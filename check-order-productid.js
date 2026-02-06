require('dotenv').config();
const mongoose = require('mongoose');

async function checkOrderProductId() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 连接到数据库');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    // 查找最新的订单
    const orders = await WarehouseOrder.find().sort({ orderedAt: -1 }).limit(3);
    
    console.log(`\n📦 找到 ${orders.length} 个订单\n`);
    
    orders.forEach((order, index) => {
      console.log(`订单 ${index + 1}:`);
      console.log({
        orderNumber: order.orderNumber,
        status: order.status,
        itemsCount: order.items.length
      });
      
      console.log('\n产品列表:');
      order.items.forEach((item, itemIndex) => {
        console.log(`  ${itemIndex + 1}. ${item.productName}`);
        console.log(`     productId: ${item.productId}`);
        console.log(`     productId type: ${typeof item.productId}`);
        console.log(`     productId is null: ${item.productId === null}`);
        console.log(`     source: ${item.source || 'N/A'}`);
      });
      console.log('\n' + '='.repeat(60) + '\n');
    });
    
    await mongoose.connection.close();
    console.log('✅ 检查完成');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkOrderProductId();
