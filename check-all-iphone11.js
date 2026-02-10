/**
 * 检查所有 iPhone 11 库存
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllIPhone11() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 查询所有 iPhone 11
    const inventory = await MerchantInventory.find({
      productName: /iPhone 11/i,
      merchantId: 'MurrayRanelagh'
    }).lean();
    
    console.log(`找到 ${inventory.length} 条 iPhone 11 库存\n`);
    
    console.log('=== 所有 iPhone 11 库存 ===');
    inventory.forEach((item, index) => {
      console.log(`${index + 1}. ${item.productName}`);
      console.log(`   ID: ${item._id}`);
      console.log(`   成色: ${item.condition}`);
      console.log(`   分类: ${item.category}`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   序列号: ${item.serialNumber || '无'}`);
      console.log(`   状态: ${item.status}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

checkAllIPhone11();
