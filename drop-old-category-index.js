require('dotenv').config();
const mongoose = require('mongoose');

async function dropOldIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    console.log('='.repeat(80));
    console.log('🔍 检查 productcategories 集合的索引');
    console.log('='.repeat(80));

    const collection = mongoose.connection.db.collection('productcategories');
    
    // 列出所有索引
    const indexes = await collection.indexes();
    console.log('\n当前索引:');
    indexes.forEach((index, i) => {
      console.log(`\n${i + 1}. ${index.name}`);
      console.log(`   Keys:`, JSON.stringify(index.key));
      console.log(`   Unique:`, index.unique || false);
    });

    // 检查是否存在 name_1 索引
    const hasNameIndex = indexes.some(index => index.name === 'name_1');
    
    if (hasNameIndex) {
      console.log('\n' + '='.repeat(80));
      console.log('🗑️  删除旧的 name_1 索引...');
      console.log('='.repeat(80));
      
      await collection.dropIndex('name_1');
      console.log('\n✅ name_1 索引已删除');
      
      // 再次列出索引
      const newIndexes = await collection.indexes();
      console.log('\n更新后的索引:');
      newIndexes.forEach((index, i) => {
        console.log(`\n${i + 1}. ${index.name}`);
        console.log(`   Keys:`, JSON.stringify(index.key));
      });
    } else {
      console.log('\n✅ 没有找到 name_1 索引');
    }

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

dropOldIndex();
