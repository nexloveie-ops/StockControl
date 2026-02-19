const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

async function testAvailableAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const AdminInventory = require('./models/AdminInventory');
    
    // 1. 查找 iPhone 13 的一条记录
    const iphone13 = await AdminInventory.findOne({
      productName: /iPhone 13/i,
      isActive: true,
      status: 'AVAILABLE',
      quantity: { $gt: 0 }
    });
    
    if (!iphone13) {
      console.log('❌ 没有找到 iPhone 13');
      return;
    }
    
    console.log('📱 找到 iPhone 13:');
    console.log(`   _id: ${iphone13._id}`);
    console.log(`   产品名称: ${iphone13.productName}`);
    console.log(`   型号: ${iphone13.model}`);
    console.log(`   颜色: ${iphone13.color}`);
    console.log(`   成色: ${iphone13.condition}`);
    console.log(`   序列号: ${iphone13.serialNumber}`);
    console.log(`   数量: ${iphone13.quantity}`);
    console.log('');
    
    // 2. 调用 API
    console.log('🔍 调用 API: /api/warehouse/products/' + iphone13._id + '/available\n');
    
    const response = await axios.get(`http://localhost:8080/api/warehouse/products/${iphone13._id}/available`);
    
    console.log('📦 API 响应:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data.length > 0) {
      console.log('\n✅ 返回的产品:');
      response.data.data.forEach((product, index) => {
        console.log(`\n   产品 ${index + 1}:`);
        console.log(`     _id: ${product._id}`);
        console.log(`     name: ${product.name}`);
        console.log(`     model: ${product.model}`);
        console.log(`     color: ${product.color}`);
        console.log(`     serialNumber: ${product.serialNumber || 'N/A'}`);
        console.log(`     imei: ${product.imei || 'N/A'}`);
        console.log(`     quantity: ${product.quantity}`);
        console.log(`     source: ${product.source}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.response) {
      console.error('   响应数据:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
  }
}

testAvailableAPI();
