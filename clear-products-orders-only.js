require('dotenv').config();
const mongoose = require('mongoose');

async function clearProductsAndOrders() {
  try {
    console.log('🔗 连接到 MongoDB Atlas...');
    console.log(`📍 数据库: ${process.env.MONGODB_URI.split('@')[1].split('/')[0]}`);
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 先统计保留的数据
    console.log('\n📊 检查保留的数据：');
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const userCount = await User.countDocuments();
    console.log(`👤 用户账号: ${userCount} 个`);
    
    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false, collection: 'suppliers' }));
    const supplierCount = await Supplier.countDocuments();
    console.log(`🏭 供应商: ${supplierCount} 个`);
    
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false, collection: 'customers' }));
    const customerCount = await Customer.countDocuments();
    console.log(`🛒 客户: ${customerCount} 个`);
    
    const StoreGroup = mongoose.model('StoreGroup', new mongoose.Schema({}, { strict: false, collection: 'store_groups' }));
    const storeGroupCount = await StoreGroup.countDocuments();
    console.log(`👥 群组: ${storeGroupCount} 个`);

    // 清除产品相关数据
    console.log('\n📦 清除产品数据...');
    
    // 清除 ProductNew (普通产品)
    const ProductNew = mongoose.model('ProductNew', new mongoose.Schema({}, { strict: false, collection: 'products_new' }));
    const productNewCount = await ProductNew.countDocuments();
    if (productNewCount > 0) {
      await ProductNew.deleteMany({});
      console.log(`✅ 已清除 ${productNewCount} 个 ProductNew 产品`);
    } else {
      console.log(`ℹ️  ProductNew: 0 个（已经是空的）`);
    }
    
    // 清除 AdminInventory (管理员库存/配件变体)
    const AdminInventory = mongoose.model('AdminInventory', new mongoose.Schema({}, { strict: false, collection: 'admin_inventory' }));
    const adminInventoryCount = await AdminInventory.countDocuments();
    if (adminInventoryCount > 0) {
      await AdminInventory.deleteMany({});
      console.log(`✅ 已清除 ${adminInventoryCount} 个 AdminInventory 产品`);
    } else {
      console.log(`ℹ️  AdminInventory: 0 个（已经是空的）`);
    }
    
    // 清除 MerchantInventory (商户库存)
    const MerchantInventory = mongoose.model('MerchantInventory', new mongoose.Schema({}, { strict: false, collection: 'merchant_inventory' }));
    const merchantInventoryCount = await MerchantInventory.countDocuments();
    if (merchantInventoryCount > 0) {
      await MerchantInventory.deleteMany({});
      console.log(`✅ 已清除 ${merchantInventoryCount} 个 MerchantInventory 产品`);
    } else {
      console.log(`ℹ️  MerchantInventory: 0 个（已经是空的）`);
    }

    // 清除订单相关数据
    console.log('\n📋 清除采购和销售数据...');
    
    // 清除采购订单/发票
    const Invoice = mongoose.model('Invoice', new mongoose.Schema({}, { strict: false, collection: 'invoices' }));
    const invoiceCount = await Invoice.countDocuments();
    if (invoiceCount > 0) {
      await Invoice.deleteMany({});
      console.log(`✅ 已清除 ${invoiceCount} 个采购订单/发票`);
    } else {
      console.log(`ℹ️  采购订单/发票: 0 个（已经是空的）`);
    }
    
    // 清除销售记录
    const Sale = mongoose.model('Sale', new mongoose.Schema({}, { strict: false, collection: 'sales' }));
    const saleCount = await Sale.countDocuments();
    if (saleCount > 0) {
      await Sale.deleteMany({});
      console.log(`✅ 已清除 ${saleCount} 个销售记录`);
    } else {
      console.log(`ℹ️  销售记录: 0 个（已经是空的）`);
    }
    
    // 清除销售发票
    const SalesInvoice = mongoose.model('SalesInvoice', new mongoose.Schema({}, { strict: false, collection: 'sales_invoices' }));
    const salesInvoiceCount = await SalesInvoice.countDocuments();
    if (salesInvoiceCount > 0) {
      await SalesInvoice.deleteMany({});
      console.log(`✅ 已清除 ${salesInvoiceCount} 个销售发票`);
    } else {
      console.log(`ℹ️  销售发票: 0 个（已经是空的）`);
    }
    
    // 清除仓库订单
    const WarehouseOrder = mongoose.model('WarehouseOrder', new mongoose.Schema({}, { strict: false, collection: 'warehouse_orders' }));
    const warehouseOrderCount = await WarehouseOrder.countDocuments();
    if (warehouseOrderCount > 0) {
      await WarehouseOrder.deleteMany({});
      console.log(`✅ 已清除 ${warehouseOrderCount} 个仓库订单`);
    } else {
      console.log(`ℹ️  仓库订单: 0 个（已经是空的）`);
    }
    
    // 清除调货记录
    const Transfer = mongoose.model('Transfer', new mongoose.Schema({}, { strict: false, collection: 'transfers' }));
    const transferCount = await Transfer.countDocuments();
    if (transferCount > 0) {
      await Transfer.deleteMany({});
      console.log(`✅ 已清除 ${transferCount} 个调货记录`);
    } else {
      console.log(`ℹ️  调货记录: 0 个（已经是空的）`);
    }
    
    // 清除维修记录
    const Repair = mongoose.model('Repair', new mongoose.Schema({}, { strict: false, collection: 'repairs' }));
    const repairCount = await Repair.countDocuments();
    if (repairCount > 0) {
      await Repair.deleteMany({});
      console.log(`✅ 已清除 ${repairCount} 个维修记录`);
    } else {
      console.log(`ℹ️  维修记录: 0 个（已经是空的）`);
    }

    const totalCleared = productNewCount + adminInventoryCount + merchantInventoryCount + 
                        invoiceCount + saleCount + salesInvoiceCount + 
                        warehouseOrderCount + transferCount + repairCount;

    console.log('\n✅ 清理完成！');
    console.log('\n📝 清理摘要：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('已清除：');
    console.log(`  • ProductNew: ${productNewCount} 个`);
    console.log(`  • AdminInventory: ${adminInventoryCount} 个`);
    console.log(`  • MerchantInventory: ${merchantInventoryCount} 个`);
    console.log(`  • 采购订单/发票: ${invoiceCount} 个`);
    console.log(`  • 销售记录: ${saleCount} 个`);
    console.log(`  • 销售发票: ${salesInvoiceCount} 个`);
    console.log(`  • 仓库订单: ${warehouseOrderCount} 个`);
    console.log(`  • 调货记录: ${transferCount} 个`);
    console.log(`  • 维修记录: ${repairCount} 个`);
    console.log(`  ─────────────────────────────────`);
    console.log(`  📊 总计: ${totalCleared} 条记录`);
    console.log('\n保留（未修改）：');
    console.log(`  • 用户账号: ${userCount} 个`);
    console.log(`  • 供应商: ${supplierCount} 个`);
    console.log(`  • 客户: ${customerCount} 个`);
    console.log(`  • 群组: ${storeGroupCount} 个`);
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

clearProductsAndOrders();
