const mongoose = require('mongoose');
require('dotenv').config();

const MerchantSale = require('./models/MerchantSale');

async function deleteTestSale() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    // 删除包含 test 的销售记录
    const result = await MerchantSale.deleteMany({
      merchantId: 'Mobile123',
      'items.productName': /test/i
    });
    
    console.log(`✅ 删除了 ${result.deletedCount} 条包含 test 的销售记录`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

deleteTestSale();
