const mongoose = require('mongoose');
require('dotenv').config();

const MerchantSale = require('./models/MerchantSale');

async function checkMarch11CashSales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 查询3月11日的销售记录
    const startDate = new Date('2026-03-11T00:00:00.000Z');
    const endDate = new Date('2026-03-11T23:59:59.999Z');

    console.log('📅 查询日期范围:');
    console.log('   开始:', startDate.toISOString());
    console.log('   结束:', endDate.toISOString());
    console.log('');

    const sales = await MerchantSale.find({
      merchantId: 'Mobile123',
      saleDate: {
        $gte: startDate,
        $lte: endDate
      },
      status: { $ne: 'refunded' }
    }).sort({ saleDate: 1 });

    console.log(`📊 找到 ${sales.length} 条销售记录\n`);

    if (sales.length === 0) {
      console.log('❌ 没有找到3月11日的销售记录');
      return;
    }

    // 筛选现金支付的记录（不区分大小写）
    const cashSales = sales.filter(sale => 
      sale.paymentMethod && sale.paymentMethod.toUpperCase() === 'CASH'
    );
    
    console.log(`💵 现金支付记录: ${cashSales.length} 条\n`);
    console.log('='.repeat(120));

    if (cashSales.length === 0) {
      console.log('❌ 没有找到现金支付的记录');
      console.log('\n所有支付方式统计:');
      const paymentMethods = {};
      sales.forEach(sale => {
        const method = sale.paymentMethod || 'unknown';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
      });
      Object.entries(paymentMethods).forEach(([method, count]) => {
        console.log(`   ${method}: ${count} 条`);
      });
    } else {
      cashSales.forEach((sale, index) => {
        console.log(`\n💵 现金记录 #${index + 1}`);
        console.log('-'.repeat(120));
        console.log(`销售ID: ${sale._id}`);
        console.log(`销售时间: ${sale.saleDate.toLocaleString('zh-CN', { timeZone: 'UTC' })}`);
        console.log(`客户: ${sale.customerName} (${sale.customerPhone})`);
        console.log('');
        
        console.log('📦 商品信息:');
        sale.items.forEach((item, i) => {
          console.log(`   ${i + 1}. ${item.productName || item.name}`);
          console.log(`      数量: ${item.quantity}`);
          console.log(`      单价: €${item.price?.toFixed(2) || '0.00'}`);
          console.log(`      小计: €${((item.price || 0) * item.quantity).toFixed(2)}`);
        });
        console.log('');
        
        console.log('💰 金额信息:');
        console.log(`   总金额: €${sale.totalAmount?.toFixed(2) || '0.00'}`);
        console.log(`   支付方式: ${sale.paymentMethod}`);
        
        // 检查现金支付相关字段
        if (sale.cashPaidAmount !== undefined && sale.cashPaidAmount !== null) {
          console.log(`   💵 客人支付金额: €${sale.cashPaidAmount.toFixed(2)}`);
        } else {
          console.log(`   💵 客人支付金额: [未记录]`);
        }
        
        if (sale.changeAmount !== undefined && sale.changeAmount !== null) {
          console.log(`   💸 找零金额: €${sale.changeAmount.toFixed(2)}`);
        } else {
          console.log(`   💸 找零金额: [未记录]`);
        }
        
        console.log('');
        console.log('📋 其他信息:');
        console.log(`   税务分类: ${sale.taxClassification || 'N/A'}`);
        console.log(`   税额: €${sale.taxAmount?.toFixed(2) || '0.00'}`);
        console.log(`   状态: ${sale.status}`);
        
        if (sale.isQuickSale) {
          console.log(`   快速销售: 是 (${sale.quickSaleCategory})`);
        }
        
        console.log('='.repeat(120));
      });

      // 统计汇总
      console.log('\n📊 现金销售汇总:');
      console.log('-'.repeat(60));
      const totalCashAmount = cashSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
      const totalCashPaid = cashSales.reduce((sum, sale) => sum + (sale.cashPaidAmount || 0), 0);
      const totalChange = cashSales.reduce((sum, sale) => sum + (sale.changeAmount || 0), 0);
      
      console.log(`总销售额: €${totalCashAmount.toFixed(2)}`);
      console.log(`总收款额: €${totalCashPaid.toFixed(2)}`);
      console.log(`总找零额: €${totalChange.toFixed(2)}`);
      console.log(`实际收入: €${(totalCashPaid - totalChange).toFixed(2)}`);
    }

    // 显示所有销售记录的支付方式
    console.log('\n\n📋 所有销售记录概览:');
    console.log('='.repeat(120));
    sales.forEach((sale, index) => {
      console.log(`${index + 1}. ${sale.saleDate.toLocaleString('zh-CN', { timeZone: 'UTC' })} | ${sale.paymentMethod?.padEnd(10)} | €${sale.totalAmount?.toFixed(2).padStart(8)} | ${sale.customerName}`);
    });

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkMarch11CashSales();
