const mongoose = require('mongoose');
require('dotenv').config();

const RepairOrder = require('./models/RepairOrder');

async function checkTestRepair() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    // 查找设备名称为 test 的维修订单
    const repairs = await RepairOrder.find({ 
      deviceName: 'test',
      merchantId: 'Mobile123'
    }).lean();
    
    console.log(`找到 ${repairs.length} 条设备名称为 test 的维修订单:\n`);
    
    repairs.forEach((repair, index) => {
      console.log(`维修订单 ${index + 1}:`);
      console.log('  ID:', repair._id);
      console.log('  设备名称:', repair.deviceName);
      console.log('  问题描述:', repair.problemDescription);
      console.log('  状态:', repair.status);
      console.log('  接收日期:', repair.receivedDate);
      console.log('  销售日期:', repair.soldDate);
      console.log('  退款日期:', repair.refundDate);
      console.log('  售价:', repair.salePrice);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

checkTestRepair();
