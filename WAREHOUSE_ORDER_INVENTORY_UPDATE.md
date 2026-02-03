# 仓库订单库存更新机制

## 问题描述
用户反馈：订单提交后，仓库产品的数量应该需要相应的变化。

## 原有逻辑
之前的实现：
1. **订单创建**（pending）→ 不扣减库存
2. **订单确认**（confirmed）→ 不扣减库存
3. **订单发货**（shipped）→ 扣减仓库库存，创建商户库存

**问题**：商户提交订单后，仓库产品数量不会立即变化，导致：
- 其他商户可能订购已被预留的产品
- 可用库存显示不准确
- 可能出现超卖情况

## 新的库存预留机制

### 1. 订单创建时预留库存
**文件**：`app.js` - `POST /api/warehouse/orders`

```javascript
// 创建订单并预留库存
const order = new WarehouseOrder({...});
await order.save();

// 预留库存：扣减仓库产品数量
for (const item of items) {
  const product = await ProductNew.findById(item.productId);
  if (product) {
    product.quantity -= item.quantity;
    await product.save();
  }
}
```

**效果**：
- ✅ 订单创建时立即扣减库存
- ✅ 其他商户看到的是扣减后的可用数量
- ✅ 避免超卖问题

### 2. 订单发货时创建商户库存
**文件**：`app.js` - `PUT /api/warehouse/orders/:id/ship`

```javascript
// 创建商户库存（库存已在订单创建时扣减）
for (const item of order.items) {
  const product = await ProductNew.findById(item.productId);
  
  // 创建商户库存记录
  for (let i = 0; i < item.quantity; i++) {
    const merchantInventory = new MerchantInventory({...});
    await merchantInventory.save();
  }
  
  // 记录库存转移
  const transfer = new InventoryTransfer({...});
  await transfer.save();
}
```

**变化**：
- ❌ 不再扣减仓库库存（已在订单创建时扣减）
- ✅ 只创建商户库存记录
- ✅ 记录库存转移历史

### 3. 订单取消时恢复库存
**文件**：`app.js` - `PUT /api/warehouse/orders/:id/cancel`

```javascript
// 恢复预留的库存
for (const item of order.items) {
  const product = await ProductNew.findById(item.productId);
  if (product) {
    product.quantity += item.quantity;
    await product.save();
  }
}
```

**新增功能**：
- ✅ 取消订单时恢复预留的库存
- ✅ 防止已发货订单被取消
- ✅ 库存数量保持准确

### 4. 前端刷新库存显示
**文件**：`public/merchant.html` - `confirmWarehouseOrderSubmit()`

```javascript
if (result.success) {
  alert(`订单创建成功！\n订单号: ${result.data.orderNumber}\n\n库存已预留，等待仓管员确认发货。`);
  warehouseCart = [];
  updateWarehouseCart();
  closeWarehouseOrderSubmitModal();
  
  // 刷新仓库产品列表以显示更新后的库存
  loadWarehouseProducts();
  
  // 切换到我的订单标签
  switchWarehouseTab('myOrders');
}
```

**改进**：
- ✅ 订单提交成功后刷新仓库产品列表
- ✅ 用户立即看到更新后的库存数量
- ✅ 提示用户库存已预留

## 业务流程

### 正常流程
```
1. 商户提交订单
   ├─ 创建订单（status: pending）
   ├─ 扣减仓库库存（预留）
   └─ 前端刷新显示更新后的库存

2. 仓管员确认订单
   ├─ 更新订单状态（status: confirmed）
   └─ 库存保持不变（已预留）

3. 仓管员发货
   ├─ 更新订单状态（status: shipped）
   ├─ 创建商户库存记录
   └─ 记录库存转移历史

4. 订单完成
   └─ 更新订单状态（status: completed）
```

### 取消流程
```
1. 取消未发货订单（pending/confirmed）
   ├─ 更新订单状态（status: cancelled）
   ├─ 恢复预留的库存
   └─ 记录取消原因

2. 已发货订单
   └─ 不允许取消
```

## 数据一致性保证

### 库存数量计算
- **仓库可用库存** = 实际库存 - 待处理订单预留数量
- **商户可见数量** = 仓库可用库存（已扣除预留）
- **订单预留数量** = 所有 pending/confirmed 状态订单的总数量

### 防止超卖
1. 订单创建时验证库存充足
2. 立即扣减库存（预留）
3. 其他商户看到的是扣减后的数量
4. 取消订单时恢复库存

### 异常处理
- 订单创建失败 → 不扣减库存
- 发货失败 → 库存已预留，可重试发货
- 取消订单 → 恢复预留的库存
- 系统错误 → 事务回滚（需要添加事务支持）

## 测试步骤

### 测试 1：订单创建后库存更新
1. 登录商户账号（MurrayRanelagh / 123456）
2. 进入"从仓库订货"
3. 记录某产品的当前库存数量（例如：5 件）
4. 添加该产品到购物车（例如：订购 2 件）
5. 提交订单
6. ✅ 确认提示"库存已预留"
7. ✅ 返回产品列表，确认库存变为 3 件

### 测试 2：取消订单后库存恢复
1. 登录仓管员账号（warehouse_manager / 123456）
2. 查看待处理订单
3. 取消某个订单
4. ✅ 确认提示"库存已恢复"
5. 登录商户账号查看仓库产品
6. ✅ 确认库存数量已恢复

### 测试 3：发货后商户库存创建
1. 仓管员确认订单
2. 仓管员标记发货
3. ✅ 确认订单状态变为"已发货"
4. 商户登录查看"我的库存"
5. ✅ 确认新增了从仓库订购的产品

### 测试 4：防止超卖
1. 商户 A 订购产品（库存 5 件，订购 3 件）
2. 商户 B 查看同一产品
3. ✅ 确认商户 B 看到的库存是 2 件（不是 5 件）
4. 商户 B 尝试订购 3 件
5. ✅ 确认提示"库存不足"

## 后续优化建议

### 1. 添加事务支持
使用 MongoDB 事务确保库存扣减和订单创建的原子性：
```javascript
const session = await mongoose.startSession();
session.startTransaction();
try {
  // 创建订单
  // 扣减库存
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
}
```

### 2. 添加库存预留超时
- 订单创建后 24 小时未确认 → 自动取消并恢复库存
- 避免长期占用库存

### 3. 添加库存变动日志
- 记录每次库存变动的原因
- 便于追踪和审计

### 4. 优化并发控制
- 使用乐观锁或悲观锁
- 防止并发订单导致的库存不一致

## 修改文件
- `StockControl-main/app.js` - 后端订单和库存逻辑
- `StockControl-main/public/merchant.html` - 前端订单提交和刷新

## 修改时间
2026-02-02
