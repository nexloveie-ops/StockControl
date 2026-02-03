require('dotenv').config();
const mongoose = require('mongoose');
const MerchantInventory = require('./models/MerchantInventory');

async function checkInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    // 查询 MurrayDundrum 的库存
    const inventory = await MerchantInventory.find({ 
      merchantId: 'MurrayDundrum',
      status: 'active',
      isActive: true
    }).limit(5);
    
    console.log('\n📦 库存数据示例:');
    inventory.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.productName}`);
      console.log(`   category: "${item.category}" (类型: ${typeof item.category})`);
      console.log(`   brand: ${item.brand}`);
      console.log(`   model: ${item.model}`);
      console.log(`   quantity: ${item.quantity}`);
    });
    
    // 统计所有不同的 category 值
    const categories = await MerchantInventory.distinct('category', {
      merchantId: 'MurrayDundrum',
      status: 'active',
      isActive: true
    });
    
    console.log('\n📊 所有分类值:');
    categories.forEach(cat => {
      console.log(`   - "${cat}" (类型: ${typeof cat})`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

checkInventory();
