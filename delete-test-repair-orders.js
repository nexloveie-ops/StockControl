const mongoose = require('mongoose');
require('dotenv').config();

async function deleteTestRepairOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const RepairOrder = require('./models/RepairOrder');
    
    const merchantId = 'Mobile123';
    
    // 查找要删除的维修订单（不区分大小写）
    console.log('🔍 查找测试维修订单\n');
    
    const testOrders = await RepairOrder.find({
      merchantId: merchantId,
      deviceName: /^test$/i  // 不区分大小写匹配 "test" 或 "TEST"
    }).lean();
    
    console.log(`📊 找到 ${testOrders.length} 条测试维修订单\n`);
    
    if (testOrders.length === 0) {
      console.log('❌ 没有找到要删除的记录');
      return;
    }
    
    // 显示要删除的记录
    testOrders.forEach((order, index) => {
      console.log(`${index + 1}. ID: ${order._id}`);
      console.log(`   设备名称: ${order.deviceName}`);
      console.log(`   客户: ${order.customerName || '未知'}`);
      console.log(`   状态: ${order.status}`);
      console.log(`   创建时间: ${new Date(order.createdAt).toLocaleString('zh-CN')}`);
      console.log('');
    });
    
    // 删除记录
    const result = await RepairOrder.deleteMany({
      merchantId: merchantId,
      deviceName: /^test$/i  // 不区分大小写匹配 "test" 或 "TEST"
    });
    
    console.log(`✅ 成功删除 ${result.deletedCount} 条维修订单\n`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ 数据库连接已关闭');
  }
}

deleteTestRepairOrders();
