# 用户数据隔离功能

## 需求概述

实现用户级别的数据隔离，确保每个用户只能看到自己的数据，除非通过管理员配置允许同组成员共享数据。

## 核心规则

### 1. 默认隔离规则
- **库存数据**: 每个用户只能看到自己的库存（MerchantInventory）
- **销售记录**: 每个用户只能看到自己的销售记录（SalesRecord）
- **维修记录**: 每个用户只能看到自己的维修记录（RepairRecord）

### 2. 组共享规则
- 用户可以被分配到一个 **StoreGroup**（店铺组）
- 管理员可以配置用户的 `canViewGroupInventory` 权限
- 如果用户有此权限，可以查看同组其他成员的数据
- 如果没有此权限，即使在同一组，也只能看到自己的数据

## 数据模型

### UserNew 模型（已存在）
```javascript
retailInfo: {
  storeType: {
    type: String,
    enum: ['single_store', 'chain_store'],
    default: 'single_store'
  },
  storeGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StoreGroup'
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  canViewGroupInventory: {
    type: Boolean,
    default: false  // 默认不能查看组内其他店面库存
  }
}
```

### MerchantInventory 模型（需要确认）
```javascript
{
  userId: ObjectId,           // 所属用户
  storeGroup: ObjectId,       // 所属店铺组（可选）
  // ... 其他字段
}
```

### SalesRecord 模型（需要确认）
```javascript
{
  userId: ObjectId,           // 销售员用户ID
  storeGroup: ObjectId,       // 所属店铺组（可选）
  // ... 其他字段
}
```

### RepairRecord 模型（需要确认）
```javascript
{
  userId: ObjectId,           // 维修员用户ID
  storeGroup: ObjectId,       // 所属店铺组（可选）
  // ... 其他字段
}
```

## API 修改

### 1. 库存查询 API
**路径**: `GET /api/merchant/inventory`

**当前逻辑**: 返回所有库存
**新逻辑**:
```javascript
// 获取当前用户信息
const userId = req.user._id;
const user = await UserNew.findById(userId);

let query = {};

if (user.retailInfo?.canViewGroupInventory && user.retailInfo?.storeGroup) {
  // 可以查看组内库存：返回同组所有成员的库存
  query.storeGroup = user.retailInfo.storeGroup;
} else {
  // 只能查看自己的库存
  query.userId = userId;
}

const inventory = await MerchantInventory.find(query);
```

### 2. 销售记录查询 API
**路径**: `GET /api/merchant/sales`

**新逻辑**:
```javascript
const userId = req.user._id;
const user = await UserNew.findById(userId);

let query = {};

if (user.retailInfo?.canViewGroupInventory && user.retailInfo?.storeGroup) {
  query.storeGroup = user.retailInfo.storeGroup;
} else {
  query.userId = userId;
}

const sales = await SalesRecord.find(query);
```

### 3. 维修记录查询 API
**路径**: `GET /api/merchant/repairs`

**新逻辑**:
```javascript
const userId = req.user._id;
const user = await UserNew.findById(userId);

let query = {};

if (user.retailInfo?.canViewGroupInventory && user.retailInfo?.storeGroup) {
  query.storeGroup = user.retailInfo.storeGroup;
} else {
  query.userId = userId;
}

const repairs = await RepairRecord.find(query);
```

### 4. 统计数据 API
**路径**: `GET /api/merchant/stats`

**新逻辑**: 统计数据也需要基于相同的权限规则进行过滤

## 管理员配置界面

### 用户管理页面增强
在 `admin-user-management.html` 中添加：

1. **店铺组分配**
   - 下拉选择框：选择用户所属的店铺组
   - 可以为空（独立用户）

2. **组内共享权限**
   - 复选框：允许查看组内其他成员的库存
   - 仅当用户分配了店铺组时才显示此选项

### 店铺组管理
创建新的管理页面 `admin-store-groups.html`：
- 创建/编辑/删除店铺组
- 查看组内成员列表
- 批量设置组内权限

## 实施步骤

### Phase 1: 数据模型验证和更新
1. ✅ 检查 UserNew 模型是否有 retailInfo.canViewGroupInventory 字段
2. ⬜ 检查 MerchantInventory 模型是否有 userId 和 storeGroup 字段
3. ⬜ 检查 SalesRecord 模型是否有 userId 和 storeGroup 字段
4. ⬜ 检查 RepairRecord 模型是否有 userId 和 storeGroup 字段
5. ⬜ 如果缺少字段，更新模型定义

### Phase 2: API 权限控制
1. ⬜ 修改 GET /api/merchant/inventory - 添加用户过滤
2. ⬜ 修改 GET /api/merchant/sales - 添加用户过滤
3. ⬜ 修改 GET /api/merchant/repairs - 添加用户过滤
4. ⬜ 修改 GET /api/merchant/stats - 添加用户过滤
5. ⬜ 修改所有相关的查询 API

### Phase 3: 数据创建时关联用户
1. ⬜ 入库时自动关联当前用户ID和店铺组
2. ⬜ 销售时自动关联当前用户ID和店铺组
3. ⬜ 维修时自动关联当前用户ID和店铺组

### Phase 4: 管理员配置界面
1. ⬜ 在用户管理页面添加店铺组选择
2. ⬜ 在用户管理页面添加组内共享权限开关
3. ⬜ 创建店铺组管理页面（可选）

### Phase 5: 测试
1. ⬜ 测试独立用户只能看到自己的数据
2. ⬜ 测试同组用户无权限时只能看到自己的数据
3. ⬜ 测试同组用户有权限时可以看到组内所有数据
4. ⬜ 测试管理员可以看到所有数据

## 安全考虑

1. **API 层面强制验证**: 所有查询必须在后端进行权限验证，不能依赖前端
2. **用户身份验证**: 确保 req.user 来自可信的认证中间件
3. **防止越权访问**: 用户不能通过修改请求参数访问其他用户的数据
4. **审计日志**: 记录跨用户数据访问（组内共享）的操作

## 向后兼容

1. **现有数据迁移**: 需要为现有的库存/销售/维修记录补充 userId 字段
2. **默认行为**: 如果记录没有 userId，可以考虑分配给管理员或标记为"历史数据"
3. **渐进式实施**: 可以先实施新数据的隔离，再逐步迁移历史数据

## 下一步行动

1. 首先检查现有数据模型的字段
2. 确认哪些 API 需要修改
3. 制定详细的实施计划
4. 开始逐步实施

## 问题和讨论

- [ ] 管理员是否需要看到所有用户的数据？
- [ ] 是否需要更细粒度的权限控制（如只读、读写）？
- [ ] 店铺组的层级结构是否需要支持（如总部-分店-门店）？
- [ ] 是否需要数据共享的审计日志？
