// 测试ProductCategory数据
require('dotenv').config();
const mongoose = require('mongoose');

async function testCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功');
    
    const ProductCategory = require('./models/ProductCategory');
    
    const categories = await ProductCategory.find({ isActive: true });
    
    console.log(`\n📋 找到 ${categories.length} 个激活的分类:\n`);
    
    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (${cat.type})`);
      console.log(`   ID: ${cat._id}`);
      console.log(`   默认税率: ${cat.defaultVatRate}`);
      console.log(`   排序: ${cat.sortOrder}`);
      console.log('');
    });
    
    await mongoose.disconnect();
    console.log('✅ 测试完成');
    
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

testCategories();
