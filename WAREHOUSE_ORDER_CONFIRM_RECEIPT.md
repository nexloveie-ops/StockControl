# 仓库订单确认收货功能 ✅

## 日期: 2026-02-02

## 问题
之前的逻辑是仓库点击发货就立即入库到商户库存，这是不对的。应该等商户确认收货后才入库。

## 正确的流程

### 旧流程（错误）❌
```
1. 商户下单 → pending
2. 仓库确认订单 → confirmed
3. 仓库发货 → shipped (立即创建商户库存) ❌
4. 完成订单 → completed (只更新状态)
```

### 新流程（正确）✅
```
1. 商户下单 → pending (扣减仓库库存预留)
2. 仓库确认订单 → confirmed
3. 仓库发货 → shipped (只标记发货，不转移库存)
4. 商户确认收货 → completed (此时才创建商户库存) ✅
```

## 实现的更改

### 1. 后端 API 修改 (app.js)

#### `/api/warehouse/orders/:id/ship` - 发货 API
**旧逻辑**: 发货时立即创建商户库存
**新逻辑**: 只更新订单状态为 `shipped`，保存发货信息到 `shipmentDetails`

```javascript
// 只标记发货，不转移库存
order.shipmentDetails = shipmentItems; // 保存发货信息
order.status = 'shipped';
order.shippedAt = new Date();
order.shippedBy = req.body.shippedBy || 'warehouse';
await order.save();
```

#### `/api/warehouse/orders/:id/complete` - 确认收货 API
**旧逻辑**: 只更新订单状态
**新逻辑**: 
- 验证商户身份（只有订单的商户可以确认收货）
- 从 `shipmentDetails` 读取发货信息
- 创建商户库存记录
- 更新仓库产品状态（标记序列号为已售出，扣减配件库存）
- 更新订单状态为 `completed`

```javascript
// 验证商户身份
if (order.merchantId !== req.currentUsername) {
  return res.status(403).json({ success: false, error: '无权操作此订单' });
}

// 处理库存转移（设备和配件）
// ... 创建商户库存 ...

// 更新订单状态
order.status = 'completed';
order.completedAt = new Date();
order.completedBy = req.currentUsername;
```

### 2. 数据模型修改 (WarehouseOrder.js)

添加 `shipmentDetails` 字段来保存发货信息：

```javascript
// 发货详情（保存发货时选择的序列号等信息）
shipmentDetails: {
  type: Array,
  default: []
}
```

### 3. 前端修改 (merchant.html)

#### 订单列表显示
为 `shipped` 状态的订单添加"确认收货"按钮：

```html
${order.status === 'shipped' ? `
  <button onclick="confirmReceiveOrder('${order._id}')" 
          style="padding: 8px 16px; background: #10b981; color: white; 
                 border: none; border-radius: 6px; cursor: pointer; 
                 font-weight: 600; margin-left: 10px;">
    ✅ 确认收货
  </button>
` : ''}
```

#### 订单详情页面
添加确认收货提示和按钮：

```html
${order.status === 'shipped' ? `
  <div style="margin-top: 20px; padding: 15px; background: #fef3c7; 
              border-radius: 8px; border-left: 4px solid #f59e0b;">
    <p style="color: #92400e; margin-bottom: 10px;">
      <strong>⚠️ 请确认收货</strong><br>
      订单已发货，请确认收到货物后点击下方按钮。
      确认收货后，产品将自动入库到您的库存中。
    </p>
    <button onclick="confirmReceiveOrder('${order._id}')" 
            style="padding: 10px 20px; background: #10b981; color: white; 
                   border: none; border-radius: 6px; cursor: pointer; 
                   font-weight: 600; font-size: 16px;">
      ✅ 确认收货
    </button>
  </div>
` : ''}
```

#### 确认收货函数
```javascript
async function confirmReceiveOrder(orderId) {
  if (!confirm('确认已收到货物？确认后产品将自动入库到您的库存中。')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/warehouse/orders/${orderId}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('✅ 收货确认成功！产品已入库到您的库存中。');
      closeWarehouseOrderDetailModal();
      loadMyWarehouseOrders(); // 刷新订单列表
      loadMyInventory(); // 刷新库存列表
    } else {
      alert('❌ 确认收货失败: ' + result.error);
    }
  } catch (error) {
    console.error('确认收货失败:', error);
    alert('❌ 确认收货失败: ' + error.message);
  }
}
```

## 库存转移时机

### 仓库库存扣减
- **时机**: 商户下单时 (`POST /api/warehouse/orders`)
- **原因**: 预留库存，防止超卖
- **操作**: 
  - 设备: 不扣减 `quantity`，只是标记序列号为预留状态（如果需要）
  - 配件: 扣减 `quantity`

### 商户库存增加
- **时机**: 商户确认收货时 (`PUT /api/warehouse/orders/:id/complete`)
- **原因**: 确保货物已收到
- **操作**:
  - 设备: 创建商户库存记录，标记序列号为已售出
  - 配件: 创建商户库存记录

## 安全性

### 权限验证
- 只有订单的商户可以确认收货
- 使用 `applyDataIsolation` 中间件验证身份
- 检查 `order.merchantId === req.currentUsername`

### 状态验证
- 只有 `shipped` 状态的订单可以确认收货
- 防止重复确认收货

## 用户体验

### 视觉提示
- 已发货订单显示黄色警告框
- 明确提示"请确认收货"
- 确认收货按钮使用绿色，易于识别

### 操作流程
1. 商户在"我的订单"中看到已发货的订单
2. 点击"查看详情"或直接点击"确认收货"
3. 系统弹出确认对话框
4. 确认后，产品自动入库
5. 订单状态变为"已完成"
6. 自动刷新订单列表和库存列表

## 测试步骤

### 1. 测试发货（仓管员）
```
1. 登录 warehouse_manager
2. 进入"仓库订单管理"
3. 确认一个订单
4. 选择产品序列号/数量
5. 点击"发货"
6. 验证: 订单状态变为"已发货"
7. 验证: 商户库存中还没有这些产品
```

### 2. 测试确认收货（商户）
```
1. 登录商户账号 (如 ham)
2. 进入"仓库订货" → "我的订单"
3. 找到"已发货"状态的订单
4. 点击"确认收货"按钮
5. 确认对话框
6. 验证: 订单状态变为"已完成"
7. 验证: 产品已入库到"我的库存"
8. 验证: 仓库产品序列号状态已更新
```

### 3. 测试权限
```
1. 尝试用其他商户账号确认收货
2. 应该返回 403 错误
3. 验证: 只有订单的商户可以确认收货
```

## 数据库状态

### 现有订单处理
数据库中现有的 3 个订单都是 `shipped` 状态，需要商户确认收货：
- WO-20260202-1061 (已手动标记为 completed 用于测试)
- WO-20260202-7228 (需要商户确认收货)
- WO-20260202-9112 (需要商户确认收货)

**注意**: 这些旧订单可能没有 `shipmentDetails`，需要特殊处理或重新发货。

## 相关文件
- `StockControl-main/app.js` - 后端 API
- `StockControl-main/models/WarehouseOrder.js` - 数据模型
- `StockControl-main/public/merchant.html` - 商户前端
- `StockControl-main/public/prototype-working.html` - 仓管员前端

## 服务器状态
- ✅ 服务器运行中 (Process ID: 47)
- ✅ 地址: http://localhost:3000
- ✅ 数据库连接正常

## 下一步
建议测试完整流程：
1. 创建新订单
2. 仓库确认并发货
3. 商户确认收货
4. 验证库存转移正确
