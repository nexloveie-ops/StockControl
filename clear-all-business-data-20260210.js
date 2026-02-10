require('dotenv').config();
const mongoose = require('mongoose');

// 导入所有需要清理的模型
const AdminInventory = require('./models/AdminInventory');
const MerchantSale = require('./models/MerchantSale');
const PurchaseInvoice = require('./models/PurchaseInvoice');
const WarehouseOrder = require('./models/WarehouseOrder');
const InventoryTransfer = require('./models/InventoryTransfer');
const RepairOrder = require('./models/RepairOrder');
const InterCompanySalesInvoice = require('./models/InterCompanySalesInvoice');

async function clearAllBusinessData() {
  try {
    console.log('🔌 连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    console.log('⚠️  准备清除以下数据：');
    console.log('   - 所有产品库存 (AdminInventory)');
    console.log('   - 所有销售记录 (MerchantSale)');
    console.log('   - 所有采购发票 (PurchaseInvoice)');
    console.log('   - 所有仓库订单 (WarehouseOrder)');
    console.log('   - 所有调货记录 (InventoryTransfer)');
    console.log('   - 所有维修订单 (RepairOrder)');
    console.log('   - 所有公司间销售发票 (InterCompanySalesInvoice)');
    console.log('\n✅ 保留以下数据：');
    console.log('   - 用户账户 (User)');
    console.log('   - 供应商信息 (Supplier)');
    console.log('   - 客户信息 (Customer)');
    console.log('   - 系统设置 (Category, Condition, VatRate, StoreGroup, CompanyInfo)');
    console.log('\n');

    // 统计当前数据
    const inventoryCount = await AdminInventory.countDocuments();
    const salesCount = await MerchantSale.countDocuments();
    const invoiceCount = await PurchaseInvoice.countDocuments();
    const warehouseOrderCount = await WarehouseOrder.countDocuments();
    const transferCount = await InventoryTransfer.countDocuments();
    const repairOrderCount = await RepairOrder.countDocuments();
    const interCompanyCount = await InterCompanySalesInvoice.countDocuments();

    console.log('📊 当前数据统计：');
    console.log(`   - 产品库存: ${inventoryCount} 条`);
    console.log(`   - 销售记录: ${salesCount} 条`);
    console.log(`   - 采购发票: ${invoiceCount} 条`);
    console.log(`   - 仓库订单: ${warehouseOrderCount} 条`);
    console.log(`   - 调货记录: ${transferCount} 条`);
    console.log(`   - 维修订单: ${repairOrderCount} 条`);
    console.log(`   - 公司间销售发票: ${interCompanyCount} 条`);
    console.log('\n');

    if (inventoryCount === 0 && salesCount === 0 && invoiceCount === 0 && 
        warehouseOrderCount === 0 && transferCount === 0 && repairOrderCount === 0 &&
        interCompanyCount === 0) {
      console.log('ℹ️  数据库已经是空的，无需清理');
      await mongoose.connection.close();
      return;
    }

    console.log('🗑️  开始清除数据...\n');

    // 1. 清除产品库存
    console.log('1️⃣  清除产品库存...');
    const inventoryResult = await AdminInventory.deleteMany({});
    console.log(`   ✅ 已删除 ${inventoryResult.deletedCount} 条产品库存记录\n`);

    // 2. 清除销售记录
    console.log('2️⃣  清除销售记录...');
    const salesResult = await MerchantSale.deleteMany({});
    console.log(`   ✅ 已删除 ${salesResult.deletedCount} 条销售记录\n`);

    // 3. 清除采购发票
    console.log('3️⃣  清除采购发票...');
    const invoiceResult = await PurchaseInvoice.deleteMany({});
    console.log(`   ✅ 已删除 ${invoiceResult.deletedCount} 条采购发票\n`);

    // 4. 清除仓库订单
    console.log('4️⃣  清除仓库订单...');
    const warehouseResult = await WarehouseOrder.deleteMany({});
    console.log(`   ✅ 已删除 ${warehouseResult.deletedCount} 条仓库订单\n`);

    // 5. 清除调货记录
    console.log('5️⃣  清除调货记录...');
    const transferResult = await InventoryTransfer.deleteMany({});
    console.log(`   ✅ 已删除 ${transferResult.deletedCount} 条调货记录\n`);

    // 6. 清除维修订单
    console.log('6️⃣  清除维修订单...');
    const repairResult = await RepairOrder.deleteMany({});
    console.log(`   ✅ 已删除 ${repairResult.deletedCount} 条维修订单\n`);

    // 7. 清除公司间销售发票
    console.log('7️⃣  清除公司间销售发票...');
    const interCompanyResult = await InterCompanySalesInvoice.deleteMany({});
    console.log(`   ✅ 已删除 ${interCompanyResult.deletedCount} 条公司间销售发票\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ 数据清除完成！');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📊 清除统计：');
    console.log(`   - 产品库存: ${inventoryResult.deletedCount} 条`);
    console.log(`   - 销售记录: ${salesResult.deletedCount} 条`);
    console.log(`   - 采购发票: ${invoiceResult.deletedCount} 条`);
    console.log(`   - 仓库订单: ${warehouseResult.deletedCount} 条`);
    console.log(`   - 调货记录: ${transferResult.deletedCount} 条`);
    console.log(`   - 维修订单: ${repairResult.deletedCount} 条`);
    console.log(`   - 公司间销售发票: ${interCompanyResult.deletedCount} 条`);
    console.log(`   - 总计: ${inventoryResult.deletedCount + salesResult.deletedCount + 
                              invoiceResult.deletedCount + warehouseResult.deletedCount + 
                              transferResult.deletedCount + repairResult.deletedCount +
                              interCompanyResult.deletedCount} 条`);
    console.log('\n✅ 保留的数据：');
    console.log('   - 用户账户');
    console.log('   - 供应商信息');
    console.log('   - 客户信息');
    console.log('   - 系统设置（分类、成色、税率、门店组、公司信息）');
    console.log('\n🎉 现在可以重新录入数据进行测试了！');

  } catch (error) {
    console.error('❌ 清除数据失败:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 执行清除
clearAllBusinessData();
