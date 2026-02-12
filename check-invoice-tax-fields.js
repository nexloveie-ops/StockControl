const mongoose = require('mongoose');
require('dotenv').config();

const PurchaseInvoice = require('./models/PurchaseInvoice');
const SalesInvoice = require('./models/SalesInvoice');

async function checkInvoiceTaxFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');

    // 查找一个采购发票
    const purchaseInvoice = await PurchaseInvoice.findOne().lean();
    if (purchaseInvoice) {
      console.log('\n=== 采购发票示例 ===');
      console.log('发票编号:', purchaseInvoice.invoiceNumber);
      console.log('\n产品字段:');
      if (purchaseInvoice.items && purchaseInvoice.items.length > 0) {
        const item = purchaseInvoice.items[0];
        console.log('产品名称:', item.description || item.productName);
        console.log('所有字段:', Object.keys(item));
        console.log('\n完整产品数据:');
        console.log(JSON.stringify(item, null, 2));
      }
    }

    // 查找一个销售发票
    const salesInvoice = await SalesInvoice.findOne().lean();
    if (salesInvoice) {
      console.log('\n=== 销售发票示例 ===');
      console.log('发票编号:', salesInvoice.invoiceNumber);
      console.log('\n产品字段:');
      if (salesInvoice.items && salesInvoice.items.length > 0) {
        const item = salesInvoice.items[0];
        console.log('产品名称:', item.description || item.productName);
        console.log('所有字段:', Object.keys(item));
        console.log('\n完整产品数据:');
        console.log(JSON.stringify(item, null, 2));
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkInvoiceTaxFields();
