require('dotenv').config();
const mongoose = require('mongoose');

async function clearAllProductsComplete() {
  try {
    console.log('🔌 连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    console.log('🗑️  清除所有产品相关的集合...\n');

    // 所有需要清除的集合
    const collectionsToDelete = [
      'admininventories',
      'merchantinventories',
      'merchantsales',
      'purchaseinvoices',
      'warehouseorders',
      'inventorytransfers',
      'repairorders',
      'intercompanysalesinvoices',
      'products',
      'productnews',
      'storeinventories',
      'inventories',
      'sales',
      'salesinvoices',
      'merchantorders',
      'purchaseorders',
      'admin_inventory',
      'merchant_inventory',
      'warehouse_orders',
      'store_groups',
      'products_new',
      'transfers',
      'repairs',
      'merchantrepairs',
      'sales_invoices',
      'invoices'
    ];

    let totalDeleted = 0;
    const deletionResults = [];

    for (const collectionName of collectionsToDelete) {
      try {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        if (count > 0) {
          const result = await mongoose.connection.db.collection(collectionName).deleteMany({});
          console.log(`   ✅ ${collectionName}: 删除了 ${result.deletedCount} 条记录`);
          totalDeleted += result.deletedCount;
          deletionResults.push({ collection: collectionName, deleted: result.deletedCount });
        }
      } catch (error) {
        // 集合不存在，跳过
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ 清除完成！');
    console.log('═══════════════════════════════════════════════════════');
    
    if (deletionResults.length > 0) {
      console.log('\n📊 删除统计：');
      deletionResults.forEach(result => {
        console.log(`   - ${result.collection}: ${result.deleted} 条`);
      });
      console.log(`\n   总计删除: ${totalDeleted} 条记录`);
    } else {
      console.log('\nℹ️  没有找到需要删除的记录');
    }

    console.log('\n✅ 保留的数据：');
    console.log('   - 用户账户 (users, usernews)');
    console.log('   - 供应商信息 (suppliers, suppliernews)');
    console.log('   - 客户信息 (customers)');
    console.log('   - 系统设置 (productcategories, productconditions, vatrates, storegroups, companyinfos)');

  } catch (error) {
    console.error('❌ 清除失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

clearAllProductsComplete();
