# 发票PDF导出最终修复 - Condition和Tax Classification

## 修复时间
2026-02-11

## 问题分析

### 数据库字段差异

**商户库存产品 (MerchantInventory)**:
- `condition`: "PRE-OWNED", "BRAND_NEW"
- `taxClassification`: "MARGIN_VAT_0", "MARGIN_VAT_23", "STANDARD_VAT"
- `vatRate`: undefined

**采购/销售发票 (PurchaseInvoice/SalesInvoice)**:
- `condition`: "PRE-OWNED", undefined
- `taxClassification`: undefined
- `vatRate`: "VAT 0%", "VAT 23%", "VAT 13.5%"

## 修复内容

### 1. ✅ Condition显示修复

**问题**: 
- "PRE-OWNED" 显示为 "PRE-OWNED"（全大写，不易读）
- "BRAND_NEW" 显示为 "BRAND_NEW"（全大写，不易读）

**修复**:
```javascript
let condition = item.condition || 'Brand New';
if (condition === 'PRE-OWNED') {
  condition = 'Pre-Owned';
} else if (condition === 'BRAND_NEW') {
  condition = 'Brand New';
}
```

**显示效果**:
- `PRE-OWNED` → `Pre-Owned`
- `BRAND_NEW` → `Brand New`
- `undefined` → `Brand New`

### 2. ✅ Tax Classification显示修复

**问题**: 
- 商户库存产品的 `taxClassification: MARGIN_VAT_0` 显示为 "VAT 0%"（错误）
- 应该显示为 "Margin VAT 0%"

**修复**:
```javascript
let taxDisplay = '';
if (item.taxClassification) {
  // 商户库存产品使用taxClassification
  if (item.taxClassification === 'MARGIN_VAT_0') {
    taxDisplay = 'Margin VAT 0%';
  } else if (item.taxClassification === 'MARGIN_VAT_23') {
    taxDisplay = 'Margin VAT 23%';
  } else if (item.taxClassification === 'STANDARD_VAT') {
    taxDisplay = 'Standard VAT';
  } else {
    taxDisplay = item.taxClassification.replace(/_/g, ' ');
  }
} else if (item.vatRate) {
  // 采购/销售发票使用vatRate
  taxDisplay = item.vatRate;
} else {
  taxDisplay = 'VAT 23%';
}
```

**显示效果**:
- `MARGIN_VAT_0` → `Margin VAT 0%`
- `MARGIN_VAT_23` → `Margin VAT 23%`
- `STANDARD_VAT` → `Standard VAT`
- `VAT 0%` → `VAT 0%`
- `VAT 23%` → `VAT 23%`
- `VAT 13.5%` → `VAT 13.5%`

### 3. ✅ 税额计算修复

**修复**:
```javascript
const taxType = item.taxClassification || item.vatRate || '';

if (taxType.includes('MARGIN_VAT_0') || taxType === 'VAT 0%') {
  itemTax = 0;
} else if (taxType.includes('MARGIN_VAT_23') || taxType === 'VAT 23%' || taxType === 'STANDARD_VAT') {
  itemTax = totalPrice * 0.23 / 1.23;
} else if (taxType === 'VAT 13.5%') {
  itemTax = totalPrice * 0.135 / 1.135;
}
```

## 修改文件
- `StockControl-main/public/prototype-working.html` - `exportInvoicePDF()` 函数

## PDF格式示例

### 商户库存产品（使用taxClassification）
```
┌────────────────────────────────────────────────────────┐
│ Product    │ Condition  │ Tax            │ Qty │ Price │
├────────────────────────────────────────────────────────┤
│ IPHONE11   │ Pre-Owned  │ Margin VAT 0%  │  1  │ €195  │
│ 64GB Black │            │                │     │       │
├────────────────────────────────────────────────────────┤
│ IPAD11     │ Pre-Owned  │ Margin VAT 0%  │  1  │ €315  │
└────────────────────────────────────────────────────────┘
```

### 采购发票产品（使用vatRate）
```
┌────────────────────────────────────────────────────────┐
│ Product    │ Condition  │ Tax            │ Qty │ Price │
├────────────────────────────────────────────────────────┤
│ IPHONE15   │ Brand New  │ VAT 0%         │  1  │ €445  │
│ PLUS       │            │                │     │       │
├────────────────────────────────────────────────────────┤
│ IPHONE14   │ Brand New  │ VAT 23%        │  1  │ €380  │
└────────────────────────────────────────────────────────┘
```

## Tax Classification说明

### 商户库存产品（taxClassification）
- `MARGIN_VAT_0` → **Margin VAT 0%** - 差价增值税0%（二手商品）
- `MARGIN_VAT_23` → **Margin VAT 23%** - 差价增值税23%（二手商品）
- `STANDARD_VAT` → **Standard VAT** - 标准增值税23%

### 采购/销售发票（vatRate）
- `VAT 0%` → **VAT 0%** - 零税率
- `VAT 23%` → **VAT 23%** - 标准税率
- `VAT 13.5%` → **VAT 13.5%** - 低税率

## Condition说明

### 数据库值 → PDF显示
- `PRE-OWNED` → **Pre-Owned** - 二手
- `BRAND_NEW` → **Brand New** - 全新
- `undefined` → **Brand New** - 默认全新

## 差价增值税 (Margin VAT) 说明

### 什么是差价增值税？
差价增值税是针对二手商品的特殊税务处理方式：
- 只对利润部分（销售价 - 采购价）征税
- 而不是对整个销售价格征税
- 适用于二手手机、二手电子产品等

### 为什么是0%？
- `MARGIN_VAT_0` 表示差价增值税税率为0%
- 这意味着即使是二手商品，也不需要缴纳增值税
- 可能是因为出口、特殊政策或其他原因

### 与标准VAT的区别
- **标准VAT 23%**: 对整个销售价格征税23%
- **Margin VAT 0%**: 对利润部分征税0%（实际不征税）
- **Margin VAT 23%**: 对利润部分征税23%

## 使用方法

1. 在产品追溯页面（prototype-working.html）
2. 点击历史记录时间线中的发票编号
3. 在发票详情对话框中点击"📄 导出PDF"
4. PDF将正确显示Condition和Tax Classification

## 注意事项

- 不需要重启服务器
- 需要强制刷新浏览器（Ctrl + Shift + R）
- 优先使用 `taxClassification`，如果不存在则使用 `vatRate`
- Condition会自动转换为易读格式

## 测试建议

1. ✅ 测试商户库存产品（应显示"Margin VAT 0%"）
2. ✅ 测试采购发票产品（应显示"VAT 0%"或"VAT 23%"）
3. ✅ 测试销售发票产品（应显示正确的税率）
4. ✅ 验证Condition显示为"Pre-Owned"而不是"PRE-OWNED"
5. ✅ 验证税额计算正确

## 相关文件

- `StockControl-main/public/prototype-working.html` - 前端实现
- `StockControl-main/check-product-tax-condition.js` - 数据库字段验证脚本
- `StockControl-main/FIX_INVOICE_PDF_TAX_AND_NOTES.md` - 之前的修复文档
