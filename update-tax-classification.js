const mongoose = require('mongoose');
require('dotenv').config();

async function updateTaxClassification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 更新所有二手和翻新设备的税务分类
    const result = await MerchantInventory.updateMany(
      {
        $or: [
          { condition: 'PRE_OWNED' },
          { condition: 'REFURBISHED' },
          { category: '二手设备' }
        ],
        taxClassification: 'VAT_23'
      },
      {
        taxClassification: 'MARGIN_VAT_0'
      }
    );
    
    console.log('📊 批量更新结果:');
    console.log('  - 匹配的文档数:', result.matchedCount);
    console.log('  - 修改的文档数:', result.modifiedCount);
    
    // 显示更新后的产品
    const updated = await MerchantInventory.find({
      $or: [
        { condition: 'PRE_OWNED' },
        { condition: 'REFURBISHED' },
        { category: '二手设备' }
      ]
    }).select('productName category condition taxClassification');
    
    console.log('\n📦 更新后的产品列表:');
    updated.forEach(p => {
      console.log(`  - ${p.productName} (${p.category}, ${p.condition}) -> ${p.taxClassification}`);
    });
    
    await mongoose.connection.close();
    console.log('\n✅ 完成');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

updateTaxClassification();
