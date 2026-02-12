require('dotenv').config();
const mongoose = require('mongoose');

async function checkInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const MerchantInventory = mongoose.model('MerchantInventory', new mongoose.Schema({}, { strict: false }));
    
    // 查询所有库存
    const allInventory = await MerchantInventory.find({
      merchantId: 'MurrayRanelagh'
    }).lean();
    
    console.log(`找到 ${allInventory.length} 条库存记录\n`);
    
    allInventory.forEach((item, index) => {
      console.log(`库存 ${index + 1}:`);
      console.log('  _id:', item._id);
      console.log('  productName:', item.productName);
      console.log('  model:', item.model);
      console.log('  color:', item.color);
      console.log('  quantity:', item.quantity);
      console.log('  status:', item.status);
      console.log('  merchantId:', item.merchantId);
      console.log('');
    });
    
    // 查询AVAILABLE状态的库存
    const availableInventory = await MerchantInventory.find({
      merchantId: 'MurrayRanelagh',
      status: 'AVAILABLE'
    }).lean();
    
    console.log(`\nAVAILABLE状态的库存: ${availableInventory.length} 条\n`);
    
    availableInventory.forEach((item, index) => {
      console.log(`AVAILABLE ${index + 1}:`);
      console.log('  productName:', item.productName);
      console.log('  model:', item.model);
      console.log('  color:', item.color);
      console.log('  quantity:', item.quantity);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

checkInventory();
