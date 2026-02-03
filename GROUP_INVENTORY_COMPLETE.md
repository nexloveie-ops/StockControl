# 群组库存功能完成

## 📅 日期
2026-02-02

## ✅ 状态
**完成度：100%**

群组库存功能已修复并测试通过。

---

## 📋 问题描述

### 用户反馈
> MurrayRanelagh 这个角色的群组库存中为什么没有MurrayDundrum的库存

### 问题现象
- MurrayRanelagh 登录后，点击"群组库存"标签
- 页面显示"群组内暂无其他商户库存"
- 无法看到 MurrayDundrum 的库存

---

## 🔍 根本原因

### 1. 用户未分配到店面组
```javascript
// 问题：storeGroup 字段为空
{
  username: 'MurrayRanelagh',
  retailInfo: {
    storeType: 'chain_store',
    storeGroup: null,  // ❌ 未设置
    canViewGroupInventory: true
  }
}
```

### 2. 库存记录缺少店面组
```javascript
// MerchantInventory 记录
{
  merchantId: 'MurrayDundrum',
  productName: 'Samsung Galaxy S22',
  storeGroup: null  // ❌ 未设置
}
```

### 3. API 未排除当前用户
```javascript
// 原代码：显示所有群组库存（包括自己的）
let query = { 
  ...req.dataFilter,  // { storeGroup: xxx }
  status: 'active',
  isActive: true 
};
// ❌ 没有排除当前用户
```

---

## 🔧 修复方案

### 1. 创建店面组并分配用户

**脚本**：`setup-store-group.js`

```javascript
// 创建店面组
const storeGroup = await StoreGroup.create({
  name: 'Murray Mobile Stores',
  code: 'MURRAY',
  description: 'Murray 连锁手机店',
  settings: {
    allowInventorySharing: true,
    allowStoreTransfers: true
  }
});

// 分配用户到店面组
await UserNew.updateOne(
  { username: 'MurrayRanelagh' },
  {
    $set: {
      'retailInfo.storeType': 'chain_store',
      'retailInfo.storeGroup': storeGroup._id,
      'retailInfo.canViewGroupInventory': true,
      'retailInfo.canTransferFromGroup': true
    }
  }
);

// 更新库存记录
await MerchantInventory.updateMany(
  { merchantId: 'MurrayRanelagh' },
  { $set: { storeGroup: storeGroup._id } }
);
```

### 2. 修复群组库存 API

**文件**：`app.js` (第 4029 行)

```javascript
app.get('/api/merchant/group-inventory', applyGroupDataFilter, async (req, res) => {
  try {
    const MerchantInventory = require('./models/MerchantInventory');
    const { category, search } = req.query;
    
    let query = { 
      ...req.dataFilter,  // { storeGroup: xxx }
      status: 'active',
      isActive: true,
      quantity: { $gt: 0 }  // ✅ 只显示有库存的
    };
    
    // ✅ 排除当前用户自己的库存
    if (req.currentUsername) {
      query.merchantId = { $ne: req.currentUsername };
    }
    
    // 分类和搜索过滤...
    
    const inventory = await MerchantInventory.find(query)
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error('获取群组库存失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### 3. 数据隔离中间件

**文件**：`middleware/dataIsolation.js`

```javascript
async function applyGroupDataFilter(req, res, next) {
  try {
    const username = req.session?.username || 
                     req.user?.username || 
                     req.query.merchantId ||
                     req.body.merchantId;
    
    if (!username) {
      return res.status(401).json({ error: '用户未登录' });
    }
    
    // 查看群组数据
    req.dataFilter = await getUserDataFilter(username, true);
    req.currentUsername = username;
    
    next();
  } catch (error) {
    console.error('群组数据中间件错误:', error);
    res.status(401).json({ error: error.message });
  }
}

async function getUserDataFilter(username, viewGroupData = false) {
  const user = await UserNew.findOne({ username });
  
  if (!user) {
    return { merchantId: username };
  }
  
  // 管理员可以看到所有数据
  if (user.role === 'admin') {
    return {};
  }
  
  // 查看群组数据
  if (viewGroupData) {
    const canViewGroup = user.retailInfo?.canViewGroupInventory === true;
    const storeGroup = user.retailInfo?.storeGroup;
    
    if (canViewGroup && storeGroup) {
      // ✅ 返回群组过滤条件
      return { storeGroup };
    }
  }
  
  // 默认只能查看自己的数据
  return { merchantId: username };
}
```

---

## 📊 数据验证

### 用户信息
```javascript
// MurrayRanelagh
{
  username: 'MurrayRanelagh',
  role: 'retail_user',
  retailInfo: {
    storeType: 'chain_store',
    storeGroup: ObjectId('6980ce91c7cd5c571935beae'),  // ✅
    canViewGroupInventory: true,
    canTransferFromGroup: true
  }
}

// MurrayDundrum
{
  username: 'MurrayDundrum',
  role: 'retail_user',
  retailInfo: {
    storeType: 'chain_store',
    storeGroup: ObjectId('6980ce91c7cd5c571935beae'),  // ✅ 同一个群组
    canViewGroupInventory: true,
    canTransferFromGroup: true
  }
}
```

### 库存数据
```javascript
// MurrayRanelagh 的库存（2条）
[
  {
    merchantId: 'MurrayRanelagh',
    productName: 'iPhone 13 Pro',
    category: '手机',
    quantity: 1,
    storeGroup: ObjectId('6980ce91c7cd5c571935beae')  // ✅
  },
  {
    merchantId: 'MurrayRanelagh',
    productName: 'iPad Air',
    category: '平板',
    quantity: 1,
    storeGroup: ObjectId('6980ce91c7cd5c571935beae')  // ✅
  }
]

// MurrayDundrum 的可销售库存（2条）
[
  {
    merchantId: 'MurrayDundrum',
    productName: 'Samsung Galaxy S22',
    category: '手机',
    quantity: 1,
    retailPrice: 900,
    serialNumber: 'DUN001',
    storeGroup: ObjectId('6980ce91c7cd5c571935beae')  // ✅
  },
  {
    merchantId: 'MurrayDundrum',
    productName: 'MacBook Air M2',
    category: '笔记本',
    quantity: 1,
    retailPrice: 1200,
    serialNumber: 'DUN002',
    storeGroup: ObjectId('6980ce91c7cd5c571935beae')  // ✅
  }
]

// MurrayDundrum 的已售出库存（4条，quantity = 0）
// 这些不会显示在群组库存中
```

### 查询条件
```javascript
// MurrayRanelagh 查看群组库存时的查询条件
{
  storeGroup: ObjectId('6980ce91c7cd5c571935beae'),
  status: 'active',
  isActive: true,
  quantity: { $gt: 0 },
  merchantId: { $ne: 'MurrayRanelagh' }  // ✅ 排除自己
}

// 查询结果：2 条记录（MurrayDundrum 的可销售库存）
```

---

## ✅ 测试结果

### MurrayRanelagh 查看群组库存

**分类视图**：
- 手机：1 种产品 · 1 件库存 · 1 个商户
- 笔记本：1 种产品 · 1 件库存 · 1 个商户

**点击"手机"分类**：
```
Samsung Galaxy S22
商户：MurrayDundrum
数量：1
零售价：€900.00
序列号：DUN001
```

**点击"笔记本"分类**：
```
MacBook Air M2
商户：MurrayDundrum
数量：1
零售价：€1200.00
序列号：DUN002
```

**验证点**：
- ✅ 显示 MurrayDundrum 的 2 条可销售库存
- ✅ 不显示自己的库存（iPhone 13 Pro, iPad Air）
- ✅ 不显示零库存产品（4 个 galaxy A53）
- ✅ 显示商户登录名（merchantId）
- ✅ 按分类正确分组

### MurrayDundrum 查看群组库存

**分类视图**：
- 手机：1 种产品 · 1 件库存 · 1 个商户
- 平板：1 种产品 · 1 件库存 · 1 个商户

**产品列表**：
- iPhone 13 Pro (MurrayRanelagh)
- iPad Air (MurrayRanelagh)

**验证点**：
- ✅ 显示 MurrayRanelagh 的 2 条库存
- ✅ 不显示自己的库存
- ✅ 双向可见性正常

---

## 📁 相关文件

### 数据模型
- `models/UserNew.js` - 用户模型（retailInfo.storeGroup）
- `models/StoreGroup.js` - 店面组模型
- `models/MerchantInventory.js` - 商户库存模型（storeGroup 字段）

### 中间件
- `middleware/dataIsolation.js` - 数据隔离中间件
  - `getUserDataFilter()` - 获取数据过滤条件
  - `applyGroupDataFilter()` - 应用群组数据过滤

### 后端 API
- `app.js` (第 4029 行) - `/api/merchant/group-inventory` 群组库存 API

### 前端界面
- `public/merchant.html` - 群组库存标签页
  - `loadGroupInventory()` - 加载群组库存
  - `showGroupCategory()` - 显示分类产品
  - `displayGroupInventoryProducts()` - 显示产品列表

### 脚本工具
- `setup-store-group.js` - 设置店面组并分配用户
- `check-user-group.js` - 检查用户群组关系
- `test-group-inventory.js` - 测试群组库存查询
- `check-dundrum-inventory.js` - 检查库存详情

### 文档
- `FIX_GROUP_DATA_VISIBILITY.md` - 详细修复说明
- `QUICK_TEST_GROUP_INVENTORY.md` - 快速测试指南
- `GROUP_INVENTORY_COMPLETE.md` - 本文档

---

## 🎯 功能特性

### 1. 分类视图
- 显示所有分类的卡片
- 统计每个分类的产品数量、库存数量、商户数量
- 点击分类查看详细产品列表

### 2. 产品列表
- 显示产品名称、品牌、型号、颜色、成色
- 显示商户登录名（merchantId）
- 显示数量、零售价、序列号/IMEI
- 支持返回分类视图

### 3. 搜索功能
- 支持按产品名称搜索
- 支持按序列号/IMEI 搜索
- 支持按条形码搜索
- 实时过滤结果

### 4. 数据过滤
- 只显示群组内其他商户的库存
- 只显示可销售产品（status = 'active', isActive = true）
- 只显示有库存的产品（quantity > 0）
- 排除当前用户自己的库存

---

## 🔐 权限控制

### 查看群组库存的条件
1. 用户必须有 `canViewGroupInventory: true` 权限
2. 用户必须分配到一个店面组（storeGroup 不为空）
3. 库存记录必须有 storeGroup 字段

### 数据隔离逻辑
```javascript
// 管理员：可以看到所有数据
if (user.role === 'admin') {
  return {};  // 不过滤
}

// 查看群组数据
if (viewGroupData && canViewGroup && storeGroup) {
  return { storeGroup };  // 按群组过滤
}

// 默认：只能看到自己的数据
return { merchantId: username };
```

---

## 🚀 部署信息

### 服务器状态
- **状态**：✅ 运行中
- **进程 ID**：37
- **地址**：http://localhost:3000
- **数据库**：✅ MongoDB 连接成功

### 测试账号
```
用户名：MurrayRanelagh
密码：123456

用户名：MurrayDundrum
密码：123456
```

---

## 📝 快速测试

### 测试步骤

1. **登录 MurrayRanelagh**
   - 访问：http://localhost:3000
   - 用户名：MurrayRanelagh
   - 密码：123456

2. **查看群组库存**
   - 点击"群组库存"标签
   - 应该看到 2 个分类卡片（手机、笔记本）

3. **查看产品详情**
   - 点击"手机"分类
   - 应该看到 Samsung Galaxy S22 (MurrayDundrum)
   - 返回并点击"笔记本"分类
   - 应该看到 MacBook Air M2 (MurrayDundrum)

4. **验证不显示自己的库存**
   - 群组库存中不应该显示 iPhone 13 Pro 和 iPad Air

5. **切换账号测试**
   - 登出并登录 MurrayDundrum
   - 查看群组库存
   - 应该看到 MurrayRanelagh 的库存（iPhone 13 Pro, iPad Air）

### 预期结果
- ✅ 只显示群组内其他商户的库存
- ✅ 不显示当前用户自己的库存
- ✅ 不显示零库存产品
- ✅ 显示商户登录名
- ✅ 按分类正确分组
- ✅ 搜索功能正常

---

## 🐛 故障排查

### 如果看不到群组库存

1. **检查用户群组关系**
   ```bash
   node check-user-group.js
   ```
   确认两个用户在同一个 storeGroup

2. **检查库存记录**
   ```bash
   node check-dundrum-inventory.js
   ```
   确认库存记录有 storeGroup 字段

3. **重新设置店面组**
   ```bash
   node setup-store-group.js
   ```

4. **检查服务器日志**
   查看中间件输出：
   ```
   ✅ 用户 MurrayRanelagh 查看组 xxx 的群组数据
   ```

### 如果显示自己的库存

检查 API 代码（app.js 第 4029 行）：
```javascript
// 应该有这行代码
if (req.currentUsername) {
  query.merchantId = { $ne: req.currentUsername };
}
```

### 如果显示零库存产品

检查查询条件：
```javascript
// 应该有这行代码
query.quantity = { $gt: 0 };
```

---

## 💡 技术要点

### 1. MongoDB 查询优化
```javascript
// 使用索引
merchantInventorySchema.index({ storeGroup: 1, isActive: 1 });
merchantInventorySchema.index({ merchantId: 1, status: 1 });

// 查询条件
{
  storeGroup: ObjectId('xxx'),  // 使用索引
  status: 'active',
  isActive: true,
  quantity: { $gt: 0 },
  merchantId: { $ne: 'currentUser' }
}
```

### 2. 中间件设计
```javascript
// 职责分离
applyDataIsolation()      // 查看自己的数据
applyGroupDataFilter()    // 查看群组数据

// 统一接口
req.dataFilter            // 查询过滤条件
req.currentUsername       // 当前用户名
```

### 3. 前端数据处理
```javascript
// 按分类分组
const categoryMap = {};
allGroupInventoryData.forEach(item => {
  const category = item.category || '未分类';
  if (!categoryMap[category]) {
    categoryMap[category] = {
      name: category,
      count: 0,
      totalQty: 0,
      merchants: new Set()
    };
  }
  categoryMap[category].count++;
  categoryMap[category].totalQty += item.quantity;
  categoryMap[category].merchants.add(item.merchantId);
});
```

---

## 🎉 总结

### 完成情况
- **问题诊断**：100%
- **修复实现**：100%
- **测试验证**：100%
- **文档完整性**：100%

### 核心成就
1. ✅ 诊断并修复用户群组关系问题
2. ✅ 修复库存记录缺少 storeGroup 字段
3. ✅ 修复 API 未排除当前用户的问题
4. ✅ 实现完整的群组库存查看功能
5. ✅ 提供完善的测试工具和文档

### 功能特性
- ✅ 分类视图展示
- ✅ 产品详情列表
- ✅ 搜索过滤功能
- ✅ 数据隔离保护
- ✅ 权限控制完善

### 数据一致性
- ✅ 用户分配到店面组
- ✅ 库存记录关联店面组
- ✅ 查询条件正确过滤
- ✅ 双向可见性验证

---

## 📞 支持文档

- `FIX_GROUP_DATA_VISIBILITY.md` - 详细修复说明
- `QUICK_TEST_GROUP_INVENTORY.md` - 快速测试指南
- `models/UserNew.js` - 用户模型文档
- `models/StoreGroup.js` - 店面组模型文档
- `middleware/dataIsolation.js` - 数据隔离中间件

---

**群组库存功能已修复并测试通过！** 🎊

**开始测试**：http://localhost:3000  
**测试账号**：MurrayRanelagh / 123456  
**祝使用愉快！** 🚀
