require('dotenv').config();
const mongoose = require('mongoose');
const MerchantInventory = require('./models/MerchantInventory');

async function checkDundrumInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    // 查询 MurrayDundrum 的所有库存
    const allInventory = await MerchantInventory.find({
      merchantId: 'MurrayDundrum'
    });
    
    console.log(`\n=== MurrayDundrum 的所有库存 (${allInventory.length} 条) ===`);
    allInventory.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.productName}`);
      console.log(`   分类: ${item.category}`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   状态: ${item.status}`);
      console.log(`   isActive: ${item.isActive}`);
      console.log(`   storeGroup: ${item.storeGroup || '未设置'}`);
      console.log(`   序列号: ${item.serialNumber || '无'}`);
    });
    
    // 查询符合群组库存条件的
    const groupInventory = await MerchantInventory.find({
      merchantId: 'MurrayDundrum',
      status: 'active',
      isActive: true,
      quantity: { $gt: 0 },
      storeGroup: { $exists: true, $ne: null }
    });
    
    console.log(`\n=== 符合群组库存条件的 (${groupInventory.length} 条) ===`);
    groupInventory.forEach((item, index) => {
      console.log(`${index + 1}. ${item.productName} - ${item.category} (数量: ${item.quantity})`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkDundrumInventory();
