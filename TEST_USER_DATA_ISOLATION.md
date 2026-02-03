# 测试用户数据隔离

## 问题诊断

### 原始问题
MurrayRanelagh 和 MurrayDundrum 看到的数据是一样的。

### 根本原因
✅ **已修复**: `merchant.html` 中 `merchantId` 被硬编码为 `'merchant_001'`

**原代码**:
```javascript
const merchantId = 'merchant_001'; // 实际应从登录session获取
```

**修复后**:
```javascript
const merchantId = localStorage.getItem('username') || 'merchant_001'; // 从登录session获取
```

### 当前数据状态

#### 用户信息
| 用户名 | 角色 | 店铺组 | 可查看组内数据 | 库存数量 | 销售记录 | 维修记录 |
|--------|------|--------|----------------|----------|----------|----------|
| MurrayRanelagh | retail_user | 无 | true | 0 | 0 | 0 |
| MurrayDundrum | retail_user | 无 | true | 0 | 0 | 0 |

#### 库存分布
- `merchant_001`: 3 个产品
- `MurrayRanelagh`: 0 个产品
- `MurrayDundrum`: 0 个产品

### 权限判断逻辑

对于 MurrayRanelagh 和 MurrayDundrum：
1. 他们是 `retail_user` 角色（不是管理员）
2. `canViewGroupInventory = true`（可以查看组内数据）
3. 但是 `storeGroup = null`（没有分配店铺组）
4. **结果**: 中间件返回 `{ merchantId: 'MurrayRanelagh' }` 或 `{ merchantId: 'MurrayDundrum' }`
5. **效果**: 每个用户只能看到自己的数据

## 测试步骤

### 1. 测试独立用户隔离

**步骤**:
1. 使用 MurrayRanelagh 登录
2. 访问 http://localhost:3000/merchant.html
3. 检查"我的库存"页面
4. 应该看到 0 个产品

5. 使用 MurrayDundrum 登录
6. 访问 http://localhost:3000/merchant.html
7. 检查"我的库存"页面
8. 应该看到 0 个产品

**预期结果**: ✅ 两个用户看到的数据不同（都是空的，因为他们没有数据）

### 2. 为用户添加测试数据

创建测试脚本为每个用户添加不同的库存：

```javascript
// 为 MurrayRanelagh 添加库存
const inventory1 = new MerchantInventory({
  merchantId: 'MurrayRanelagh',
  merchantName: 'Murray Ranelagh',
  productName: 'iPhone 13 Pro',
  category: '手机',
  serialNumber: 'RAN001',
  costPrice: 800,
  wholesalePrice: 900,
  retailPrice: 1000,
  quantity: 1,
  status: 'active',
  isActive: true
});

// 为 MurrayDundrum 添加库存
const inventory2 = new MerchantInventory({
  merchantId: 'MurrayDundrum',
  merchantName: 'Murray Dundrum',
  productName: 'Samsung Galaxy S22',
  category: '手机',
  serialNumber: 'DUN001',
  costPrice: 700,
  wholesalePrice: 800,
  retailPrice: 900,
  quantity: 1,
  status: 'active',
  isActive: true
});
```

### 3. 测试组内共享

**步骤**:
1. 创建一个店铺组（如果还没有）
2. 将 MurrayRanelagh 和 MurrayDundrum 分配到同一个组
3. 确保两个用户的 `canViewGroupInventory = true`
4. 重新登录测试

**预期结果**: 
- MurrayRanelagh 可以看到自己和 MurrayDundrum 的库存
- MurrayDundrum 可以看到自己和 MurrayRanelagh 的库存

### 4. 测试权限关闭

**步骤**:
1. 将 MurrayRanelagh 的 `canViewGroupInventory` 设置为 `false`
2. 保持 MurrayDundrum 的 `canViewGroupInventory = true`
3. 重新登录测试

**预期结果**:
- MurrayRanelagh 只能看到自己的库存
- MurrayDundrum 可以看到组内所有成员的库存

## 创建测试数据脚本

```javascript
// create-test-inventory.js
require('dotenv').config();
const mongoose = require('mongoose');

async function createTestInventory() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const MerchantInventory = require('./models/MerchantInventory');
  
  // 为 MurrayRanelagh 创建库存
  await MerchantInventory.create({
    merchantId: 'MurrayRanelagh',
    merchantName: 'Murray Ranelagh',
    productName: 'iPhone 13 Pro',
    brand: 'Apple',
    model: '13 Pro',
    category: '手机',
    serialNumber: 'RAN001',
    barcode: 'RAN001',
    costPrice: 800,
    wholesalePrice: 900,
    retailPrice: 1000,
    quantity: 1,
    condition: 'BRAND_NEW',
    status: 'active',
    isActive: true
  });
  
  // 为 MurrayDundrum 创建库存
  await MerchantInventory.create({
    merchantId: 'MurrayDundrum',
    merchantName: 'Murray Dundrum',
    productName: 'Samsung Galaxy S22',
    brand: 'Samsung',
    model: 'Galaxy S22',
    category: '手机',
    serialNumber: 'DUN001',
    barcode: 'DUN001',
    costPrice: 700,
    wholesalePrice: 800,
    retailPrice: 900,
    quantity: 1,
    condition: 'BRAND_NEW',
    status: 'active',
    isActive: true
  });
  
  console.log('✅ 测试数据创建成功');
  process.exit(0);
}

createTestInventory();
```

## 验证修复

### 检查点
- [x] 前端代码已修复（从 localStorage 获取 username）
- [ ] 刷新页面测试
- [ ] 创建测试数据
- [ ] 验证数据隔离工作正常

### 下一步
1. 刷新浏览器页面
2. 检查浏览器控制台，确认 merchantId 正确
3. 如果需要，创建测试数据
4. 验证两个用户看到不同的数据

## 注意事项

1. **清除缓存**: 修改后需要刷新页面（Ctrl+F5）
2. **检查 localStorage**: 确保 `localStorage.getItem('username')` 返回正确的用户名
3. **服务器日志**: 检查服务器日志，应该看到正确的用户名而不是 merchant_001

## 预期服务器日志

修复前:
```
⚠️  用户 merchant_001 不在 UserNew 表中，使用默认隔离策略
```

修复后:
```
✅ 用户 MurrayRanelagh 只能查看自己的数据
✅ 用户 MurrayDundrum 只能查看自己的数据
```
