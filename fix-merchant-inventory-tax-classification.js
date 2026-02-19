require('dotenv').config();
const mongoose = require('mongoose');

async function fixTaxClassification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const AdminInventory = require('./models/AdminInventory');
    const MerchantInventory = require('./models/MerchantInventory');

    // 查找所有从仓库订货的商户库存（source: 'warehouse'）
    const merchantInventories = await MerchantInventory.find({ 
      source: 'warehouse' 
    });

    console.log(`📦 找到 ${merchantInventories.length} 条从仓库订货的商户库存记录\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const merchantInv of merchantInventories) {
      // 查找对应的AdminInventory记录
      const adminInv = await AdminInventory.findOne({
        productName: merchantInv.productName,
        brand: merchantInv.brand,
        model: merchantInv.model,
        color: merchantInv.color,
        condition: merchantInv.condition
      });

      if (adminInv) {
        // 检查税务分类是否不一致
        if (merchantInv.taxClassification !== adminInv.taxClassification) {
          console.log(`🔧 修复产品: ${merchantInv.productName} (${merchantInv.serialNumber || '配件'})`);
          console.log(`   原税务分类: ${merchantInv.taxClassification}`);
          console.log(`   新税务分类: ${adminInv.taxClassification}`);
          
          merchantInv.taxClassification = adminInv.taxClassification;
          await merchantInv.save();
          
          fixedCount++;
        } else {
          skippedCount++;
        }
      } else {
        console.log(`⚠️  未找到对应的AdminInventory记录: ${merchantInv.productName}`);
      }
    }

    console.log(`\n✅ 修复完成:`);
    console.log(`   修复数量: ${fixedCount}`);
    console.log(`   跳过数量: ${skippedCount}`);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

fixTaxClassification();
