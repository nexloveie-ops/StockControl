# 采购报表计算修复

## 修复时间
2026-02-12

## 问题描述
采购报表中显示的总金额和税额错误，供货商显示为"仓库"而不是仓库的公司名称。

## 问题原因

### 1. 仓库订单金额计算错误
- 代码尝试使用`item.costPrice`或`item.price`字段
- 但WarehouseOrder模型中使用的是`wholesalePrice`和`subtotal`字段
- 导致所有仓库订单的金额都显示为€0.00

### 2. 供货商名称显示错误
- 仓库订单的供货商硬编码为"仓库"
- 应该显示仓库的公司名称（从CompanyInfo表获取）

## 修复方案

### 修改文件: app.js (第7780-7810行)

#### 修复前:
```javascript
warehouseOrders.forEach(order => {
  // 计算订单总金额和税额
  let totalAmount = 0;
  let taxAmount = 0;
  
  order.items.forEach(item => {
    const itemTotal = (item.costPrice || item.price || 0) * item.quantity;
    totalAmount += itemTotal;
    
    // 根据税分类计算税额
    if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
      taxAmount += itemTotal - (itemTotal / 1.23);
    } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
      taxAmount += itemTotal - (itemTotal / 1.135);
    }
  });
  
  orders.push({
    orderNumber: order.orderNumber,
    date: order.orderDate || order.createdAt,
    totalAmount: totalAmount,
    taxAmount: taxAmount,
    supplier: '仓库',  // ❌ 硬编码
    type: 'warehouse',
    itemCount: order.items.length,
    _id: order._id
  });
});
```

#### 修复后:
```javascript
// 获取仓库公司信息
const CompanyInfo = require('./models/CompanyInfo');
const warehouseCompany = await CompanyInfo.findOne({ isDefault: true }).lean();
const warehouseSupplierName = warehouseCompany ? warehouseCompany.companyName : '仓库';

warehouseOrders.forEach(order => {
  // 使用订单中已经计算好的总金额和税额
  const totalAmount = order.totalAmount || 0;
  const taxAmount = order.taxAmount || 0;
  
  orders.push({
    orderNumber: order.orderNumber,
    date: order.orderDate || order.createdAt,
    totalAmount: totalAmount,  // ✅ 使用订单的totalAmount
    taxAmount: taxAmount,      // ✅ 使用订单的taxAmount
    supplier: warehouseSupplierName,  // ✅ 使用公司名称
    type: 'warehouse',
    itemCount: order.items.length,
    _id: order._id
  });
});
```

## 修复说明

### 1. 使用订单已计算的金额
- WarehouseOrder在创建时已经计算了`totalAmount`和`taxAmount`
- 直接使用这些字段，而不是重新计算
- 避免了字段名不匹配的问题

### 2. 获取仓库公司名称
- 从CompanyInfo表查询默认公司信息
- 使用`companyName`字段作为供货商名称
- 如果查询失败，回退到"仓库"

## WarehouseOrder数据结构

```javascript
{
  orderNumber: 'WO-20260212-2243',
  merchantId: 'MurrayRanelagh',
  items: [
    {
      productName: 'Samsung Galaxy A53',
      quantity: 2,
      wholesalePrice: 250,      // ✅ 正确字段
      subtotal: 500,            // ✅ 正确字段
      taxClassification: 'MARGIN_VAT_0',
      taxAmount: 0
    }
  ],
  totalAmount: 500,             // ✅ 订单总金额
  taxAmount: 0,                 // ✅ 订单税额
  subtotal: 500,
  status: 'completed'
}
```

## 测试结果

修复后，采购报表应该正确显示：
- ✅ 仓库订单的总金额（从order.totalAmount）
- ✅ 仓库订单的税额（从order.taxAmount）
- ✅ 供货商显示为公司名称（例如："Celestia Trade Partners Limited (668302)"）

## 服务器状态
- 服务器已重启（进程39）
- 修复已生效
- 请强制刷新浏览器（Ctrl + Shift + R）查看修复结果

## 相关文件
- `StockControl-main/app.js` (第7780-7810行)
- `StockControl-main/models/WarehouseOrder.js`
- `StockControl-main/models/CompanyInfo.js`
