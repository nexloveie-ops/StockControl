const mongoose = require('mongoose');
require('dotenv').config();

async function checkFeb11Sales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const Sale = require('./models/Sale');

    // 查询2月11日的销售记录
    const sales = await Sale.find({
      saleDate: {
        $gte: new Date('2026-02-11T00:00:00.000Z'),
        $lt: new Date('2026-02-12T00:00:00.000Z')
      }
    }).sort({ saleDate: 1 });

    console.log(`=== 2026年2月11日销售记录 ===`);
    console.log(`找到 ${sales.length} 条销售记录\n`);

    if (sales.length === 0) {
      console.log('❌ 没有找到销售记录');
      return;
    }

    let totalProfit = 0;

    sales.forEach((sale, index) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`订单 ${index + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`订单号: ${sale.invoiceNumber}`);
      console.log(`用户: ${sale.merchantId}`);
      console.log(`时间: ${sale.saleDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
      console.log(`状态: ${sale.status}`);
      console.log(`总金额: €${sale.totalAmount}`);
      console.log(`\n产品明细:`);
      
      let saleProfit = 0;
      
      sale.items.forEach((item, itemIndex) => {
        const unitProfit = item.price - item.costPrice;
        const itemProfit = unitProfit * item.quantity;
        saleProfit += itemProfit;
        
        console.log(`\n  ${itemIndex + 1}. ${item.productName}`);
        if (item.serialNumber) {
          console.log(`     序列号: ${item.serialNumber}`);
        }
        console.log(`     销售价格: €${item.price}`);
        console.log(`     成本价: €${item.costPrice}`);
        console.log(`     数量: ${item.quantity}`);
        console.log(`     ─────────────────────────────────`);
        console.log(`     单品利润: €${item.price} - €${item.costPrice} = €${unitProfit.toFixed(2)}`);
        console.log(`     总利润: €${unitProfit.toFixed(2)} × ${item.quantity} = €${itemProfit.toFixed(2)}`);
      });
      
      console.log(`\n  📊 本订单利润: €${saleProfit.toFixed(2)}`);
      totalProfit += saleProfit;
    });

    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`=== 2月11日汇总 ===`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`总订单数: ${sales.length}`);
    console.log(`总利润: €${totalProfit.toFixed(2)}`);
    console.log(`\n计算公式: 利润 = (销售价格 - 成本价) × 数量`);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkFeb11Sales();
