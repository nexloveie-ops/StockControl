require('dotenv').config();
const mongoose = require('mongoose');

async function checkAllCollections() {
  try {
    console.log('🔌 连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    console.log('📊 检查所有集合的详细数据...\n');

    // 获取数据库中所有的集合
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('数据库中的所有集合及其数据：');
    console.log('═══════════════════════════════════════════════════════\n');
    
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`\n📦 ${collection.name}: ${count} 条记录`);
      
      if (count > 0 && count <= 10) {
        // 如果记录数不多，显示详细数据
        const docs = await mongoose.connection.db.collection(collection.name).find({}).limit(10).toArray();
        docs.forEach((doc, index) => {
          console.log(`\n   记录 ${index + 1}:`);
          console.log(`   ID: ${doc._id}`);
          
          // 显示关键字段
          if (doc.productName) console.log(`   产品名称: ${doc.productName}`);
          if (doc.name) console.log(`   名称: ${doc.name}`);
          if (doc.model) console.log(`   型号: ${doc.model}`);
          if (doc.serialNumber) console.log(`   序列号: ${doc.serialNumber}`);
          if (doc.quantity) console.log(`   数量: ${doc.quantity}`);
          if (doc.costPrice) console.log(`   进货价: €${doc.costPrice}`);
          if (doc.wholesalePrice) console.log(`   批发价: €${doc.wholesalePrice}`);
          if (doc.retailPrice) console.log(`   零售价: €${doc.retailPrice}`);
          if (doc.createdAt) console.log(`   创建时间: ${doc.createdAt}`);
        });
      } else if (count > 10) {
        // 如果记录太多，只显示前3条
        const docs = await mongoose.connection.db.collection(collection.name).find({}).limit(3).toArray();
        console.log(`   (显示前3条记录)`);
        docs.forEach((doc, index) => {
          console.log(`\n   记录 ${index + 1}:`);
          console.log(`   ID: ${doc._id}`);
          if (doc.productName) console.log(`   产品名称: ${doc.productName}`);
          if (doc.name) console.log(`   名称: ${doc.name}`);
          if (doc.username) console.log(`   用户名: ${doc.username}`);
          if (doc.email) console.log(`   邮箱: ${doc.email}`);
        });
        console.log(`   ... 还有 ${count - 3} 条记录`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('总结：');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`总集合数: ${collections.length}`);
    
    let totalRecords = 0;
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      totalRecords += count;
    }
    console.log(`总记录数: ${totalRecords}`);

  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkAllCollections();
