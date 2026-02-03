# 正确的数据隔离逻辑

## 需求澄清

### 错误理解 ❌
- 加入群组后，用户自动看到群组内所有数据
- 日常操作会受到群组配置的影响

### 正确理解 ✅
1. **日常操作**：每个店铺永远只能看到自己的数据（无论是否加入群组）
2. **群组功能**：只在专门的"群组页面"才能看到群组内其他店铺的数据
3. **加入群组不影响日常**：加入群组不改变店铺的日常库存、销售、维修查看

## 实现方案

### 1. 两种中间件

#### applyDataIsolation（默认）
- **用途**：日常操作（我的库存、销售、维修等）
- **逻辑**：永远返回 `{ merchantId: username }`
- **效果**：只能看到自己的数据

#### applyGroupDataFilter（群组专用）
- **用途**：群组页面
- **逻辑**：
  - 如果用户有群组且有权限：返回 `{ storeGroup: groupId }`
  - 否则：返回 `{ merchantId: username }`
- **效果**：可以看到群组内所有店铺的数据

### 2. API 端点

#### 日常操作 API（使用 applyDataIsolation）
```javascript
GET /api/merchant/inventory          // 我的库存
GET /api/merchant/sales              // 我的销售记录
GET /api/merchant/repairs            // 我的维修记录
GET /api/merchant/stats              // 我的统计数据
```

**查询条件**: `{ merchantId: 'username' }`
**结果**: 只显示自己的数据

#### 群组页面 API（使用 applyGroupDataFilter）
```javascript
GET /api/merchant/group-inventory    // 群组库存（新增）
GET /api/merchant/group-sales        // 群组销售（待实现）
GET /api/merchant/group-repairs      // 群组维修（待实现）
GET /api/merchant/group-stats        // 群组统计（待实现）
```

**查询条件**: `{ storeGroup: 'groupId' }`（如果有权限）
**结果**: 显示群组内所有店铺的数据

## 数据查询逻辑

### 场景 1: merchant_001 日常查看库存
```javascript
// API: GET /api/merchant/inventory?merchantId=merchant_001
// 中间件: applyDataIsolation
// 查询条件: { merchantId: 'merchant_001', status: 'active', isActive: true }
// 结果: 只显示 merchant_001 的 3 个产品
```

### 场景 2: merchant_001 在群组页面查看库存
```javascript
// API: GET /api/merchant/group-inventory?merchantId=merchant_001
// 中间件: applyGroupDataFilter
// 用户配置: storeGroup = '6980ce91...', canViewGroupInventory = true
// 查询条件: { storeGroup: '6980ce91...', status: 'active', isActive: true }
// 结果: 显示群组内所有店铺的产品（包括其他店铺）
```

### 场景 3: MurrayRanelagh 日常查看库存
```javascript
// API: GET /api/merchant/inventory?merchantId=MurrayRanelagh
// 中间件: applyDataIsolation
// 查询条件: { merchantId: 'MurrayRanelagh', status: 'active', isActive: true }
// 结果: 只显示 MurrayRanelagh 的 2 个产品
```

## 前端实现

### merchant.html（现有页面）
保持不变，使用 `/api/merchant/inventory` 等 API

```javascript
// 我的库存 - 只显示自己的
fetch(`${API_BASE}/merchant/inventory?merchantId=${merchantId}`)

// 我的销售 - 只显示自己的
fetch(`${API_BASE}/merchant/sales?merchantId=${merchantId}`)

// 我的维修 - 只显示自己的
fetch(`${API_BASE}/merchant/repairs?merchantId=${merchantId}`)
```

### group.html（新增页面 - 待创建）
使用群组 API

```javascript
// 群组库存 - 显示群组内所有店铺的
fetch(`${API_BASE}/merchant/group-inventory?merchantId=${merchantId}`)

// 群组销售 - 显示群组内所有店铺的
fetch(`${API_BASE}/merchant/group-sales?merchantId=${merchantId}`)

// 群组维修 - 显示群组内所有店铺的
fetch(`${API_BASE}/merchant/group-repairs?merchantId=${merchantId}`)
```

## 权限判断流程

### applyDataIsolation（日常操作）
```
用户登录
  ↓
获取 username
  ↓
返回 { merchantId: username }
  ↓
只查询自己的数据
```

### applyGroupDataFilter（群组页面）
```
用户登录
  ↓
获取 username
  ↓
查询用户信息
  ↓
是管理员？
  ├─ 是 → 返回 {} （所有数据）
  └─ 否 → 继续
      ↓
有群组且有权限？
  ├─ 是 → 返回 { storeGroup: groupId }
  └─ 否 → 返回 { merchantId: username }
```

## 测试验证

### 测试 1: merchant_001 日常操作
1. 登录 merchant_001
2. 访问"我的库存"
3. **预期**: 看到 3 个产品（自己的）
4. **不应该**: 看到其他店铺的产品

### 测试 2: merchant_001 群组页面（待实现）
1. 登录 merchant_001
2. 访问"群组库存"页面
3. **预期**: 看到群组内所有店铺的产品
4. **包括**: 自己的 + 其他店铺的

### 测试 3: MurrayRanelagh 日常操作
1. 登录 MurrayRanelagh
2. 访问"我的库存"
3. **预期**: 看到 2 个产品（自己的）
4. **不应该**: 看到 merchant_001 或 MurrayDundrum 的产品

## 实施状态

### Phase 1: 核心逻辑
✅ 修改 `middleware/dataIsolation.js`
  - ✅ `getUserDataFilter(username, viewGroupData)` - 支持两种模式
  - ✅ `applyDataIsolation` - 日常操作中间件
  - ✅ `applyGroupDataFilter` - 群组页面中间件

✅ 修改 `app.js`
  - ✅ 导入新中间件
  - ✅ 添加 `GET /api/merchant/group-inventory` API

### Phase 2: 群组页面（待实现）
⬜ 创建 `public/group.html` - 群组页面
⬜ 添加群组销售 API
⬜ 添加群组维修 API
⬜ 添加群组统计 API

### Phase 3: 测试
⬜ 测试日常操作（确保只看到自己的数据）
⬜ 测试群组页面（确保看到群组数据）
⬜ 测试权限控制

## 关键点

1. **默认行为不变**：日常操作永远只看到自己的数据
2. **群组是可选功能**：只在专门的群组页面使用
3. **加入群组不影响日常**：加入群组不改变用户的日常体验
4. **清晰的 API 分离**：日常 API 和群组 API 完全分开

## 下一步

1. ✅ 服务器已重启
2. ⬜ 测试日常操作（merchant_001 应该看到 3 个产品）
3. ⬜ 创建群组页面（可选）
4. ⬜ 测试群组功能（可选）

现在刷新页面，merchant_001 应该能看到自己的 3 个产品了！
