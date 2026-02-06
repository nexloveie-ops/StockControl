# 修复：调货申请支持多条库存记录

## 问题描述
提交调货申请时，如果配件产品有多条库存记录（每条 quantity: 1），即使总库存足够（如 3 件），也会报错"库存不足"。

**示例**：
- 产品：Phone Case, iPhone 13 - Clear
- 数据库记录：
  ```
  { _id: 'xxx1', quantity: 1 }
  { _id: 'xxx2', quantity: 1 }
  { _id: 'xxx3', quantity: 1 }
  ```
- 总库存：3 件
- 请求数量：2 件
- 错误：`iPhone Clear Case 库存不足`

## 根本原因

### 前端传递
前端只传递第一条记录的 `inventoryId`：
```javascript
{
  inventoryId: 'xxx1',  // 第一条记录
  quantity: 2           // 请求 2 件
}
```

### 后端验证
后端只检查单条记录：
```javascript
const inventory = await MerchantInventory.findById(item.inventoryId);

if (inventory.quantity < item.quantity) {  // 1 < 2 ❌
  return res.status(400).json({
    success: false,
    error: `${inventory.productName} 库存不足`
  });
}
```

## 解决方案

### 修改后端逻辑
**文件**：`StockControl-main/app.js`
**位置**：约第 6935-6980 行（`/api/merchant/inventory/transfer/request`）

**修改内容**：
1. 检查单条记录是否足够
2. 如果不足，查找同产品的其他可用库存
3. 从多条记录中分配数量（先进先出）
4. 为每条使用的库存创建独立的调货项目

**修改后的逻辑**：
```javascript
// 对于配件，如果单条记录数量不足，查找同产品的其他记录
let remainingQty = item.quantity;
const inventoriesToUse = [];

if (inventory.quantity >= item.quantity) {
  // 单条记录足够
  inventoriesToUse.push({
    inventory: inventory,
    quantity: item.quantity
  });
} else {
  // 需要从多条记录中扣减
  // 查找相同产品的所有可用库存
  const sameProductInventories = await MerchantInventory.find({
    merchantId: fromMerchantId,
    productName: inventory.productName,
    brand: inventory.brand,
    model: inventory.model,
    color: inventory.color,
    status: 'active',
    isActive: true,
    quantity: { $gt: 0 }
  }).sort({ createdAt: 1 }); // 先进先出
  
  // 计算总可用数量
  const totalAvailable = sameProductInventories.reduce((sum, inv) => sum + inv.quantity, 0);
  
  if (totalAvailable < item.quantity) {
    return res.status(400).json({
      success: false,
      error: `${inventory.productName} 库存不足。需要: ${item.quantity}, 可用: ${totalAvailable}`
    });
  }
  
  // 从多条记录中分配数量
  for (const inv of sameProductInventories) {
    if (remainingQty <= 0) break;
    
    const qtyToUse = Math.min(inv.quantity, remainingQty);
    inventoriesToUse.push({
      inventory: inv,
      quantity: qtyToUse
    });
    remainingQty -= qtyToUse;
  }
}

// 为每个使用的库存记录创建调货项目
for (const { inventory: inv, quantity: qty } of inventoriesToUse) {
  transferItems.push({
    inventoryId: inv._id,
    productName: inv.productName,
    // ... 其他字段
    quantity: qty,
    transferPrice: transferPrice
  });
  
  totalAmount += qty * transferPrice;
}
```

## 工作流程

### 示例：请求 2 件（总库存 3 件）

**步骤 1：前端请求**
```javascript
{
  inventoryId: 'xxx1',
  quantity: 2
}
```

**步骤 2：后端查找库存**
```javascript
// 第一条记录
inventory = { _id: 'xxx1', quantity: 1 }

// 发现不足，查找同产品的其他记录
sameProductInventories = [
  { _id: 'xxx1', quantity: 1 },
  { _id: 'xxx2', quantity: 1 },
  { _id: 'xxx3', quantity: 1 }
]

// 总可用：3 件 ✅
```

**步骤 3：分配数量**
```javascript
// 从第一条记录取 1 件
inventoriesToUse.push({ inventory: xxx1, quantity: 1 })
remainingQty = 2 - 1 = 1

// 从第二条记录取 1 件
inventoriesToUse.push({ inventory: xxx2, quantity: 1 })
remainingQty = 1 - 1 = 0
```

**步骤 4：创建调货项目**
```javascript
transferItems = [
  { inventoryId: 'xxx1', quantity: 1, transferPrice: 10 },
  { inventoryId: 'xxx2', quantity: 1, transferPrice: 10 }
]

totalAmount = 1 * 10 + 1 * 10 = 20
```

**步骤 5：审批和完成**
- 审批时：不扣减库存，只改变状态
- 完成时：分别从 xxx1 和 xxx2 扣减 1 件

## 优势

### 1. 先进先出（FIFO）
```javascript
.sort({ createdAt: 1 })
```
优先使用最早入库的产品，符合库存管理最佳实践。

### 2. 精确库存控制
每条调货项目对应一条库存记录，扣减时不会出错。

### 3. 完整的审计追踪
可以追踪每件产品的来源和去向。

### 4. 兼容现有逻辑
- 单条记录足够时，行为不变
- 多条记录时，自动拆分
- 完成调货的逻辑无需修改

## 测试步骤

### 1. 准备测试数据
确保有一个配件产品有多条库存记录：
```javascript
// 在 MurrayDundrum 的库存中
Phone Case, iPhone 13 - Clear
- 记录1: quantity: 1
- 记录2: quantity: 1
- 记录3: quantity: 1
总计: 3 件
```

### 2. 重启服务器
```bash
# 停止旧进程
# 启动新进程
node app.js
```

### 3. 测试调货申请
1. 登录 MurrayRanelagh 账号
2. 进入"群组库存"
3. 选择店铺：MurrayDundrum
4. 找到 Phone Case, iPhone 13 - Clear
5. 选择变体，输入数量：2
6. 添加到购物车
7. 点击"提交调货申请"
8. ✅ 应该成功创建调货申请

### 4. 验证调货记录
1. 登录 MurrayDundrum 账号
2. 进入"调货管理" → "待审批"
3. 查看刚才的调货申请
4. ✅ 应该显示 2 个产品项目（每个 quantity: 1）

### 5. 测试审批和完成
1. MurrayDundrum 审批通过
2. MurrayRanelagh 确认收货
3. ✅ 应该成功完成
4. 验证库存：
   - MurrayDundrum：剩余 1 件
   - MurrayRanelagh：新增 2 件（可能合并为 1 条记录）

### 6. 测试库存不足
1. 再次尝试调货 3 件（但只剩 1 件）
2. ✅ 应该提示：`库存不足。需要: 3, 可用: 1`

## 注意事项

### 1. 调货项目数量增加
如果请求 10 件，但每条记录只有 1 件，会创建 10 个调货项目。这是正常的，因为每个项目对应一条库存记录。

### 2. 价格一致性
所有拆分的项目使用相同的 `transferPrice`（基于第一条记录）。

### 3. 性能考虑
查询同产品的所有库存记录可能影响性能。如果库存记录很多，可以考虑：
- 添加索引：`{ merchantId: 1, productName: 1, status: 1 }`
- 限制查询数量：`.limit(100)`

### 4. 调入方库存
完成调货后，调入方可能会收到多条库存记录（每条对应一个调货项目）。这是正常的，也可以在后续优化时合并相同产品的记录。

## 相关文件
- `StockControl-main/app.js` (调货申请 API)
- `StockControl-main/models/InventoryTransfer.js` (调货模型)
- `StockControl-main/models/MerchantInventory.js` (库存模型)

## 完成时间
2026年2月6日
