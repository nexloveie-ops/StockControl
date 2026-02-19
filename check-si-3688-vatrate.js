const mongoose = require('mongoose');
require('dotenv').config();

const PurchaseInvoice = require('./models/PurchaseInvoice');
const AdminInventory = require('./models/AdminInventory');

async function checkInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const invoiceNumber = 'SI-3688';
    
    console.log('\n=== PurchaseInvoice ===');
    const purchaseInvoice = await PurchaseInvoice.findOne({ invoiceNumber }).lean();
    if (purchaseInvoice) {
      console.log('找到 PurchaseInvoice');
      console.log('items:', purchaseInvoice.items?.length || 0);
      purchaseInvoice.items?.forEach((item, idx) => {
        console.log(`\nItem ${idx + 1}:`);
        console.log('  description:', item.description);
        console.log('  vatRate:', item.vatRate);
        console.log('  serialNumbers:', item.serialNumbers);
      });
    } else {
      console.log('未找到 PurchaseInvoice');
    }

    console.log('\n=== AdminInventory ===');
    const adminInventory = await AdminInventory.find({ invoiceNumber }).lean();
    console.log(`找到 ${adminInventory.length} 条 AdminInventory 记录`);
    adminInventory.forEach((item, idx) => {
      console.log(`\n[${idx + 1}]:`);
      console.log('  productName:', item.productName);
      console.log('  serialNumber:', item.serialNumber);
      console.log('  taxClassification:', item.taxClassification);
    });

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkInvoice();
