const mongoose = require('mongoose');
require('dotenv').config();

const MerchantInventory = require('./models/MerchantInventory');
const AdminInventory = require('./models/AdminInventory');
const PurchaseInvoice = require('./models/PurchaseInvoice');
const WarehouseOrder = require('./models/WarehouseOrder');

async function checkRemainingData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');

    // 检查商户库存
    console.log('\n=== 商户库存（MerchantInventory）===');
    const merchantInventory = await MerchantInventory.find().lean();
    console.log(`总数: ${merchantInventory.length}`);
    if (merchantInventory.length > 0) {
      merchantInventory.forEach(item => {
        console.log(`  - ${item.productName} (${item.serialNumber})`);
      });
    }

    // 检查管理员库存
    console.log('\n=== 管理员库存（AdminInventory）===');
    const adminInventory = await AdminInventory.find().lean();
    console.log(`总数: ${adminInventory.length}`);
    if (adminInventory.length > 0) {
      adminInventory.forEach(item => {
        console.log(`  - ${item.productName} (${item.category})`);
      });
    }

    // 检查采购发票
    console.log('\n=== 采购发票（PurchaseInvoice）===');
    const purchaseInvoices = await PurchaseInvoice.find().lean();
    console.log(`总数: ${purchaseInvoices.length}`);
    if (purchaseInvoices.length > 0) {
      purchaseInvoices.forEach(invoice => {
        console.log(`  - ${invoice.invoiceNumber} (${invoice.items.length} 个产品)`);
      });
    }

    // 检查仓库订单
    console.log('\n=== 仓库订单（WarehouseOrder）===');
    const warehouseOrders = await WarehouseOrder.find().lean();
    console.log(`总数: ${warehouseOrders.length}`);
    if (warehouseOrders.length > 0) {
      warehouseOrders.forEach(order => {
        console.log(`  - ${order.orderNumber} (${order.items.length} 个产品)`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkRemainingData();
