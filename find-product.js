const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

async function findProduct() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');

    console.log('搜索包含 "iPhone" 和 "Clear Case" 和 "12 Pro Max" 的产品...\n');
    
    // 搜索 ProductNew
    const productsNew = await ProductNew.find({
      name: /iPhone.*Clear Case.*12 Pro Max/i
    }).limit(5);
    
    console.log('ProductNew 中找到的产品:');
    if (productsNew.length > 0) {
      productsNew.forEach(p => {
        console.log(`  - ${p.name} (库存: ${p.stockQuantity}, ID: ${p._id})`);
      });
    } else {
      console.log('  (无)');
    }
    
    // 搜索 AdminInventory
    const productsAdmin = await AdminInventory.find({
      productName: /iPhone.*Clear Case.*12 Pro Max/i
    }).limit(5);
    
    console.log('\nAdminInventory 中找到的产品:');
    if (productsAdmin.length > 0) {
      productsAdmin.forEach(p => {
        console.log(`  - ${p.productName} (库存: ${p.quantity}, ID: ${p._id})`);
      });
    } else {
      console.log('  (无)');
    }
    
    // 尝试更宽松的搜索
    console.log('\n\n搜索所有包含 "Clear Case" 的产品...\n');
    
    const allProductsNew = await ProductNew.find({
      name: /Clear Case/i
    }).limit(10);
    
    console.log('ProductNew:');
    allProductsNew.forEach(p => {
      console.log(`  - ${p.name} (库存: ${p.stockQuantity})`);
    });
    
    const allProductsAdmin = await AdminInventory.find({
      productName: /Clear Case/i
    }).limit(10);
    
    console.log('\nAdminInventory:');
    allProductsAdmin.forEach(p => {
      console.log(`  - ${p.productName} (库存: ${p.quantity})`);
    });
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await mongoose.connection.close();
  }
}

findProduct();
