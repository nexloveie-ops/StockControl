const mongoose = require('mongoose');
require('dotenv').config();

async function checkIPhone11Category() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const ProductNew = require('./models/ProductNew');
    const ProductCategory = require('./models/ProductCategory');
    
    console.log('📱 检查 iPhone 11 的分类信息\n');
    console.log('='.repeat(80));
    
    // 查找 iPhone 11
    const iphone11 = await ProductNew.findOne({
      name: /iPhone 11/i,
      isActive: true,
      stockQuantity: { $gt: 0 }
    }).populate('category');
    
    if (!iphone11) {
      console.log('❌ 未找到 iPhone 11');
      return;
    }
    
    console.log('\niPhone 11 产品信息:');
    console.log(`  _id: ${iphone11._id}`);
    console.log(`  name: ${iphone11.name}`);
    console.log(`  condition: ${iphone11.condition}`);
    console.log(`  stockQuantity: ${iphone11.stockQuantity}`);
    console.log(`  category (ObjectId): ${iphone11.category?._id || 'null'}`);
    console.log(`  category.name: ${iphone11.category?.name || 'null'}`);
    console.log(`  category.type: ${iphone11.category?.type || 'null'}`);
    
    // 查看所有分类
    console.log('\n所有产品分类:');
    const categories = await ProductCategory.find({});
    categories.forEach(cat => {
      console.log(`  ${cat._id}: name="${cat.name}", type="${cat.type}"`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkIPhone11Category();
