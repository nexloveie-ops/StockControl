require('dotenv').config();
const mongoose = require('mongoose');

async function checkMobile123() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const UserNew = require('./models/UserNew');
    const MerchantInventory = require('./models/MerchantInventory');
    const StoreGroup = require('./models/StoreGroup');  // 加载 StoreGroup 模型
    
    // 1. 检查 Mobile123 用户信息
    console.log('=== 1. 检查 Mobile123 用户信息 ===');
    const mobile123 = await UserNew.findOne({ username: 'Mobile123' })
      .populate('retailInfo.storeGroup');
    
    if (mobile123) {
      console.log('用户名:', mobile123.username);
      console.log('retailInfo.storeGroup (ObjectId):', mobile123.retailInfo?.storeGroup);
      console.log('retailInfo.canViewGroupInventory:', mobile123.retailInfo?.canViewGroupInventory);
      console.log('retailInfo.canTransferFromGroup:', mobile123.retailInfo?.canTransferFromGroup);
      
      if (mobile123.retailInfo?.storeGroup) {
        console.log('\n群组详情:');
        console.log('  ID:', mobile123.retailInfo.storeGroup._id);
        console.log('  名称:', mobile123.retailInfo.storeGroup.name);
        console.log('  代码:', mobile123.retailInfo.storeGroup.code);
      }
    } else {
      console.log('❌ 找不到 Mobile123 用户');
      process.exit(0);
    }
    
    // 2. 检查同一群组的其他用户
    if (mobile123.retailInfo?.storeGroup) {
      console.log('\n=== 2. 检查同一群组的其他用户 ===');
      const groupId = mobile123.retailInfo.storeGroup._id;
      
      const groupUsers = await UserNew.find({
        'retailInfo.storeGroup': groupId,
        role: 'retail_user',
        isActive: true
      }).select('username profile retailInfo.storeGroup');
      
      console.log(`群组内的用户 (${groupUsers.length} 人):`);
      groupUsers.forEach(user => {
        console.log(`  - ${user.username} (${user.profile?.firstName || 'N/A'})`);
      });
      
      // 3. 检查其他用户的库存
      console.log('\n=== 3. 检查群组内其他用户的库存 ===');
      for (const user of groupUsers) {
        if (user.username !== 'Mobile123') {
          const inventory = await MerchantInventory.find({
            merchantId: user.username,
            storeGroup: groupId,
            status: 'active',
            isActive: true,
            quantity: { $gt: 0 }
          });
          
          console.log(`\n${user.username} 的库存:`);
          console.log(`  总数: ${inventory.length} 件产品`);
          
          if (inventory.length > 0) {
            console.log('  前3件产品:');
            inventory.slice(0, 3).forEach(item => {
              console.log(`    - ${item.productName} (${item.category || '未分类'}) x${item.quantity}`);
              console.log(`      storeGroup: ${item.storeGroup}`);
            });
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkMobile123();
