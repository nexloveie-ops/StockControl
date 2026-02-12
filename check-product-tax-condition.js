const mongoose = require('mongoose');
require('dotenv').config();

const MerchantInventory = require('./models/MerchantInventory');
const PurchaseInvoice = require('./models/PurchaseInvoice');
const SalesInvoice = require('./models/SalesInvoice');

async function checkProductTaxCondition() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');

    // 查找一些商户库存产品
    console.log('\n=== 商户库存产品 ===');
    const inventoryProducts = await MerchantInventory.find().limit(5).lean();
    inventoryProducts.forEach(product => {
      console.log(`\n产品: ${product.productName}`);
      console.log('  - condition:', product.condition);
      console.log('  - taxClassification:', product.taxClassification);
      console.log('  - vatRate:', product.vatRate);
    });

    // 查找采购发票
    console.log('\n\n=== 采购发票产品 ===');
    const purchaseInvoice = await PurchaseInvoice.findOne().lean();
    if (purchaseInvoice && purchaseInvoice.items) {
      purchaseInvoice.items.forEach(item => {
        console.log(`\n产品: ${item.description}`);
        console.log('  - condition:', item.condition);
        console.log('  - taxClassification:', item.taxClassification);
        console.log('  - vatRate:', item.vatRate);
      });
    }

    // 查找销售发票
    console.log('\n\n=== 销售发票产品 ===');
    const salesInvoice = await SalesInvoice.findOne().lean();
    if (salesInvoice && salesInvoice.items) {
      salesInvoice.items.forEach(item => {
        console.log(`\n产品: ${item.description}`);
        console.log('  - condition:', item.condition);
        console.log('  - taxClassification:', item.taxClassification);
        console.log('  - vatRate:', item.vatRate);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkProductTaxCondition();
