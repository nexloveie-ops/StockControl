# 用户群组与库存同步功能

## 功能描述
当管理员在"用户管理"中修改用户的群组设置时，系统会自动同步更新该用户所有库存记录的 `storeGroup` 字段。

## 使用场景

### 场景 1: 将用户添加到群组
- 管理员编辑用户，设置"所属群组"
- 保存后，该用户的所有库存记录自动设置 storeGroup
- 群组内其他成员可以在"群组库存"中看到这些库存

### 场景 2: 将用户从群组中移除
- 管理员编辑用户，清除"所属群组"
- 保存后，该用户的所有库存记录自动清除 storeGroup
- 群组内其他成员不再能看到这些库存

### 场景 3: 将用户从一个群组转移到另一个群组
- 管理员编辑用户，修改"所属群组"
- 保存后，该用户的所有库存记录自动更新为新的 storeGroup
- 新群组成员可以看到这些库存，旧群组成员不再能看到

## 技术实现

### API 修改
**位置**: `PUT /api/admin/users/:id`

**修改内容**:
```javascript
// 记录旧的群组ID（用于判断是否需要更新库存）
const oldStoreGroup = user.retailInfo?.storeGroup;
const oldUsername = user.username;

// ... 更新用户信息 ...

await user.save();

// 检查群组是否发生变化
const newStoreGroup = user.retailInfo?.storeGroup;
const storeGroupChanged = String(oldStoreGroup) !== String(newStoreGroup);

if (storeGroupChanged) {
  console.log('群组发生变化，更新库存记录的 storeGroup');
  
  // 更新该用户的所有库存记录的 storeGroup
  const updateResult = await MerchantInventory.updateMany(
    { merchantId: oldUsername },
    { $set: { storeGroup: newStoreGroup || null } }
  );
  
  console.log(`✅ 更新了 ${updateResult.modifiedCount} 条库存记录的 storeGroup`);
}
```

### 关键逻辑

1. **检测变化**: 比较更新前后的 storeGroup，只有发生变化时才更新库存
2. **批量更新**: 使用 `updateMany` 一次性更新该用户的所有库存记录
3. **支持清除**: 当 storeGroup 设置为 null 时，库存记录的 storeGroup 也会被清除
4. **日志记录**: 记录更新的库存数量，便于追踪和调试

## 测试验证

### 自动化测试
运行测试脚本：
```bash
node test-user-group-inventory-sync.js
```

测试结果：
```
=== 测试步骤 1: 移除用户的群组 ===
✅ 已将用户从群组中移除
✅ 更新了 7 条库存记录的 storeGroup 为 null
✅ 所有库存的 storeGroup 已清除

=== 测试步骤 2: 重新添加用户到群组 ===
✅ 已将用户重新添加到群组
✅ 更新了 7 条库存记录的 storeGroup
✅ 所有库存的 storeGroup 已恢复
```

### 手动测试步骤

#### 测试 1: 添加用户到群组

1. 访问 http://localhost:3000
2. 使用管理员账号登录（admin / admin123）
3. 进入"用户管理"
4. 编辑一个没有群组的用户
5. 设置"所属群组"为某个群组
6. 保存
7. 查看服务器日志，应该显示：
   ```
   群组发生变化，更新库存记录的 storeGroup
   旧群组: null
   新群组: [群组ID]
   ✅ 更新了 X 条库存记录的 storeGroup
   ```
8. 使用该群组的其他成员登录，在"群组库存"中应该能看到该用户的库存

#### 测试 2: 从群组中移除用户

1. 编辑一个有群组的用户
2. 清除"所属群组"（选择"无群组（独立用户）"）
3. 保存
4. 查看服务器日志，应该显示：
   ```
   群组发生变化，更新库存记录的 storeGroup
   旧群组: [群组ID]
   新群组: null
   ✅ 更新了 X 条库存记录的 storeGroup
   ```
5. 使用该群组的其他成员登录，在"群组库存"中不应该再看到该用户的库存

#### 测试 3: 转移用户到另一个群组

1. 编辑一个有群组的用户
2. 修改"所属群组"为另一个群组
3. 保存
4. 查看服务器日志，应该显示：
   ```
   群组发生变化，更新库存记录的 storeGroup
   旧群组: [旧群组ID]
   新群组: [新群组ID]
   ✅ 更新了 X 条库存记录的 storeGroup
   ```
5. 使用新群组的成员登录，应该能看到该用户的库存
6. 使用旧群组的成员登录，不应该再看到该用户的库存

## 数据一致性保证

### 自动同步时机
- ✅ 管理员修改用户群组时
- ✅ 创建新库存时（从用户信息获取 storeGroup）
- ✅ 仓库订单确认收货时（从用户信息获取 storeGroup）
- ✅ 库存调拨时（从调拨信息获取 storeGroup）

### 数据修复工具
如果发现数据不一致，可以运行修复脚本：
```bash
node fix-merchant-inventory-storegroup.js
```

这个脚本会：
1. 查找所有没有 storeGroup 的库存记录
2. 根据 merchantId 查找对应用户的群组
3. 批量更新库存记录的 storeGroup

## 性能考虑

### 批量更新
使用 `updateMany` 进行批量更新，性能优于逐条更新：
```javascript
// ✅ 好的做法：批量更新
await MerchantInventory.updateMany(
  { merchantId: username },
  { $set: { storeGroup: newGroupId } }
);

// ❌ 不好的做法：逐条更新
const items = await MerchantInventory.find({ merchantId: username });
for (const item of items) {
  item.storeGroup = newGroupId;
  await item.save();
}
```

### 索引优化
MerchantInventory 模型已经在 merchantId 和 storeGroup 上建立了索引：
```javascript
merchantInventorySchema.index({ merchantId: 1, status: 1 });
merchantInventorySchema.index({ storeGroup: 1, isActive: 1 });
```

## 相关文件

### 修改的文件
- `app.js` - 添加了库存同步逻辑到用户更新 API

### 测试文件
- `test-user-group-inventory-sync.js` - 自动化测试脚本

### 相关文档
- `FIX_GROUP_INVENTORY_COMPLETE.md` - 群组库存功能修复文档
- `FIX_GROUP_INVENTORY_STOREGROUP.md` - storeGroup 字段修复文档

## 注意事项

1. **用户名修改**: 如果同时修改用户名和群组，库存更新使用旧用户名查找
2. **权限检查**: 只有管理员可以修改用户群组
3. **日志记录**: 所有群组变更都会记录在服务器日志中
4. **事务处理**: 用户更新和库存更新在同一个请求中完成，但不在事务中（可以考虑后续优化）

## 状态
✅ 已实现 - 2026-02-05
✅ 已测试 - 自动化测试通过

## 下一步优化建议

1. **事务支持**: 将用户更新和库存更新放在同一个事务中，确保数据一致性
2. **异步处理**: 对于库存数量很大的用户，可以考虑异步更新
3. **通知机制**: 群组变更时通知相关用户
4. **审计日志**: 记录群组变更历史，便于追溯
