const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllSales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const Sale = require('./models/Sale');

    // 查询所有销售记录
    const sales = await Sale.find({}).sort({ saleDate: -1 });

    console.log(`=== 所有销售记录 ===`);
    console.log(`找到 ${sales.length} 条销售记录\n`);

    if (sales.length === 0) {
      console.log('❌ 数据库中没有任何销售记录');
      console.log('提示: 数据可能在远程数据库中，而不是本地数据库');
      return;
    }

    sales.forEach((sale, index) => {
      console.log(`\n${index + 1}. 订单号: ${sale.invoiceNumber}`);
      console.log(`   用户: ${sale.merchantId}`);
      console.log(`   日期: ${sale.saleDate.toLocaleString('zh-CN')}`);
      console.log(`   状态: ${sale.status}`);
      console.log(`   总金额: €${sale.totalAmount}`);
      
      let saleProfit = 0;
      sale.items.forEach((item) => {
        const itemProfit = (item.price - item.costPrice) * item.quantity;
        saleProfit += itemProfit;
        console.log(`   - ${item.productName}: 销售价€${item.price}, 成本价€${item.costPrice}, 利润€${itemProfit.toFixed(2)}`);
      });
      console.log(`   订单利润: €${saleProfit.toFixed(2)}`);
    });

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkAllSales();
