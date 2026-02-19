require('dotenv').config();
const mongoose = require('mongoose');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const ProductCategory = require('./models/ProductCategory');
    const ProductCondition = require('./models/ProductCondition');

    // 查询产品分类
    const categories = await ProductCategory.find({}).sort({ sortOrder: 1 });
    console.log(`📋 找到 ${categories.length} 条产品分类记录:\n`);
    
    if (categories.length === 0) {
      console.log('⚠️  数据库中没有产品分类数据\n');
    } else {
      categories.forEach(cat => {
        console.log(`${cat.type}`);
        console.log(`  描述: ${cat.description || 'N/A'}`);
        console.log(`  默认税率: ${cat.defaultVatRate}`);
        console.log(`  默认成色: ${cat.defaultCondition}`);
        console.log(`  激活状态: ${cat.isActive ? '✅' : '❌'}`);
        console.log(`  排序: ${cat.sortOrder}\n`);
      });
    }

    // 查询产品成色
    const conditions = await ProductCondition.find({}).sort({ sortOrder: 1 });
    console.log(`\n🏷️  找到 ${conditions.length} 条产品成色记录:\n`);
    
    if (conditions.length === 0) {
      console.log('⚠️  数据库中没有产品成色数据');
    } else {
      conditions.forEach(cond => {
        console.log(`${cond.code}: ${cond.name}`);
        console.log(`  描述: ${cond.description || 'N/A'}`);
        console.log(`  激活状态: ${cond.isActive ? '✅' : '❌'}`);
        console.log(`  排序: ${cond.sortOrder}\n`);
      });
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

checkData();
