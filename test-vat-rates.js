// 测试VatRate数据
require('dotenv').config();
const mongoose = require('mongoose');

async function testVatRates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功');
    
    const VatRate = require('./models/VatRate');
    
    const vatRates = await VatRate.find({ isActive: true }).sort({ sortOrder: 1, rate: 1 });
    
    console.log(`\n💰 找到 ${vatRates.length} 个激活的税率:\n`);
    
    vatRates.forEach((vat, index) => {
      console.log(`${index + 1}. ${vat.name} (${vat.rate}%)`);
      console.log(`   Code: ${vat.code}`);
      console.log(`   描述: ${vat.description || '-'}`);
      console.log(`   适用范围: ${vat.applicableScope || '-'}`);
      console.log('');
    });
    
    await mongoose.disconnect();
    console.log('✅ 测试完成');
    
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

testVatRates();
