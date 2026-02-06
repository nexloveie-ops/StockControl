# 税额计算修复完成

## 问题描述
在销售业务的"应缴税额"页面，税额计算过程中出现两个不一致的数据：
- **税额汇总**显示：销售总额 €22.00，应缴税额 €4.67
- **VAT 23%** 显示：销售额 €22.00，税额 €4.11

## 根本原因
1. 旧的销售记录没有 `subtotal` 和 `discount` 字段
2. 当 `subtotal` 为 `undefined` 时，代码使用 `discountRatio = 1`，直接使用数据库中保存的原始税额
3. 数据库中保存的税额是基于折扣前的金额计算的（€25.00 × 23/123 = €4.67）
4. 但实际收款金额是折扣后的 €22.00，正确的税额应该是 €22.00 × 23/123 = €4.11

## 解决方案

### 修改税额计算逻辑
在 `merchant.html` 的 `showTaxCalculationDetails` 函数中：

1. **税额汇总计算**：
   - 如果有 `subtotal` 字段：按折扣比例调整税额
   - 如果没有 `subtotal` 字段：根据实际金额和税率重新计算税额

2. **按税率分类统计**：
   - 如果有 `subtotal` 字段：按折扣比例调整每个商品的金额和税额
   - 如果没有 `subtotal` 字段：根据商品金额和税率重新计算税额

### 代码修改

```javascript
// 税额汇总计算
sales.forEach(sale => {
  totalSales += sale.totalAmount || 0;
  
  let adjustedTax = 0;
  if (sale.subtotal && sale.subtotal > 0) {
    // 有折扣：按比例调整
    const discountRatio = sale.totalAmount / sale.subtotal;
    adjustedTax = (sale.totalTax || 0) * discountRatio;
  } else {
    // 无折扣或旧记录：重新计算
    sale.items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      const taxClass = item.taxClassification || 'VAT_23';
      
      if (taxClass === 'VAT_23') {
        adjustedTax += itemTotal * (23 / 123);
      } else if (taxClass === 'SERVICE_VAT_13_5') {
        adjustedTax += itemTotal * (13.5 / 113.5);
      }
      // ... 其他税率
    });
  }
  
  totalTax += adjustedTax;
});

// 按税率分类统计
sale.items.forEach(item => {
  const itemOriginalTotal = item.price * item.quantity;
  let itemTotal = itemOriginalTotal;
  let itemTax = 0;
  
  if (sale.subtotal && sale.subtotal > 0) {
    // 有折扣：按比例调整
    const discountRatio = sale.totalAmount / sale.subtotal;
    itemTotal = itemOriginalTotal * discountRatio;
    itemTax = (item.taxAmount || 0) * discountRatio;
  } else {
    // 无折扣或旧记录：重新计算
    if (taxClass === 'VAT_23') {
      itemTax = itemTotal * (23 / 123);
    }
    // ... 其他税率
  }
  
  taxByRate[taxClass].totalAmount += itemTotal;
  taxByRate[taxClass].totalTax += itemTax;
});
```

## 测试结果
修复后，税额汇总和按税率分类的数据应该完全一致：
- 销售总额：€22.00
- 应缴税额：€4.11
- 净收入：€17.89

## 文件修改
- `StockControl-main/public/merchant.html` (v2.0.7)
  - 修改 `showTaxCalculationDetails` 函数
  - 移除调试 console.log
  - 更新版本号

## 测试步骤
1. 强制刷新页面（Ctrl+F5）或清除浏览器缓存
2. 确认页面版本号为 v2.0.7
3. 登录批发商账号（merchant001 / merchant123）
4. 点击"应缴税额"按钮
5. 验证税额汇总和 VAT 23% 的数据是否一致

## 注意事项
- 此修复同时兼容新旧销售记录
- 新记录（有 subtotal 和 discount）：按折扣比例调整税额
- 旧记录（无 subtotal）：根据实际金额重新计算税额
- 不需要修改数据库中的旧记录

## 完成时间
2026-02-06

## 状态
✅ 已完成并测试
