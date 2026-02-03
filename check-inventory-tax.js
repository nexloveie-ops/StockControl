require('dotenv').config();
const mongoose = require('mongoose');
const MerchantInventory = require('./models/MerchantInventory');

async function checkTax() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    // 查找 galaxy A53 的库存
    const inventory = await MerchantInventory.find({
      productName: /galaxy A53/i,
      merchantId: 'MurrayDundrum'
    });
    
    console.log(`\n📦 找到 ${inventory.length} 条库存记录:`);
    
    inventory.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.productName}`);
      console.log(`   序列号: ${item.serialNumber || item.imei || '无'}`);
      console.log(`   税务分类: "${item.taxClassification}"`);
      console.log(`   批发价: €${item.wholesalePrice}`);
      console.log(`   零售价: €${item.retailPrice}`);
      console.log(`   状态: ${item.status}`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

checkTax();
