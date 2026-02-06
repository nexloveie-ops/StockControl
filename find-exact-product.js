const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

async function findProduct() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const AdminInventory = require('./models/AdminInventory');

    console.log('搜索所有 "iPhone Clear Case" 产品的详细信息...\n');
    
    const products = await AdminInventory.find({
      productName: /iPhone Clear Case/i
    });
    
    products.forEach((p, index) => {
      console.log(`${index + 1}. ${p.productName}`);
      console.log(`   型号: ${p.model || '无'}`);
      console.log(`   品牌: ${p.brand || '无'}`);
      console.log(`   库存: ${p.quantity}`);
      console.log(`   ID: ${p._id}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await mongoose.connection.close();
  }
}

findProduct();
