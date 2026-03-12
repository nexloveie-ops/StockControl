const mongoose = require('mongoose');
require('dotenv').config();

async function listAllRepairs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const RepairOrder = require('./models/RepairOrder');
    
    const merchantId = 'Mobile123';
    
    // 查找所有维修订单
    const repairs = await RepairOrder.find({ merchantId }).sort({ createdAt: -1 }).limit(10).lean();
    
    console.log(`📊 最近10条维修订单:\n`);
    
    repairs.forEach((order, index) => {
      console.log(`${index + 1}. ID: ${order._id}`);
      console.log(`   设备名称: "${order.deviceName}"`);
      console.log(`   客户: ${order.customerName || '未知'} (${order.customerPhone})`);
      console.log(`   问题: ${order.problemDescription}`);
      console.log(`   状态: ${order.status}`);
      console.log(`   创建时间: ${new Date(order.createdAt).toLocaleString('zh-CN')}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ 数据库连接已关闭');
  }
}

listAllRepairs();
