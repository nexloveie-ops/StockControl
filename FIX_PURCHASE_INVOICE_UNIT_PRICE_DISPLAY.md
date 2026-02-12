# 采购发票Unit Price显示修复

## 问题描述

在Purchase Invoice Details中，Unit Price显示的是含税价格（€1.23），但应该显示税前价格（€1.00）。

例如SI-003发票：
- **错误显示**: Unit Price = €1.23（含税）
- **正确显示**: Unit Price = €1.00（税前）

## 根本原因

Invoice Details API (`app.js`第1660-1745行)在格式化发票items时：
1. **PurchaseInvoice items**: 将`item.unitCost`乘以taxMultiplier，错误地认为存储的是税前价格
2. **AdminInventory items**: 返回`unitCostIncludingTax`作为`unitCost`字段

但实际上：
- PurchaseInvoice表中的`unitCost`已经是税前价格
- AdminInventory表中的`costPrice`也是税前价格
- 采购发票应该显示税前单价，而不是含税单价

## 修复方案

### 修复1: AdminInventory items格式化
修改`app.js`第1710-1745行：

**修改前：**
```javascript
unitCost: unitCostIncludingTax, // 含税单价
totalCost: totalCostIncludingTax, // 含税总价
```

**修改后：**
```javascript
unitCost: unitCostExcludingTax, // 税前单价（采购发票显示税前价格）
totalCost: totalCostIncludingTax, // 含税总价
unitCostIncludingTax: unitCostIncludingTax, // 含税单价（备用）
```

### 修复2: PurchaseInvoice items格式化
修改`app.js`第1660-1690行：

**修改前：**
```javascript
const unitCostIncludingTax = (item.unitCost || 0) * taxMultiplier;
const totalCostIncludingTax = (item.totalCost || 0) * taxMultiplier;

return {
  unitCost: unitCostIncludingTax, // 含税单价
  totalCost: totalCostIncludingTax, // 含税总价
  ...
};
```

**修改后：**
```javascript
const unitCostExcludingTax = item.unitCost || 0;  // 不含税单价
const totalCostExcludingTax = item.totalCost || 0;  // 不含税总价
const taxAmount = totalCostExcludingTax * (taxMultiplier - 1);  // 税额
const totalCostIncludingTax = totalCostExcludingTax + taxAmount;  // 含税总价

return {
  unitCost: unitCostExcludingTax, // 税前单价（采购发票显示税前价格）
  totalCost: totalCostIncludingTax, // 含税总价
  ...
};
```

## 验证结果

### SI-003采购发票
修复后显示：
- **Unit Price**: €1.00（税前）✅
- **Total Price**: €24.60（含税，20个 × €1.00 × 1.23）✅
- **VAT Rate**: Standard Rate - 23% ✅

### 计算逻辑
```
税前单价: €1.00
数量: 20
税前小计: €1.00 × 20 = €20.00
税额: €20.00 × 0.23 = €4.60
含税总价: €20.00 + €4.60 = €24.60
```

## 前端显示

前端`prototype-working.html`第3650-3700行显示：
```html
<th>Unit Price</th>
...
<td>€${(item.unitCost || 0).toFixed(2)}</td>  <!-- 显示税前单价 -->
```

底部汇总显示：
```html
<div>Subtotal (Excl. VAT): €${(invoice.subtotal || 0).toFixed(2)}</div>
<div>VAT Amount: €${(invoice.taxAmount || 0).toFixed(2)}</div>
<div>Total Amount (Incl. VAT): €${(invoice.totalAmount || 0).toFixed(2)}</div>
```

## 数据字段说明

### PurchaseInvoice表
- `unitCost`: 税前单价
- `totalCost`: 税前总价
- `taxAmount`: 税额
- `subtotal`: 税前小计
- `totalAmount`: 含税总额

### AdminInventory表
- `costPrice`: 税前单价
- 含税价格 = `costPrice × (1 + 税率)`

## 相关文件

- `StockControl-main/app.js` (第1660-1745行 - Invoice Details API)
- `StockControl-main/public/prototype-working.html` (第3650-3700行 - 发票详情显示)

## 状态

✅ **已完成** - 2026-02-12
- 修复AdminInventory items的unitCost显示
- 修复PurchaseInvoice items的unitCost计算
- 服务器已重启（进程45）
- Unit Price现在正确显示税前价格
