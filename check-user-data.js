/**
 * 检查用户数据隔离
 * 查看 MurrayRanelagh 和 MurrayDundrum 的数据
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkUserData() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    const MerchantSale = require('./models/MerchantSale');
    const RepairOrder = require('./models/RepairOrder');
    const UserNew = require('./models/UserNew');
    
    // 检查用户信息
    console.log('='.repeat(60));
    console.log('检查用户信息');
    console.log('='.repeat(60));
    
    const users = ['MurrayRanelagh', 'MurrayDundrum'];
    
    for (const username of users) {
      console.log(`\n📋 用户: ${username}`);
      
      const user = await UserNew.findOne({ username });
      if (user) {
        console.log(`  角色: ${user.role}`);
        console.log(`  店铺组: ${user.retailInfo?.storeGroup || '无'}`);
        console.log(`  可查看组内数据: ${user.retailInfo?.canViewGroupInventory || false}`);
      } else {
        console.log(`  ⚠️  用户不在 UserNew 表中`);
      }
      
      // 检查库存
      const inventory = await MerchantInventory.find({ 
        merchantId: username,
        isActive: true 
      });
      console.log(`  库存数量: ${inventory.length}`);
      if (inventory.length > 0) {
        console.log(`  库存产品:`);
        inventory.slice(0, 5).forEach(item => {
          console.log(`    - ${item.productName} (SN: ${item.serialNumber})`);
        });
        if (inventory.length > 5) {
          console.log(`    ... 还有 ${inventory.length - 5} 个产品`);
        }
      }
      
      // 检查销售记录
      const sales = await MerchantSale.find({ merchantId: username });
      console.log(`  销售记录: ${sales.length}`);
      
      // 检查维修记录
      const repairs = await RepairOrder.find({ merchantId: username });
      console.log(`  维修记录: ${repairs.length}`);
    }
    
    // 检查所有库存的 merchantId 分布
    console.log('\n' + '='.repeat(60));
    console.log('所有库存的 merchantId 分布');
    console.log('='.repeat(60));
    
    const allInventory = await MerchantInventory.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$merchantId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    allInventory.forEach(item => {
      console.log(`  ${item._id}: ${item.count} 个产品`);
    });
    
    console.log('\n✅ 检查完成');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkUserData();
