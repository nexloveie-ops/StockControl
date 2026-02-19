const mongoose = require('mongoose');
require('dotenv').config();

const AdminInventory = require('./models/AdminInventory');

async function fixTaxClassification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const invoiceNumber = 'SI-3688';
    
    console.log(`\n修复发票 ${invoiceNumber} 的税务分类...\n`);

    // 更新所有SI-3688的产品税务分类为MARGIN_VAT_0
    const result = await AdminInventory.updateMany(
      { invoiceNumber: invoiceNumber },
      { $set: { taxClassification: 'MARGIN_VAT_0' } }
    );

    console.log(`✅ 更新了 ${result.modifiedCount} 条记录`);
    console.log(`   税务分类: VAT_23 → MARGIN_VAT_0`);

    // 验证更新结果
    const updatedProducts = await AdminInventory.find({ invoiceNumber }).lean();
    console.log(`\n验证结果:`);
    updatedProducts.forEach((p, idx) => {
      console.log(`  [${idx + 1}] ${p.productName} (${p.serialNumber}): ${p.taxClassification}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ 修复完成！');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixTaxClassification();
