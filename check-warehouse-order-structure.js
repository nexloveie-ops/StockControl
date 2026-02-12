// 检查仓库订单的数据结构
require('dotenv').config();
const mongoose = require('mongoose');

async function checkOrderStructure() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    const orderNumber = 'WO-20260212-2243';
    
    const order = await WarehouseOrder.findOne({ orderNumber }).lean();
    
    if (!order) {
      console.log(`❌ 找不到订单: ${orderNumber}`);
      return;
    }
    
    console.log(`📦 仓库订单完整数据结构:\n`);
    console.log(JSON.stringify(order, null, 2));
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkOrderStructure();
