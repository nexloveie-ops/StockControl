require('dotenv').config();
const mongoose = require('mongoose');
const ProductCategory = require('./models/ProductCategory');
const ProductCondition = require('./models/ProductCondition');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 检查产品分类
    console.log('📦 产品分类 (ProductCategory):');
    console.log('='.repeat(60));
    const categories = await ProductCategory.find().sort({ sortOrder: 1 });
    
    if (categories.length === 0) {
      console.log('⚠️  没有找到任何产品分类数据');
    } else {
      console.log(`找到 ${categories.length} 个分类:\n`);
      categories.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.type}`);
        console.log(`   描述: ${cat.description || '无'}`);
        console.log(`   默认税率: ${cat.defaultVatRate}`);
        console.log(`   激活状态: ${cat.isActive ? '✅' : '❌'}`);
        console.log(`   排序: ${cat.sortOrder}`);
        console.log('');
      });
    }

    // 检查设备成色
    console.log('\n🎨 设备成色 (ProductCondition):');
    console.log('='.repeat(60));
    const conditions = await ProductCondition.find().sort({ sortOrder: 1 });
    
    if (conditions.length === 0) {
      console.log('⚠️  没有找到任何设备成色数据');
    } else {
      console.log(`找到 ${conditions.length} 个成色:\n`);
      conditions.forEach((cond, index) => {
        console.log(`${index + 1}. ${cond.name} (${cond.code})`);
        console.log(`   描述: ${cond.description || '无'}`);
        console.log(`   激活状态: ${cond.isActive ? '✅' : '❌'}`);
        console.log(`   排序: ${cond.sortOrder}`);
        console.log('');
      });
    }

    // 如果没有数据，提供创建建议
    if (categories.length === 0 || conditions.length === 0) {
      console.log('\n💡 建议:');
      console.log('请使用管理员账号登录系统，在"系统设置"中添加分类和成色数据');
      console.log('或者运行以下命令创建默认数据:');
      console.log('  node create-default-categories-conditions.js');
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkData();
