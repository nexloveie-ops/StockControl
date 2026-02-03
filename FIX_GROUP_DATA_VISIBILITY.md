# 群组库存功能修复

## 问题描述
MurrayRanelagh 用户在查看群组库存时，看不到 MurrayDundrum 的库存。

## 根本原因
1. **用户未分配到店面组**: MurrayRanelagh 和 MurrayDundrum 虽然都有 `canViewGroupInventory: true` 权限，但 `storeGroup` 字段为空
2. **库存记录缺少店面组**: MerchantInventory 记录中的 `storeGroup` 字段未设置
3. **API 未排除当前用户**: 群组库存 API 应该只显示其他商户的库存，不包括当前用户自己的

## 修复内容

### 1. 创建店面组并分配用户
**文件**: `setup-store-group.js`

- 创建 "Murray Mobile Stores" 店面组 (代码: MURRAY)
- 将 MurrayRanelagh 和 MurrayDundrum 分配到同一个店面组
- 设置用户权限:
  - `storeType`: 'chain_store'
  - `canViewGroupInventory`: true
  - `canTransferFromGroup`: true
- 更新所有相关的 MerchantInventory 记录，添加 `storeGroup` 字段

### 2. 修复群组库存 API
**文件**: `app.js` (第 4029 行)

修改 `/api/merchant/group-inventory` API:

```javascript
// 排除当前用户自己的库存（只显示群组内其他商户的库存）
if (req.currentUsername) {
  query.merchantId = { $ne: req.currentUsername };
}

// 只显示有库存的产品
query.quantity = { $gt: 0 };
```

### 3. 数据隔离中间件
**文件**: `middleware/dataIsolation.js`

`applyGroupDataFilter` 中间件逻辑:
- 检查用户的 `canViewGroupInventory` 权限
- 检查用户的 `storeGroup` 是否存在
- 如果都满足，返回 `{ storeGroup: <groupId> }` 作为查询条件
- 否则只能查看自己的数据 `{ merchantId: username }`

## 数据验证

### 用户信息
```
MurrayRanelagh:
  - 角色: retail_user
  - 店面组: 6980ce91c7cd5c571935beae
  - 可查看群组库存: true
  - 自己的库存: 2 条 (iPhone 13 Pro, iPad Air)

MurrayDundrum:
  - 角色: retail_user
  - 店面组: 6980ce91c7cd5c571935beae
  - 可查看群组库存: true
  - 可销售库存: 2 条 (Samsung Galaxy S22, MacBook Air M2)
  - 已售出库存: 4 条 (galaxy A53, quantity = 0)
```

### 群组库存查询结果
MurrayRanelagh 查看群组库存时:
- ✅ 可以看到 MurrayDundrum 的 2 条可销售库存
- ✅ 不显示自己的库存
- ✅ 不显示数量为 0 的库存
- ✅ 按分类正确分组显示

## 查询条件
```javascript
{
  storeGroup: ObjectId("6980ce91c7cd5c571935beae"),
  status: 'active',
  isActive: true,
  quantity: { $gt: 0 },
  merchantId: { $ne: 'MurrayRanelagh' }  // 排除当前用户
}
```

## 前端显示
**文件**: `public/merchant.html`

群组库存页面功能:
1. 显示分类卡片，统计每个分类的产品数量和商户数量
2. 点击分类查看该分类下的所有产品
3. 显示商户的登录名 (merchantId)
4. 只显示可销售的产品 (quantity > 0, status = 'active')
5. 支持搜索功能

## 测试脚本
- `check-user-group.js` - 检查用户的店面组关系
- `setup-store-group.js` - 设置店面组并分配用户
- `test-group-inventory.js` - 测试群组库存查询逻辑
- `check-dundrum-inventory.js` - 检查 MurrayDundrum 的库存详情

## 测试步骤
1. 登录 MurrayRanelagh 账号
2. 点击"群组库存"标签
3. 应该看到 2 个分类卡片:
   - 手机 (1 种产品, 1 件库存, 1 个商户)
   - 笔记本 (1 种产品, 1 件库存, 1 个商户)
4. 点击任意分类，查看产品列表
5. 应该显示 MurrayDundrum 的产品，不显示自己的产品

## 注意事项
1. 新创建的商户用户需要手动分配到店面组
2. 从仓库发货时，系统会自动设置 MerchantInventory 的 `storeGroup` 字段
3. 只有 `canViewGroupInventory: true` 的用户才能查看群组库存
4. 群组库存只显示其他商户的可销售产品，不包括自己的库存

## 相关文件
- `models/UserNew.js` - 用户模型 (retailInfo.storeGroup)
- `models/StoreGroup.js` - 店面组模型
- `models/MerchantInventory.js` - 商户库存模型 (storeGroup 字段)
- `middleware/dataIsolation.js` - 数据隔离中间件
- `app.js` - 群组库存 API
- `public/merchant.html` - 群组库存前端界面

## 修复时间
2026-02-02

## 状态
✅ 已完成并测试通过
