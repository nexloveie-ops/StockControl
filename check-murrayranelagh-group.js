require('dotenv').config();
const mongoose = require('mongoose');

async function checkMurrayRanelaghGroup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const UserNew = require('./models/UserNew');
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 1. 检查 MurrayRanelagh 用户信息
    console.log('=== 1. 检查 MurrayRanelagh 用户信息 ===');
    const ranelagh = await UserNew.findOne({ username: 'MurrayRanelagh' });
    if (ranelagh) {
      console.log('用户名:', ranelagh.username);
      console.log('群组:', ranelagh.storeGroup);
      console.log('角色:', ranelagh.role);
      console.log('激活状态:', ranelagh.isActive);
    } else {
      console.log('❌ 找不到 MurrayRanelagh 用户');
      process.exit(0);
    }
    
    // 2. 检查同一群组的其他用户
    console.log('\n=== 2. 检查同一群组的其他用户 ===');
    if (ranelagh.storeGroup) {
      const groupUsers = await UserNew.find({
        storeGroup: ranelagh.storeGroup,
        role: 'retail_user',
        isActive: true
      }).select('username profile storeGroup');
      
      console.log(`群组 ${ranelagh.storeGroup} 内的用户:`);
      groupUsers.forEach(user => {
        console.log(`  - ${user.username} (${user.profile?.firstName || 'N/A'})`);
      });
      
      // 3. 检查其他用户的库存
      console.log('\n=== 3. 检查群组内其他用户的库存 ===');
      for (const user of groupUsers) {
        if (user.username !== 'MurrayRanelagh') {
          const inventory = await MerchantInventory.find({
            merchantId: user.username,
            status: 'active',
            isActive: true,
            quantity: { $gt: 0 }
          });
          
          console.log(`\n${user.username} 的库存:`);
          console.log(`  总数: ${inventory.length} 件产品`);
          
          if (inventory.length > 0) {
            console.log('  前5件产品:');
            inventory.slice(0, 5).forEach(item => {
              console.log(`    - ${item.productName} (${item.category || '未分类'}) x${item.quantity}`);
            });
          }
        }
      }
      
      // 4. 检查 MurrayRanelagh 自己的库存
      console.log('\n=== 4. 检查 MurrayRanelagh 自己的库存 ===');
      const ranelaghInventory = await MerchantInventory.find({
        merchantId: 'MurrayRanelagh',
        status: 'active',
        isActive: true,
        quantity: { $gt: 0 }
      });
      console.log(`总数: ${ranelaghInventory.length} 件产品`);
      
    } else {
      console.log('❌ MurrayRanelagh 没有设置群组');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkMurrayRanelaghGroup();
