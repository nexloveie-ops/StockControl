require('dotenv').config();
const mongoose = require('mongoose');
const UserNew = require('./models/UserNew');

async function checkUserGroups() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    // 查询两个用户
    const users = await UserNew.find({
      username: { $in: ['MurrayRanelagh', 'MurrayDundrum'] }
    }).select('username role retailInfo');
    
    console.log('\n=== 用户信息 ===');
    users.forEach(user => {
      console.log(`\n用户: ${user.username}`);
      console.log(`角色: ${user.role}`);
      console.log(`店面类型: ${user.retailInfo?.storeType || '未设置'}`);
      console.log(`店面组 ID: ${user.retailInfo?.storeGroup || '未设置'}`);
      console.log(`店面 ID: ${user.retailInfo?.store || '未设置'}`);
      console.log(`可查看群组库存: ${user.retailInfo?.canViewGroupInventory || false}`);
      console.log(`可从群组调货: ${user.retailInfo?.canTransferFromGroup || false}`);
    });
    
    // 检查是否在同一个群组
    if (users.length === 2) {
      const group1 = users[0].retailInfo?.storeGroup?.toString();
      const group2 = users[1].retailInfo?.storeGroup?.toString();
      
      console.log('\n=== 群组关系 ===');
      if (group1 && group2 && group1 === group2) {
        console.log('✅ 两个用户在同一个群组');
      } else {
        console.log('❌ 两个用户不在同一个群组或未设置群组');
        console.log(`MurrayRanelagh 群组: ${group1 || '未设置'}`);
        console.log(`MurrayDundrum 群组: ${group2 || '未设置'}`);
      }
    }
    
    // 查询 MerchantInventory 数据
    const MerchantInventory = require('./models/MerchantInventory');
    
    console.log('\n=== 库存数据 ===');
    for (const user of users) {
      const count = await MerchantInventory.countDocuments({
        merchantId: user.username,
        status: 'active',
        isActive: true
      });
      console.log(`${user.username} 的库存数量: ${count}`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkUserGroups();
