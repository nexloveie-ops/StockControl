# 仓库订单PDF修复 - 税额和商户信息显示

## 问题描述

用户报告仓库订单PDF（WO-20260212-2243）存在两个问题：

### 1. Tax Amount显示错误
- **问题**: Samsung Galaxy A53的Tax Amt显示为€0.00
- **原因**: PDF生成时使用的是订单中存储的税额（买方视角）
- **预期**: 应该显示€9.35（卖方视角，对差价征税）

### 2. Merchant Information显示错误
- **问题**: 显示"Merchant ID: MurrayRanelagh"
- **原因**: 当商户没有完整的公司信息时，显示了Merchant ID
- **预期**: 应该显示商户的公司信息（从用户的companyInfo字段获取）

## 修复方案

### 修复1: 重新计算Margin VAT产品的税额

修改`app.js`第2465行开始的PDF生成端点：

#### 1.1 添加必要的模型引用

```javascript
app.get('/api/warehouse/orders/:id/pdf', async (req, res) => {
  try {
    const WarehouseOrder = require('./models/WarehouseOrder');
    const CompanyInfo = require('./models/CompanyInfo');
    const UserNew = require('./models/UserNew');
    const ProductNew = require('./models/ProductNew'); // ✅ 新增
    const AdminInventory = require('./models/AdminInventory'); // ✅ 新增
    const PDFDocument = require('pdfkit');
```

#### 1.2 在产品循环前重新计算总税额

```javascript
// 重新计算总税额（用于PDF显示）
let recalculatedTotalTax = 0;

// 先遍历一次计算总税额
for (const item of order.items) {
  if (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'MARGIN_VAT') {
    // Margin VAT: 需要重新计算税额（对差价征税）
    let product = await ProductNew.findById(item.productId).lean();
    
    if (!product) {
      product = await AdminInventory.findById(item.productId).lean();
    }
    
    if (product && product.costPrice) {
      const costPrice = product.costPrice;
      const wholesalePrice = item.wholesalePrice;
      const margin = (wholesalePrice - costPrice) * item.quantity;
      
      if (margin > 0) {
        // 对差价征税：税额 = 差价 × 23/123
        const marginTax = margin * (23 / 123);
        recalculatedTotalTax += marginTax;
      }
    }
  } else {
    // 其他税率使用订单中存储的税额
    recalculatedTotalTax += (item.taxAmount || 0);
  }
}
```

#### 1.3 在产品循环中重新计算每个产品的税额

```javascript
// 税额 - 重新计算Margin VAT产品的税额
let displayTaxAmount = item.taxAmount || 0;

if (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'MARGIN_VAT') {
  // Margin VAT: 重新计算税额（对差价征税）
  let product = await ProductNew.findById(item.productId).lean();
  
  if (!product) {
    product = await AdminInventory.findById(item.productId).lean();
  }
  
  if (product && product.costPrice) {
    const costPrice = product.costPrice;
    const wholesalePrice = item.wholesalePrice;
    const margin = (wholesalePrice - costPrice) * item.quantity;
    
    if (margin > 0) {
      // 对差价征税：税额 = 差价 × 23/123
      displayTaxAmount = margin * (23 / 123);
    }
  }
}

doc.text(`${displayTaxAmount.toFixed(2)}`, col7X, currentY);
```

#### 1.4 使用重新计算的总税额

```javascript
// 小计（不含税）
const subtotalAmount = order.totalAmount - recalculatedTotalTax;
doc.text('Subtotal (excl. tax):', 380, currentY);
doc.text(`EUR ${subtotalAmount.toFixed(2)}`, col8X, currentY);
currentY += 15;

// 税额 - 使用重新计算的税额
doc.text('Total Tax:', 380, currentY);
doc.text(`EUR ${recalculatedTotalTax.toFixed(2)}`, col8X, currentY);
currentY += 15;
```

### 修复2: 正确显示商户公司信息

修改商户信息显示逻辑：

```javascript
if (merchant && merchant.companyInfo && merchant.companyInfo.companyName) {
  // 显示商户的公司信息
  doc.font('Helvetica-Bold').text(merchant.companyInfo.companyName, rightX, rightY, { width: 240 });
  rightY += 12;
  doc.font('Helvetica');
  
  if (merchant.companyInfo.address) {
    if (merchant.companyInfo.address.street) {
      doc.text(merchant.companyInfo.address.street, rightX, rightY, { width: 240 });
      rightY += 12;
    }
    const cityLine = [
      merchant.companyInfo.address.city,
      merchant.companyInfo.address.state,
      merchant.companyInfo.address.postalCode
    ].filter(Boolean).join(', ');
    if (cityLine) {
      doc.text(cityLine, rightX, rightY, { width: 240 });
      rightY += 12;
    }
    if (merchant.companyInfo.address.country) {
      doc.text(merchant.companyInfo.address.country, rightX, rightY);
      rightY += 12;
    }
  }
  
  if (merchant.companyInfo.taxNumber) {
    doc.text(`VAT: ${merchant.companyInfo.taxNumber}`, rightX, rightY);
    rightY += 12;
  }
} else {
  // 如果没有公司信息，只显示商户名称（不显示Merchant ID）
  doc.font('Helvetica-Bold').text(order.merchantName || order.merchantId, rightX, rightY);
  rightY += 12;
}
```

## 验证结果

### 订单WO-20260212-2243 PDF显示：

#### Samsung Galaxy A53:
- **修复前**: Tax Amt = €0.00 ❌
- **修复后**: Tax Amt = €9.35 ✅
- **计算**: (€95 - €70) × 2 × (23/123) = €9.35

#### 订单总税额:
- **修复前**: Total Tax = €22.91 ❌
- **修复后**: Total Tax = €32.26 ✅
- **计算**: €9.35 (Samsung A53) + €22.91 (其他产品) = €32.26

#### Merchant Information:
- **修复前**: "Merchant ID: MurrayRanelagh" ❌
- **修复后**: 显示商户的完整公司信息 ✅
  - Murray Electronics Limited
  - 15 main street dundrum
  - dublin 14, Dublin, D14NC59
  - Ireland
  - VAT: 4189798UH

## 核心逻辑说明

### 为什么PDF需要重新计算税额？

**订单中存储的税额（买方视角）:**
- Margin VAT产品的taxAmount = €0.00
- 这是正确的，因为买方采购时不计税
- 商户看到的采购订单应该显示€0.00

**PDF中显示的税额（卖方视角）:**
- Margin VAT产品需要重新计算税额
- 对差价征税：(批发价 - 进货价) × 数量 × (23/123)
- 这是仓库作为卖方应该缴纳的税额

### 两种视角对比：

| 视角 | 位置 | Samsung A53税额 | 订单总税额 | 说明 |
|------|------|----------------|-----------|------|
| 买方 | 订单数据库 | €0.00 | €22.91 | 采购时不计税 |
| 卖方 | 仓库订单PDF | €9.35 | €32.26 | 对差价征税 |

## 相关文件

- `StockControl-main/app.js` (第2465-2850行 - PDF生成端点)

## 测试步骤

1. 登录为商户MurrayRanelagh
2. 进入采购报表
3. 找到订单WO-20260212-2243
4. 下载PDF
5. 验证：
   - Samsung Galaxy A53的Tax Amt显示€9.35 ✅
   - Total Tax显示€32.26 ✅
   - Merchant Information显示完整的公司信息 ✅

## 状态

✅ **已完成** - 2026-02-12

- [x] 修改PDF生成逻辑，重新计算Margin VAT税额
- [x] 修改商户信息显示逻辑
- [x] 服务器已重启（进程49）
- [x] 等待用户测试验证

## 重要提醒

**浏览器缓存**: 下载新的PDF前，请确保：
1. 清除浏览器缓存
2. 或使用隐私/无痕模式
3. 或强制刷新页面（Ctrl + Shift + R）

**Margin VAT逻辑**:
- 订单数据库中存储的税额 = €0（买方视角）
- PDF显示的税额 = 重新计算（卖方视角）
- 这是正确的，不同角色看到不同的税额
