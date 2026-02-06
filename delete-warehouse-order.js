require('dotenv').config();
const mongoose = require('mongoose');

async function deleteWarehouseOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 连接到数据库');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    const orderNumber = 'WO-20260206-1625';
    
    // 查找订单
    const order = await WarehouseOrder.findOne({ orderNumber });
    
    if (!order) {
      console.log(`❌ 订单 ${orderNumber} 不存在`);
      await mongoose.connection.close();
      return;
    }
    
    console.log('\n📦 找到订单:');
    console.log({
      orderNumber: order.orderNumber,
      merchantId: order.merchantId,
      merchantName: order.merchantName,
      status: order.status,
      totalAmount: order.totalAmount,
      itemsCount: order.items.length,
      orderedAt: order.orderedAt
    });
    
    // 删除订单
    await WarehouseOrder.deleteOne({ orderNumber });
    console.log(`\n✅ 订单 ${orderNumber} 已删除`);
    
    // 验证删除
    const checkOrder = await WarehouseOrder.findOne({ orderNumber });
    if (!checkOrder) {
      console.log('✅ 确认订单已从数据库中删除');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ 完成');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

deleteWarehouseOrder();
