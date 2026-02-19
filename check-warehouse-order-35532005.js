const mongoose = require('mongoose');
require('dotenv').config();

async function checkWarehouseOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const serialNumber = '35532005';
    
    console.log(`🔍 查询序列号 ${serialNumber} 的仓库订单\n`);
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    // 查询包含这个序列号的仓库订单
    const orders = await WarehouseOrder.find({
      'items.serialNumber': serialNumber
    }).lean();
    
    console.log(`找到 ${orders.length} 个仓库订单\n`);
    
    if (orders.length > 0) {
      orders.forEach((order, index) => {
        console.log(`${index + 1}. 订单号: ${order.orderNumber}`);
        console.log(`   商户: ${order.merchantId}`);
        console.log(`   订单日期: ${order.orderDate}`);
        console.log(`   状态: ${order.status}`);
        console.log(`   总金额: €${order.totalAmount}`);
        console.log(`   产品数量: ${order.items.length}`);
        
        // 找到包含这个序列号的产品
        const matchingItems = order.items.filter(item => item.serialNumber === serialNumber);
        console.log(`   匹配的产品: ${matchingItems.length}`);
        
        matchingItems.forEach((item, i) => {
          console.log(`\n   产品 ${i + 1}:`);
          console.log(`     产品名称: ${item.productName}`);
          console.log(`     序列号: ${item.serialNumber}`);
          console.log(`     数量: ${item.quantity}`);
          console.log(`     成本价: €${item.costPrice || '无'}`);
          console.log(`     批发价: €${item.wholesalePrice || '无'}`);
          console.log(`     零售价: €${item.retailPrice || '无'}`);
          console.log(`     税务分类: ${item.taxClassification || '无'}`);
        });
        
        console.log('');
      });
    } else {
      console.log('❌ 未找到仓库订单');
      
      // 尝试查询所有仓库订单，看看数据结构
      console.log('\n尝试查询最近的仓库订单...\n');
      const recentOrders = await WarehouseOrder.find().sort({ orderDate: -1 }).limit(3).lean();
      
      console.log(`找到 ${recentOrders.length} 个最近的订单\n`);
      
      recentOrders.forEach((order, index) => {
        console.log(`${index + 1}. 订单号: ${order.orderNumber}`);
        console.log(`   商户: ${order.merchantId}`);
        console.log(`   产品数量: ${order.items.length}`);
        
        if (order.items.length > 0) {
          console.log(`   第一个产品:`);
          console.log(`     产品名称: ${order.items[0].productName}`);
          console.log(`     序列号字段: ${order.items[0].serialNumber || '无'}`);
          console.log(`     IMEI字段: ${order.items[0].imei || '无'}`);
        }
        console.log('');
      });
    }
    
    // 同时查询AdminInventory，看看发票号
    console.log('=== 查询AdminInventory ===\n');
    const AdminInventory = require('./models/AdminInventory');
    const adminProduct = await AdminInventory.findOne({ serialNumber }).lean();
    
    if (adminProduct) {
      console.log(`发票号: ${adminProduct.invoiceNumber}`);
      console.log(`供货商: ${adminProduct.supplier}`);
      console.log(`创建时间: ${adminProduct.createdAt}`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

checkWarehouseOrder();
