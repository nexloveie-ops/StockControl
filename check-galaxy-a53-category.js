require('dotenv').config();
const mongoose = require('mongoose');
const ProductNew = require('./models/ProductNew');
const ProductCategory = require('./models/ProductCategory');

async function checkProduct() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    // 查找 galaxy A53 产品
    const products = await ProductNew.find({ name: /galaxy A53/i });
    
    console.log(`\n📱 找到 ${products.length} 个 galaxy A53 产品:`);
    
    for (const product of products) {
      console.log(`\n产品 ID: ${product._id}`);
      console.log(`名称: ${product.name}`);
      console.log(`分类 ID: ${product.category}`);
      
      // 查找分类
      const category = await ProductCategory.findById(product.category);
      if (category) {
        console.log(`分类名称: ${category.name}`);
        console.log(`分类类型: ${category.type}`);
      } else {
        console.log(`❌ 找不到分类`);
      }
    }
    
    // 列出所有分类
    console.log('\n\n📊 所有产品分类:');
    const categories = await ProductCategory.find({});
    categories.forEach(cat => {
      console.log(`   ${cat._id}: ${cat.name} (${cat.type})`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

checkProduct();
