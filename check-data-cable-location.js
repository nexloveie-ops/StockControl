require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

async function checkDataCableLocation() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const MerchantInventory = require('./models/MerchantInventory');
    
    // 查找 Data Cable USB-A TO MICRO
    const records = await MerchantInventory.find({
      productName: 'Data Cable',
      model: 'USB-A TO MICRO'
    }).lean();
    
    console.log(`=== 找到 ${records.length} 条记录 ===\n`);
    
    records.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record._id}`);
      console.log(`   产品名: ${record.productName}`);
      console.log(`   型号: ${record.model}`);
      console.log(`   数量: ${record.quantity}`);
      console.log(`   位置: ${record.location || '(空)'}`);
      console.log(`   备注: ${record.notes || '(空)'}`);
      console.log(`   更新时间: ${record.updatedAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

checkDataCableLocation();
