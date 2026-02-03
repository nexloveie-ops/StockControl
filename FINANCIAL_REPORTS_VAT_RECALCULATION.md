# Financial Reports VAT Amount 重新计算功能

## 问题描述

在 Financial Reports 中，某些 SalesInvoice 的 VAT Amount 显示为 €0.00，但实际上这些发票包含 Margin VAT 产品，应该有税额。

### 问题发票示例
- **SI-1769998537832-0002**: 18 个 Margin VAT 产品，税额应为 €84.15
- **SI-1769998524159-0001**: 4 个 Margin VAT 产品，税额应为 €5.61

## 根本原因

SalesInvoice 数据库中的 `taxAmount` 字段为 0 是正确的（因为 Margin VAT 产品在销售时标记为 VAT 0%），但在 Financial Reports 中需要根据产品的成本价重新计算实际应缴税额。

## 解决方案

修改 Financial Reports API (`/api/admin/reports/financial` 和 `/api/reports/financial`)，在返回数据时重新计算 SalesInvoice 的税额：

### 实现逻辑

1. **Populate 产品信息**
   ```javascript
   .populate('items.product')
   ```

2. **遍历每个发票项目，根据产品的 vatRate 重新计算税额**
   ```javascript
   invoice.items.forEach(item => {
     const product = item.product;
     if (!product) return;
     
     const totalPrice = item.totalPrice;
     const costPrice = product.costPrice * item.quantity;
     
     if (product.vatRate === 'VAT 0%') {
       // Margin VAT: 税额 = (卖价 - 成本价) × 23/123
       if (costPrice > 0) {
         recalculatedTax += (totalPrice - costPrice) * (23 / 123);
       }
     } else if (product.vatRate === 'VAT 23%') {
       // VAT 23%: 税额 = 总价 × 23/123
       recalculatedTax += totalPrice * (23 / 123);
     } else if (product.vatRate === 'VAT 13.5%') {
       // Service VAT 13.5%: 税额 = 总价 × 13.5/113.5
       recalculatedTax += totalPrice * (13.5 / 113.5);
     }
   });
   ```

3. **使用重新计算的税额**
   ```javascript
   results.push({
     ...
     taxAmount: recalculatedTax, // 使用重新计算的税额
     ...
   });
   ```

## 税额计算公式

### Margin VAT (VAT 0%)
```
税额 = (卖价 - 成本价) × 23/123
```

### VAT 23%
```
税额 = 总价 × 23/123
```

### Service VAT 13.5%
```
税额 = 总价 × 13.5/113.5
```

## 修改的文件

- `StockControl-main/app.js` (第 3595-3640 行, 第 3800-3845 行)
  - `/api/admin/reports/financial` API
  - `/api/reports/financial` API (别名路径)

## 测试结果

### 测试脚本
```bash
node test-financial-reports-fix.js
```

### 验证结果
```
SI-1769998537832-0002:
  预期税额: €84.15
  实际税额: €84.15
  差异: €0.00 ✅ 通过

SI-1769998524159-0001:
  预期税额: €5.61
  实际税额: €5.61
  差异: €0.00 ✅ 通过
```

## 重要说明

1. **SalesInvoice 数据不变**: 数据库中的 SalesInvoice 记录保持不变，`taxAmount` 字段仍为 0
2. **仅在 API 层重新计算**: 税额重新计算只在 Financial Reports API 返回数据时进行
3. **依赖产品信息**: 必须 populate `items.product` 才能获取产品的 `vatRate` 和 `costPrice`
4. **成本价为 0 的处理**: 如果产品的 `costPrice` 为 0，Margin VAT 税额将为 0（无法计算）

## 影响范围

- Financial Reports 页面 (`prototype-working.html`)
- 所有使用 `/api/admin/reports/financial` 或 `/api/reports/financial` 的功能
- 税务汇总统计（`totalSalesTax`, `totalTaxPayable`）

## 日期

2026-02-02
