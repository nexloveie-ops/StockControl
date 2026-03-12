const mongoose = require('mongoose');
require('dotenv').config();

async function manualUpdateRepairStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const RepairOrder = require('./models/RepairOrder');
    
    const repairOrderId = '69b333cdd8fb4862512bb3d3';
    
    console.log(`🔍 查找维修订单: ${repairOrderId}\n`);
    
    const repairOrder = await RepairOrder.findById(repairOrderId);
    
    if (!repairOrder) {
      console.log('❌ 未找到维修订单');
      return;
    }
    
    console.log('📋 当前维修订单信息:');
    console.log(`设备名称: ${repairOrder.deviceName}`);
    console.log(`当前状态: ${repairOrder.status}`);
    console.log(`退款日期: ${repairOrder.refundDate || 'N/A'}`);
    
    console.log('\n🔄 更新状态为 refunded...');
    
    repairOrder.status = 'refunded';
    repairOrder.refundDate = new Date();
    await repairOrder.save();
    
    console.log('✅ 维修订单状态已更新');
    console.log(`新状态: ${repairOrder.status}`);
    console.log(`退款日期: ${new Date(repairOrder.refundDate).toLocaleString('zh-CN')}`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

manualUpdateRepairStatus();
