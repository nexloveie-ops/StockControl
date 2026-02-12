const mongoose = require('mongoose');
require('dotenv').config();

// 导入所有业务数据模型
const MerchantInventory = require('./models/MerchantInventory');
const AdminInventory = require('./models/AdminInventory');
const MerchantSale = require('./models/MerchantSale');
const InventoryTransfer = require('./models/InventoryTransfer');
const WarehouseOrder = require('./models/WarehouseOrder');
const PurchaseInvoice = require('./models/PurchaseInvoice');
const SalesInvoice = require('./models/SalesInvoice');
const RepairOrder = require('./models/RepairOrder');

// 旧系统模型（如果存在）
const ProductNew = require('./models/ProductNew');

async function clearAllBusinessData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    console.log('\n⚠️  警告：即将清除所有业务数据！');
    console.log('保留：用户账户、供应商、客户、分类、条件等基础配置');
    console.log('\n开始清除...\n');

    // 1. 清除商户库存
    const inventoryCount = await MerchantInventory.countDocuments();
    await MerchantInventory.deleteMany({});
    console.log(`✅ 已清除 ${inventoryCount} 条商户库存记录`);

    // 2. 清除管理员库存（配件库存）
    const adminInventoryCount = await AdminInventory.countDocuments();
    await AdminInventory.deleteMany({});
    console.log(`✅ 已清除 ${adminInventoryCount} 条管理员库存记录（配件）`);

    // 3. 清除销售记录
    const salesCount = await MerchantSale.countDocuments();
    await MerchantSale.deleteMany({});
    console.log(`✅ 已清除 ${salesCount} 条销售记录`);

    // 4. 清除调货记录
    const transferCount = await InventoryTransfer.countDocuments();
    await InventoryTransfer.deleteMany({});
    console.log(`✅ 已清除 ${transferCount} 条调货记录`);

    // 5. 清除仓库订单
    const warehouseOrderCount = await WarehouseOrder.countDocuments();
    await WarehouseOrder.deleteMany({});
    console.log(`✅ 已清除 ${warehouseOrderCount} 条仓库订单`);

    // 6. 清除采购发票
    const purchaseInvoiceCount = await PurchaseInvoice.countDocuments();
    await PurchaseInvoice.deleteMany({});
    console.log(`✅ 已清除 ${purchaseInvoiceCount} 条采购发票`);

    // 7. 清除销售发票
    const salesInvoiceCount = await SalesInvoice.countDocuments();
    await SalesInvoice.deleteMany({});
    console.log(`✅ 已清除 ${salesInvoiceCount} 条销售发票`);

    // 8. 清除维修订单
    const repairOrderCount = await RepairOrder.countDocuments();
    await RepairOrder.deleteMany({});
    console.log(`✅ 已清除 ${repairOrderCount} 条维修订单`);

    // 9. 清除旧系统产品（如果存在）
    try {
      const productNewCount = await ProductNew.countDocuments();
      await ProductNew.deleteMany({});
      console.log(`✅ 已清除 ${productNewCount} 条旧系统产品记录`);
    } catch (error) {
      console.log('ℹ️  旧系统产品模型不存在或已清空');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有业务数据已清除完成！');
    console.log('='.repeat(60));
    
    console.log('\n📊 清除统计:');
    console.log(`  - 商户库存: ${inventoryCount} 条`);
    console.log(`  - 管理员库存（配件）: ${adminInventoryCount} 条`);
    console.log(`  - 销售记录: ${salesCount} 条`);
    console.log(`  - 调货记录: ${transferCount} 条`);
    console.log(`  - 仓库订单: ${warehouseOrderCount} 条`);
    console.log(`  - 采购发票: ${purchaseInvoiceCount} 条`);
    console.log(`  - 销售发票: ${salesInvoiceCount} 条`);
    console.log(`  - 维修订单: ${repairOrderCount} 条`);
    
    const total = inventoryCount + adminInventoryCount + salesCount + transferCount + warehouseOrderCount + 
                  purchaseInvoiceCount + salesInvoiceCount + repairOrderCount;
    console.log(`  - 总计: ${total} 条记录`);

    console.log('\n✅ 保留的数据:');
    console.log('  - 用户账户（admin, warehouse1, mobile123等）');
    console.log('  - 供应商信息');
    console.log('  - 客户信息');
    console.log('  - 产品分类');
    console.log('  - 产品成色');
    console.log('  - 系统设置');

    console.log('\n📝 下一步操作:');
    console.log('  1. 重新录入测试数据');
    console.log('  2. 使用发票识别功能上传采购发票');
    console.log('  3. 创建销售订单');
    console.log('  4. 测试调货功能');

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('\n❌ 清除数据时出错:', error);
    process.exit(1);
  }
}

// 执行清除
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║          清除所有业务数据 - 2026-02-11                    ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('\n⏳ 5秒后开始清除...');
console.log('按 Ctrl+C 取消\n');

setTimeout(() => {
  clearAllBusinessData();
}, 5000);
