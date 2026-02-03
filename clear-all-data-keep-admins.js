require('dotenv').config();
const mongoose = require('mongoose');

async function clearAllData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    console.log('⚠️  警告：此操作将清空所有数据，只保留管理员和仓库管理员账号！');
    console.log('='.repeat(80));
    
    // 获取所有集合
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📊 找到 ${collections.length} 个集合\n`);

    let deletedCount = 0;
    let keptCount = 0;

    for (const collection of collections) {
      const collectionName = collection.name;
      
      // 跳过系统集合
      if (collectionName.startsWith('system.')) {
        console.log(`⏭️  跳过系统集合: ${collectionName}`);
        continue;
      }

      // 对于 usernews 集合，只保留 admin 和 warehouse_manager
      if (collectionName === 'usernews') {
        const beforeCount = await mongoose.connection.db.collection(collectionName).countDocuments();
        
        // 删除除了 admin 和 warehouse_manager 之外的所有用户
        const result = await mongoose.connection.db.collection(collectionName).deleteMany({
          username: { $nin: ['admin', 'warehouse_manager'] }
        });
        
        const afterCount = await mongoose.connection.db.collection(collectionName).countDocuments();
        
        console.log(`👥 ${collectionName}: 删除 ${result.deletedCount} 个用户，保留 ${afterCount} 个管理员账号`);
        deletedCount += result.deletedCount;
        keptCount += afterCount;
        continue;
      }

      // 清空其他所有集合
      const count = await mongoose.connection.db.collection(collectionName).countDocuments();
      
      if (count > 0) {
        await mongoose.connection.db.collection(collectionName).deleteMany({});
        console.log(`🗑️  ${collectionName}: 删除 ${count} 条记录`);
        deletedCount += count;
      } else {
        console.log(`⚪ ${collectionName}: 已经是空的`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 清理汇总:');
    console.log('='.repeat(80));
    console.log(`✅ 保留的管理员账号: ${keptCount} 个`);
    console.log(`🗑️  删除的记录总数: ${deletedCount} 条`);
    console.log('\n✅ 数据清理完成！');
    console.log('\n保留的账号:');
    console.log('  - admin (管理员)');
    console.log('  - warehouse_manager (仓库管理员)');

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

// 确认提示
console.log('\n⚠️  警告：此操作将清空所有数据！');
console.log('只保留以下账号:');
console.log('  - admin (管理员)');
console.log('  - warehouse_manager (仓库管理员)');
console.log('\n按 Ctrl+C 取消，或等待 5 秒后自动执行...\n');

setTimeout(() => {
  clearAllData();
}, 5000);
