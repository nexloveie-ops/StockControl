const mongoose = require('mongoose');
require('dotenv').config();

async function checkInvoice() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ 连接成功\n');

  const db = mongoose.connection.db;
  const col = db.collection('salesinvoices');

  const invoice = await col.findOne({ invoiceNumber: 'SI-1774621956925-0004' });
  if (!invoice) {
    console.log('❌ 未找到发票');
    return;
  }

  console.log('发票号:', invoice.invoiceNumber);
  console.log('总计:', invoice.totalAmount);
  console.log('\n商品明细:');
  invoice.items.forEach((item, i) => {
    console.log(`\n${i+1}. ${item.description || item.productName}`);
    console.log('   数量:', item.quantity);
    console.log('   所有价格字段:', JSON.stringify({
      unitPrice: item.unitPrice,
      unitPriceIncludingTax: item.unitPriceIncludingTax,
      unitPriceExcludingTax: item.unitPriceExcludingTax,
      totalPrice: item.totalPrice,
      totalPriceIncludingTax: item.totalPriceIncludingTax,
      price: item.price,
      taxAmount: item.taxAmount,
      vatRate: item.vatRate
    }, null, 2));
  });

  await mongoose.connection.close();
}

checkInvoice().catch(console.error);
