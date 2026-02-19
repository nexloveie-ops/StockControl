const mongoose = require('mongoose');
require('dotenv').config();

async function checkWarehouseOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    // 查找最新的仓库订单
    const orders = await WarehouseOrder.find({})
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`📦 找到 ${orders.length} 个订单\n`);
    
    for (const order of orders) {
      console.log(`订单: ${order.orderNumber}`);
      console.log(`状态: ${order.status}`);
      console.log(`商户: ${order.merchantId}`);
      console.log(`创建时间: ${order.createdAt}`);
      console.log(`\n订单项目:`);
      
      order.items.forEach((item, index) => {
        console.log(`\n  ${index + 1}. ${item.productName}`);
        console.log(`     productId: ${item.productId}`);
        console.log(`     数量: ${item.quantity}`);
        console.log(`     单价: €${item.unitPrice}`);
      });
      
      console.log('\n' + '='.repeat(80) + '\n');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkWarehouseOrder();
