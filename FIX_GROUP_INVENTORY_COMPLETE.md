# 群组库存功能修复完成

## 问题总结
MurrayDundrum 用户在"群组库存"页面看不到群组内其他商户（MurrayRanelagh）的库存。

## 根本原因
库存记录创建时没有正确设置 `storeGroup` 字段，导致群组库存查询无法找到这些记录。

## 修复内容

### 1. 数据修复 ✅
运行脚本 `fix-merchant-inventory-storegroup.js` 修复了现有的 7 条库存记录：
- MurrayRanelagh 的所有库存记录现在都正确设置了 storeGroup
- 群组：Murray Mobile (MURRAY)
- 总数量：103 件

### 2. 代码修复 ✅
修改了 `app.js` 中的仓库订单确认收货 API：

**修改位置**: `PUT /api/warehouse/orders/:id/complete`

**修改内容**:
1. 在 API 开始处获取商户的群组信息：
```javascript
// 获取商户的群组信息
const merchant = await UserNew.findOne({ username: order.merchantId })
  .populate('retailInfo.storeGroup');
const merchantStoreGroup = merchant?.retailInfo?.storeGroup?._id || null;
```

2. 在创建设备库存记录时添加 storeGroup：
```javascript
const merchantInventory = new MerchantInventory({
  merchantId: order.merchantId,
  merchantName: order.merchantName,
  storeGroup: merchantStoreGroup,  // ← 新增
  // ... 其他字段
});
```

3. 在创建配件库存记录时添加 storeGroup：
```javascript
const merchantInventory = new MerchantInventory({
  merchantId: order.merchantId,
  merchantName: order.merchantName,
  storeGroup: merchantStoreGroup,  // ← 新增
  // ... 其他字段
});
```

### 3. 其他创建库存的位置检查 ✅
检查了所有创建 MerchantInventory 的位置：

| 位置 | 状态 | 说明 |
|------|------|------|
| 仓库订单确认收货（设备） | ✅ 已修复 | 添加了 storeGroup |
| 仓库订单确认收货（配件） | ✅ 已修复 | 添加了 storeGroup |
| 手动添加库存 | ✅ 已有 | 已经包含 storeGroup |
| 库存调拨 | ✅ 已有 | 已经包含 storeGroup |

## 验证结果

### 诊断脚本输出
```bash
node check-group-inventory.js
```

结果：
```
=== MurrayDundrum 用户信息 ===
用户名: MurrayDundrum
群组ID: 69834c8de75caaea2d676f6d
群组名称: Murray Mobile
可查看群组库存: true

=== 群组内的用户 ===
总用户数: 2
- MurrayDundrum (retail_user)
- MurrayRanelagh (retail_user)

=== MurrayDundrum 应该能看到的库存 ===
记录数: 6

前5条记录:
1. Lightning Cable (数量: 98)
2. iPhone 12 128GB AB Grade Vat margin (序列号: 111333)
3. iPhone 14 128GB AB Grade Vat margin (序列号: 222222)
4. iPhone 14 128GB AB Grade Vat margin (序列号: 222333)
5. iPhone 14 128GB AB Grade Vat margin (序列号: 222555)
```

✅ MurrayDundrum 现在可以看到 MurrayRanelagh 的 6 条有库存的记录

## 测试步骤

1. 访问 http://localhost:3000
2. 使用 MurrayDundrum 账号登录
   - 用户名: MurrayDundrum
   - 密码: merchant123
3. 点击"群组库存"标签页
4. 应该能看到 MurrayRanelagh 的库存：
   - Lightning Cable (98个)
   - iPhone 12 128GB AB Grade Vat margin
   - iPhone 14 128GB AB Grade Vat margin (多台)

## 相关文件

### 修改的文件
- `app.js` - 添加了 storeGroup 设置到仓库订单确认收货 API

### 新增的文件
- `check-group-inventory.js` - 诊断脚本
- `fix-merchant-inventory-storegroup.js` - 数据修复脚本
- `FIX_GROUP_INVENTORY_STOREGROUP.md` - 详细修复文档
- `FIX_GROUP_INVENTORY_COMPLETE.md` - 本文档

## 技术细节

### 数据模型
```javascript
// MerchantInventory Schema
{
  merchantId: String,        // 商户用户名
  merchantName: String,      // 商户名称
  storeGroup: ObjectId,      // 所属群组 ← 关键字段
  productName: String,
  quantity: Number,
  // ... 其他字段
}
```

### 查询逻辑
```javascript
// 群组库存查询
const query = {
  storeGroup: userStoreGroup,           // 查询同群组的库存
  merchantId: { $ne: currentUsername }, // 排除自己的库存
  status: 'active',
  isActive: true,
  quantity: { $gt: 0 }                  // 只显示有库存的
};
```

### 数据隔离中间件
```javascript
// applyGroupDataFilter 中间件
async function getUserDataFilter(username, viewGroupData = true) {
  const user = await UserNew.findOne({ username });
  
  if (viewGroupData && user.retailInfo?.canViewGroupInventory) {
    return { storeGroup: user.retailInfo.storeGroup }; // 返回群组过滤
  }
  
  return { merchantId: username }; // 默认只看自己的
}
```

## 状态
✅ 已完成 - 2026-02-05

## 下一步
- 测试群组库存功能
- 测试从群组调货功能
- 确认新创建的库存记录都正确设置了 storeGroup
