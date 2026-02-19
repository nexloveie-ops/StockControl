const mongoose = require('mongoose');
require('dotenv').config();

async function clearBusinessData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 要清空的集合
    const collections = [
      'productnews',           // 产品信息
      'admininventories',      // 仓库库存
      'merchantinventories',   // 商户库存
      'purchaseinvoices',      // 采购发票
      'salesrecords',          // 销售记录
      'warehouseorders',       // 仓库订单（商户采购订单）
      'transfers',             // 调库订单
      'repairorders'           // 维修订单（如果有）
    ];

    console.log('\n开始清空业务数据...\n');

    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.collection(collectionName);
        const result = await collection.deleteMany({});
        console.log(`✅ ${collectionName}: 删除 ${result.deletedCount} 条记录`);
      } catch (error) {
        console.log(`⚠️  ${collectionName}: ${error.message}`);
      }
    }

    console.log('\n=== 保留的数据 ===');
    console.log('✓ 用户账号 (users)');
    console.log('✓ 供应商 (suppliers)');
    console.log('✓ 客户 (customers)');
    console.log('✓ 产品分类 (productcategories)');
    console.log('✓ 税率配置 (vatrates)');
    console.log('✓ 成色配置 (conditions)');
    console.log('✓ 公司信息 (companyinfos)');

    await mongoose.connection.close();
    console.log('\n✅ 业务数据清空完成！');
    console.log('💡 现在可以重新录入数据进行测试');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearBusinessData();
