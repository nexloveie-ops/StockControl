require('dotenv').config();
const mongoose = require('mongoose');

async function fixNullCategoryName() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    console.log('='.repeat(80));
    console.log('🔍 检查产品分类中的 null name 记录');
    console.log('='.repeat(80));

    // 查找所有 name 为 null 或空的记录
    const ProductCategory = require('./models/ProductCategory');
    
    const nullNameCategories = await ProductCategory.find({
      $or: [
        { name: null },
        { name: '' },
        { name: { $exists: false } }
      ]
    });

    console.log(`\n找到 ${nullNameCategories.length} 个问题记录:\n`);

    if (nullNameCategories.length > 0) {
      nullNameCategories.forEach((cat, index) => {
        console.log(`${index + 1}. ID: ${cat._id}`);
        console.log(`   Name: ${cat.name}`);
        console.log(`   Type: ${cat.type || 'N/A'}`);
        console.log(`   Code: ${cat.code || 'N/A'}`);
        console.log(`   Created: ${cat.createdAt}`);
        console.log();
      });

      console.log('='.repeat(80));
      console.log('🗑️  删除这些问题记录...');
      console.log('='.repeat(80));

      const result = await ProductCategory.deleteMany({
        $or: [
          { name: null },
          { name: '' },
          { name: { $exists: false } }
        ]
      });

      console.log(`\n✅ 已删除 ${result.deletedCount} 个问题记录`);
    } else {
      console.log('✅ 没有发现问题记录');
    }

    // 显示剩余的分类
    console.log('\n' + '='.repeat(80));
    console.log('📊 当前产品分类列表');
    console.log('='.repeat(80));

    const allCategories = await ProductCategory.find({}).sort({ type: 1, name: 1 });
    
    if (allCategories.length > 0) {
      allCategories.forEach((cat, index) => {
        console.log(`\n${index + 1}. ${cat.name}`);
        console.log(`   类型: ${cat.type}`);
        console.log(`   代码: ${cat.code || 'N/A'}`);
        console.log(`   VAT: ${cat.defaultVatRate || 'N/A'}`);
      });
    } else {
      console.log('\n⚠️  数据库中没有产品分类');
    }

    console.log('\n' + '='.repeat(80));
    console.log(`总计: ${allCategories.length} 个产品分类`);
    console.log('='.repeat(80));

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

fixNullCategoryName();
