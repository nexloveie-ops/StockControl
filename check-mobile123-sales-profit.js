const mongoose = require('mongoose');
require('dotenv').config();

async function checkMobile123Sales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const Sale = require('./models/Sale');

    // 查询Mobile123的销售记录
    const sales = await Sale.find({
      merchantId: 'Mobile123',
      status: { $ne: 'refunded' }
    }).sort({ saleDate: -1 });

    console.log(`=== Mobile123 的销售记录 ===`);
    console.log(`找到 ${sales.length} 条销售记录\n`);

    let grandTotalProfit = 0;

    sales.forEach((sale, index) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`${index + 1}. 订单号: ${sale.invoiceNumber}`);
      console.log(`   日期: ${sale.saleDate.toLocaleString('zh-CN')}`);
      console.log(`   状态: ${sale.status}`);
      console.log(`   总金额: €${sale.totalAmount}`);
      console.log(`\n   产品明细:`);
      
      let saleProfit = 0;
      
      sale.items.forEach((item, itemIndex) => {
        const unitProfit = item.price - item.costPrice;
        const itemProfit = unitProfit * item.quantity;
        saleProfit += itemProfit;
        
        console.log(`\n   ${itemIndex + 1}. ${item.productName}`);
        console.log(`      • 销售价格: €${item.price}`);
        console.log(`      • 成本价: €${item.costPrice}`);
        console.log(`      • 数量: ${item.quantity}`);
        console.log(`      • 单品利润: €${item.price} - €${item.costPrice} = €${unitProfit.toFixed(2)}`);
        console.log(`      • 总利润: €${unitProfit.toFixed(2)} × ${item.quantity} = €${itemProfit.toFixed(2)}`);
      });
      
      console.log(`\n   📊 本订单利润: €${saleProfit.toFixed(2)}`);
      grandTotalProfit += saleProfit;
    });

    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`=== 汇总 ===`);
    console.log(`Mobile123 总销售订单数: ${sales.length}`);
    console.log(`Mobile123 总利润: €${grandTotalProfit.toFixed(2)}`);
    
    console.log(`\n\n=== 利润计算公式 ===`);
    console.log(`每个产品的利润 = (销售价格 - 成本价) × 数量`);
    console.log(`每个订单的利润 = 该订单所有产品利润之和`);
    console.log(`总利润 = 所有订单利润之和`);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkMobile123Sales();
