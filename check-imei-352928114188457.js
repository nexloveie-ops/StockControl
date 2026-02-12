const mongoose = require('mongoose');
require('dotenv').config();

async function checkIMEI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const imei = '352928114188457';
    console.log(`=== 查询IMEI: ${imei} ===\n`);

    // 查询所有可能包含这个IMEI的集合
    
    // 1. 检查 admininventories (管理员库存)
    console.log('1. 检查 AdminInventories 集合:');
    const adminInventory = await mongoose.connection.db.collection('admininventories')
      .find({ serialNumber: imei })
      .toArray();
    
    if (adminInventory.length > 0) {
      adminInventory.forEach(item => {
        console.log(`   找到记录:`);
        console.log(`   - 产品名称: ${item.productName}`);
        console.log(`   - 序列号: ${item.serialNumber}`);
        console.log(`   - 批发价 (wholesalePrice): €${item.wholesalePrice || '无'}`);
        console.log(`   - 零售价 (retailPrice): €${item.retailPrice || '无'}`);
        console.log(`   - 成本价 (costPrice): €${item.costPrice || '无'}`);
        console.log(`   - 状态: ${item.status}`);
        console.log(`   - 店铺: ${item.storeGroup}`);
        console.log('');
      });
    } else {
      console.log('   ❌ 未找到记录\n');
    }

    // 2. 检查 merchantinventories (商户库存)
    console.log('2. 检查 MerchantInventories 集合:');
    const merchantInventory = await mongoose.connection.db.collection('merchantinventories')
      .find({ serialNumber: imei })
      .toArray();
    
    if (merchantInventory.length > 0) {
      merchantInventory.forEach(item => {
        console.log(`   找到记录:`);
        console.log(`   - 产品名称: ${item.productName}`);
        console.log(`   - 序列号: ${item.serialNumber}`);
        console.log(`   - 批发价 (wholesalePrice): €${item.wholesalePrice || '无'}`);
        console.log(`   - 零售价 (retailPrice): €${item.retailPrice || '无'}`);
        console.log(`   - 成本价 (costPrice): €${item.costPrice || '无'}`);
        console.log(`   - 状态: ${item.status}`);
        console.log(`   - 商户: ${item.merchantId}`);
        console.log('');
      });
    } else {
      console.log('   ❌ 未找到记录\n');
    }

    // 3. 检查 purchaseinvoices (采购发票)
    console.log('3. 检查 PurchaseInvoices 集合:');
    const purchaseInvoices = await mongoose.connection.db.collection('purchaseinvoices')
      .find({ 'items.serialNumber': imei })
      .toArray();
    
    if (purchaseInvoices.length > 0) {
      purchaseInvoices.forEach(invoice => {
        console.log(`   找到采购发票: ${invoice.invoiceNumber}`);
        console.log(`   供应商: ${invoice.supplierName || invoice.supplierId}`);
        console.log(`   日期: ${new Date(invoice.invoiceDate).toLocaleString('zh-CN')}`);
        
        invoice.items.forEach(item => {
          if (item.serialNumber === imei) {
            console.log(`   产品明细:`);
            console.log(`   - 产品名称: ${item.productName}`);
            console.log(`   - 序列号: ${item.serialNumber}`);
            console.log(`   - 采购单价: €${item.unitPrice || '无'}`);
            console.log(`   - 数量: ${item.quantity}`);
            console.log(`   - 总价: €${item.totalPrice || '无'}`);
          }
        });
        console.log('');
      });
    } else {
      console.log('   ❌ 未找到记录\n');
    }

    // 4. 检查 warehouseorders (仓库订单)
    console.log('4. 检查 WarehouseOrders 集合:');
    const warehouseOrders = await mongoose.connection.db.collection('warehouseorders')
      .find({ 'items.serialNumber': imei })
      .toArray();
    
    if (warehouseOrders.length > 0) {
      warehouseOrders.forEach(order => {
        console.log(`   找到仓库订单: ${order.orderNumber}`);
        console.log(`   商户: ${order.merchantId}`);
        console.log(`   日期: ${new Date(order.orderDate).toLocaleString('zh-CN')}`);
        
        order.items.forEach(item => {
          if (item.serialNumber === imei) {
            console.log(`   产品明细:`);
            console.log(`   - 产品名称: ${item.productName}`);
            console.log(`   - 序列号: ${item.serialNumber}`);
            console.log(`   - 成本价 (costPrice): €${item.costPrice || '无'}`);
            console.log(`   - 批发价 (wholesalePrice): €${item.wholesalePrice || '无'}`);
            console.log(`   - 零售价 (retailPrice): €${item.retailPrice || '无'}`);
          }
        });
        console.log('');
      });
    } else {
      console.log('   ❌ 未找到记录\n');
    }

    // 5. 检查 inventorytransfers (调货记录)
    console.log('5. 检查 InventoryTransfers 集合:');
    const transfers = await mongoose.connection.db.collection('inventorytransfers')
      .find({ 'items.serialNumber': imei })
      .toArray();
    
    if (transfers.length > 0) {
      transfers.forEach(transfer => {
        console.log(`   找到调货记录: ${transfer.transferNumber}`);
        console.log(`   从: ${transfer.fromMerchant} → 到: ${transfer.toMerchant}`);
        console.log(`   日期: ${new Date(transfer.createdAt).toLocaleString('zh-CN')}`);
        
        transfer.items.forEach(item => {
          if (item.serialNumber === imei) {
            console.log(`   产品明细:`);
            console.log(`   - 产品名称: ${item.productName}`);
            console.log(`   - 序列号: ${item.serialNumber}`);
            console.log(`   - 调货价格 (transferPrice): €${item.transferPrice || '无'}`);
            console.log(`   - 零售价 (retailPrice): €${item.retailPrice || '无'}`);
          }
        });
        console.log('');
      });
    } else {
      console.log('   ❌ 未找到记录\n');
    }

    // 6. 检查销售记录
    console.log('6. 检查 MerchantSales 集合:');
    const sales = await mongoose.connection.db.collection('merchantsales')
      .find({ 'items.serialNumber': imei })
      .toArray();
    
    if (sales.length > 0) {
      sales.forEach(sale => {
        console.log(`   找到销售记录:`);
        console.log(`   商户: ${sale.merchantId}`);
        console.log(`   日期: ${new Date(sale.saleDate).toLocaleString('zh-CN')}`);
        console.log(`   状态: ${sale.status}`);
        
        sale.items.forEach(item => {
          if (item.serialNumber === imei) {
            console.log(`   产品明细:`);
            console.log(`   - 产品名称: ${item.productName}`);
            console.log(`   - 序列号: ${item.serialNumber}`);
            console.log(`   - 销售价格: €${item.price || '无'}`);
            console.log(`   - 成本价: €${item.costPrice || '无'}`);
            console.log(`   - 利润: €${(item.price - item.costPrice).toFixed(2)}`);
          }
        });
        console.log('');
      });
    } else {
      console.log('   ❌ 未找到记录\n');
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

checkIMEI();
