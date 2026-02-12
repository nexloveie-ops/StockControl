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

    // 按用户分组
    const salesByMerchant = {};

    sales.forEach((sale) => {
      if (!salesByMerchant[sale.merchantId]) {
        salesByMerchant[sale.merchantId] = [];
      }
      salesByMerchant[sale.merchantId].push(sale);
    });

    console.log(`用户列表:`);
    Object.keys(salesByMerchant).forEach(merchantId => {
      console.log(`  - ${merchantId}: ${salesByMerchant[merchantId].length} 条记录`);
    });

    // 显示每个用户的详细信息
    Object.keys(salesByMerchant).forEach(merchantId => {
      console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`用户: ${merchantId}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      let merchantTotalProfit = 0;

      salesByMerchant[merchantId].forEach((sale, index) => {
        console.log(`\n${index + 1}. 订单号: ${sale.invoiceNumber}`);
        console.log(`   日期: ${sale.saleDate.toLocaleString('zh-CN')}`);
        console.log(`   状态: ${sale.status}`);
        console.log(`   总金额: €${sale.totalAmount}`);
        
        let saleProfit = 0;
        
        console.log(`   产品:`);
        sale.items.forEach((item, itemIndex) => {
          const unitProfit = item.price - item.costPrice;
          const itemProfit = unitProfit * item.quantity;
          saleProfit += itemProfit;
          
          console.log(`     ${itemIndex + 1}. ${item.productName}`);
          console.log(`        销售价: €${item.price} | 成本价: €${item.costPrice} | 数量: ${item.quantity}`);
          console.log(`        利润计算: (€${item.price} - €${item.costPrice}) × ${item.quantity} = €${itemProfit.toFixed(2)}`);
        });
        
        console.log(`   订单利润: €${saleProfit.toFixed(2)}`);
        merchantTotalProfit += saleProfit;
      });

      console.log(`\n📊 ${merchantId} 总利润: €${merchantTotalProfit.toFixed(2)}`);
    });

    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`=== 利润计算公式 ===`);
    console.log(`利润 = (销售价格 - 成本价) × 数量`);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkAllSales();
