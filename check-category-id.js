require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const ProductNew = require('./models/ProductNew');

async function checkCategory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    const categoryId = '697f9be06164706bb1ca0d56';
    
    // 检查 Category 集合
    console.log('\n📂 检查 Category 集合:');
    const category = await Category.findById(categoryId);
    if (category) {
      console.log(`   找到: ${category.name} (${category.type})`);
    } else {
      console.log(`   ❌ 未找到 ID: ${categoryId}`);
    }
    
    // 检查所有分类
    console.log('\n📊 所有分类:');
    const allCategories = await Category.find({});
    allCategories.forEach(cat => {
      console.log(`   - ${cat._id}: ${cat.name} (${cat.type})`);
    });
    
    // 检查 galaxy A53 产品
    console.log('\n📱 检查 galaxy A53 产品:');
    const products = await ProductNew.find({ name: /galaxy A53/i }).populate('category');
    products.forEach(p => {
      console.log(`   产品 ID: ${p._id}`);
      console.log(`   分类 ID: ${p.category?._id || p.category}`);
      console.log(`   分类名称: ${p.category?.name || '未知'}`);
      console.log(`   分类类型: ${p.category?.type || '未知'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ 已断开数据库连接');
  }
}

checkCategory();
