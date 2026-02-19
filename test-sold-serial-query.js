const mongoose = require('mongoose');
require('dotenv').config();

const ProductNew = require('./models/ProductNew');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n=== 查询所有有已售序列号的产品 ===');
    const products = await ProductNew.find({
      isActive: true,
      'serialNumbers.status': 'sold'
    }).select('name serialNumbers stockQuantity');
    
    console.log(`找到 ${products.length} 个产品`);
    
    products.forEach(p => {
      console.log(`\n${p.name} (stockQuantity: ${p.stockQuantity}):`);
      p.serialNumbers.forEach(sn => {
        console.log(`  - ${sn.serialNumber}: ${sn.status}`);
      });
    });

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

test();
