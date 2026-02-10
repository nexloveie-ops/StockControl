/**
 * 修复 iPhone 11 (111999) 的分类
 * 从 "Brand Used Devices" 改为 "Pre-Owned Devices"
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixIPhone11Category() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 查找 iPhone 11
    const inventory = await MerchantInventory.findOne({
      serialNumber: '111999',
      merchantId: 'MurrayRanelagh'
    });
    
    if (!inventory) {
      console.log('❌ 未找到库存记录');
      return;
    }
    
    console.log('=== 当前状态 ===');
    console.log(`产品: ${inventory.productName}`);
    console.log(`序列号: ${inventory.serialNumber}`);
    console.log(`成色: ${inventory.condition}`);
    console.log(`分类: ${inventory.category}`);
    console.log(`数量: ${inventory.quantity}`);
    console.log('');
    
    // 修复分类
    const oldCategory = inventory.category;
    inventory.category = 'Pre-Owned Devices';
    
    await inventory.save();
    
    console.log('=== 修复完成 ===');
    console.log(`分类: ${oldCategory} → ${inventory.category}`);
    console.log('✅ 分类已更新为 Pre-Owned Devices');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

fixIPhone11Category();
