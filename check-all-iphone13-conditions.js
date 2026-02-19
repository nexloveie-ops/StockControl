const mongoose = require('mongoose');
require('dotenv').config();

async function checkConditions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const AdminInventory = require('./models/AdminInventory');
    
    const allIPhone13 = await AdminInventory.find({
      productName: /iPhone 13/i,
      isActive: true
    });
    
    console.log(`📱 找到 ${allIPhone13.length} 条 iPhone 13 记录:\n`);
    
    allIPhone13.forEach((device, index) => {
      console.log(`${index + 1}. _id: ${device._id}`);
      console.log(`   序列号: ${device.serialNumber}`);
      console.log(`   成色: "${device.condition}"`);
      console.log(`   状态: ${device.status}`);
      console.log(`   数量: ${device.quantity}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkConditions();
