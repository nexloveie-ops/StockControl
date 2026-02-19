const mongoose = require('mongoose');
require('dotenv').config();

const ProductNew = require('./models/ProductNew');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const product = await ProductNew.findOne({ name: 'iPhone 13' }).lean();
    
    if (product) {
      console.log('\n=== iPhone 13 ===');
      console.log('_id:', product._id);
      console.log('name:', product.name);
      console.log('isActive:', product.isActive);
      console.log('stockQuantity:', product.stockQuantity);
      console.log('serialNumbers:', product.serialNumbers?.length || 0);
      
      if (product.serialNumbers && product.serialNumbers.length > 0) {
        console.log('\n序列号:');
        product.serialNumbers.forEach(sn => {
          console.log(`  - ${sn.serialNumber}: ${sn.status}`);
        });
        
        const hasSold = product.serialNumbers.some(sn => sn.status === 'sold');
        console.log('\n有已售序列号?', hasSold);
      }
    } else {
      console.log('❌ 未找到 iPhone 13');
    }

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

test();
