const mongoose = require('mongoose');
require('dotenv').config();

async function verifyTaxReport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = 'Mobile123';
    
    console.log('📊 验证税务报表查询条件\n');
    
    // 模拟税务报表的查询条件
    const startDate = new Date('2026-03-01');
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date('2026-03-31');
    endDate.setHours(23, 59, 59, 999);
    
    console.log(`日期范围: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\n`);
    
    // 查询所有销售记录
    const allSales = await MerchantSale.find({
      merchantId: merchantId,
      saleDate: { $gte: startDate, $lte: endDate }
    }).lean();
    
    console.log(`📋 所有销售记录: ${allSales.length} 条\n`);
    allSales.forEach((sale, i) => {
      console.log(`${i + 1}. 订单 ${sale._id.toString().slice(-8)}`);
      console.log(`   状态: ${sale.status}`);
      console.log(`   金额: €${sale.totalAmount}`);
      console.log(`   日期: ${new Date(sale.saleDate).toLocaleDateString()}`);
      if (sale.refundDate) {
        console.log(`   ⚠️ 已退款: ${new Date(sale.refundDate).toLocaleDateString()}`);
      }
      console.log('');
    });
    
    // 查询税务报表使用的条件（只包含completed）
    const taxReportSales = await MerchantSale.find({
      merchantId: merchantId,
      saleDate: { $gte: startDate, $lte: endDate },
      status: 'completed'
    }).lean();
    
    console.log(`\n✅ 税务报表查询结果: ${taxReportSales.length} 条\n`);
    taxReportSales.forEach((sale, i) => {
      console.log(`${i + 1}. 订单 ${sale._id.toString().slice(-8)}`);
      console.log(`   状态: ${sale.status}`);
      console.log(`   金额: €${sale.totalAmount}`);
      console.log('');
    });
    
    // 检查是否包含退款订单
    const refundedInReport = taxReportSales.filter(sale => sale.refundDate);
    
    if (refundedInReport.length > 0) {
      console.log('❌ 错误：税务报表仍然包含已退款的订单！');
      refundedInReport.forEach(sale => {
        console.log(`   - 订单 ${sale._id.toString().slice(-8)}`);
      });
    } else {
      console.log('✅ 正确：税务报表不包含已退款的订单');
    }
    
    // 检查Margin VAT记录
    console.log('\n\n📊 Margin VAT 销售记录:\n');
    
    const marginVATSales = await MerchantSale.find({
      merchantId: merchantId,
      saleDate: { $gte: startDate, $lte: endDate },
      status: 'completed',
      'items.taxClassification': { $in: ['MARGIN_VAT_0', 'MARGIN_VAT', 'Margin VAT'] }
    }).lean();
    
    console.log(`找到 ${marginVATSales.length} 条Margin VAT销售记录\n`);
    
    if (marginVATSales.length === 0) {
      console.log('✅ 没有Margin VAT销售记录（TEST IPHONE 11已被正确排除）');
    } else {
      marginVATSales.forEach((sale, i) => {
        const marginItems = sale.items.filter(item => 
          item.taxClassification === 'MARGIN_VAT_0' || 
          item.taxClassification === 'MARGIN_VAT' ||
          item.taxClassification === 'Margin VAT'
        );
        
        console.log(`${i + 1}. 订单 ${sale._id.toString().slice(-8)}`);
        console.log(`   日期: ${new Date(sale.saleDate).toLocaleDateString()}`);
        marginItems.forEach(item => {
          console.log(`   - ${item.productName}: €${item.price}`);
        });
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

verifyTaxReport();
