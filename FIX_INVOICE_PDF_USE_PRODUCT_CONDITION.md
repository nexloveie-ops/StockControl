# 发票PDF导出修复 - 使用产品的Condition和Tax Classification

## 修复时间
2026-02-11

## 问题描述
PDF导出时没有读取产品本身的condition和taxClassification，而是使用发票item中的字段（可能为空）。

## 解决方案

### 1. 后端API修复 - Populate产品字段

**修改文件**: `StockControl-main/app.js`

**采购发票API** (第3905行):
```javascript
const invoice = await PurchaseInvoice.findById(invoiceId)
  .populate('supplier', 'name code contact')
  .populate('items.product', 'condition taxClassification')  // 新增
  .lean();
```

**销售发票API** (第3925行):
```javascript
const invoice = await SalesInvoice.findById(invoiceId)
  .populate('customer', 'name code contact')
  .populate('items.product', 'condition taxClassification')  // 新增
  .lean();
```

### 2. 前端PDF导出修复 - 使用产品字段

**修改文件**: `StockControl-main/public/prototype-working.html`

**Condition读取优先级**:
```javascript
// 优先使用产品的condition，其次使用item的condition
let condition = item.product?.condition || item.condition || 'Brand New';
if (condition === 'PRE-OWNED') {
  condition = 'Pre-Owned';
} else if (condition === 'BRAND_NEW') {
  condition = 'Brand New';
}
```

**Tax Classification读取优先级**:
```javascript
const productTaxClass = item.product?.taxClassification;
const itemTaxClass = item.taxClassification;
const itemVatRate = item.vatRate;

if (productTaxClass) {
  // 优先使用产品的taxClassification
  if (productTaxClass === 'MARGIN_VAT_0') {
    taxDisplay = 'Margin VAT 0%';
  } else if (productTaxClass === 'MARGIN_VAT_23') {
    taxDisplay = 'Margin VAT 23%';
  } else if (productTaxClass === 'STANDARD_VAT') {
    taxDisplay = 'Standard VAT';
  }
} else if (itemTaxClass) {
  // 其次使用item的taxClassification
  // ...
} else if (itemVatRate) {
  // 最后使用item的vatRate
  taxDisplay = itemVatRate;
}
```

**税额计算**:
```javascript
const taxType = productTaxClass || itemTaxClass || itemVatRate || '';

if (taxType.includes('MARGIN_VAT_0') || taxType === 'VAT 0%') {
  itemTax = 0;
} else if (taxType.includes('MARGIN_VAT_23') || taxType === 'VAT 23%' || taxType === 'STANDARD_VAT') {
  itemTax = totalPrice * 0.23 / 1.23;
} else if (taxType === 'VAT 13.5%') {
  itemTax = totalPrice * 0.135 / 1.135;
}
```

## 字段读取优先级

### Condition
1. `item.product.condition` - 产品本身的成色（最优先）
2. `item.condition` - 发票item中的成色
3. `'Brand New'` - 默认值

### Tax Classification
1. `item.product.taxClassification` - 产品本身的税务分类（最优先）
2. `item.taxClassification` - 发票item中的税务分类
3. `item.vatRate` - 发票item中的税率
4. `'VAT 23%'` - 默认值

## 数据流程

```
数据库
  ↓
PurchaseInvoice/SalesInvoice
  ├─ items[]
  │   ├─ product (ObjectId) → populate → MerchantInventory
  │   │   ├─ condition: "PRE-OWNED"
  │   │   └─ taxClassification: "MARGIN_VAT_0"
  │   ├─ condition: undefined (可能为空)
  │   ├─ taxClassification: undefined (可能为空)
  │   └─ vatRate: "VAT 0%"
  ↓
API返回
  ↓
前端PDF导出
  ├─ 优先使用 item.product.condition
  ├─ 优先使用 item.product.taxClassification
  └─ 生成PDF
```

## 为什么需要这个修复？

### 问题场景
1. 商户从仓库采购产品时，产品有自己的condition和taxClassification
2. 采购发票的items中只记录了产品引用（product ObjectId）
3. 采购发票的items中可能没有condition和taxClassification字段
4. 导致PDF导出时显示默认值而不是产品实际的成色和税务分类

### 修复后的效果
- PDF现在显示产品实际的成色（如"Pre-Owned"）
- PDF现在显示产品实际的税务分类（如"Margin VAT 0%"）
- 即使发票item中没有这些字段，也能正确显示

## 示例对比

### 修复前
```
产品: IPHONE11
Condition: Brand New (错误 - 使用了默认值)
Tax: VAT 0% (错误 - 使用了item.vatRate)
```

### 修复后
```
产品: IPHONE11
Condition: Pre-Owned (正确 - 从产品读取)
Tax: Margin VAT 0% (正确 - 从产品读取)
```

## 修改的文件

### 后端
- `StockControl-main/app.js` (第3905行和第3925行)

### 前端
- `StockControl-main/public/prototype-working.html` - `exportInvoicePDF()` 函数

## 使用方法

1. **服务器已重启**（进程28）- 后端API修改已生效
2. **强制刷新浏览器**（Ctrl + Shift + R）- 前端修改已生效
3. 在产品追溯页面点击发票编号
4. 点击"📄 导出PDF"按钮
5. PDF将显示产品实际的condition和taxClassification

## 注意事项

- 后端API修改需要重启服务器（已完成）
- 前端修改需要强制刷新浏览器
- 如果产品已被删除，会fallback到item的字段
- 如果所有字段都为空，会使用默认值

## 测试建议

1. ✅ 测试商户库存产品的采购发票（应显示产品的condition和taxClassification）
2. ✅ 测试销售发票（应显示产品的condition和taxClassification）
3. ✅ 测试产品已删除的情况（应fallback到item字段）
4. ✅ 验证税额计算使用正确的税务分类

## 相关文件

- `StockControl-main/app.js` - 后端API
- `StockControl-main/public/prototype-working.html` - 前端PDF导出
- `StockControl-main/check-product-tax-condition.js` - 数据验证脚本
- `StockControl-main/FIX_INVOICE_PDF_CONDITION_TAX_FINAL.md` - 之前的修复文档
