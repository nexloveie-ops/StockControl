require('dotenv').config();
const mongoose = require('mongoose');

async function checkProductIMEI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    
    // 查找 galaxy A53 产品
    const products = await ProductNew.find({ 
      name: /galaxy A53/i 
    }).lean(); // 使用 lean() 获取原始数据
    
    console.log(`找到 ${products.length} 个 galaxy A53 产品:\n`);
    
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   ID: ${product._id}`);
      console.log(`   SKU: ${product.sku}`);
      console.log(`   IMEI: ${product.imei || '无'}`);
      console.log(`   SN: ${product.serialNumber || '无'}`);
      console.log(`   quantity: ${product.quantity || '无此字段'}`);
      console.log(`   stockQuantity: ${product.stockQuantity || '无此字段'}`);
      console.log(`   激活: ${product.isActive}`);
      console.log(`   品牌: ${product.brand}`);
      console.log(`   型号: ${product.model}`);
      console.log(`   颜色: ${product.color}`);
      console.log(`   成色: ${product.condition}`);
      console.log('\n   原始数据:');
      console.log(JSON.stringify(product, null, 2));
      console.log('');
    });
    
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkProductIMEI();
