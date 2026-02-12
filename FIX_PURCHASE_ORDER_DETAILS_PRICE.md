# 采购订单详情价格显示修复

## 修复时间
2026-02-12

## 问题描述
采购订单详情中，单价和总价都显示为€0.00，而且没有显示税额。

## 问题原因

### 1. 仓库订单字段名错误
- 代码尝试使用`item.costPrice`或`item.price`
- 但WarehouseOrder模型中使用的是`wholesalePrice`和`subtotal`字段
- 导致所有价格都显示为0

### 2. 税额计算错误
- 仓库订单在创建时已经计算了`totalAmount`和`taxAmount`
- 不应该重新计算，而是直接使用订单中的值

## WarehouseOrder数据结构

```javascript
{
  orderNumber: 'WO-20260212-2243',
  items: [
    {
      productName: 'Samsung Galaxy A53',
      quantity: 2,
      wholesalePrice: 250,      // ✅ 单价字段
      subtotal: 500,            // ✅ 小计字段
      taxClassification: 'MARGIN_VAT_0',
      taxAmount: 0
    }
  ],
  totalAmount: 500,             // ✅ 订单总金额
  taxAmount: 0,                 // ✅ 订单税额
  subtotal: 500
}
```

## 修复方案

### 修改文件: merchant.html (第7790-7860行)

#### 修复1: 使用订单的总金额和税额

**修复前:**
```javascript
} else if (orderType === 'warehouse') {
  items = orderDetails.items || [];
  supplier = '仓库';
  orderDate = new Date(orderDetails.orderDate || orderDetails.createdAt).toLocaleDateString('zh-CN');
  
  items.forEach(item => {
    const itemTotal = (item.costPrice || item.price || 0) * item.quantity;  // ❌ 字段不存在
    totalAmount += itemTotal;
    
    if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
      taxAmount += itemTotal - (itemTotal / 1.23);
    } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
      taxAmount += itemTotal - (itemTotal / 1.135);
    }
  });
}
```

**修复后:**
```javascript
} else if (orderType === 'warehouse') {
  items = orderDetails.items || [];
  supplier = '仓库';
  orderDate = new Date(orderDetails.orderDate || orderDetails.createdAt).toLocaleDateString('zh-CN');
  
  // 使用订单中已经计算好的总金额和税额
  totalAmount = orderDetails.totalAmount || 0;  // ✅ 直接使用
  taxAmount = orderDetails.taxAmount || 0;      // ✅ 直接使用
}
```

#### 修复2: 使用正确的价格字段

**修复前:**
```javascript
${items.map(item => {
  const unitPrice = orderType === 'transfer' ? 
    (item.transferPrice || item.costPrice || 0) : 
    (item.costPrice || item.price || 0);  // ❌ 仓库订单字段错误
  const itemTotal = unitPrice * item.quantity;
  
  return `...`;
}).join('')}
```

**修复后:**
```javascript
${items.map(item => {
  let unitPrice = 0;
  let itemTotal = 0;
  
  if (orderType === 'transfer') {
    unitPrice = item.transferPrice || item.costPrice || 0;
    itemTotal = unitPrice * item.quantity;
  } else if (orderType === 'warehouse') {
    // 仓库订单使用wholesalePrice和subtotal
    unitPrice = item.wholesalePrice || 0;        // ✅ 正确字段
    itemTotal = item.subtotal || (unitPrice * item.quantity);  // ✅ 正确字段
  } else {
    // 发票订单
    unitPrice = item.costPrice || 0;
    itemTotal = unitPrice * item.quantity;
  }
  
  return `...`;
}).join('')}
```

## 修复说明

### 1. 仓库订单总金额和税额
- 直接使用`orderDetails.totalAmount`和`orderDetails.taxAmount`
- 这些值在订单创建时已经正确计算
- 避免重复计算和字段名错误

### 2. 产品单价和小计
- 仓库订单使用`item.wholesalePrice`作为单价
- 使用`item.subtotal`作为小计（如果存在）
- 如果subtotal不存在，则计算：`wholesalePrice × quantity`

### 3. 不同订单类型的字段映射

| 订单类型 | 单价字段 | 小计计算 | 总金额来源 | 税额来源 |
|---------|---------|---------|-----------|---------|
| 调货 (transfer) | transferPrice / costPrice | 单价 × 数量 | 累加计算 | 累加计算 |
| 仓库 (warehouse) | wholesalePrice | subtotal | order.totalAmount | order.taxAmount |
| 发票 (invoice) | costPrice | 单价 × 数量 | 累加计算 | 累加计算 |

## 测试结果

修复后，采购订单详情应该正确显示：
- ✅ 产品单价（从wholesalePrice）
- ✅ 产品小计（从subtotal）
- ✅ 订单总金额（从order.totalAmount）
- ✅ 订单税额（从order.taxAmount）

## 测试步骤

1. 登录商户系统
2. 进入"报表中心" → "采购报表"
3. 点击仓库订单号（例如：WO-20260212-2243）
4. 验证详情显示：
   - 每个产品的单价正确
   - 每个产品的小计正确
   - 订单总金额正确
   - 税额正确显示

## 相关文件
- `StockControl-main/public/merchant.html` (第7790-7860行)
- `StockControl-main/models/WarehouseOrder.js`

## 注意事项
- HTML文件修改后需要强制刷新浏览器（Ctrl + Shift + R）
- 不同订单类型使用不同的字段名
- 仓库订单的金额和税额已经在订单创建时计算好
