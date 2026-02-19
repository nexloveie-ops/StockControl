const mongoose = require('mongoose');
require('dotenv').config();

async function checkMerchantSales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    const allSales = await MerchantSale.find({});
    
    console.log(`📊 MerchantSale 集合中有 ${allSales.length} 条记录\n`);
    
    if (allSales.length > 0) {
      console.log('前 10 条记录:');
      allSales.slice(0, 10).forEach((sale, index) => {
        console.log(`\n${index + 1}. 订单号: ${sale.orderNumber || 'N/A'}`);
        console.log(`   商户: ${sale.merchantId}`);
        console.log(`   日期: ${sale.saleDate}`);
        console.log(`   状态: ${sale.status}`);
        console.log(`   类型: ${sale.saleType || 'N/A'}`);
        console.log(`   总额: €${sale.totalAmount}`);
        console.log(`   商品数: ${sale.items ? sale.items.length : 0}`);
      });
    }
    
    // 按商户统计
    const merchantStats = {};
    allSales.forEach(sale => {
      if (!merchantStats[sale.merchantId]) {
        merchantStats[sale.merchantId] = 0;
      }
      merchantStats[sale.merchantId]++;
    });
    
    console.log('\n\n按商户统计:');
    Object.keys(merchantStats).forEach(merchantId => {
      console.log(`  ${merchantId}: ${merchantStats[merchantId]} 条记录`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkMerchantSales();
