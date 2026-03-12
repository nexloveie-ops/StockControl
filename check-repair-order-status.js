const mongoose = require('mongoose');
require('dotenv').config();

async function checkRepairOrderStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const RepairOrder = require('./models/RepairOrder');
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = 'Mobile123';
    
    // 查找最近的已退款销售记录
    console.log('🔍 查找最近的已退款销售记录\n');
    
    const refundedSales = await MerchantSale.find({
      merchantId: merchantId,
      $or: [
        { status: 'refunded' },
        { refundDate: { $exists: true, $ne: null } }
      ]
    }).sort({ refundDate: -1 }).limit(5).lean();
    
    console.log(`📊 找到 ${refundedSales.length} 条已退款的销售记录\n`);
    
    for (let i = 0; i < refundedSales.length; i++) {
      const sale = refundedSales[i];
      console.log(`\n========== 销售记录 ${i + 1} ==========`);
      console.log(`销售ID: ${sale._id}`);
      console.log(`状态: ${sale.status}`);
      console.log(`退款日期: ${sale.refundDate ? new Date(sale.refundDate).toLocaleString('zh-CN') : 'N/A'}`);
      console.log(`退款金额: €${sale.refundAmount || 0}`);
      
      // 检查是否有维修订单
      const repairItems = sale.items.filter(item => item.repairOrderId);
      
      if (repairItems.length > 0) {
        console.log(`\n📋 包含 ${repairItems.length} 个维修项目:`);
        
        for (const item of repairItems) {
          console.log(`\n  项目: ${item.productName}`);
          console.log(`  维修订单ID: ${item.repairOrderId}`);
          
          // 查找维修订单
          const repairOrder = await RepairOrder.findById(item.repairOrderId);
          
          if (repairOrder) {
            console.log(`  维修订单状态: ${repairOrder.status}`);
            console.log(`  退款日期: ${repairOrder.refundDate ? new Date(repairOrder.refundDate).toLocaleString('zh-CN') : 'N/A'}`);
            
            // 检查是否在退款项目中
            const isInRefundItems = sale.refundItems && sale.refundItems.some(refundItem => 
              refundItem.productName === item.productName
            );
            
            console.log(`  是否在退款项目中: ${isInRefundItems ? '✅ 是' : '❌ 否'}`);
            
            if (isInRefundItems && repairOrder.status !== 'refunded') {
              console.log(`  ⚠️ 问题：维修订单应该是refunded状态，但实际是 ${repairOrder.status}`);
            } else if (isInRefundItems && repairOrder.status === 'refunded') {
              console.log(`  ✅ 正确：维修订单状态已更新为refunded`);
            }
          } else {
            console.log(`  ❌ 未找到维修订单`);
          }
        }
      } else {
        console.log(`\n  无维修项目`);
      }
      
      console.log(`========================================`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkRepairOrderStatus();
