const mongoose = require('mongoose');
require('dotenv').config();

const ProductNew = require('./models/ProductNew');
const AdminInventory = require('./models/AdminInventory');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n=== ProductNew - iPhone 13 序列号 ===');
    const productNew = await ProductNew.findOne({ name: 'iPhone 13' }).lean();
    if (productNew && productNew.serialNumbers) {
      productNew.serialNumbers.forEach(sn => {
        console.log(`序列号: "${sn.serialNumber}" (类型: ${typeof sn.serialNumber})`);
        console.log(`  status: "${sn.status}"`);
        console.log(`  原始值: ${JSON.stringify(sn.serialNumber)}`);
      });
    }

    console.log('\n=== AdminInventory - iPhone 13 序列号 ===');
    const adminInv = await AdminInventory.findOne({ productName: 'iPhone 13' }).lean();
    if (adminInv) {
      console.log(`序列号: "${adminInv.serialNumber}" (类型: ${typeof adminInv.serialNumber})`);
      console.log(`  原始值: ${JSON.stringify(adminInv.serialNumber)}`);
    }

    console.log('\n=== 比较 ===');
    if (productNew && adminInv) {
      const pnSerial = productNew.serialNumbers[0].serialNumber;
      const aiSerial = adminInv.serialNumber;
      console.log(`ProductNew: "${pnSerial}"`);
      console.log(`AdminInventory: "${aiSerial}"`);
      console.log(`相等? ${pnSerial === aiSerial}`);
      console.log(`严格相等? ${pnSerial === aiSerial && typeof pnSerial === typeof aiSerial}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

check();
