const mongoose = require('mongoose');
require('dotenv').config();

const PurchaseInvoice = require('./models/PurchaseInvoice');
const AdminInventory = require('./models/AdminInventory');

async function checkInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const invoiceNumber = 'SI-3688';
    
    console.log('\n=== PurchaseInvoice Collection ===');
    const purchaseInvoices = await PurchaseInvoice.find({ invoiceNumber }).lean();
    console.log(`Found ${purchaseInvoices.length} PurchaseInvoice records`);
    purchaseInvoices.forEach((inv, idx) => {
      console.log(`\n[${idx + 1}] PurchaseInvoice:`);
      console.log('  _id:', inv._id);
      console.log('  invoiceNumber:', inv.invoiceNumber);
      console.log('  items:', inv.items?.length || 0);
      inv.items?.forEach((item, i) => {
        console.log(`    Item ${i + 1}:`, {
          productName: item.productName,
          quantity: item.quantity,
          serialNumbers: item.serialNumbers,
          vatRate: item.vatRate
        });
      });
    });

    console.log('\n=== AdminInventory Collection ===');
    const adminInventory = await AdminInventory.find({ invoiceNumber }).lean();
    console.log(`Found ${adminInventory.length} AdminInventory records`);
    adminInventory.forEach((inv, idx) => {
      console.log(`\n[${idx + 1}] AdminInventory:`);
      console.log('  _id:', inv._id);
      console.log('  productName:', inv.productName);
      console.log('  serialNumber:', inv.serialNumber);
      console.log('  taxClassification:', inv.taxClassification);
      console.log('  condition:', inv.condition);
      console.log('  invoiceNumber:', inv.invoiceNumber);
    });

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkInvoice();
