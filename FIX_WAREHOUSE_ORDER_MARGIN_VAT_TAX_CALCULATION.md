# 仓库订单Margin VAT税额计算修复

## 问题描述

在仓库订单WO-20260212-2243中，Samsung Galaxy A53（Margin VAT产品）的税额计算错误：
- **错误**: 税额 = €0.00
- **正确**: 税额 = €9.35（对差价征税）

## 根本原因

在创建仓库订单时（`app.js`第2305-2310行），Margin VAT产品的税额计算逻辑错误：

**错误逻辑：**
```javascript
else if (taxClassification === 'MARGIN_VAT_0') {
  // Margin VAT: 采购时不产生进项税
  itemTaxAmount = 0;
  itemSubtotal = itemTotal;
  displayTaxAmount = 0; // 采购时税额为0
}
```

这个逻辑假设仓库批发Margin VAT产品时不计税，但实际上应该对差价（批发价 - 进货价）征收Margin VAT税。

## 正确的税务处理

### Margin VAT产品的税务流程：

1. **仓库从供应商采购**
   - 进货价：€70
   - 不计进项税 ✅

2. **仓库批发给商户**（本次修复）
   - 批发价：€95
   - 差价：€95 - €70 = €25
   - 对差价征税：€25 × (23/123) = €4.67（每台）
   - 2台总税额：€9.35 ✅

3. **商户零售给最终客户**
   - 售价：€199
   - 成本：€95（从仓库采购的价格）
   - 差价：€199 - €95 = €104
   - 对差价征税：€104 × (23/123) = €19.41

## 修复方案

### 修复1: 修改订单创建逻辑

修改`app.js`第2305-2325行：

**修改后：**
```javascript
else if (taxClassification === 'MARGIN_VAT_0') {
  // Margin VAT: 对差价（批发价 - 进货价）征税
  const costPrice = product.costPrice || 0;
  const margin = (wholesalePrice - costPrice) * item.quantity; // 差价
  
  if (margin > 0) {
    // 对差价征收Margin VAT: 税额 = 差价 × 23/123
    itemTaxAmount = margin * (23 / 123);
    displayTaxAmount = itemTaxAmount;
  } else {
    itemTaxAmount = 0;
    displayTaxAmount = 0;
  }
  
  // 不含税小计 = 批发价总额 - 税额
  itemSubtotal = itemTotal - itemTaxAmount;
}
```

### 修复2: 更新已存在的订单

运行脚本`fix-warehouse-order-WO-20260212-2243-margin-vat.js`修复订单WO-20260212-2243：

```
Samsung Galaxy A53 (128GB)
  进货价: €70 × 2 = €140
  批发价: €95 × 2 = €190
  差价: €50.00
  旧税额: €0.00
  新税额: €9.35 ✅
  差异: €9.35
```

## 验证结果

### 修复前：
- Samsung Galaxy A53税额：€0.00 ❌
- 订单总税额：€22.91

### 修复后：
- Samsung Galaxy A53税额：€9.35 ✅
- 订单总税额：€32.26 ✅

### 完整订单明细：

| 产品 | 数量 | 税率 | 批发价 | 进货价 | 差价 | 税额 |
|------|------|------|--------|--------|------|------|
| Samsung Galaxy A53 | 2 | MARGIN_VAT | €95 | €70 | €50 | €9.35 |
| Car Holder Air-Condition | 5 | VAT 23% | €6 | - | - | €5.61 |
| Car Holder Windows | 5 | VAT 23% | €6.5 | - | - | €6.08 |
| Car Holder Dash | 5 | VAT 23% | €6 | - | - | €5.61 |
| iPhone Clear Case (5个变体) | 10 | VAT 23% | €3 | - | - | €5.61 |
| **总计** | | | **€312.50** | | | **€32.26** |

## Margin VAT计算公式

```
差价 = 批发价 - 进货价
税额 = 差价 × (23/123)
或者: 税额 = 差价 - (差价 / 1.23)
```

### 示例计算：
```
进货价: €70
批发价: €95
差价: €25
税额: €25 × (23/123) = €4.67（每台）
2台税额: €9.35
```

## 相关文件

- `StockControl-main/app.js` (第2305-2325行 - 仓库订单创建)
- `StockControl-main/fix-warehouse-order-WO-20260212-2243-margin-vat.js` (修复脚本)
- `StockControl-main/FIX_WAREHOUSE_ORDER_MARGIN_VAT_COMPLETE.md` (之前的修复文档)

## 状态

✅ **已完成** - 2026-02-12
- 修改了仓库订单创建时的Margin VAT税额计算逻辑
- 修复了订单WO-20260212-2243的Samsung Galaxy A53税额
- 服务器已重启（进程46）
- 新创建的仓库订单将正确计算Margin VAT税额

## 注意事项

1. 这个修复只影响**仓库批发给商户**环节的税额计算
2. 商户零售给最终客户时，仍然需要对差价（售价 - 从仓库采购的价格）征收Margin VAT
3. 进货价（costPrice）必须正确设置，否则税额计算会不准确
4. 只有Margin VAT产品（二手商品）才使用这个计算方式
5. 标准VAT产品仍然按照原来的方式计算税额
