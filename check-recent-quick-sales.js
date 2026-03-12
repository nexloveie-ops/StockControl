const mongoose = require('mongoose');
require('dotenv').config();

async function checkRecentQuickSales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const RepairOrder = require('./models/RepairOrder');
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = 'Mobile123';
    
    // 查询最近7天的快速销售维修订单
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    console.log(`📅 查询最近7天的快速销售维修记录\n`);
    
    const repairs = await RepairOrder.find({
      merchantId: merchantId,
      status: 'sold',
      isQuickSale: true,
      soldAt: { $gte: sevenDaysAgo }
    }).sort({ soldAt: -1 }).lean();
    
    console.log(`📊 找到 ${repairs.length} 条快速销售维修记录\n`);
    
    if (repairs.length === 0) {
      console.log('❌ 没有找到快速销售的维修记录');
      return;
    }
    
    // 获取所有相关的销售记录
    const repairIds = repairs.map(r => r._id);
    const sales = await MerchantSale.find({
      merchantId: merchantId,
      'items.repairOrderId': { $in: repairIds }
    }).lean();
    
    // 创建维修ID到销售记录的映射
    const repairIdToSaleMap = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.repairOrderId) {
          repairIdToSaleMap[item.repairOrderId.toString()] = sale;
        }
      });
    });
    
    console.log(`🔗 找到 ${sales.length} 条相关销售记录\n`);
    
    // 显示所有记录
    for (let i = 0; i < repairs.length; i++) {
      const repair = repairs[i];
      const relatedSale = repairIdToSaleMap[repair._id.toString()];
      
      const soldTime = repair.soldAt ? new Date(repair.soldAt) : null;
      const timeStr = soldTime ? soldTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      
      console.log(`\n========== 维修记录 ${i + 1} ==========`);
      console.log(`时间: ${timeStr}`);
      console.log(`订单ID: ${repair._id}`);
      console.log(`设备名称: ${repair.deviceName || 'N/A'}`);
      console.log(`客户: ${repair.customerName || '未知'}`);
      console.log(`问题描述: ${repair.problemDescription || 'N/A'}`);
      
      // 显示服务信息
      if (repair.services && repair.services.length > 0) {
        console.log(`服务:`);
        repair.services.forEach((service, idx) => {
          console.log(`  - ${service.name}: €${service.price}`);
        });
      }
      
      console.log(`销售价格: €${repair.salePrice || 0}`);
      console.log(`⚡ 快速销售`);
      console.log(`销售日期: ${soldTime ? soldTime.toLocaleDateString('zh-CN') : 'N/A'}`);
      console.log(`销售时间: ${soldTime ? soldTime.toLocaleString('zh-CN') : 'N/A'}`);
      
      // 检查销售记录
      if (relatedSale) {
        console.log(`\n📋 销售记录:`);
        console.log(`   销售ID: ${relatedSale._id}`);
        console.log(`   状态: ${relatedSale.status}`);
        console.log(`   总金额: €${relatedSale.totalAmount}`);
        
        if (relatedSale.refundDate) {
          console.log(`   退款日期: ${new Date(relatedSale.refundDate).toLocaleString('zh-CN')}`);
        }
        if (relatedSale.refundAmount) {
          console.log(`   退款金额: €${relatedSale.refundAmount}`);
        }
        
        const isRefunded = relatedSale.status === 'refunded' || relatedSale.refundDate;
        console.log(`   退款状态: ${isRefunded ? '❌ 已退款' : '✅ 未退款'}`);
        
        // 显示退款项目
        if (relatedSale.refundItems && relatedSale.refundItems.length > 0) {
          console.log(`\n   退款项目 (${relatedSale.refundItems.length} 个):`);
          relatedSale.refundItems.forEach((item, idx) => {
            console.log(`   ${idx + 1}. ${item.productName}: €${item.price || item.totalAmount || 0} x ${item.quantity || 1}`);
          });
        }
        
        // 判断是否应该显示在今天的报表中
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const isToday = soldTime && soldTime >= today && soldTime < tomorrow;
        
        console.log(`\n   📊 显示判断:`);
        console.log(`   - 是今天: ${isToday ? '✅' : '❌'}`);
        console.log(`   - 未退款: ${!isRefunded ? '✅' : '❌'}`);
        console.log(`   - 应该显示在本日维修明细: ${isToday && !isRefunded ? '✅ 是' : '❌ 否'}`);
      } else {
        console.log(`\n📋 销售记录: ❌ 未找到`);
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

checkRecentQuickSales();
