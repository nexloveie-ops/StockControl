/**
 * 检查 merchant_001 的数据和群组配置
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkMerchant001() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    const UserNew = require('./models/UserNew');
    
    // 检查用户信息
    console.log('='.repeat(60));
    console.log('检查 merchant_001 用户信息');
    console.log('='.repeat(60));
    
    const user = await UserNew.findOne({ username: 'merchant_001' });
    if (user) {
      console.log('✅ 用户存在于 UserNew 表');
      console.log(`  角色: ${user.role}`);
      console.log(`  店铺组: ${user.retailInfo?.storeGroup || '无'}`);
      console.log(`  可查看组内数据: ${user.retailInfo?.canViewGroupInventory || false}`);
    } else {
      console.log('⚠️  用户不在 UserNew 表中');
    }
    
    // 检查库存数据
    console.log('\n' + '='.repeat(60));
    console.log('检查 merchant_001 库存数据');
    console.log('='.repeat(60));
    
    const inventory = await MerchantInventory.find({ 
      merchantId: 'merchant_001',
      isActive: true 
    });
    
    console.log(`\n总库存数量: ${inventory.length}`);
    
    if (inventory.length > 0) {
      console.log('\n库存详情:');
      inventory.forEach((item, index) => {
        console.log(`\n  产品 ${index + 1}:`);
        console.log(`    名称: ${item.productName}`);
        console.log(`    序列号: ${item.serialNumber}`);
        console.log(`    merchantId: ${item.merchantId}`);
        console.log(`    storeGroup: ${item.storeGroup || '无'}`);
        console.log(`    store: ${item.store || '无'}`);
      });
      
      // 统计有无 storeGroup
      const withGroup = inventory.filter(i => i.storeGroup).length;
      const withoutGroup = inventory.filter(i => !i.storeGroup).length;
      
      console.log('\n' + '='.repeat(60));
      console.log('storeGroup 统计:');
      console.log(`  有 storeGroup: ${withGroup} 个`);
      console.log(`  无 storeGroup: ${withoutGroup} 个`);
    }
    
    console.log('\n✅ 检查完成');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkMerchant001();
