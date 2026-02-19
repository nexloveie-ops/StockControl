const mongoose = require('mongoose');
require('dotenv').config();

async function checkProduct() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    const serialNumber = '35532010';
    
    console.log(`\n查询序列号: ${serialNumber}\n`);
    
    // 查询ProductNew
    const productNew = await ProductNew.findOne({
      'serialNumbers.serialNumber': serialNumber
    }).lean();
    
    if (productNew) {
      console.log('📦 ProductNew:');
      console.log(`  名称: ${productNew.name}`);
      console.log(`  品牌: ${productNew.brand}`);
      console.log(`  型号: ${productNew.model}`);
      console.log(`  颜色: ${productNew.color || '(无)'}`);
      console.log(`  成色: ${productNew.condition}`);
      
      const serial = productNew.serialNumbers.find(sn => sn.serialNumber === serialNumber);
      if (serial) {
        console.log(`  序列号状态: ${serial.status}`);
      }
    } else {
      console.log('❌ ProductNew中未找到');
    }
    
    // 查询AdminInventory
    const adminInventory = await AdminInventory.findOne({
      serialNumber: serialNumber
    }).lean();
    
    if (adminInventory) {
      console.log('\n📦 AdminInventory:');
      console.log(`  产品名称: ${adminInventory.productName}`);
      console.log(`  品牌: ${adminInventory.brand}`);
      console.log(`  型号: ${adminInventory.model}`);
      console.log(`  颜色: ${adminInventory.color}`);
      console.log(`  成色: ${adminInventory.condition}`);
      console.log(`  状态: ${adminInventory.status}`);
    } else {
      console.log('\n❌ AdminInventory中未找到');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkProduct();
