# 用户数据隔离实施方案

## 当前状态分析

### 数据模型现状
1. **MerchantInventory**: 使用 `merchantId` (String) 和 `storeGroup` (ObjectId)
2. **MerchantSale**: 使用 `merchantId` (String)
3. **RepairOrder**: 使用 `merchantId` (String)
4. **UserNew**: 有 `retailInfo.storeGroup` 和 `retailInfo.canViewGroupInventory`

### 关键发现
- 所有模型都使用 `merchantId` (字符串) 来标识用户
- `merchantId` 实际上就是用户的 `username`
- 已经有 `storeGroup` 字段支持
- UserNew 模型已经有 `canViewGroupInventory` 权限字段

## 实施方案

### 方案选择
**保持使用 merchantId (username)，不需要添加 userId 字段**

理由：
1. 现有数据已经使用 merchantId
2. merchantId 实际上就是 username，可以直接使用
3. 避免大规模数据迁移
4. 保持向后兼容

### 实施步骤

## Phase 1: API 权限控制修改

### 1.1 创建权限检查中间件

**文件**: `StockControl-main/middleware/dataIsolation.js`

```javascript
/**
 * 数据隔离中间件
 * 根据用户权限设置查询过滤条件
 */

const UserNew = require('../models/UserNew');

/**
 * 获取用户的数据查询过滤条件
 * @param {Object} req - Express request 对象
 * @returns {Object} 查询过滤条件
 */
async function getUserDataFilter(req) {
  const username = req.user?.username || localStorage.getItem('username');
  
  if (!username) {
    throw new Error('用户未登录');
  }
  
  // 查询用户信息
  const user = await UserNew.findOne({ username });
  
  if (!user) {
    throw new Error('用户不存在');
  }
  
  // 管理员可以看到所有数据
  if (user.role === 'admin') {
    return {}; // 空对象表示不过滤
  }
  
  // 检查是否可以查看组内数据
  const canViewGroup = user.retailInfo?.canViewGroupInventory === true;
  const storeGroup = user.retailInfo?.storeGroup;
  
  if (canViewGroup && storeGroup) {
    // 可以查看组内所有成员的数据
    return { storeGroup };
  } else {
    // 只能查看自己的数据
    return { merchantId: username };
  }
}

/**
 * 中间件：为请求添加数据过滤条件
 */
async function applyDataIsolation(req, res, next) {
  try {
    req.dataFilter = await getUserDataFilter(req);
    next();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}

module.exports = {
  getUserDataFilter,
  applyDataIsolation
};
```

### 1.2 修改库存查询 API

**文件**: `StockControl-main/app.js`

**当前代码** (大约在某行):
```javascript
app.get('/api/merchant/inventory', async (req, res) => {
  const merchantId = req.query.merchantId;
  const inventory = await MerchantInventory.find({ merchantId, isActive: true });
  res.json(inventory);
});
```

**修改为**:
```javascript
const { applyDataIsolation } = require('./middleware/dataIsolation');

app.get('/api/merchant/inventory', applyDataIsolation, async (req, res) => {
  try {
    const { category, search } = req.query;
    
    // 基础过滤条件（来自中间件）
    let query = { ...req.dataFilter, isActive: true };
    
    // 添加分类过滤
    if (category) {
      query.category = category;
    }
    
    // 添加搜索过滤
    if (search) {
      query.$or = [
        { serialNumber: new RegExp(search, 'i') },
        { barcode: new RegExp(search, 'i') },
        { productName: new RegExp(search, 'i') },
        { notes: new RegExp(search, 'i') }
      ];
    }
    
    const inventory = await MerchantInventory.find(query)
      .sort({ createdAt: -1 });
    
    res.json(inventory);
  } catch (error) {
    console.error('查询库存失败:', error);
    res.status(500).json({ error: '查询库存失败' });
  }
});
```

### 1.3 修改销售记录查询 API

```javascript
app.get('/api/merchant/sales', applyDataIsolation, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 基础过滤条件
    let query = { ...req.dataFilter };
    
    // 添加日期过滤
    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) query.saleDate.$gte = new Date(startDate);
      if (endDate) query.saleDate.$lte = new Date(endDate);
    }
    
    const sales = await MerchantSale.find(query)
      .sort({ saleDate: -1 })
      .populate('items.inventoryId')
      .populate('items.repairOrderId');
    
    res.json(sales);
  } catch (error) {
    console.error('查询销售记录失败:', error);
    res.status(500).json({ error: '查询销售记录失败' });
  }
});
```

### 1.4 修改维修记录查询 API

```javascript
app.get('/api/merchant/repairs', applyDataIsolation, async (req, res) => {
  try {
    const { status } = req.query;
    
    // 基础过滤条件
    let query = { ...req.dataFilter };
    
    // 添加状态过滤
    if (status) {
      query.status = status;
    }
    
    const repairs = await RepairOrder.find(query)
      .sort({ receivedDate: -1 });
    
    res.json(repairs);
  } catch (error) {
    console.error('查询维修记录失败:', error);
    res.status(500).json({ error: '查询维修记录失败' });
  }
});
```

### 1.5 修改统计数据 API

```javascript
app.get('/api/merchant/stats', applyDataIsolation, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    // 基础过滤条件
    const baseFilter = req.dataFilter;
    
    // 本日销售
    const todaySales = await MerchantSale.find({
      ...baseFilter,
      saleDate: { $gte: today, $lt: tomorrow },
      status: 'completed'
    });
    
    // 本日维修
    const todayRepairs = await RepairOrder.find({
      ...baseFilter,
      receivedDate: { $gte: today, $lt: tomorrow }
    });
    
    // 本月税额
    const monthSales = await MerchantSale.find({
      ...baseFilter,
      saleDate: { $gte: firstDayOfMonth, $lt: firstDayOfNextMonth },
      status: 'completed'
    });
    
    // 库存总数
    const totalInventory = await MerchantInventory.countDocuments({
      ...baseFilter,
      isActive: true
    });
    
    // 计算统计数据
    const todaySalesAmount = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const todayRepairsCount = todayRepairs.length;
    const monthTaxAmount = monthSales.reduce((sum, sale) => sum + (sale.totalTax || 0), 0);
    
    res.json({
      todaySales: {
        count: todaySales.length,
        amount: todaySalesAmount,
        details: todaySales
      },
      todayRepairs: {
        count: todayRepairsCount,
        details: todayRepairs
      },
      monthTax: {
        amount: monthTaxAmount,
        details: monthSales
      },
      totalInventory
    });
  } catch (error) {
    console.error('查询统计数据失败:', error);
    res.status(500).json({ error: '查询统计数据失败' });
  }
});
```

## Phase 2: 数据创建时关联用户和组

### 2.1 入库时关联

```javascript
app.post('/api/merchant/inventory', async (req, res) => {
  try {
    const username = req.user?.username || localStorage.getItem('username');
    const user = await UserNew.findOne({ username });
    
    const inventoryData = {
      ...req.body,
      merchantId: username,
      merchantName: user?.profile?.firstName || username,
      storeGroup: user?.retailInfo?.storeGroup || null,
      store: user?.retailInfo?.store || null
    };
    
    const inventory = new MerchantInventory(inventoryData);
    await inventory.save();
    
    res.json(inventory);
  } catch (error) {
    console.error('创建库存失败:', error);
    res.status(500).json({ error: '创建库存失败' });
  }
});
```

### 2.2 销售时关联

```javascript
app.post('/api/merchant/sales', async (req, res) => {
  try {
    const username = req.user?.username || localStorage.getItem('username');
    
    const saleData = {
      ...req.body,
      merchantId: username
    };
    
    const sale = new MerchantSale(saleData);
    await sale.save();
    
    res.json(sale);
  } catch (error) {
    console.error('创建销售记录失败:', error);
    res.status(500).json({ error: '创建销售记录失败' });
  }
});
```

### 2.3 维修时关联

```javascript
app.post('/api/merchant/repairs', async (req, res) => {
  try {
    const username = req.user?.username || localStorage.getItem('username');
    
    const repairData = {
      ...req.body,
      merchantId: username
    };
    
    const repair = new RepairOrder(repairData);
    await repair.save();
    
    res.json(repair);
  } catch (error) {
    console.error('创建维修记录失败:', error);
    res.status(500).json({ error: '创建维修记录失败' });
  }
});
```

## Phase 3: 管理员配置界面

### 3.1 用户管理页面增强

在 `admin-user-management.html` 中添加：

1. **店铺组选择字段**
```html
<div class="form-group">
  <label>店铺组</label>
  <select id="editStoreGroup">
    <option value="">无（独立用户）</option>
    <!-- 动态加载店铺组列表 -->
  </select>
</div>
```

2. **组内共享权限开关**
```html
<div class="form-group" id="groupPermissionSection" style="display: none;">
  <label>
    <input type="checkbox" id="editCanViewGroupInventory">
    允许查看组内其他成员的数据
  </label>
</div>
```

3. **JavaScript 逻辑**
```javascript
// 当选择店铺组时，显示权限选项
document.getElementById('editStoreGroup').addEventListener('change', (e) => {
  const groupPermissionSection = document.getElementById('groupPermissionSection');
  if (e.target.value) {
    groupPermissionSection.style.display = 'block';
  } else {
    groupPermissionSection.style.display = 'none';
    document.getElementById('editCanViewGroupInventory').checked = false;
  }
});
```

### 3.2 API 端点

```javascript
// 更新用户的店铺组和权限
app.put('/api/admin/users/:id/retail-info', async (req, res) => {
  try {
    const { storeGroup, canViewGroupInventory } = req.body;
    
    const user = await UserNew.findByIdAndUpdate(
      req.params.id,
      {
        'retailInfo.storeGroup': storeGroup || null,
        'retailInfo.canViewGroupInventory': canViewGroupInventory || false
      },
      { new: true }
    );
    
    res.json(user);
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

// 获取所有店铺组
app.get('/api/admin/store-groups', async (req, res) => {
  try {
    const groups = await StoreGroup.find({});
    res.json(groups);
  } catch (error) {
    console.error('查询店铺组失败:', error);
    res.status(500).json({ error: '查询店铺组失败' });
  }
});
```

## Phase 4: 测试计划

### 4.1 独立用户测试
1. 创建用户 A（无店铺组）
2. 用户 A 创建库存、销售、维修记录
3. 创建用户 B（无店铺组）
4. 用户 B 创建库存、销售、维修记录
5. 验证：用户 A 只能看到自己的数据
6. 验证：用户 B 只能看到自己的数据

### 4.2 同组无权限测试
1. 创建店铺组 "Group1"
2. 将用户 A 和用户 B 分配到 Group1
3. 不授予 canViewGroupInventory 权限
4. 验证：用户 A 只能看到自己的数据
5. 验证：用户 B 只能看到自己的数据

### 4.3 同组有权限测试
1. 授予用户 A 的 canViewGroupInventory 权限
2. 验证：用户 A 可以看到 Group1 内所有成员的数据
3. 验证：用户 B 仍然只能看到自己的数据

### 4.4 管理员测试
1. 使用管理员账号登录
2. 验证：管理员可以看到所有用户的数据

## Phase 5: 安全检查清单

- [ ] 所有 API 都使用 applyDataIsolation 中间件
- [ ] 前端不能绕过后端权限检查
- [ ] 用户身份验证可靠（使用 JWT 或 session）
- [ ] 防止 SQL/NoSQL 注入
- [ ] 记录敏感操作的审计日志
- [ ] 测试所有边界情况

## 实施优先级

### 高优先级（立即实施）
1. ✅ 创建数据隔离中间件
2. ⬜ 修改库存查询 API
3. ⬜ 修改销售记录查询 API
4. ⬜ 修改维修记录查询 API
5. ⬜ 修改统计数据 API

### 中优先级（本周完成）
6. ⬜ 数据创建时关联用户和组
7. ⬜ 基础测试

### 低优先级（下周完成）
8. ⬜ 管理员配置界面
9. ⬜ 完整测试
10. ⬜ 文档更新

## 注意事项

1. **认证中间件**: 确保所有 API 都有认证中间件，req.user 可用
2. **localStorage**: 后端不能访问 localStorage，需要从 req.user 获取用户信息
3. **向后兼容**: 现有数据的 merchantId 已经是 username，无需迁移
4. **性能**: 添加适当的数据库索引以优化查询性能
5. **错误处理**: 所有 API 都要有完善的错误处理

## 下一步

请确认是否开始实施，或者需要调整方案？
