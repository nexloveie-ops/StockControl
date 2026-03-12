const mongoose = require('mongoose');
require('dotenv').config();

async function deleteTestSales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = 'Mobile123';
    
    // 查找包含test的销售记录
    console.log('🔍 查找包含test的销售记录\n');
    
    const sales = await MerchantSale.find({
      merchantId: merchantId,
      'items.productName': /test/i
    }).lean();
    
    console.log(`📊 找到 ${sales.length} 条包含test的销售记录\n`);
    
    if (sales.length === 0) {
      console.log('❌ 没有找到要删除的记录');
      return;
    }
    
    // 显示要删除的记录
    sales.forEach((sale, index) => {
      console.log(`${index + 1}. 销售ID: ${sale._id}`);
      console.log(`   日期: ${sale.date ? new Date(sale.date).toLocaleString('zh-CN') : 'N/A'}`);
      console.log(`   状态: ${sale.status}`);
      console.log(`   总金额: €${sale.totalAmount}`);
      
      const testItems = sale.items.filter(item => /test/i.test(item.productName));
      console.log(`   包含test的项目:`);
      testItems.forEach(item => {
        console.log(`     - ${item.productName}: €${item.price}`);
      });
      console.log('');
    });
    
    // 删除记录
    const result = await MerchantSale.deleteMany({
      merchantId: merchantId,
      'items.productName': /test/i
    });
    
    console.log(`✅ 成功删除 ${result.deletedCount} 条销售记录\n`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ 数据库连接已关闭');
  }
}

deleteTestSales();
