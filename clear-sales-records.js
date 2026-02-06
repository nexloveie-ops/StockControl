const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function clearSalesRecords() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    // 查询当前销售记录数量
    const count = await MerchantSale.countDocuments({ merchantId: 'MurrayDundrum' });
    console.log(`📊 当前销售记录数量: ${count}\n`);
    
    if (count === 0) {
      console.log('✅ 没有销售记录需要清除');
      return;
    }
    
    // 删除所有销售记录
    const result = await MerchantSale.deleteMany({ merchantId: 'MurrayDundrum' });
    console.log(`✅ 已删除 ${result.deletedCount} 条销售记录\n`);
    
    // 验证删除结果
    const remainingCount = await MerchantSale.countDocuments({ merchantId: 'MurrayDundrum' });
    console.log(`📊 剩余销售记录数量: ${remainingCount}`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

clearSalesRecords();
