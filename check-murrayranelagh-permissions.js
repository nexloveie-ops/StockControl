require('dotenv').config();
const mongoose = require('mongoose');

async function checkMurrayRanelaghPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const UserNew = require('./models/UserNew');
    const StoreGroup = require('./models/StoreGroup');
    
    // 检查 MurrayRanelagh 用户信息
    console.log('=== MurrayRanelagh 用户信息 ===');
    const ranelagh = await UserNew.findOne({ username: 'MurrayRanelagh' })
      .populate('retailInfo.storeGroup');
    
    if (ranelagh) {
      console.log('用户名:', ranelagh.username);
      console.log('角色:', ranelagh.role);
      console.log('激活状态:', ranelagh.isActive);
      console.log('\nretailInfo:');
      console.log('  storeType:', ranelagh.retailInfo?.storeType);
      console.log('  storeGroup:', ranelagh.retailInfo?.storeGroup?._id || '❌ 未设置');
      console.log('  canViewGroupInventory:', ranelagh.retailInfo?.canViewGroupInventory);
      console.log('  canTransferFromGroup:', ranelagh.retailInfo?.canTransferFromGroup);
      
      if (ranelagh.retailInfo?.storeGroup) {
        console.log('\n群组详情:');
        console.log('  ID:', ranelagh.retailInfo.storeGroup._id);
        console.log('  名称:', ranelagh.retailInfo.storeGroup.name);
        console.log('  代码:', ranelagh.retailInfo.storeGroup.code);
        console.log('  库存共享:', ranelagh.retailInfo.storeGroup.settings?.allowInventorySharing);
        console.log('  店面调货:', ranelagh.retailInfo.storeGroup.settings?.allowStoreTransfers);
      } else {
        console.log('\n❌ 用户没有设置群组！');
        console.log('需要在管理后台设置用户的群组。');
      }
    } else {
      console.log('❌ 找不到 MurrayRanelagh 用户');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkMurrayRanelaghPermissions();
