require('dotenv').config();
const mongoose = require('mongoose');
const MerchantInventory = require('./models/MerchantInventory');

async function updateCategory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    // 更新所有 galaxy A53 的分类从"未分类"改为"二手设备"
    const result = await MerchantInventory.updateMany(
      { 
        productName: /galaxy A53/i,
        category: '未分类'
      },
      { 
        $set: { category: '二手设备' }
      }
    );
    
    console.log(`\n✅ 更新了 ${result.modifiedCount} 条记录`);
    
    // 验证
    const inventory = await MerchantInventory.find({ 
      productName: /galaxy A53/i 
    });
    
    console.log('\n📦 galaxy A53 库存:');
    inventory.forEach(item => {
      console.log(`   - ${item.productName}: ${item.category}`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

updateCategory();
