# 修复调货申请API调用

## 日期
2026-02-11

## 问题
提交调货申请时报错：
```
Failed to load resource: the server responded with a status of 404 (Not Found)
提交调货申请失败: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## 原因分析

### 1. API路径错误
**前端使用的路径**：
```javascript
fetch(`${API_BASE}/merchant/inventory/transfer`, {
  method: 'POST',
  // ...
});
```

**后端实际路径**：
```javascript
app.post('/api/merchant/inventory/transfer/request', async (req, res) => {
  // ...
});
```

路径不匹配导致404错误。

### 2. 数据格式不匹配

**前端发送的数据**：
```javascript
{
  fromMerchant: merchantId,
  toMerchant: selectedTransferStore.username,
  items: [
    {
      productName: 'iPhone 13',
      brand: 'Apple',
      model: '128GB',
      // ... 产品信息
      // ❌ 缺少 inventoryId
    }
  ],
  totalAmount: 1000,
  notes: ''
}
```

**后端期望的数据**：
```javascript
{
  fromMerchantId: string,  // ✅ 字段名不同
  toMerchantId: string,    // ✅ 字段名不同
  items: [
    {
      inventoryId: string,  // ✅ 需要库存ID
      quantity: number
    }
  ],
  notes: string
}
```

### 3. 调货方向理解错误

**错误理解**：
- fromMerchant: 当前用户（调出方）
- toMerchant: 目标店铺（调入方）

**正确理解**：
- fromMerchantId: 目标店铺（调出方，拥有库存的一方）
- toMerchantId: 当前用户（调入方，请求调货的一方）

在群组库存场景中：
- 当前用户浏览其他店铺的库存
- 当前用户请求从其他店铺调货
- 所以：fromMerchantId = 其他店铺，toMerchantId = 当前用户

## 解决方案

### 1. 修正API路径
```javascript
// 修改前
fetch(`${API_BASE}/merchant/inventory/transfer`, {

// 修改后
fetch(`${API_BASE}/merchant/inventory/transfer/request`, {
```

### 2. 修正数据格式
```javascript
// 准备调货数据 - 使用后端期望的格式
const transferItems = [];

// 为每个购物车项分配库存记录
for (const cartItem of transferCart) {
  let remainingQty = cartItem.quantity;
  
  // 从 availableItems 中分配库存
  if (cartItem.availableItems && cartItem.availableItems.length > 0) {
    for (const invItem of cartItem.availableItems) {
      if (remainingQty <= 0) break;
      
      const qtyToUse = Math.min(remainingQty, invItem.quantity);
      transferItems.push({
        inventoryId: invItem._id,
        quantity: qtyToUse
      });
      
      remainingQty -= qtyToUse;
    }
  }
  
  if (remainingQty > 0) {
    alert(`库存不足：${cartItem.productName} 还需要 ${remainingQty} 件`);
    return;
  }
}

const transferData = {
  fromMerchantId: selectedTransferStore.username,  // 调出方（目标店铺）
  toMerchantId: merchantId,  // 调入方（当前用户）
  items: transferItems,
  notes: ''
};
```

### 3. 修正调货方向
```javascript
// 修改前（错误）
fromMerchant: merchantId,  // 当前用户
toMerchant: selectedTransferStore.username,  // 目标店铺

// 修改后（正确）
fromMerchantId: selectedTransferStore.username,  // 目标店铺（拥有库存）
toMerchantId: merchantId,  // 当前用户（请求调货）
```

## 库存分配逻辑

### 场景说明
用户在购物车中添加：
- iPhone 13 - 128GB - Blue × 3

但目标店铺的库存可能分散在多条记录中：
- 记录1：iPhone 13 - 128GB - Blue × 2
- 记录2：iPhone 13 - 128GB - Blue × 1

### 分配算法
```javascript
for (const cartItem of transferCart) {
  let remainingQty = cartItem.quantity;  // 需要3件
  
  for (const invItem of cartItem.availableItems) {
    if (remainingQty <= 0) break;
    
    const qtyToUse = Math.min(remainingQty, invItem.quantity);
    // 第一次循环：qtyToUse = min(3, 2) = 2
    // 第二次循环：qtyToUse = min(1, 1) = 1
    
    transferItems.push({
      inventoryId: invItem._id,
      quantity: qtyToUse
    });
    
    remainingQty -= qtyToUse;
    // 第一次循环后：remainingQty = 3 - 2 = 1
    // 第二次循环后：remainingQty = 1 - 1 = 0
  }
}
```

### 结果
提交给后端的数据：
```javascript
{
  fromMerchantId: 'MurrayDundrum',
  toMerchantId: 'MurrayRanelagh',
  items: [
    { inventoryId: 'record1_id', quantity: 2 },
    { inventoryId: 'record2_id', quantity: 1 }
  ],
  notes: ''
}
```

## 后端处理流程

### 1. 验证参数
```javascript
if (!fromMerchantId || !toMerchantId || !items || items.length === 0) {
  return res.status(400).json({
    success: false,
    error: '缺少必要参数'
  });
}
```

### 2. 判断交易类型
```javascript
// 基于公司信息判断
if (fromCompany && toCompany && fromCompany === toCompany) {
  transferType = 'INTERNAL_TRANSFER';  // 内部调拨
  priceType = 'cost';  // 使用成本价
} else {
  transferType = 'INTER_COMPANY_SALE';  // 公司间销售
  priceType = 'wholesale';  // 使用批发价
}
```

### 3. 验证库存
```javascript
for (const item of items) {
  const inventory = await MerchantInventory.findById(item.inventoryId);
  
  if (!inventory) {
    return res.status(404).json({
      success: false,
      error: `库存记录不存在: ${item.inventoryId}`
    });
  }
  
  if (inventory.merchantId !== fromMerchantId) {
    return res.status(403).json({
      success: false,
      error: '无权调货此产品'
    });
  }
  
  // 检查数量是否足够
  // ...
}
```

### 4. 创建调货记录
```javascript
const transfer = await InventoryTransfer.create({
  transferNumber: `TR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  fromMerchant: fromMerchantId,
  toMerchant: toMerchantId,
  transferType: transferType,
  items: transferItems,
  totalAmount: totalAmount,
  status: 'pending',
  notes: notes
});
```

## 数据流程图

```
用户操作流程：
1. MurrayRanelagh 登录
2. 进入"群组库存"
3. 选择 MurrayDundrum 店铺
4. 浏览 MurrayDundrum 的库存
5. 添加产品到购物车：iPhone 13 × 3
6. 提交调货申请

数据流向：
MurrayRanelagh (调入方)
    ↓ 发起请求
    ↓ fromMerchantId: MurrayDundrum
    ↓ toMerchantId: MurrayRanelagh
    ↓ items: [{ inventoryId: xxx, quantity: 3 }]
    ↓
后端API (/api/merchant/inventory/transfer/request)
    ↓ 验证库存
    ↓ 判断交易类型
    ↓ 创建调货记录
    ↓
MurrayDundrum (调出方)
    ↓ 收到待审批通知
    ↓ 审批通过/拒绝
```

## 测试步骤

### 1. 准备测试数据
确保 MurrayDundrum 有可用库存：
- Samsung Galaxy S22 × 2
- iPhone 13 × 1

### 2. 测试调货申请
1. 登录 MurrayRanelagh
2. 进入"群组库存"
3. 选择 MurrayDundrum
4. 添加产品到购物车
5. 点击"提交调货申请"
6. 打开浏览器控制台（F12）
7. 查看 Network 标签
8. 确认请求发送到正确的URL
9. 查看请求数据格式
10. 查看响应结果

### 3. 预期结果
- ✅ 请求URL: `/api/merchant/inventory/transfer/request`
- ✅ 请求方法: POST
- ✅ 请求数据包含: fromMerchantId, toMerchantId, items
- ✅ items 包含: inventoryId, quantity
- ✅ 响应成功: { success: true, data: { transferNumber: 'TR-...' } }
- ✅ 显示成功消息
- ✅ 购物车清空
- ✅ 返回店铺选择

### 4. 验证调货记录
1. 登录 MurrayDundrum
2. 进入"调货管理" → "待审批"
3. 查看新创建的调货申请
4. 确认产品和数量正确

## 常见错误

### 错误1：404 Not Found
**原因**：API路径错误
**解决**：使用 `/api/merchant/inventory/transfer/request`

### 错误2：缺少必要参数
**原因**：字段名错误或缺少 inventoryId
**解决**：使用正确的字段名和数据格式

### 错误3：库存记录不存在
**原因**：inventoryId 无效或不存在
**解决**：确保 availableItems 包含有效的库存记录

### 错误4：无权调货此产品
**原因**：fromMerchantId 和 toMerchantId 方向错误
**解决**：fromMerchantId = 拥有库存的店铺

### 错误5：库存不足
**原因**：请求的数量超过可用库存
**解决**：在前端验证库存数量

## 文件修改

### StockControl-main/public/merchant.html
- 修改 `submitTransferRequest()` 函数
- 修正API路径：`/merchant/inventory/transfer/request`
- 修正数据格式：使用 inventoryId
- 修正调货方向：fromMerchantId = 目标店铺
- 添加库存分配逻辑

## 相关文档
- `FIX_GROUP_INVENTORY_TRANSFER_CART.md` - 功能改进说明
- `GROUP_INVENTORY_CART_COMPLETE.md` - 完成总结
- `QUICK_TEST_GROUP_INVENTORY_CART.md` - 测试指南

## 状态
✅ 已修复

## 下一步
1. 清除浏览器缓存
2. 强制刷新页面（Ctrl + Shift + R）
3. 测试调货申请功能
4. 验证数据格式正确
5. 确认调货记录创建成功
