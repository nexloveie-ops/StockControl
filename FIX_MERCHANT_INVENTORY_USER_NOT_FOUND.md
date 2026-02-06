# 修复商户群组库存无法读取问题

## 问题描述
用户 MurrayDundrum 在 merchant.html 的"群组库存"标签页无法看到群组内其他商户的库存。

## 系统架构

### 前端调用
```javascript
// merchant.html
const response = await fetch(`${API_BASE}/merchant/group-inventory?merchantId=${merchantId}`);
```

### 后端API
```javascript
app.get('/api/merchant/group-inventory', applyGroupDataFilter, async (req, res) => {
  // 使用 applyGroupDataFilter 中间件设置数据过滤
  let query = { 
    ...req.dataFilter,  // 来自中间件的群组过滤
    status: 'active',
    isActive: true,
    quantity: { $gt: 0 }
  };
  
  // 排除当前用户自己的库存
  if (req.currentUsername) {
    query.merchantId = { $ne: req.currentUsername };
  }
  
  const inventory = await MerchantInventory.find(query);
});
```

### 数据隔离中间件
```javascript
async function applyGroupDataFilter(req, res, next) {
  const username = req.session?.username || req.query.merchantId;
  req.dataFilter = await getUserDataFilter(username, true); // true = 查看群组数据
}

async function getUserDataFilter(username, viewGroupData = false) {
  const user = await UserNew.findOne({ username });
  
  if (viewGroupData) {
    const canViewGroup = user.retailInfo?.canViewGroupInventory === true;
    const storeGroup = user.retailInfo?.storeGroup;
    
    if (canViewGroup && storeGroup) {
      return { storeGroup }; // 返回群组过滤条件
    }
  }
  
  return { merchantId: username }; // 默认只看自己的数据
}
```

## 服务器日志
```
✅ 用户 MurrayDundrum 查看组 69834c8de75caaea2d676f6d 的群组数据
```

中间件正确识别了用户的群组。

## 需要的调试信息

### 1. 查询条件
需要看到完整的查询条件：
```
群组库存查询条件: {
  "storeGroup": "69834c8de75caaea2d676f6d",
  "status": "active",
  "isActive": true,
  "quantity": { "$gt": 0 },
  "merchantId": { "$ne": "MurrayDundrum" }
}
```

### 2. 查询结果
需要看到：
- `群组库存查询结果数量: X`
- 如果有结果，显示第一条记录示例

### 3. 数据库验证
需要检查数据库中是否有其他商户的库存记录：

```javascript
// check-group-inventory.js
const mongoose = require('mongoose');
require('dotenv').config();

async function checkGroupInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    const MerchantInventory = require('./models/MerchantInventory');
    const UserNew = require('./models/UserNew');
    
    // 1. 检查 MurrayDundrum 的群组
    const user = await UserNew.findOne({ username: 'MurrayDundrum' })
      .populate('retailInfo.storeGroup');
    
    console.log('\n=== MurrayDundrum 用户信息 ===');
    console.log('用户名:', user.username);
    console.log('群组ID:', user.retailInfo?.storeGroup?._id);
    console.log('群组名称:', user.retailInfo?.storeGroup?.name);
    console.log('可查看群组库存:', user.retailInfo?.canViewGroupInventory);
    
    const groupId = user.retailInfo?.storeGroup?._id;
    
    if (!groupId) {
      console.log('\n⚠️  用户没有分配群组');
      process.exit(0);
    }
    
    // 2. 检查该群组的所有用户
    const groupUsers = await UserNew.find({
      'retailInfo.storeGroup': groupId,
      isActive: true
    });
    
    console.log('\n=== 群组内的用户 ===');
    groupUsers.forEach(u => {
      console.log(`- ${u.username} (${u.role})`);
    });
    
    // 3. 检查该群组的所有库存
    const allInventory = await MerchantInventory.find({
      storeGroup: groupId,
      isActive: true
    });
    
    console.log('\n=== 群组库存总览 ===');
    console.log('总记录数:', allInventory.length);
    
    const byMerchant = {};
    allInventory.forEach(item => {
      if (!byMerchant[item.merchantId]) {
        byMerchant[item.merchantId] = {
          total: 0,
          active: 0,
          sold: 0
        };
      }
      byMerchant[item.merchantId].total++;
      if (item.status === 'active' && item.quantity > 0) {
        byMerchant[item.merchantId].active++;
      }
      if (item.status === 'sold') {
        byMerchant[item.merchantId].sold++;
      }
    });
    
    console.log('\n按商户统计:');
    Object.entries(byMerchant).forEach(([merchantId, stats]) => {
      console.log(`- ${merchantId}:`);
      console.log(`  总数: ${stats.total}`);
      console.log(`  在售: ${stats.active}`);
      console.log(`  已售: ${stats.sold}`);
    });
    
    // 4. 检查其他商户的可用库存（MurrayDundrum 应该能看到的）
    const otherInventory = await MerchantInventory.find({
      storeGroup: groupId,
      merchantId: { $ne: 'MurrayDundrum' },
      status: 'active',
      isActive: true,
      quantity: { $gt: 0 }
    });
    
    console.log('\n=== MurrayDundrum 应该能看到的库存 ===');
    console.log('记录数:', otherInventory.length);
    
    if (otherInventory.length > 0) {
      console.log('\n前5条记录:');
      otherInventory.slice(0, 5).forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.productName}`);
        console.log(`   商户: ${item.merchantId}`);
        console.log(`   数量: ${item.quantity}`);
        console.log(`   状态: ${item.status}`);
        console.log(`   群组: ${item.storeGroup}`);
      });
    } else {
      console.log('\n⚠️  没有找到其他商户的可用库存');
      console.log('可能原因:');
      console.log('1. 其他商户还没有添加库存');
      console.log('2. 库存记录的 storeGroup 字段没有正确设置');
      console.log('3. 所有库存都已售出或数量为0');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkGroupInventory();
```

## 可能的原因

### 1. 没有其他商户的库存
- 群组内其他商户（如 MurrayRanelagh）还没有添加库存
- 需要先让其他商户添加一些库存数据

### 2. storeGroup 字段未设置
- 库存记录创建时没有正确设置 storeGroup 字段
- 需要检查创建库存的代码是否正确设置了 storeGroup

### 3. 用户权限问题
- MurrayDundrum 的 canViewGroupInventory 权限可能是 false
- 需要确认用户权限设置

### 4. 数据过滤条件问题
- 中间件返回的过滤条件可能不正确
- 需要查看完整的查询条件日志

## 下一步

1. 用户访问 MurrayDundrum 的群组库存页面
2. 查看服务器日志中的查询条件和结果
3. 运行 check-group-inventory.js 脚本检查数据库
4. 根据结果诊断问题
5. 修复代码或添加测试数据

## 状态
- 🔍 等待用户访问页面并提供日志
- 📝 已准备数据库检查脚本
