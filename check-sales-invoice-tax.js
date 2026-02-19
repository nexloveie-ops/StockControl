const mongoose = require('mongoose');
require('dotenv').config();

async function checkInvoiceTax() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    const SalesInvoice = require('./models/SalesInvoice');
    
    const invoiceNumber = 'SI-1771434626583-0001';
    
    const invoice = await SalesInvoice.findOne({ invoiceNumber }).lean();
    
    if (!invoice) {
      console.log('❌ 未找到发票');
      return;
    }
    
    console.log(`\n📋 销售发票: ${invoiceNumber}`);
    console.log(`客户: ${invoice.customer?.name || invoice.customerPhone}`);
    console.log(`总金额: €${invoice.totalAmount}`);
    console.log(`税额: €${invoice.taxAmount || 0}`);
    console.log(`\n产品明细:`);
    
    let calculatedTax = 0;
    
    invoice.items.forEach((item, i) => {
      console.log(`\n产品 ${i + 1}:`);
      console.log(`  名称: ${item.productName}`);
      console.log(`  数量: ${item.quantity}`);
      console.log(`  单价: €${item.price}`);
      console.log(`  总价: €${item.totalPrice}`);
      console.log(`  税率: ${item.vatRate}`);
      console.log(`  税额: €${item.taxAmount || 0}`);
      
      calculatedTax += (item.taxAmount || 0);
    });
    
    console.log(`\n计算的总税额: €${calculatedTax.toFixed(2)}`);
    console.log(`发票记录的税额: €${invoice.taxAmount || 0}`);
    
    if (calculatedTax === 0 && invoice.totalAmount > 0) {
      console.log(`\n⚠️  问题：总金额€${invoice.totalAmount}，但税额为€0`);
      console.log(`   这可能是因为所有产品都使用了Margin VAT税率`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkInvoiceTax();
