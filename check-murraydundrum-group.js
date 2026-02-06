const mongoose = require('mongoose');
require('dotenv').config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const UserNew = require('./models/UserNew');
    const StoreGroup = require('./models/StoreGroup');
    
    const user = await UserNew.findOne({ username: 'MurrayDundrum' })
      .populate('retailInfo.storeGroup');
    
    console.log('=== MurrayDundrum 用户信息 ===');
    console.log('用户名:', user.username);
    console.log('群组:', user.retailInfo?.storeGroup?.name || 'null');
    console.log('群组ID:', user.retailInfo?.storeGroup?._id || 'null');
    console.log('canViewGroupInventory:', user.retailInfo?.canViewGroupInventory);
    console.log('canTransferFromGroup:', user.retailInfo?.canTransferFromGroup);
    
    console.log('\n=== retailInfo 原始数据 ===');
    console.log(JSON.stringify(user.retailInfo, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkUser();
