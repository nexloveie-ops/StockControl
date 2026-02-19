require('dotenv').config();
const mongoose = require('mongoose');

async function checkVatRates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const VatRate = require('./models/VatRate');

    const vatRates = await VatRate.find({}).sort({ sortOrder: 1 });

    console.log(`📊 找到 ${vatRates.length} 条税率记录:\n`);

    if (vatRates.length === 0) {
      console.log('⚠️  数据库中没有税率数据');
    } else {
      vatRates.forEach(vat => {
        console.log(`${vat.code}: ${vat.name} (${vat.rate}%)`);
        console.log(`  描述: ${vat.description || 'N/A'}`);
        console.log(`  适用范围: ${vat.applicableScope || 'N/A'}`);
        console.log(`  激活状态: ${vat.isActive ? '✅' : '❌'}`);
        console.log(`  排序: ${vat.sortOrder}\n`);
      });
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

checkVatRates();
