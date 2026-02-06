require('dotenv').config();
const mongoose = require('mongoose');

async function clearAllBusinessData() {
  try {
    console.log('🔗 连接到 MongoDB Atlas...');
    console.log(`📍 数据库: stockcontrol\n`);
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    let totalCleared = 0;

    // 清除产品数据
    console.log('📦 清除产品数据...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const productCollections = [
      'productnews',           // ProductNew 的实际集合名
      'admininventories',      // AdminInventory 的实际集合名
      'merchantinventories',   // MerchantInventory 的实际集合名
      'products_new',          // 备用名称
      'admin_inventory',       // 备用名称
      'merchant_inventory'     // 备用名称
    ];
    
    for (const collectionName of productCollections) {
      try {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        if (count > 0) {
          await mongoose.connection.db.collection(collectionName).deleteMany({});
          console.log(`✅ ${collectionName.padEnd(25)} : 已清除 ${count} 条`);
          totalCleared += count;
        }
      } catch (error) {
        // 集合不存在，跳过
      }
    }

    // 清除采购和销售数据
    console.log('\n📋 清除采购和销售数据...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const orderCollections = [
      'purchaseinvoices',              // 采购发票
      'salesinvoices',                 // 销售发票
      'sales_invoices',                // 备用名称
      'merchantsales',                 // 商户销售
      'sales',                         // 备用名称
      'warehouseorders',               // 仓库订单
      'warehouse_orders',              // 备用名称
      'inventorytransfers',            // 调货记录
      'transfers',                     // 备用名称
      'repairorders',                  // 维修订单
      'repairs',                       // 备用名称
      'intercompanysalesinvoices',     // 公司间销售发票
      'invoices',                      // 备用名称
      'purchaseorders',                // 采购订单
      'merchantorders',                // 商户订单
      'merchantrepairs'                // 商户维修
    ];
    
    for (const collectionName of orderCollections) {
      try {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        if (count > 0) {
          await mongoose.connection.db.collection(collectionName).deleteMany({});
          console.log(`✅ ${collectionName.padEnd(30)} : 已清除 ${count} 条`);
          totalCleared += count;
        }
      } catch (error) {
        // 集合不存在，跳过
      }
    }

    // 统计保留的数据
    console.log('\n✅ 保留的数据（未修改）：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const preservedCollections = [
      { name: 'usernews', label: '用户账号' },
      { name: 'users', label: '用户账号(备用)' },
      { name: 'suppliernews', label: '供应商' },
      { name: 'suppliers', label: '供应商(备用)' },
      { name: 'customers', label: '客户' },
      { name: 'storegroups', label: '群组' },
      { name: 'store_groups', label: '群组(备用)' },
      { name: 'productcategories', label: '产品分类' },
      { name: 'categories', label: '产品分类(备用)' },
      { name: 'productconditions', label: '产品成色' },
      { name: 'vatrates', label: 'VAT税率' },
      { name: 'companyinfos', label: '公司信息' }
    ];
    
    for (const { name, label } of preservedCollections) {
      try {
        const count = await mongoose.connection.db.collection(name).countDocuments();
        if (count > 0) {
          console.log(`📌 ${label.padEnd(20)} : ${count} 条`);
        }
      } catch (error) {
        // 集合不存在，跳过
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 清理完成！共清除 ${totalCleared} 条业务数据`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 现在可以重新开始入库流程了！');

  } catch (error) {
    console.error('❌ 清理失败:', error);
    console.error('错误详情:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 数据库连接已关闭');
    process.exit(0);
  }
}

clearAllBusinessData();
