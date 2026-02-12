const mongoose = require('mongoose');
require('dotenv').config();

const MerchantInventory = require('./models/MerchantInventory');

async function checkSI3688MerchantInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');

    // 查找SI-3688发票中的序列号对应的商户库存产品
    const serialNumbers = [
      '352459164934616', '357534562672102', '357977660208883',
      '350542602572361', '351952298904928', '350032738439198',
      '354827380091387', '356663518695940', '357479188926245',
      '357894923681543', '358239124217086', '357654171204665',
      '357479186201252', '352926111850103', '353988109592906',
      '352928114188457', '356581104143077', '352990110729262',
      '357196596034087', 'CDFXDES1', 'CDFXDES2', 'CDFXDES3'
    ];

    console.log('\n=== 查找商户库存中的产品 ===');
    
    for (const sn of serialNumbers) {
      const product = await MerchantInventory.findOne({ serialNumber: sn }).lean();
      if (product) {
        console.log(`\n序列号: ${sn}`);
        console.log('  - productName:', product.productName);
        console.log('  - condition:', product.condition);
        console.log('  - taxClassification:', product.taxClassification);
        console.log('  - status:', product.status);
      }
    }

    // 统计
    const foundCount = await MerchantInventory.countDocuments({
      serialNumber: { $in: serialNumbers }
    });
    
    console.log(`\n\n总计: ${serialNumbers.length} 个序列号`);
    console.log(`找到: ${foundCount} 个产品在商户库存中`);
    console.log(`缺失: ${serialNumbers.length - foundCount} 个产品`);

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkSI3688MerchantInventory();
