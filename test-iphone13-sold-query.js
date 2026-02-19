const mongoose = require('mongoose');
require('dotenv').config();

const ProductNew = require('./models/ProductNew');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n=== 查询 iPhone 13 ===');
    const product = await ProductNew.findOne({
      name: 'iPhone 13',
      isActive: true,
      'serialNumbers.status': 'sold'
    }).select('name serialNumbers stockQuantity');
    
    if (product) {
      console.log('找到产品:', product.name);
      console.log('stockQuantity:', product.stockQuantity);
      console.log('serialNumbers:');
      product.serialNumbers.forEach(sn => {
        console.log(`  - ${sn.serialNumber}: ${sn.status}`);
      });
    } else {
      console.log('❌ 未找到产品');
      
      // 尝试不带sold条件查询
      const productWithoutSold = await ProductNew.findOne({
        name: 'iPhone 13',
        isActive: true
      }).select('name serialNumbers stockQuantity');
      
      if (productWithoutSold) {
        console.log('\n不带sold条件找到产品:', productWithoutSold.name);
        console.log('serialNumbers:');
        productWithoutSold.serialNumbers.forEach(sn => {
          console.log(`  - ${sn.serialNumber}: ${sn.status}`);
        });
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

test();
