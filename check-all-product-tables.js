require('dotenv').config();
const mongoose = require('mongoose');

async function checkAllProductTables() {
  try {
    console.log('🔌 连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    console.log('📊 检查所有可能的产品表...\n');

    // 获取数据库中所有的集合
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log('数据库中的所有集合：');
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`   - ${collection.name}: ${count} 条记录`);
    }

    console.log('\n');
    console.log('🔍 重点检查产品相关的集合：');
    
    const productCollections = [
      'admininventories',
      'merchantsales',
      'purchaseinvoices',
      'warehouseorders',
      'inventorytransfers',
      'repairorders',
      'intercompanysalesinvoices',
      'products',
      'merchantinventories',
      'storeinventories',
      'inventories',
      'sales',
      'salesinvoices',
      'merchantorders',
      'purchaseorders'
    ];

    for (const collectionName of productCollections) {
      try {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        if (count > 0) {
          console.log(`   ⚠️  ${collectionName}: ${count} 条记录 - 需要清除！`);
        } else {
          console.log(`   ✅ ${collectionName}: 0 条记录`);
        }
      } catch (error) {
        // 集合不存在
      }
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkAllProductTables();
