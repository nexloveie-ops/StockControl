const mongoose = require('mongoose');

const SOURCE_URI = 'mongodb+srv://toys123ie_db_user:scirvqPqLXJerZ7f@toys123ie.9gsjch4.mongodb.net/stockcontrol?retryWrites=true&w=majority&appName=toys123ie';
const TARGET_URI = 'mongodb+srv://lztech:Zz12341234@lztechserve.9qydb2t.mongodb.net/stockcontrol?appName=lztechserve';

async function migrateDatabase() {
  console.log('🚀 开始数据库迁移...\n');

  // 创建两个独立的连接
  const sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
  console.log('✅ 源数据库连接成功');

  const targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
  console.log('✅ 目标数据库连接成功\n');

  try {
    // 获取源数据库所有集合
    const collections = await sourceConn.db.listCollections().toArray();
    console.log(`📋 发现 ${collections.length} 个集合:\n`);
    collections.forEach(c => console.log(`   - ${c.name}`));
    console.log('');

    let totalDocs = 0;

    for (const collectionInfo of collections) {
      const collName = collectionInfo.name;

      // 跳过系统集合
      if (collName.startsWith('system.')) continue;

      const sourceCol = sourceConn.db.collection(collName);
      const targetCol = targetConn.db.collection(collName);

      // 获取所有文档
      const docs = await sourceCol.find({}).toArray();

      if (docs.length === 0) {
        console.log(`⏭️  ${collName}: 空集合，跳过`);
        continue;
      }

      // 清空目标集合（避免重复）
      await targetCol.deleteMany({});

      // 批量插入
      const batchSize = 500;
      let inserted = 0;

      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize);
        await targetCol.insertMany(batch, { ordered: false });
        inserted += batch.length;
      }

      totalDocs += inserted;
      console.log(`✅ ${collName}: ${inserted} 条记录已迁移`);

      // 迁移索引
      const indexes = await sourceCol.indexes();
      for (const index of indexes) {
        if (index.name === '_id_') continue; // 跳过默认索引
        try {
          const { key, ...options } = index;
          delete options.ns;
          delete options.v;
          await targetCol.createIndex(key, options);
        } catch (e) {
          // 索引已存在或其他错误，忽略
        }
      }
    }

    console.log(`\n🎉 迁移完成！共迁移 ${totalDocs} 条记录`);

  } catch (error) {
    console.error('❌ 迁移失败:', error);
  } finally {
    await sourceConn.close();
    await targetConn.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

migrateDatabase();
