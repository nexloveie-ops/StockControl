const mongoose = require('mongoose');
require('dotenv').config();

async function checkOrderShipmentDetails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    const orderId = '699609a8e3384a2c59db006e';
    
    const order = await WarehouseOrder.findById(orderId);
    
    if (!order) {
      console.log('❌ 订单不存在');
      return;
    }
    
    console.log('📦 订单信息:');
    console.log(`   订单号: ${order.orderNumber}`);
    console.log(`   状态: ${order.status}`);
    console.log(`   商户: ${order.merchantId}`);
    console.log(`\n订单项目 (${order.items.length} 个):`);
    
    order.items.forEach((item, index) => {
      console.log(`\n  ${index + 1}. ${item.productName}`);
      console.log(`     productId: ${item.productId}`);
      console.log(`     数量: ${item.quantity}`);
    });
    
    console.log(`\n\n发货详情 (${order.shipmentDetails ? order.shipmentDetails.length : 0} 个):`);
    
    if (order.shipmentDetails && order.shipmentDetails.length > 0) {
      order.shipmentDetails.forEach((detail, index) => {
        console.log(`\n  ${index + 1}.`);
        console.log(`     isDevice: ${detail.isDevice}`);
        if (detail.isDevice) {
          console.log(`     selectedProducts: ${JSON.stringify(detail.selectedProducts)}`);
        } else {
          console.log(`     quantity: ${detail.quantity}`);
        }
      });
    } else {
      console.log('   ⚠️  没有发货详情');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkOrderShipmentDetails();
