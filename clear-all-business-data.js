require('dotenv').config();
const mongoose = require('mongoose');
const ProductNew = require('./models/ProductNew');
const PurchaseInvoice = require('./models/PurchaseInvoice');
const SalesInvoice = require('./models/SalesInvoice');
const SupplierNew = require('./models/SupplierNew');

async function clearAllBusinessData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    console.log('🗑️  开始清理数据...\n');

    // 1. 删除所有销售发票
    const salesResult = await SalesInvoice.deleteMany({});
    console.log(`✅ 删除了 ${salesResult.deletedCount} 条销售发票`);

    // 2. 删除所有采购发票
    const purchaseResult = await PurchaseInvoice.deleteMany({});
    console.log(`✅ 删除了 ${purchaseResult.deletedCount} 条采购发票`);

    // 3. 删除所有产品
    const productsResult = await ProductNew.deleteMany({});
    console.log(`✅ 删除了 ${productsResult.deletedCount} 个产品`);

    // 4. 删除所有供应商
    const suppliersResult = await SupplierNew.deleteMany({});
    console.log(`✅ 删除了 ${suppliersResult.deletedCount} 个供应商`);

    console.log('\n✅ 所有业务数据已清空！');
    console.log('\n📝 保留的数据：');
    console.log('   - 用户账号');
    console.log('   - 客户信息');
    console.log('   - 产品分类');
    console.log('   - 设备成色');
    console.log('   - 系统设置');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

clearAllBusinessData();
