# 修复确认收货认证问题

## 日期: 2026-02-02

## 问题
点击"确认收货"按钮时报错：
```
确认收货失败: 用户未登录
PUT http://localhost:3000/api/warehouse/orders/xxx/complete 401 (Unauthorized)
```

## 原因分析

### 认证机制
merchant.html 使用 localStorage 存储用户信息，不使用 session：
```javascript
const merchantId = localStorage.getItem('username');
```

### 后端验证
`applyDataIsolation` 中间件尝试从多个来源获取用户名：
```javascript
const username = req.session?.username ||      // session (不存在)
                 req.user?.username ||          // passport (不存在)
                 req.query.merchantId ||        // URL 参数 ✅
                 req.body.merchantId;           // 请求体 ✅
```

### 问题
原来的请求没有传递 `merchantId`：
```javascript
// ❌ 错误的请求
fetch(`${API_BASE}/warehouse/orders/${orderId}/complete`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' }
});
```

## 解决方案

在请求中添加 `merchantId` 参数（URL 参数和请求体都添加）：

```javascript
// ✅ 正确的请求
fetch(`${API_BASE}/warehouse/orders/${orderId}/complete?merchantId=${merchantId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ merchantId: merchantId })
});
```

## 修改的文件

### merchant.html
修改 `confirmReceiveOrder()` 函数：

```javascript
async function confirmReceiveOrder(orderId) {
  if (!confirm('确认已收到货物？确认后产品将自动入库到您的库存中。')) {
    return;
  }
  
  try {
    // 添加 merchantId 到 URL 参数和请求体
    const response = await fetch(`${API_BASE}/warehouse/orders/${orderId}/complete?merchantId=${merchantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId: merchantId })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('✅ 收货确认成功！产品已入库到您的库存中。');
      closeWarehouseOrderDetailModal();
      loadMyWarehouseOrders();
      loadMyInventory();
    } else {
      alert('❌ 确认收货失败: ' + result.error);
    }
  } catch (error) {
    console.error('确认收货失败:', error);
    alert('❌ 确认收货失败: ' + error.message);
  }
}
```

## 其他 API 调用

merchant.html 中的其他 API 调用也使用相同的模式：

### 示例 1: 创建仓库订单
```javascript
const response = await fetch(`${API_BASE}/warehouse/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData) // orderData 中不包含 merchantId
});
```

**问题**: 这个 API 也使用 `applyDataIsolation`，但为什么能工作？

**答案**: 因为创建订单的 API 从 localStorage 获取 merchantId 并添加到请求体中：
```javascript
const orderData = {
  items: warehouseCart.map(item => ({
    productId: item.productId,
    quantity: item.quantity
  })),
  deliveryMethod: deliveryMethod,
  deliveryAddress: deliveryAddress,
  pickupLocation: pickupLocation,
  notes: notes
};
```

但实际上，这个 API 在后端是这样获取 merchantId 的：
```javascript
const merchantId = req.currentUsername; // 从中间件设置
```

所以其他 API 可能也有同样的问题！

## 建议的改进

### 方案 1: 统一使用 URL 参数
为所有需要认证的 API 添加 `merchantId` URL 参数：
```javascript
fetch(`${API_BASE}/endpoint?merchantId=${merchantId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

### 方案 2: 使用 Session
修改登录 API，设置 session：
```javascript
// 登录成功后
req.session.username = user.username;
req.session.userId = user._id;
```

然后在前端使用 `credentials: 'include'`：
```javascript
fetch(url, {
  method: 'POST',
  credentials: 'include', // 发送 cookie
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

### 方案 3: 使用 JWT Token
在登录时返回 JWT token，然后在每个请求的 header 中发送：
```javascript
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
});
```

## 当前状态
- ✅ 确认收货功能已修复
- ✅ 添加了 merchantId 参数
- ✅ 服务器运行正常 (Process ID: 48)

## 测试步骤
1. 登录商户账号
2. 进入"仓库订货" → "我的订单"
3. 找到"已发货"状态的订单
4. 点击"✅ 确认收货"
5. 验证: 不再报 401 错误
6. 验证: 订单状态变为"已完成"
7. 验证: 产品已入库

## 相关文件
- `StockControl-main/public/merchant.html` - 前端修复
- `StockControl-main/middleware/dataIsolation.js` - 认证中间件
- `StockControl-main/app.js` - 后端 API
