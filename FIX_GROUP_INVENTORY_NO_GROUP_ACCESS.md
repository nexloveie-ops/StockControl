# 修复无群组用户仍能查看群组库存的问题

## 问题描述
当管理员将 MurrayDundrum 从群组中移除后，该用户仍然可以在"群组库存"页面看到其他商户的库存。

## 问题分析

### 1. 用户状态确认
运行检查脚本确认用户已被移除群组：
```
=== MurrayDundrum 用户信息 ===
用户名: MurrayDundrum
群组: null
群组ID: null
canViewGroupInventory: false
```
✅ 用户确实已被移除群组

### 2. 服务器日志分析
```
⚠️  用户 MurrayDundrum 没有群组或无权限，只能查看自己的数据
群组库存请求 - 数据过滤: { merchantId: 'MurrayDundrum' }
群组库存查询条件: {
  "merchantId": { "$ne": "MurrayDundrum" },
  "status": "active",
  "isActive": true,
  "quantity": { "$gt": 0 }
}
群组库存查询结果数量: 6
```

### 3. 根本原因
**查询条件错误**：
- 中间件返回：`{ merchantId: 'MurrayDundrum' }` （表示只能查看自己的数据）
- API 添加：`merchantId: { $ne: 'MurrayDundrum' }` （排除自己的库存）
- 最终查询：没有 storeGroup 过滤，只有 `merchantId: { $ne: 'MurrayDundrum' }`
- **结果**：返回了所有其他商户的库存，而不是空结果

### 4. 逻辑错误
当用户没有群组时：
- ❌ **错误逻辑**：查询所有其他商户的库存
- ✅ **正确逻辑**：应该返回空结果（因为用户没有权限查看群组库存）

## 修复方案

### 修改位置
`app.js` - `GET /api/merchant/group-inventory`

### 修改内容
在查询之前添加权限检查：

```javascript
// 检查用户是否有群组权限
// 如果 dataFilter 包含 merchantId（而不是 storeGroup），说明用户没有群组或无权限
if (req.dataFilter.merchantId && !req.dataFilter.storeGroup) {
  console.log('⚠️  用户没有群组或无权限，返回空结果');
  return res.json({
    success: true,
    data: []
  });
}
```

### 逻辑说明

**中间件返回的 dataFilter 有两种情况**：

1. **有群组且有权限**：
   ```javascript
   { storeGroup: ObjectId('...') }
   ```
   → 继续查询，返回同群组其他商户的库存

2. **没有群组或无权限**：
   ```javascript
   { merchantId: 'username' }
   ```
   → 直接返回空结果，不执行查询

## 测试验证

### 测试步骤

1. **确认用户已移除群组**：
   ```bash
   node check-murraydundrum-group.js
   ```
   结果：群组为 null

2. **访问群组库存页面**：
   - 使用 MurrayDundrum 登录
   - 点击"群组库存"标签页
   - 应该显示空列表或提示信息

3. **查看服务器日志**：
   ```
   ⚠️  用户没有群组或无权限，返回空结果
   ```

### 预期结果

| 用户状态 | 群组库存显示 |
|---------|-------------|
| 有群组 + 有权限 | 显示同群组其他商户的库存 |
| 有群组 + 无权限 | 空列表 |
| 无群组 | 空列表 |

## 完整的权限控制流程

### 1. 中间件层（applyGroupDataFilter）
```javascript
async function getUserDataFilter(username, viewGroupData = false) {
  const user = await UserNew.findOne({ username });
  
  if (viewGroupData) {
    const canViewGroup = user.retailInfo?.canViewGroupInventory === true;
    const storeGroup = user.retailInfo?.storeGroup;
    
    if (canViewGroup && storeGroup) {
      return { storeGroup }; // 有权限，返回群组过滤
    }
  }
  
  return { merchantId: username }; // 无权限，返回个人过滤
}
```

### 2. API 层（群组库存查询）
```javascript
// 检查权限
if (req.dataFilter.merchantId && !req.dataFilter.storeGroup) {
  return res.json({ success: true, data: [] }); // 无权限，返回空
}

// 有权限，构建查询
let query = { 
  ...req.dataFilter,  // { storeGroup: ObjectId }
  merchantId: { $ne: req.currentUsername }, // 排除自己
  status: 'active',
  quantity: { $gt: 0 }
};
```

## 相关场景

### 场景 1: 用户从群组中移除
1. 管理员编辑用户，清除"所属群组"
2. 保存后，用户的 storeGroup 设置为 null
3. 用户的所有库存记录的 storeGroup 也被清除
4. 用户访问"群组库存"页面，显示空列表 ✅

### 场景 2: 用户在群组但无权限
1. 用户有 storeGroup，但 canViewGroupInventory = false
2. 中间件返回 `{ merchantId: username }`
3. API 检测到无权限，返回空列表 ✅

### 场景 3: 用户有群组且有权限
1. 用户有 storeGroup，且 canViewGroupInventory = true
2. 中间件返回 `{ storeGroup: ObjectId }`
3. API 查询同群组其他商户的库存 ✅

## 修改的文件
- `app.js` - 群组库存 API 添加权限检查

## 新增的文件
- `check-murraydundrum-group.js` - 检查用户群组状态
- `FIX_GROUP_INVENTORY_NO_GROUP_ACCESS.md` - 本文档

## 状态
✅ 已修复 - 2026-02-05
✅ 服务器已重启

## 测试
现在请测试：
1. 使用 MurrayDundrum 登录（已移除群组）
2. 访问"群组库存"页面
3. 应该显示空列表，不再显示其他商户的库存
