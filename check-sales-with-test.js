const mongoose = require('mongoose');
require('dotenv').config();

async function checkSalesWithTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = 'Mobile123';
    
    // 查找包含test的销售记录
    const sales = await MerchantSale.find({
      merchantId: merchantId,
      'items.productName': /test/i
    }).sort({ date: -1 }).lean();
    
    console.log(`📊 找到 ${sales.length} 条包含test的销售记录\n`);
    
    sales.forEach((sale, index) => {
      console.log(`\n========== 销售记录 ${index + 1} ==========`);
      console.log(`销售ID: ${sale._id}`);
      console.log(`日期: ${new Date(sale.date).toLocaleString('zh-CN')}`);
      console.log(`状态: ${sale.status}`);
      console.log(`总金额: €${sale.totalAmount}`);
      
      const testItems = sale.items.filter(item => /test/i.test(item.productName));
      console.log(`\n包含test的项目 (${testItems.length} 个):`);
      testItems.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.productName}`);
        console.log(`     价格: €${item.price}`);
        console.log(`     repairOrderId: ${item.repairOrderId || 'N/A'}`);
      });
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkSalesWithTest();
