require('dotenv').config();
const mongoose = require('mongoose');

async function deleteAllProducts() {
  try {
    console.log('🔌 连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    console.log('🗑️  准备删除所有产品数据...\n');

    // 所有可能包含产品数据的集合
    const productCollections = [
      'productnews',
      'admininventories',
      'merchantinventories',
      'products',
      'storeinventories',
      'inventories',
      'admin_inventory',
      'merchant_inventory',
      'products_new',
      'product3cs'
    ];

    let totalDeleted = 0;
    const deletionResults = [];

    for (const collectionName of productCollections) {
      try {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        if (count > 0) {
          console.log(`🗑️  删除 ${collectionName}...`);
          const result = await mongoose.connection.db.collection(collectionName).deleteMany({});
          console.log(`   ✅ 已删除 ${result.deletedCount} 条记录\n`);
          totalDeleted += result.deletedCount;
          deletionResults.push({ collection: collectionName, deleted: result.deletedCount });
        }
      } catch (error) {
        // 集合不存在，跳过
      }
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ 产品数据删除完成！');
    console.log('═══════════════════════════════════════════════════════');
    
    if (deletionResults.length > 0) {
      console.log('\n📊 删除统计：');
      deletionResults.forEach(result => {
        console.log(`   - ${result.collection}: ${result.deleted} 条`);
      });
      console.log(`\n   总计删除: ${totalDeleted} 条产品记录`);
    } else {
      console.log('\nℹ️  没有找到需要删除的产品记录');
    }

    console.log('\n✅ 保留的数据：');
    console.log('   - 用户账户 (users, usernews)');
    console.log('   - 供应商信息 (suppliers, suppliernews)');
    console.log('   - 客户信息 (customers)');
    console.log('   - 采购发票 (purchaseinvoices)');
    console.log('   - 销售记录 (merchantsales)');
    console.log('   - 仓库订单 (warehouseorders)');
    console.log('   - 系统设置 (productcategories, productconditions, vatrates, storegroups, companyinfos)');

  } catch (error) {
    console.error('❌ 删除失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

deleteAllProducts();
