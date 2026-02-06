require('dotenv').config();
const mongoose = require('mongoose');

async function testMurrayRanelaghGroupAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const UserNew = require('./models/UserNew');
    const MerchantInventory = require('./models/MerchantInventory');
    const StoreGroup = require('./models/StoreGroup');
    
    // 1. 检查 MurrayRanelagh 用户信息
    console.log('=== 1. 检查 MurrayRanelagh 用户信息 ===');
    const ranelagh = await UserNew.findOne({ username: 'MurrayRanelagh' })
      .populate('retailInfo.storeGroup');
    
    if (!ranelagh) {
      console.log('❌ 找不到 MurrayRanelagh 用户');
      process.exit(0);
    }
    
    console.log('用户名:', ranelagh.username);
    console.log('群组ID:', ranelagh.retailInfo?.storeGroup?._id);
    console.log('群组名称:', ranelagh.retailInfo?.storeGroup?.name);
    console.log('canViewGroupInventory:', ranelagh.retailInfo?.canViewGroupInventory);
    console.log('canTransferFromGroup:', ranelagh.retailInfo?.canTransferFromGroup);
    
    // 2. 测试 /api/merchant/group-users API
    console.log('\n=== 2. 测试 /api/merchant/group-users API ===');
    const groupUsers = await UserNew.find({
      storeGroup: ranelagh.retailInfo?.storeGroup?._id,
      role: 'retail_user',
      isActive: true
    }).select('username profile');
    
    console.log(`找到 ${groupUsers.length} 个群组用户:`);
    groupUsers.forEach(u => {
      console.log(`  - ${u.username} (${u.profile?.firstName || 'N/A'})`);
    });
    
    // 3. 测试 /api/merchant/group-inventory API（查询 MurrayDundrum 的库存）
    console.log('\n=== 3. 测试 /api/merchant/group-inventory API ===');
    
    // 模拟数据隔离中间件的逻辑
    const canViewGroup = ranelagh.retailInfo?.canViewGroupInventory === true;
    const storeGroup = ranelagh.retailInfo?.storeGroup?._id;
    
    console.log('canViewGroup:', canViewGroup);
    console.log('storeGroup:', storeGroup);
    
    if (canViewGroup && storeGroup) {
      // 查询群组内其他用户的库存
      const inventory = await MerchantInventory.find({
        storeGroup: storeGroup,
        merchantId: { $ne: 'MurrayRanelagh' },  // 排除自己
        status: 'active',
        isActive: true,
        quantity: { $gt: 0 }
      });
      
      console.log(`\n找到 ${inventory.length} 件群组库存:`);
      
      // 按商户分组
      const byMerchant = {};
      inventory.forEach(item => {
        if (!byMerchant[item.merchantId]) {
          byMerchant[item.merchantId] = [];
        }
        byMerchant[item.merchantId].push(item);
      });
      
      Object.entries(byMerchant).forEach(([merchantId, items]) => {
        console.log(`\n  商户: ${merchantId} (${items.length} 件产品)`);
        items.slice(0, 3).forEach(item => {
          console.log(`    - ${item.productName} (${item.category}) x${item.quantity}`);
        });
      });
    } else {
      console.log('❌ 用户没有群组查看权限');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

testMurrayRanelaghGroupAPI();
