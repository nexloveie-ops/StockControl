const mongoose = require('mongoose');
require('dotenv').config();

const AdminInventory = require('./models/AdminInventory');
const ProductNew = require('./models/ProductNew');

async function checkIPhone13() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n=== AdminInventory - iPhone 13 ===');
    const adminProducts = await AdminInventory.find({ 
      productName: /iPhone.*13/i 
    }).lean();
    console.log(`Found ${adminProducts.length} records`);
    adminProducts.forEach((p, idx) => {
      console.log(`\n[${idx + 1}]:`);
      console.log('  _id:', p._id);
      console.log('  productName:', p.productName);
      console.log('  model:', p.model);
      console.log('  color:', p.color);
      console.log('  condition:', p.condition);
      console.log('  serialNumber:', p.serialNumber);
      console.log('  quantity:', p.quantity);
    });

    console.log('\n=== ProductNew - iPhone 13 ===');
    const productNewRecords = await ProductNew.find({ 
      name: /iPhone.*13/i 
    }).lean();
    console.log(`Found ${productNewRecords.length} records`);
    productNewRecords.forEach((p, idx) => {
      console.log(`\n[${idx + 1}]:`);
      console.log('  _id:', p._id);
      console.log('  name:', p.name);
      console.log('  model:', p.model);
      console.log('  color:', p.color);
      console.log('  condition:', p.condition);
      console.log('  stockQuantity:', p.stockQuantity);
      console.log('  serialNumbers:', p.serialNumbers?.length || 0);
    });

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkIPhone13();
