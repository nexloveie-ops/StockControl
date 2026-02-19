const mongoose = require('mongoose');
require('dotenv').config();

async function checkInvoiceRaw() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    // 直接查询集合，不通过模型
    const db = mongoose.connection.db;
    const collection = db.collection('intercompanysalesinvoices');
    
    const invoice = await collection.findOne({ 
      relatedTransferNumber: 'TRF20260218001' 
    });
    
    if (!invoice) {
      console.log('❌ 未找到发票');
      return;
    }
    
    console.log('📄 原始发票数据:\n');
    console.log(`发票号: ${invoice.invoiceNumber}`);
    console.log(`关联调货单: ${invoice.relatedTransferNumber}`);
    console.log(`\n商品items原始数据:\n`);
    console.log(JSON.stringify(invoice.items, null, 2));
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

checkInvoiceRaw();
