require('dotenv').config();
const mongoose = require('mongoose');
const ProductNew = require('./models/ProductNew');
const PurchaseInvoice = require('./models/PurchaseInvoice');
const SupplierNew = require('./models/SupplierNew');

async function clearData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 删除所有产品
    const productsResult = await ProductNew.deleteMany({});
    console.log(`🗑️  删除了 ${productsResult.deletedCount} 个产品`);

    // 删除所有采购发票
    const invoicesResult = await PurchaseInvoice.deleteMany({});
    console.log(`🗑️  删除了 ${invoicesResult.deletedCount} 个采购发票`);

    // 删除所有供应商
    const suppliersResult = await SupplierNew.deleteMany({});
    console.log(`🗑️  删除了 ${suppliersResult.deletedCount} 个供应商`);

    console.log('\n✅ 数据清理完成！');
    console.log('📝 保留的数据：');
    console.log('   - 用户账号');
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

clearData();
