const mongoose = require('mongoose');
require('dotenv').config();

async function checkUserStoreGroup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    const UserNew = require('./models/UserNew');
    
    const user = await UserNew.findOne({ username: 'MurrayRanelagh' })
      .populate('retailInfo.storeGroup');
    
    console.log('\n=== 用户信息 ===');
    console.log('用户名:', user.username);
    console.log('角色:', user.role);
    console.log('用户ID:', user._id);
    
    console.log('\n=== retailInfo ===');
    console.log(JSON.stringify(user.retailInfo, null, 2));
    
    if (user.retailInfo?.storeGroup) {
      console.log('\n=== 群组信息 ===');
      console.log('群组ID:', user.retailInfo.storeGroup._id);
      console.log('群组ID类型:', typeof user.retailInfo.storeGroup._id);
      console.log('群组名称:', user.retailInfo.storeGroup.name);
      console.log('群组代码:', user.retailInfo.storeGroup.code);
    } else {
      console.log('\n⚠️  用户没有分配群组');
      console.log('retailInfo.storeGroup 的值:', user.retailInfo?.storeGroup);
      console.log('retailInfo.storeGroup 的类型:', typeof user.retailInfo?.storeGroup);
    }
    
    // 检查原始数据（不使用 populate）
    const userRaw = await UserNew.findOne({ username: 'MurrayRanelagh' });
    console.log('\n=== 原始数据（未 populate）===');
    console.log('retailInfo.storeGroup:', userRaw.retailInfo?.storeGroup);
    console.log('类型:', typeof userRaw.retailInfo?.storeGroup);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkUserStoreGroup();
