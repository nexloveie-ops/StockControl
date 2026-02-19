const mongoose = require('mongoose');
require('dotenv').config();

async function checkWarehouseOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    // 查找与TRF20260218001相关的仓库订单
    // 可能是通过商户MurrayRanelagh在相近时间创建的订单
    const orders = await WarehouseOrder.find({
      merchantId: 'MurrayRanelagh'
    }).sort({ createdAt: -1 }).limit(5).lean();
    
    console.log(`找到 ${orders.length} 个MurrayRanelagh的仓库订单\n`);
    
    orders.forEach((order, index) => {
      console.log(`\n${index + 1}. 订单号: ${order.orderNumber}`);
      console.log(`   状态: ${order.status}`);
      console.log(`   创建时间: ${order.createdAt}`);
      console.log(`   商品数量: ${order.items.length}`);
      
      order.items.forEach((item, i) => {
        console.log(`\n   商品 ${i + 1}: ${item.productName}`);
        console.log(`      数量: ${item.quantity}`);
        console.log(`      批发价: €${item.wholesalePrice}`);
        console.log(`      taxClassification: "${item.taxClassification}"`);
        console.log(`      taxClassification类型: ${typeof item.taxClassification}`);
      });
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

checkWarehouseOrder();
