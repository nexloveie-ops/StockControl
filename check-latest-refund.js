const mongoose = require('mongoose');
require('dotenv').config();

async function checkLatestRefund() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const RepairOrder = require('./models/RepairOrder');
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = 'Mobile123';
    
    // 查找最新的退款记录
    const latestRefund = await MerchantSale.findOne({
      merchantId: merchantId,
      refundDate: { $exists: true, $ne: null }
    }).sort({ refundDate: -1 }).lean();
    
    if (!latestRefund) {
      console.log('❌ 没有找到退款记录');
      return;
    }
    
    console.log('📋 最新的退款记录:');
    console.log(`销售ID: ${latestRefund._id}`);
    console.log(`退款日期: ${new Date(latestRefund.refundDate).toLocaleString('zh-CN')}`);
    console.log(`状态: ${latestRefund.status}`);
    console.log(`\n退款项目 (${latestRefund.refundItems?.length || 0} 个):`);
    
    if (latestRefund.refundItems) {
      for (const item of latestRefund.refundItems) {
        console.log(`\n  - ${item.productName}`);
        console.log(`    type: ${item.type}`);
        console.log(`    repairOrderId: ${item.repairOrderId || 'N/A'}`);
        console.log(`    repairLocation: ${item.repairLocation || 'N/A'}`);
        
        // 如果有repairOrderId，查找维修订单
        if (item.repairOrderId) {
          const repair = await RepairOrder.findById(item.repairOrderId);
          if (repair) {
            console.log(`    维修订单状态: ${repair.status}`);
            console.log(`    维修订单退款日期: ${repair.refundDate ? new Date(repair.refundDate).toLocaleString('zh-CN') : 'N/A'}`);
          } else {
            console.log(`    ❌ 未找到维修订单`);
          }
        }
      }
    }
    
    // 检查销售记录中的items
    console.log(`\n\n📦 销售记录中的所有项目 (${latestRefund.items.length} 个):`);
    for (const item of latestRefund.items) {
      console.log(`\n  - ${item.productName}`);
      console.log(`    repairOrderId: ${item.repairOrderId || 'N/A'}`);
      
      if (item.repairOrderId) {
        const repair = await RepairOrder.findById(item.repairOrderId);
        if (repair) {
          console.log(`    维修订单状态: ${repair.status}`);
          console.log(`    维修订单退款日期: ${repair.refundDate ? new Date(repair.refundDate).toLocaleString('zh-CN') : 'N/A'}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkLatestRefund();
