require('dotenv').config();
const mongoose = require('mongoose');

async function checkWarehouseOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const WarehouseOrder = mongoose.model('WarehouseOrder', new mongoose.Schema({}, { strict: false }));
    
    // 查询所有仓库订单
    const orders = await WarehouseOrder.find({
      merchantId: 'MurrayRanelagh'
    }).lean();
    
    console.log(`找到 ${orders.length} 条仓库订单\n`);
    
    orders.forEach((order, index) => {
      console.log(`订单 ${index + 1}:`);
      console.log('  _id:', order._id);
      console.log('  orderNumber:', order.orderNumber);
      console.log('  merchantId:', order.merchantId);
      console.log('  status:', order.status);
      console.log('  orderDate:', order.orderDate);
      console.log('  items数量:', order.items?.length || 0);
      if (order.items && order.items.length > 0) {
        console.log('  第一个产品:', order.items[0].productName);
      }
      console.log('');
    });
    
    // 查询已完成的订单
    const completedOrders = await WarehouseOrder.find({
      merchantId: 'MurrayRanelagh',
      status: { $in: ['COMPLETED', 'RECEIVED'] }
    }).lean();
    
    console.log(`已完成的订单: ${completedOrders.length} 条`);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkWarehouseOrders();
