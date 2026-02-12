const mongoose = require('mongoose');
require('dotenv').config();

async function checkRecentSales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const Sale = require('./models/Sale');

    // 查询最近的销售记录
    const sales = await Sale.find({
      status: { $ne: 'refunded' }
    }).sort({ saleDate: -1 }).limit(5);

    console.log(`=== 最近的销售记录 ===`);
    console.log(`找到 ${sales.length} 条销售记录\n`);

    sales.forEach((sale, index) => {
      console.log(`\n${index + 1}. 订单号: ${sale.invoiceNumber}`);
      console.log(`   日期: ${sale.saleDate.toLocaleString('zh-CN')}`);
      console.log(`   状态: ${sale.status}`);
      console.log(`   总金额: €${sale.totalAmount}`);
      console.log(`   产品明细:`);
      
      let saleProfit = 0;
      
      sale.items.forEach((item, itemIndex) => {
        const itemProfit = (item.price - item.costPrice) * item.quantity;
        saleProfit += itemProfit;
        
        console.log(`\n   ${itemIndex + 1}. ${item.productName}`);
        console.log(`      销售价格: €${item.price}`);
        console.log(`      成本价: €${item.costPrice}`);
        console.log(`      数量: ${item.quantity}`);
        console.log(`      计算过程: (€${item.price} - €${item.costPrice}) × ${item.quantity} = €${itemProfit.toFixed(2)}`);
      });
      
      console.log(`\n   📊 订单总利润: €${saleProfit.toFixed(2)}`);
    });

    console.log(`\n\n=== 利润计算说明 ===`);
    console.log(`公式: 利润 = (销售价格 - 成本价) × 数量`);
    console.log(`\n每个订单的利润 = 所有产品的利润之和`);
    console.log(`每个产品的利润 = (该产品的销售价格 - 该产品的成本价) × 数量`);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkRecentSales();
