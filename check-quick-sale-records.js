const mongoose = require('mongoose');
require('dotenv').config();

async function checkQuickSaleRecords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = 'Mobile123';
    
    // 查询最近3天的所有销售记录
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    console.log(`📅 查询最近3天的销售记录\n`);
    
    const sales = await MerchantSale.find({
      merchantId: merchantId,
      saleDate: { $gte: threeDaysAgo }
    }).sort({ saleDate: -1 }).lean();
    
    console.log(`📊 找到 ${sales.length} 条销售记录\n`);
    
    if (sales.length === 0) {
      console.log('❌ 没有找到销售记录');
      return;
    }
    
    // 显示所有记录
    for (let i = 0; i < sales.length; i++) {
      const sale = sales[i];
      const saleTime = new Date(sale.saleDate);
      const timeStr = saleTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      
      console.log(`\n========== 销售记录 ${i + 1} ==========`);
      console.log(`时间: ${timeStr}`);
      console.log(`销售ID: ${sale._id}`);
      console.log(`客户: ${sale.customerName || '未知'} (${sale.customerPhone || 'N/A'})`);
      console.log(`状态: ${sale.status}`);
      console.log(`总金额: €${sale.totalAmount}`);
      console.log(`销售日期: ${saleTime.toLocaleString('zh-CN')}`);
      
      if (sale.refundDate) {
        console.log(`退款日期: ${new Date(sale.refundDate).toLocaleString('zh-CN')}`);
      }
      if (sale.refundAmount) {
        console.log(`退款金额: €${sale.refundAmount}`);
      }
      
      const isRefunded = sale.status === 'refunded' || sale.refundDate;
      console.log(`退款状态: ${isRefunded ? '❌ 已退款' : '✅ 未退款'}`);
      
      // 显示销售项目
      console.log(`\n销售项目 (${sale.items.length} 个):`);
      sale.items.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.productName}: €${item.price} x ${item.quantity}`);
        if (item.serialNumber) {
          console.log(`     序列号: ${item.serialNumber}`);
        }
        if (item.repairOrderId) {
          console.log(`     关联维修订单: ${item.repairOrderId}`);
        }
        if (item.isQuickSale) {
          console.log(`     ⚡ 快速销售`);
        }
      });
      
      // 显示退款项目
      if (sale.refundItems && sale.refundItems.length > 0) {
        console.log(`\n退款项目 (${sale.refundItems.length} 个):`);
        sale.refundItems.forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.productName}: €${item.price || item.totalAmount || 0} x ${item.quantity || 1}`);
          if (item.serialNumber) {
            console.log(`     序列号: ${item.serialNumber}`);
          }
        });
      }
      
      // 判断是否应该显示在今天的报表中
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const isToday = saleTime >= today && saleTime < tomorrow;
      
      console.log(`\n📊 显示判断:`);
      console.log(`  - 是今天: ${isToday ? '✅' : '❌'}`);
      console.log(`  - 未退款: ${!isRefunded ? '✅' : '❌'}`);
      
      // 检查是否有维修服务项目
      const hasRepairItems = sale.items.some(item => item.repairOrderId || item.isQuickSale);
      if (hasRepairItems) {
        console.log(`  - 包含维修/快速销售项目: ✅`);
        console.log(`  - 应该显示在本日维修明细: ${isToday && !isRefunded ? '✅ 是' : '❌ 否'}`);
        
        if (isToday && isRefunded) {
          console.log(`\n  ⚠️ 这条记录是今天的，但已退款，所以不应该显示！`);
        }
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

checkQuickSaleRecords();
