require('dotenv').config();
const mongoose = require('mongoose');
const MerchantInventory = require('./models/MerchantInventory');

async function fixTaxClassification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    // 修复所有税务分类
    const updates = [
      { from: 'VAT 23%', to: 'VAT_23' },
      { from: 'VAT 13.5%', to: 'SERVICE_VAT_13_5' },
      { from: 'VAT 0%', to: 'MARGIN_VAT_0' }
    ];
    
    for (const update of updates) {
      const result = await MerchantInventory.updateMany(
        { taxClassification: update.from },
        { $set: { taxClassification: update.to } }
      );
      console.log(`✓ "${update.from}" -> "${update.to}": ${result.modifiedCount} 条记录`);
    }
    
    console.log('\n✅ 修复完成');
    
    // 验证
    const inventory = await MerchantInventory.find({}).limit(5);
    console.log('\n📦 验证前 5 条记录:');
    inventory.forEach(item => {
      console.log(`   ${item.productName}: ${item.taxClassification}`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

fixTaxClassification();
