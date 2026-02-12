// 检查销售发票的数据结构
require('dotenv').config();
const mongoose = require('mongoose');

async function checkInvoiceStructure() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const SalesInvoice = require('./models/SalesInvoice');
    
    const invoiceNumber = 'SI-1770857743240-0001';
    
    const invoice = await SalesInvoice.findOne({ invoiceNumber }).lean();
    
    if (!invoice) {
      console.log(`❌ 找不到发票: ${invoiceNumber}`);
      return;
    }
    
    console.log(`📄 销售发票完整数据结构:\n`);
    console.log(JSON.stringify(invoice, null, 2));
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkInvoiceStructure();
