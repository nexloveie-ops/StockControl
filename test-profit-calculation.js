const mongoose = require('mongoose');
require('dotenv').config();

async function testProfitCalculation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    console.log('=== 利润计算测试 ===\n');

    // 查询Mobile123的销售记录
    const sales = await mongoose.connection.db.collection('merchantsales')
      .find({ merchantId: 'Mobile123' })
      .sort({ saleDate: -1 })
      .limit(5)
      .toArray();

    console.log(`找到 ${sales.length} 条Mobile123的销售记录\n`);

    let totalOldProfit = 0;
    let totalNewProfit = 0;

    sales.forEach((sale, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`订单 ${index + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`时间: ${new Date(sale.saleDate).toLocaleString('zh-CN')}`);
      console.log(`状态: ${sale.status}`);
      console.log(`总金额: €${sale.totalAmount}\n`);

      let saleOldProfit = 0;
      let saleNewProfit = 0;

      sale.items.forEach((item, itemIndex) => {
        console.log(`产品 ${itemIndex + 1}: ${item.productName}`);
        if (item.serialNumber) {
          console.log(`  序列号: ${item.serialNumber}`);
        }
        console.log(`  销售价格: €${item.price}`);
        console.log(`  成本价: €${item.costPrice}`);
        console.log(`  数量: ${item.quantity}`);
        console.log(`  税额: €${(item.taxAmount || 0).toFixed(2)}`);
        console.log(`  税务分类: ${item.taxClassification || '未知'}`);
        
        const grossProfit = (item.price - item.costPrice) * item.quantity;
        const netProfit = grossProfit - (item.taxAmount || 0);
        
        console.log(`  ─────────────────────────────────`);
        console.log(`  毛利润: €${grossProfit.toFixed(2)} = (€${item.price} - €${item.costPrice}) × ${item.quantity}`);
        console.log(`  净利润: €${netProfit.toFixed(2)} = €${grossProfit.toFixed(2)} - €${(item.taxAmount || 0).toFixed(2)}`);
        
        saleOldProfit += grossProfit;
        saleNewProfit += netProfit;
        console.log('');
      });

      console.log(`📊 订单利润对比:`);
      console.log(`  旧算法（未扣税）: €${saleOldProfit.toFixed(2)}`);
      console.log(`  新算法（扣税后）: €${saleNewProfit.toFixed(2)}`);
      console.log(`  差异: €${(saleOldProfit - saleNewProfit).toFixed(2)}\n`);

      totalOldProfit += saleOldProfit;
      totalNewProfit += saleNewProfit;
    });

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`=== 总计对比 ===`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`旧算法总利润（未扣税）: €${totalOldProfit.toFixed(2)}`);
    console.log(`新算法总利润（扣税后）: €${totalNewProfit.toFixed(2)}`);
    console.log(`总差异: €${(totalOldProfit - totalNewProfit).toFixed(2)}`);
    console.log(`\n说明:`);
    console.log(`- 旧算法: 利润 = (销售价 - 成本价) × 数量`);
    console.log(`- 新算法: 利润 = (销售价 - 成本价) × 数量 - 应缴税额`);
    console.log(`- 新算法更准确，反映了真实的净利润`);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

testProfitCalculation();
