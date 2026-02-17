const mongoose = require('mongoose');
const ProductCategory = require('./models/ProductCategory');

mongoose.connect('mongodb://localhost:27017/stockcontrol')
  .then(async () => {
    console.log('✅ MongoDB连接成功\n');
    
    const categories = await ProductCategory.find({ isActive: true });
    console.log(`找到 ${categories.length} 个激活的分类:\n`);
    
    categories.forEach(cat => {
      console.log(`📦 分类:`);
      console.log(`   type: "${cat.type}"`);
      console.log(`   description: "${cat.description || '无'}"`);
      console.log(`   包含accessory: ${cat.type.toLowerCase().includes('accessory')}`);
      console.log(`   包含配件: ${cat.type.toLowerCase().includes('配件')}`);
      console.log('');
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 错误:', err);
    process.exit(1);
  });
