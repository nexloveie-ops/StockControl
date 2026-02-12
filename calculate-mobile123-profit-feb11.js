const mongoose = require('mongoose');
require('dotenv').config();

async function calculateProfit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    console.log('=== Mobile123 2月11日利润计算 ===\n');

    // 查询2月11日的销售记录
    const startDate = new Date('2026-02-11T00:00:00.000Z');
    const endDate = new Date('2026-02-12T00:00:00.000Z');

    const sales = await mongoose.connection.db.collection('merchantsales')
      .find({
        merchantId: 'Mobile123',
        saleDate: { $gte: startDate, $lt: endDate }
      })
      .sort({ saleDate: 1 })
      .toArray();

    console.log(`找到 ${sales.length} 条销售记录\n`);

    if (sales.length === 0) {
      console.log('❌ 没有找到销售记录');
      return;
    }

    // 过滤掉已退款的订单
    const validSales = sales.filter(sale => sale.status !== 'refunded' && sale.status !== 'REFUNDED');
    const refundedSales = sales.filter(sale => sale.status === 'refunded' || sale.status === 'REFUNDED');

    console.log(`有效销售: ${validSales.length} 条`);
    console.log(`已退款: ${refundedSales.length} 条\n`);

    let totalSalesAmount = 0;
    let totalCost = 0;
    let totalTax = 0;
    let totalGrossProfit = 0;
    let totalNetProfit = 0;

    validSales.forEach((sale, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`订单 ${index + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`时间: ${new Date(sale.saleDate).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
      console.log(`订单号: ${sale.invoiceNumber || '无'}`);
      console.log(`状态: ${sale.status}`);
      console.log(`总金额: €${sale.totalAmount}\n`);

      let orderSalesAmount = 0;
      let orderCost = 0;
      let orderTax = 0;
      let orderGrossProfit = 0;
      let orderNetProfit = 0;

      sale.items.forEach((item, itemIndex) => {
        console.log(`产品 ${itemIndex + 1}: ${item.productName}`);
        if (item.serialNumber) {
          console.log(`  序列号: ${item.serialNumber}`);
        }
        
        const salesAmount = item.price * item.quantity;
        const cost = item.costPrice * item.quantity;
        const tax = item.taxAmount || 0;
        const grossProfit = salesAmount - cost;
        const netProfit = grossProfit - tax;

        console.log(`  销售价格: €${item.price}`);
        console.log(`  成本价: €${item.costPrice}`);
        console.log(`  数量: ${item.quantity}`);
        console.log(`  税务分类: ${item.taxClassification || '未知'}`);
        console.log(`  税额: €${tax.toFixed(2)}`);
        console.log(`  ─────────────────────────────────`);
        console.log(`  销售额 = €${item.price} × ${item.quantity} = €${salesAmount.toFixed(2)}`);
        console.log(`  成本 = €${item.costPrice} × ${item.quantity} = €${cost.toFixed(2)}`);
        console.log(`  毛利润 = €${salesAmount.toFixed(2)} - €${cost.toFixed(2)} = €${grossProfit.toFixed(2)}`);
        console.log(`  净利润 = €${grossProfit.toFixed(2)} - €${tax.toFixed(2)} = €${netProfit.toFixed(2)}`);
        console.log('');

        orderSalesAmount += salesAmount;
        orderCost += cost;
        orderTax += tax;
        orderGrossProfit += grossProfit;
        orderNetProfit += netProfit;
      });

      console.log(`📊 订单汇总:`);
      console.log(`  销售额: €${orderSalesAmount.toFixed(2)}`);
      console.log(`  成本: €${orderCost.toFixed(2)}`);
      console.log(`  税额: €${orderTax.toFixed(2)}`);
      console.log(`  毛利润: €${orderGrossProfit.toFixed(2)}`);
      console.log(`  净利润: €${orderNetProfit.toFixed(2)}`);
      console.log('');

      totalSalesAmount += orderSalesAmount;
      totalCost += orderCost;
      totalTax += orderTax;
      totalGrossProfit += orderGrossProfit;
      totalNetProfit += orderNetProfit;
    });

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`=== 2月11日总计（不含退款） ===`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`有效订单数: ${validSales.length}`);
    console.log(`总销售额: €${totalSalesAmount.toFixed(2)}`);
    console.log(`总成本: €${totalCost.toFixed(2)}`);
    console.log(`总税额: €${totalTax.toFixed(2)}`);
    console.log(`总毛利润: €${totalGrossProfit.toFixed(2)}`);
    console.log(`总净利润: €${totalNetProfit.toFixed(2)}`);
    
    console.log(`\n计算公式:`);
    console.log(`  毛利润 = 销售额 - 成本`);
    console.log(`  净利润 = 毛利润 - 应缴税额`);
    console.log(`  净利润 = €${totalGrossProfit.toFixed(2)} - €${totalTax.toFixed(2)} = €${totalNetProfit.toFixed(2)}`);

    if (refundedSales.length > 0) {
      console.log(`\n⚠️  已退款订单（不计入利润）:`);
      refundedSales.forEach(sale => {
        console.log(`  - ${sale.items.map(i => i.productName).join(', ')} (€${sale.totalAmount})`);
      });
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

calculateProfit();
