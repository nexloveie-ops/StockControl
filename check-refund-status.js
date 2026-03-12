const mongoose = require('mongoose');
require('dotenv').config();

async function checkRefundStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = 'Mobile123';
    
    console.log(`🔍 检查 ${merchantId} 的销售记录状态\n`);
    
    // 查询所有销售记录
    const allSales = await MerchantSale.find({
      merchantId: merchantId
    }).lean();
    
    console.log(`📊 总销售记录: ${allSales.length} 条\n`);
    
    // 统计不同的status值
    const statusCounts = {};
    allSales.forEach(sale => {
      const status = sale.status || 'undefined';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('📋 Status 统计:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count} 条`);
    });
    console.log('');
    
    // 查找可能是退款的记录
    const possibleRefunds = allSales.filter(sale => {
      const status = (sale.status || '').toLowerCase();
      return status.includes('refund') || status.includes('退款');
    });
    
    console.log(`🔍 可能的退款记录: ${possibleRefunds.length} 条\n`);
    
    if (possibleRefunds.length > 0) {
      console.log('退款记录详情:');
      possibleRefunds.forEach((sale, i) => {
        console.log(`${i + 1}. 订单ID: ${sale._id}`);
        console.log(`   - 状态: ${sale.status}`);
        console.log(`   - 销售日期: ${new Date(sale.saleDate).toLocaleDateString()}`);
        console.log(`   - 金额: €${sale.totalAmount}`);
        console.log(`   - 客户: ${sale.customerName || 'N/A'}`);
        console.log('');
      });
    }
    
    // 测试查询条件
    console.log('🧪 测试查询条件:\n');
    
    const testQuery1 = await MerchantSale.find({
      merchantId: merchantId,
      status: { $nin: ['REFUNDED', 'refunded'] }
    }).lean();
    console.log(`1. status: { $nin: ['REFUNDED', 'refunded'] }`);
    console.log(`   结果: ${testQuery1.length} 条记录\n`);
    
    const testQuery2 = await MerchantSale.find({
      merchantId: merchantId,
      status: { $nin: ['REFUNDED', 'refunded', 'Refunded'] }
    }).lean();
    console.log(`2. status: { $nin: ['REFUNDED', 'refunded', 'Refunded'] }`);
    console.log(`   结果: ${testQuery2.length} 条记录\n`);
    
    const testQuery3 = await MerchantSale.find({
      merchantId: merchantId,
      $or: [
        { status: { $exists: false } },
        { status: { $nin: ['REFUNDED', 'refunded', 'Refunded'] } }
      ]
    }).lean();
    console.log(`3. $or: [{ status: { $exists: false } }, { status: { $nin: [...] } }]`);
    console.log(`   结果: ${testQuery3.length} 条记录\n`);
    
    // 检查是否有status为null或undefined的记录
    const noStatus = allSales.filter(sale => !sale.status);
    console.log(`📊 没有status字段的记录: ${noStatus.length} 条`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkRefundStatus();
