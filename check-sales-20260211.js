const mongoose = require('mongoose');
require('dotenv').config();

async function checkSales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const Sale = require('./models/Sale');

    // 查询2月11日的销售记录
    const startDate = new Date('2026-02-11T00:00:00.000Z');
    const endDate = new Date('2026-02-11T23:59:59.999Z');

    const sales = await Sale.find({
      saleDate: { $gte: startDate, $lte: endDate },
      status: { $ne: 'refunded' }
    }).sort({ saleDate: -1 });

    console.log(`=== 2026年2月11日销售记录 ===`);
    console.log(`找到 ${sales.length} 条销售记录\n`);

    let totalProfit = 0;

    sales.forEach((sale, index) => {
      console.log(`\n${index + 1}. 订单号: ${sale.invoiceNumber}`);
      console.log(`   时间: ${sale.saleDate.toLocaleString('zh-CN', { timeZone: 'UTC' })}`);
      console.log(`   状态: ${sale.status}`);
      console.log(`   总金额: €${sale.totalAmount}`);
      console.log(`   产品明细:`);
      
      let saleProfit = 0;
      
      sale.items.forEach((item, itemIndex) => {
        const itemProfit = (item.price - item.costPrice) * item.quantity;
        saleProfit += itemProfit;
        
        console.log(`   ${itemIndex + 1}. ${item.productName}`);
        console.log(`      - 销售价格: €${item.price}`);
        console.log(`      - 成本价: €${item.costPrice}`);
        console.log(`      - 数量: ${item.quantity}`);
        console.log(`      - 单品利润: €${item.price - item.costPrice}`);
        console.log(`      - 总利润: €${itemProfit.toFixed(2)} = (€${item.price} - €${item.costPrice}) × ${item.quantity}`);
      });
      
      console.log(`   订单利润: €${saleProfit.toFixed(2)}`);
      totalProfit += saleProfit;
    });

    console.log(`\n=== 汇总 ===`);
    console.log(`总利润: €${totalProfit.toFixed(2)}`);
    console.log(`\n计算公式: 利润 = (销售价格 - 成本价) × 数量`);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkSales();
