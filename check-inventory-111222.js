// 检查序列号 111222 的库存
require('dotenv').config();
const mongoose = require('mongoose');

async function checkInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 查找序列号包含 111222 的产品
    console.log('\n🔍 搜索序列号包含 "111222" 的产品...\n');
    
    const results = await MerchantInventory.find({
      serialNumber: { $regex: '111222', $options: 'i' }
    }).lean();
    
    if (results.length === 0) {
      console.log('❌ 没有找到序列号包含 "111222" 的产品');
      
      // 查找所有库存
      console.log('\n📊 查看所有库存产品（前10条）：\n');
      const allInventory = await MerchantInventory.find().limit(10).lean();
      
      allInventory.forEach((item, index) => {
        console.log(`${index + 1}. 商户: ${item.merchantId}`);
        console.log(`   产品: ${item.productName}`);
        console.log(`   序列号: ${item.serialNumber || '无'}`);
        console.log(`   条码: ${item.barcode || '无'}`);
        console.log(`   数量: ${item.quantity}`);
        console.log('');
      });
    } else {
      console.log(`✅ 找到 ${results.length} 个产品：\n`);
      
      results.forEach((item, index) => {
        console.log(`${index + 1}. 商户: ${item.merchantId}`);
        console.log(`   产品: ${item.productName}`);
        console.log(`   序列号: ${item.serialNumber}`);
        console.log(`   条码: ${item.barcode || '无'}`);
        console.log(`   数量: ${item.quantity}`);
        console.log(`   分类: ${item.category}`);
        console.log(`   状态: ${item.status}`);
        console.log('');
      });
    }
    
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkInventory();
