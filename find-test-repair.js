const mongoose = require('mongoose');
require('dotenv').config();

const RepairOrder = require('./models/RepairOrder');

async function findTestRepair() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    // 查找所有包含 test 的维修订单
    const repairs = await RepairOrder.find({
      $or: [
        { deviceName: /test/i },
        { issueDescription: /test/i },
        { customerName: /test/i }
      ]
    }).lean();
    
    console.log(`找到 ${repairs.length} 条包含 test 的维修订单:\n`);
    
    repairs.forEach((repair, index) => {
      console.log(`\n维修订单 ${index + 1}:`);
      console.log('ID:', repair._id);
      console.log('设备名称:', repair.deviceName);
      console.log('问题描述:', repair.issueDescription);
      console.log('客户名称:', repair.customerName);
      console.log('状态:', repair.status);
      console.log('退款日期:', repair.refundDate);
      console.log('销售日期:', repair.soldDate);
      console.log('创建日期:', repair.createdAt);
    });
    
    // 查找最近的维修订单
    console.log('\n\n========== 最近10条维修订单 ==========');
    const recentRepairs = await RepairOrder.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    recentRepairs.forEach((repair, index) => {
      console.log(`\n${index + 1}. ${repair.deviceName} - ${repair.issueDescription}`);
      console.log('   状态:', repair.status);
      console.log('   创建:', repair.createdAt);
      console.log('   销售:', repair.soldDate);
      console.log('   退款:', repair.refundDate);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

findTestRepair();
