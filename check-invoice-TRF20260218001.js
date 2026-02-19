const mongoose = require('mongoose');
require('dotenv').config();

async function checkInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const InterCompanySalesInvoice = require('./models/InterCompanySalesInvoice');
    
    // 查找与调货单TRF20260218001关联的销售发票
    const invoice = await InterCompanySalesInvoice.findOne({ 
      relatedTransferNumber: 'TRF20260218001' 
    }).lean();
    
    if (!invoice) {
      console.log('❌ 未找到关联的销售发票');
      return;
    }
    
    console.log('📄 销售发票信息:\n');
    console.log(`发票号: ${invoice.invoiceNumber}`);
    console.log(`关联调货单: ${invoice.relatedTransferNumber}`);
    console.log(`状态: ${invoice.status}`);
    console.log(`\n商品明细:\n`);
    
    invoice.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.productName}`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   单价: €${item.unitPrice}`);
      console.log(`   总价: €${item.totalPrice}`);
      console.log(`   taxClassification: "${item.taxClassification}"`);
      console.log(`   taxClassification类型: ${typeof item.taxClassification}`);
      console.log('');
    });
    
    console.log(`\n小计: €${invoice.subtotal}`);
    console.log(`VAT税率: ${invoice.vatRate}`);
    console.log(`VAT金额: €${invoice.vatAmount}`);
    console.log(`总金额: €${invoice.totalAmount}`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

checkInvoice();
