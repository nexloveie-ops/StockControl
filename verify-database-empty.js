require('dotenv').config();
const mongoose = require('mongoose');

// 导入模型
const AdminInventory = require('./models/AdminInventory');
const MerchantSale = require('./models/MerchantSale');
const PurchaseInvoice = require('./models/PurchaseInvoice');
const WarehouseOrder = require('./models/WarehouseOrder');
const InventoryTransfer = require('./models/InventoryTransfer');
const RepairOrder = require('./models/RepairOrder');
const InterCompanySalesInvoice = require('./models/InterCompanySalesInvoice');

async function verifyDatabaseEmpty() {
  try {
    console.log('🔌 连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    console.log('📊 验证数据库状态...\n');

    // 统计所有业务数据
    const inventoryCount = await AdminInventory.countDocuments();
    const salesCount = await MerchantSale.countDocuments();
    const invoiceCount = await PurchaseInvoice.countDocuments();
    const warehouseOrderCount = await WarehouseOrder.countDocuments();
    const transferCount = await InventoryTransfer.countDocuments();
    const repairOrderCount = await RepairOrder.countDocuments();
    const interCompanyCount = await InterCompanySalesInvoice.countDocuments();

    console.log('当前数据统计：');
    console.log(`   - 产品库存 (AdminInventory): ${inventoryCount} 条`);
    console.log(`   - 销售记录 (MerchantSale): ${salesCount} 条`);
    console.log(`   - 采购发票 (PurchaseInvoice): ${invoiceCount} 条`);
    console.log(`   - 仓库订单 (WarehouseOrder): ${warehouseOrderCount} 条`);
    console.log(`   - 调货记录 (InventoryTransfer): ${transferCount} 条`);
    console.log(`   - 维修订单 (RepairOrder): ${repairOrderCount} 条`);
    console.log(`   - 公司间销售发票 (InterCompanySalesInvoice): ${interCompanyCount} 条`);
    console.log('\n');

    const totalCount = inventoryCount + salesCount + invoiceCount + 
                      warehouseOrderCount + transferCount + repairOrderCount + 
                      interCompanyCount;

    if (totalCount === 0) {
      console.log('✅ 数据库已清空！所有产品信息、销售信息、采购信息都已删除。');
      console.log('🎉 可以开始重新录入数据测试了！');
    } else {
      console.log(`⚠️  数据库中还有 ${totalCount} 条记录未删除`);
      console.log('需要再次运行清除脚本');
    }

  } catch (error) {
    console.error('❌ 验证失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

verifyDatabaseEmpty();
