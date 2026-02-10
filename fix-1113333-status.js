/**
 * 修复序列号 1113333 的状态
 * 将状态从 damaged 改为 active
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fix1113333Status() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 查找序列号 1113333
    const inventory = await MerchantInventory.findOne({
      serialNumber: '1113333'
    });
    
    if (!inventory) {
      console.log('❌ 数据库中没有序列号 1113333 的记录');
      return;
    }
    
    console.log('=== 修复前 ===');
    console.log(`产品名称: ${inventory.productName}`);
    console.log(`序列号: ${inventory.serialNumber}`);
    console.log(`状态: ${inventory.status}`);
    console.log('');
    
    // 修改状态
    inventory.status = 'active';
    await inventory.save();
    
    console.log('=== 修复后 ===');
    console.log(`状态: ${inventory.status}`);
    console.log('');
    console.log('✅ 状态已修复为 active');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

fix1113333Status();
