# Financial Reports中Margin VAT税额计算修复

## 问题描述

在仓库管理员的Financial Reports中，仓库订单WO-20260212-2243的Samsung Galaxy A53（Margin VAT产品）税额显示错误：
- **错误**: 税额 = €0（使用订单中存储的买方视角税额）
- **正确**: 税额 = €9.35（卖方视角，对差价征税）

## 核心逻辑

### 两种视角的税额：

**1. 买方视角（商户采购订单PDF）**
- 订单中存储的`taxAmount` = €0
- 商户看到的采购订单PDF显示税额€0 ✅
- 因为买方采购时不计税

**2. 卖方视角（仓库Financial Reports）**
- Financial Reports重新计算`taxAmount` = €9.35
- 仓库管理员看到的Financial Reports显示税额€9.35 ✅
- 因为仓库是卖方，需要对差价征税

## 修复方案

修改`app.js`第5575-5600行，在Financial Reports API中重新计算Margin VAT产品的税额：

**修改前：**
```javascript
warehouseOrders.forEach(order => {
  results.push({
    _id: order._id,
    invoiceNumber: order.orderNumber,
    type: 'sales',
    subType: 'wholesale',
    partner: order.merchantId || order.merchantName,
    date: order.completedAt,
    totalAmount: order.totalAmount,
    taxAmount: order.taxAmount || 0, // ❌ 使用订单中存储的税额（买方视角）
    subtotal: order.subtotal || order.totalAmount
  });
});
```

**修改后：**
```javascript
for (const order of warehouseOrders) {
  // 重新计算税额（卖方视角）
  let recalculatedTaxAmount = 0;
  
  for (const item of order.items) {
    if (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'MARGIN_VAT') {
      // Margin VAT: 卖方需要对差价征税
      // 查询产品获取进货价
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
          recalculatedTaxAmount += marginTax;
        }
      }
    } else {
      // 其他税率使用订单中存储的税额
      recalculatedTaxAmount += (item.taxAmount || 0);
    }
  }
  
  results.push({
    _id: order._id,
    invoiceNumber: order.orderNumber,
    type: 'sales',
    subType: 'wholesale',
    partner: order.merchantId || order.merchantName,
    date: order.completedAt,
    totalAmount: order.totalAmount,
    taxAmount: recalculatedTaxAmount, // ✅ 重新计算的税额（卖方视角）
    subtotal: order.totalAmount - recalculatedTaxAmount
  });
}
```

## 验证结果

### WO-20260212-2243订单：

**Samsung Galaxy A53计算：**
- 进货价：€70
- 批发价：€95
- 数量：2
- 差价：(€95 - €70) × 2 = €50
- 税额：€50 × (23/123) = €9.35 ✅

**订单总税额：**
- Samsung Galaxy A53：€9.35
- Car Holder Air-Condition：€5.61
- Car Holder Windows：€6.08
- Car Holder Dash：€5.61
- iPhone Clear Case (5个)：€5.61
- **总计**：€32.26 ✅

## 两种视角对比

| 视角 | 位置 | Samsung A53税额 | 订单总税额 | 说明 |
|------|------|----------------|-----------|------|
| 买方 | 商户采购订单PDF | €0.00 | €22.91 | 采购时不计税 |
| 卖方 | 仓库Financial Reports | €9.35 | €32.26 | 对差价征税 |

## 完整的Margin VAT流程

### 1. 仓库从供应商采购
- 进货价：€70
- 税额：€0（买方视角）

### 2. 仓库批发给商户
- **商户采购订单PDF**：
  - 批发价：€95
  - 税额：€0（买方视角）✅
  
- **仓库Financial Reports**：
  - 批发价：€95
  - 进货价：€70
  - 差价：€25
  - 税额：€4.67（卖方视角）✅

### 3. 商户销售给最终客户
- 售价：€199
- 成本：€95
- 差价：€104
- 税额：€19.41（卖方视角）

## 相关文件

- `StockControl-main/app.js` (第5575-5630行 - Financial Reports API)
- `StockControl-main/public/prototype-working.html` (仓库管理员Financial Reports)

## 状态

✅ **已完成** - 2026-02-12
- 修改了Financial Reports API，对Margin VAT产品重新计算税额
- 仓库订单中存储的taxAmount保持为0（买方视角）
- Financial Reports显示重新计算的税额（卖方视角）
- 服务器已重启（进程48）

## 关键逻辑总结

**Margin VAT产品的税额：**
- 📄 **订单中存储**：taxAmount = 0（买方视角）
- 📊 **Financial Reports**：重新计算taxAmount = 差价 × 23/123（卖方视角）
- 这样可以满足不同角色的需求，同时保持数据一致性
