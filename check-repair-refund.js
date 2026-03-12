const mongoose = require('mongoose');
require('dotenv').config();

async function checkRepairRefund() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    const RepairOrder = require('./models/RepairOrder');
    
    const merchantId = 'Mobile123';
    
    console.log('🔍 检查维修服务的退款情况\n');
    
    // 查询所有包含维修服务的销售记录
    const salesWithRepair = await MerchantSale.find({
      merchantId: merchantId,
      'items.repairOrderId': { $exists: true, $ne: null }
    }).lean();
    
    console.log(`📊 包含维修服务的销售记录: ${salesWithRepair.length} 条\n`);
    
    salesWithRepair.forEach((sale, i) => {
      const repairItems = sale.items.filter(item => item.repairOrderId);
      
      console.log(`${i + 1}. 订单 ${sale._id.toString().slice(-8)}`);
      console.log(`   销售日期: ${new Date(sale.saleDate).toLocaleDateString('zh-CN')}`);
      console.log(`   状态: ${sale.status}`);
      console.log(`   总金额: €${sale.totalAmount}`);
      
      if (sale.refundDate) {
        console.log(`   ⚠️ 退款日期: ${new Date(sale.refundDate).toLocaleDateString('zh-CN')}`);
        console.log(`   退款金额: €${sale.refundAmount || 0}`);
      }
      
      console.log(`   维修项目:`);
      repairItems.forEach(item => {
        console.log(`   - ${item.productName}: €${item.price}`);
        console.log(`     repairOrderId: ${item.repairOrderId}`);
      });
      console.log('');
    });
    
    // 查询所有已销售的维修订单
    console.log('\n📋 所有已销售的维修订单:\n');
    
    const soldRepairs = await RepairOrder.find({
      merchantId: merchantId,
      status: 'sold'
    }).lean();
    
    console.log(`找到 ${soldRepairs.length} 条已销售的维修订单\n`);
    
    // 检查每个维修订单是否有对应的销售记录，以及是否退款
    for (const repair of soldRepairs) {
      console.log(`维修订单: ${repair._id.toString().slice(-8)}`);
      console.log(`  设备: ${repair.deviceName}`);
      console.log(`  客户: ${repair.customerName || 'N/A'} (${repair.customerPhone})`);
      console.log(`  销售价格: €${repair.salePrice || 0}`);
      console.log(`  销售日期: ${repair.soldAt ? new Date(repair.soldAt).toLocaleDateString('zh-CN') : 'N/A'}`);
      
      // 查找对应的销售记录
      const relatedSale = await MerchantSale.findOne({
        merchantId: merchantId,
        'items.repairOrderId': repair._id
      }).lean();
      
      if (relatedSale) {
        console.log(`  ✅ 找到销售记录: ${relatedSale._id.toString().slice(-8)}`);
        console.log(`     销售记录状态: ${relatedSale.status}`);
        
        if (relatedSale.status === 'refunded' || relatedSale.refundDate) {
          console.log(`     ❌ 已退款: ${relatedSale.refundDate ? new Date(relatedSale.refundDate).toLocaleDateString('zh-CN') : 'N/A'}`);
        } else {
          console.log(`     ✅ 未退款`);
        }
      } else {
        console.log(`  ⚠️ 未找到对应的销售记录`);
      }
      console.log('');
    }
    
    // 统计今日已销售且未退款的维修订单
    console.log('\n📊 今日已销售且未退款的维修订单:\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let todayCount = 0;
    let todayNotRefundedCount = 0;
    
    for (const repair of soldRepairs) {
      const saleDate = repair.soldAt ? new Date(repair.soldAt) : new Date(repair.updatedAt);
      
      if (saleDate >= today && saleDate < tomorrow) {
        todayCount++;
        
        // 检查是否退款
        const relatedSale = await MerchantSale.findOne({
          merchantId: merchantId,
          'items.repairOrderId': repair._id
        }).lean();
        
        const isRefunded = relatedSale && (relatedSale.status === 'refunded' || relatedSale.refundDate);
        
        if (!isRefunded) {
          todayNotRefundedCount++;
          console.log(`${todayNotRefundedCount}. ${repair.deviceName} - ${repair.customerName || 'N/A'}`);
          console.log(`   销售价格: €${repair.salePrice || 0}`);
          console.log(`   销售时间: ${saleDate.toLocaleString('zh-CN')}`);
        }
      }
    }
    
    console.log(`\n今日已销售: ${todayCount} 条`);
    console.log(`今日已销售且未退款: ${todayNotRefundedCount} 条`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkRepairRefund();
