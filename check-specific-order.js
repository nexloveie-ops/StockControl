require('dotenv').config();
const mongoose = require('mongoose');

async function checkSpecificOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 连接到数据库');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    const orderId = '698533211eb182583626c7c4';
    
    // 查找订单
    const order = await WarehouseOrder.findById(orderId);
    
    if (!order) {
      console.log(`❌ 订单 ${orderId} 不存在`);
      await mongoose.connection.close();
      return;
    }
    
    console.log('\n📦 订单信息:');
    console.log({
      orderNumber: order.orderNumber,
      status: order.status,
      merchantId: order.merchantId,
      totalAmount: order.totalAmount,
      itemsCount: order.items.length
    });
    
    console.log('\n📋 订单产品详情:');
    order.items.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.productName}`);
      console.log('   productId:', item.productId);
      console.log('   productId type:', typeof item.productId);
      console.log('   productId is null:', item.productId === null);
      console.log('   productId is undefined:', item.productId === undefined);
      console.log('   brand:', item.brand);
      console.log('   model:', item.model);
      console.log('   color:', item.color);
      console.log('   quantity:', item.quantity);
      console.log('   wholesalePrice:', item.wholesalePrice);
      console.log('   taxClassification:', item.taxClassification);
      console.log('   taxAmount:', item.taxAmount);
      console.log('   source:', item.source);
    });
    
    await mongoose.connection.close();
    console.log('\n✅ 检查完成');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkSpecificOrder();
