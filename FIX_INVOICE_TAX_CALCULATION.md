# 修复发票税额计算和PDF显示

## 完成时间
2026-02-10

## 问题描述
1. **税额计算错误**: AdminInventory产品的税额被设置为0，导致发票总税额不正确
2. **PDF缺少税额**: PDF导出时没有显示税额列和税额汇总

## 根本原因
AdminInventory产品的 `costPrice` 是含税价格，但在API中：
- `taxAmount` 被硬编码为0
- `totalCostExcludingTax` 错误地使用了含税价格

这导致：
- 税额分解显示不正确
- 总税额计算错误
- PDF中缺少税额信息

## 解决方案

### 1. 修复后端税额计算 ✅

**文件**: `StockControl-main/app.js`

**修改位置**: `/api/admin/purchase-orders/:invoiceId` API

**修改内容**:
```javascript
// 格式化AdminInventory产品为发票items格式
const adminItems = adminProducts.map(product => {
  // 正确映射税率
  let vatRate = 'VAT 0%';
  let taxMultiplier = 1.0;
  
  if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
    vatRate = 'VAT 23%';
    taxMultiplier = 1.23;
  } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
    vatRate = 'VAT 13.5%';
    taxMultiplier = 1.135;
  } else if (product.taxClassification === 'VAT_0' || product.taxClassification === 'VAT 0%') {
    vatRate = 'VAT 0%';
    taxMultiplier = 1.0;
  }
  
  // AdminInventory的costPrice是含税价格，需要计算不含税价格和税额
  const totalCostIncludingTax = product.costPrice * product.quantity;
  const totalCostExcludingTax = totalCostIncludingTax / taxMultiplier;
  const taxAmount = totalCostIncludingTax - totalCostExcludingTax;
  const unitCostExcludingTax = product.costPrice / taxMultiplier;
  
  return {
    _id: product._id,
    product: product._id,
    productName: product.productName,
    description: `${product.productName} - ${product.model} - ${product.color}`,
    quantity: product.quantity,
    unitCost: product.costPrice, // 含税单价
    totalCost: totalCostIncludingTax, // 含税总价
    unitCostExcludingTax: unitCostExcludingTax, // 不含税单价
    totalCostExcludingTax: totalCostExcludingTax, // 不含税总价
    vatRate: vatRate,
    taxAmount: taxAmount, // 正确计算的税额
    serialNumbers: product.serialNumber ? [product.serialNumber] : [],
    barcode: product.barcode || '',
    location: product.location,
    condition: product.condition,
    source: 'AdminInventory'
  };
});
```

**重新计算发票总金额**:
```javascript
// 重新计算总金额、小计和税额
const totalAmount = allItems.reduce((sum, item) => sum + item.totalCost, 0);
const subtotal = allItems.reduce((sum, item) => sum + item.totalCostExcludingTax, 0);
const taxAmount = allItems.reduce((sum, item) => sum + item.taxAmount, 0);

const formattedInvoice = {
  // ...
  totalAmount: totalAmount,
  subtotal: subtotal,
  taxAmount: taxAmount,
  // ...
};
```

### 2. 修复PDF税额显示 ✅

**文件**: `StockControl-main/public/prototype-working.html`

**修改位置**: `downloadPurchaseInvoicePDF()` 函数

**修改内容**:

1. **添加税额列到表格**:
```javascript
// 表格头
head: [['Product', 'Qty', 'Unit Price', 'Total', 'VAT Rate', 'Tax Amount']]

// 表格数据
return [
  displayName,
  item.quantity.toString(),
  `€${(item.unitCost || 0).toFixed(2)}`,
  `€${(item.totalCost || 0).toFixed(2)}`,
  item.vatRate || 'N/A',
  `€${(item.taxAmount || 0).toFixed(2)}` // 新增税额列
];
```

2. **添加税额汇总**:
```javascript
// 总计 - 显示详细的税额分解
yPos = doc.lastAutoTable.finalY + 10;

doc.setFontSize(10);
doc.setFont(undefined, 'normal');
doc.text(`Subtotal (excl. VAT):`, 120, yPos);
doc.text(`€${(invoice.subtotal || 0).toFixed(2)}`, 170, yPos, { align: 'right' });

yPos += 6;
doc.text(`VAT Amount:`, 120, yPos);
doc.text(`€${(invoice.taxAmount || 0).toFixed(2)}`, 170, yPos, { align: 'right' });

yPos += 8;
doc.setFontSize(12);
doc.setFont(undefined, 'bold');
doc.text(`Total (incl. VAT):`, 120, yPos);
doc.text(`€${(invoice.totalAmount || 0).toFixed(2)}`, 170, yPos, { align: 'right' });
```

## 税额计算公式

### VAT 23%
```
含税价格 = €1.00
不含税价格 = €1.00 / 1.23 = €0.8130
税额 = €1.00 - €0.8130 = €0.1870
验证: €0.8130 + €0.1870 = €1.00 ✅
```

### VAT 13.5%
```
含税价格 = €1.00
不含税价格 = €1.00 / 1.135 = €0.8811
税额 = €1.00 - €0.8811 = €0.1189
验证: €0.8811 + €0.1189 = €1.00 ✅
```

### VAT 0%
```
含税价格 = €1.00
不含税价格 = €1.00 / 1.0 = €1.00
税额 = €1.00 - €1.00 = €0.00
验证: €1.00 + €0.00 = €1.00 ✅
```

## 测试结果

### SI-003 订单税额验证
运行测试脚本: `node test-invoice-tax-calculation.js`

```
=== SI-003 订单总计 ===
产品总数: 220
总金额(含税): €5940.00
总金额(不含税): €4829.27
总税额: €1110.73
验证: €4829.27 + €1110.73 = €5940.00 ✅
```

### 单个产品示例
```
产品: iPhone Screen Saver - iPhone 11 - Normal
数量: 15
进货价(含税): €1.00
税率: VAT 23%

计算结果:
  总价(含税): €15.00
  总价(不含税): €12.20
  税额: €2.80
  验证: €12.20 + €2.80 = €15.00 ✅
```

## PDF格式改进

### 产品明细表格
| Product | Qty | Unit Price | Total | VAT Rate | Tax Amount |
|---------|-----|------------|-------|----------|------------|
| iPhone Screen Saver - iPhone 11 - Normal (A1-S1-P1) | 15 | €1.00 | €15.00 | VAT 23% | €2.80 |

### 金额汇总
```
Subtotal (excl. VAT):    €4,829.27
VAT Amount:              €1,110.73
─────────────────────────────────
Total (incl. VAT):       €5,940.00
```

## 测试步骤

1. **重启服务器** ✅
   ```bash
   taskkill /F /IM node.exe
   node app.js
   ```

2. **刷新浏览器**
   - 按 Ctrl + Shift + R 强制刷新

3. **查看发票详情**
   - 打开 Prototype 页面
   - 供货商/客户管理 → Mobigo Limited → SI-003 → 发票详情

4. **验证税额显示**
   - ✅ 税额分解显示正确的税额
   - ✅ 总税额: €1,110.73
   - ✅ 小计(不含税): €4,829.27
   - ✅ 总金额(含税): €5,940.00

5. **测试PDF下载**
   - 点击"📥 下载PDF"按钮
   - 验证PDF包含：
     - ✅ 税额列（Tax Amount）
     - ✅ 小计(不含税)
     - ✅ 税额合计
     - ✅ 总金额(含税)

## 相关文件
- `StockControl-main/app.js` - 后端税额计算修复
- `StockControl-main/public/prototype-working.html` - PDF税额显示修复
- `StockControl-main/test-invoice-tax-calculation.js` - 税额计算验证脚本

## 技术要点

### 含税价格转换公式
```javascript
// 已知含税价格，计算不含税价格和税额
const priceIncludingTax = 1.00;
const taxMultiplier = 1.23; // VAT 23%

const priceExcludingTax = priceIncludingTax / taxMultiplier;
const taxAmount = priceIncludingTax - priceExcludingTax;
```

### 不含税价格转换公式（PurchaseInvoice使用）
```javascript
// 已知不含税价格，计算含税价格和税额
const priceExcludingTax = 1.00;
const taxMultiplier = 1.23; // VAT 23%

const priceIncludingTax = priceExcludingTax * taxMultiplier;
const taxAmount = priceIncludingTax - priceExcludingTax;
```

## 注意事项

1. **AdminInventory vs PurchaseInvoice**:
   - AdminInventory: `costPrice` 是含税价格
   - PurchaseInvoice: `unitCost` 是不含税价格

2. **税率映射**:
   - 数据库存储: `VAT_23`, `VAT_13_5`, `VAT_0`
   - 显示格式: `VAT 23%`, `VAT 13.5%`, `VAT 0%`

3. **精度问题**:
   - 使用 `.toFixed(2)` 保留两位小数
   - 验证时允许 ±0.01 的误差（浮点数精度）

## 下一步
功能已完成并测试通过。税额计算现在完全正确，PDF也包含了完整的税额信息。
