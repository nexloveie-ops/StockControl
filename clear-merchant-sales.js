const mongoose = require('mongoose');
require('dotenv').config();

async function clearMerchantSales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    // 查询所有销售记录
    const allSales = await MerchantSale.find({});
    console.log(`📊 当前有 ${allSales.length} 条销售记录\n`);
    
    if (allSales.length > 0) {
      console.log('销售记录详情:');
      allSales.forEach((sale, index) => {
        console.log(`  ${index + 1}. ${sale.merchantId} - ${sale.saleDate} - €${sale.totalAmount} - ${sale.status}`);
      });
      
      console.log('\n🗑️  开始删除所有销售记录...');
      
      const result = await MerchantSale.deleteMany({});
      
      console.log(`✅ 已删除 ${result.deletedCount} 条销售记录`);
    } else {
      console.log('✅ 没有销售记录需要删除');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

clearMerchantSales();
