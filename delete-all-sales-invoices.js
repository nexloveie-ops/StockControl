const mongoose = require('mongoose');
require('dotenv').config();

async function deleteSalesInvoices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n开始删除所有销售记录...\n');

    // 删除 SalesInvoice
    const SalesInvoice = require('./models/SalesInvoice');
    const salesResult = await SalesInvoice.deleteMany({});
    console.log(`✅ SalesInvoice: 删除 ${salesResult.deletedCount} 条记录`);

    // 删除 InterCompanySalesInvoice（如果有）
    try {
      const InterCompanySalesInvoice = require('./models/InterCompanySalesInvoice');
      const interCompanyResult = await InterCompanySalesInvoice.deleteMany({});
      console.log(`✅ InterCompanySalesInvoice: 删除 ${interCompanyResult.deletedCount} 条记录`);
    } catch (error) {
      console.log(`⚠️  InterCompanySalesInvoice: ${error.message}`);
    }

    // 删除 SalesRecord（如果有）
    try {
      const collection = mongoose.connection.collection('salesrecords');
      const salesRecordResult = await collection.deleteMany({});
      console.log(`✅ SalesRecord: 删除 ${salesRecordResult.deletedCount} 条记录`);
    } catch (error) {
      console.log(`⚠️  SalesRecord: ${error.message}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ 所有销售记录删除完成！');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteSalesInvoices();
