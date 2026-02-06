require('dotenv').config();
const mongoose = require('mongoose');

async function checkAllData() {
  try {
    console.log('🔗 连接到 MongoDB Atlas...');
    console.log(`📍 数据库: ${process.env.MONGODB_URI.split('@')[1].split('/')[1].split('?')[0]}`);
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 获取所有集合
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 数据库中的集合数量: ${collections.length}\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const collection of collections) {
      const collectionName = collection.name;
      const count = await mongoose.connection.db.collection(collectionName).countDocuments();
      
      const icon = count > 0 ? '📦' : '📭';
      console.log(`${icon} ${collectionName.padEnd(30)} : ${count} 条记录`);
      
      // 如果有数据，显示一条示例
      if (count > 0) {
        const sample = await mongoose.connection.db.collection(collectionName).findOne();
        console.log(`   示例数据字段: ${Object.keys(sample).slice(0, 5).join(', ')}...`);
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ 检查失败:', error);
    console.error('错误详情:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('👋 数据库连接已关闭');
    process.exit(0);
  }
}

checkAllData();
