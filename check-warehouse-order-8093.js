require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

async function checkWarehouseOrder() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const WarehouseOrder = require('./models/WarehouseOrder');
    
    // 查找订单
    const order = await WarehouseOrder.findOne({
      orderNumber: 'WO-20260206-8093'
    }).lean();
    
    if (!order) {
      console.log('❌ 订单不存在');
      return;
    }
    
    console.log('=== 订单信息 ===');
    console.log('订单号:', order.orderNumber);
    console.log('商户:', order.merchantName);
    console.log('总金额:', order.totalAmount);
    console.log('小计:', order.subtotal);
    console.log('税额:', order.taxAmount);
    console.log('\n=== 产品明细 ===');
    
    order.items.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.productName}`);
      console.log('   数量:', item.quantity);
      console.log('   批发价:', item.wholesalePrice);
      console.log('   小计:', item.subtotal);
      console.log('   税务分类:', item.taxClassification);
      console.log('   税额:', item.taxAmount);
    });

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkWarehouseOrder();
