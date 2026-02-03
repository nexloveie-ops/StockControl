require('dotenv').config();
const mongoose = require('mongoose');
const SalesInvoice = require('./models/SalesInvoice');
const ProductNew = require('./models/ProductNew');
const Customer = require('./models/Customer');

async function checkSalesInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 查找销售发票
    const invoice = await SalesInvoice.findOne({
      invoiceNumber: 'SI-1770079205989-0001'
    }).populate('customer').populate('items.product');

    if (!invoice) {
      console.log('❌ 未找到销售发票');
      return;
    }

    console.log('📋 销售发票信息:');
    console.log('   发票号:', invoice.invoiceNumber);
    console.log('   客户:', invoice.customer?.name || 'N/A');
    console.log('   日期:', invoice.invoiceDate);
    console.log('   总额: €' + invoice.totalAmount.toFixed(2));
    console.log('');

    console.log('📦 产品明细:');
    for (const item of invoice.items) {
      console.log(`\n   产品: ${item.description}`);
      console.log(`   产品ID: ${item.product?._id || 'N/A'}`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   单价: €${item.unitPrice.toFixed(2)}`);
      console.log(`   总价: €${item.totalPrice.toFixed(2)}`);
      console.log(`   VAT Rate (发票): ${item.vatRate || 'N/A'}`);
      console.log(`   Tax Amount (发票): €${item.taxAmount?.toFixed(2) || '0.00'}`);
      
      if (item.product) {
        console.log(`   VAT Rate (产品): ${item.product.vatRate || 'N/A'}`);
        console.log(`   产品分类: ${item.product.productType || 'N/A'}`);
      }
      
      if (item.serialNumbers && item.serialNumbers.length > 0) {
        console.log(`   序列号: ${item.serialNumbers.join(', ')}`);
      }
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkSalesInvoice();
