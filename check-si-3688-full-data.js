const mongoose = require('mongoose');
require('dotenv').config();

const PurchaseInvoice = require('./models/PurchaseInvoice');

async function checkInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const invoiceNumber = 'SI-3688';
    
    const invoice = await PurchaseInvoice.findOne({ invoiceNumber }).lean();
    
    if (invoice) {
      console.log('\n=== PurchaseInvoice Full Data ===');
      console.log('_id:', invoice._id);
      console.log('invoiceNumber:', invoice.invoiceNumber);
      console.log('supplier:', invoice.supplier);
      console.log('invoiceDate:', invoice.invoiceDate);
      console.log('createdAt:', invoice.createdAt);
      console.log('items count:', invoice.items?.length || 0);
      
      console.log('\n=== Items Details ===');
      invoice.items?.forEach((item, i) => {
        console.log(`\nItem ${i + 1}:`);
        console.log('  product:', item.product);
        console.log('  productName:', item.productName);
        console.log('  description:', item.description);
        console.log('  quantity:', item.quantity);
        console.log('  unitCost:', item.unitCost);
        console.log('  serialNumbers:', item.serialNumbers);
        console.log('  vatRate:', item.vatRate);
      });
    } else {
      console.log('❌ PurchaseInvoice not found');
    }

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkInvoice();
