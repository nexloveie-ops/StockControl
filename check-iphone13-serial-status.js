const mongoose = require('mongoose');
require('dotenv').config();

const ProductNew = require('./models/ProductNew');
const AdminInventory = require('./models/AdminInventory');

async function checkIPhone13() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n=== ProductNew - iPhone 13 ===');
    const product = await ProductNew.findOne({ 
      name: 'iPhone 13'
    }).lean();
    
    if (product) {
      console.log('_id:', product._id);
      console.log('name:', product.name);
      console.log('stockQuantity:', product.stockQuantity);
      console.log('serialNumbers:', product.serialNumbers?.length || 0);
      
      if (product.serialNumbers && product.serialNumbers.length > 0) {
        console.log('\n序列号详情:');
        product.serialNumbers.forEach((sn, idx) => {
          console.log(`  [${idx + 1}] ${sn.serialNumber}:`);
          console.log('      status:', sn.status);
          console.log('      color:', sn.color);
          console.log('      purchaseInvoice:', sn.purchaseInvoice);
        });
        
        const availableCount = product.serialNumbers.filter(sn => sn.status === 'available').length;
        console.log(`\n可销售序列号: ${availableCount} 个`);
      }
    } else {
      console.log('未找到 iPhone 13');
    }

    console.log('\n=== AdminInventory - iPhone 13 ===');
    const adminProduct = await AdminInventory.findOne({ 
      productName: 'iPhone 13'
    }).lean();
    
    if (adminProduct) {
      console.log('_id:', adminProduct._id);
      console.log('productName:', adminProduct.productName);
      console.log('serialNumber:', adminProduct.serialNumber);
      console.log('quantity:', adminProduct.quantity);
      console.log('status:', adminProduct.status);
      console.log('salesStatus:', adminProduct.salesStatus);
    } else {
      console.log('未找到 iPhone 13');
    }

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkIPhone13();
