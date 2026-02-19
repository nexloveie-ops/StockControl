const mongoose = require('mongoose');
require('dotenv').config();

async function checkAdminInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const AdminInventory = require('./models/AdminInventory');
    
    // 查找所有 iPhone 15 Plus
    const items = await AdminInventory.find({
      productName: /iPhone 15 Plus/i,
      isActive: true
    });
    
    console.log(`📱 AdminInventory 中找到 ${items.length} 个 iPhone 15 Plus\n`);
    
    for (const item of items) {
      console.log(`\n产品 ${item._id}:`);
      console.log(`  产品名称: ${item.productName}`);
      console.log(`  品牌: ${item.brand}`);
      console.log(`  型号: ${item.model}`);
      console.log(`  颜色: ${item.color}`);
      console.log(`  成色: ${item.condition}`);
      console.log(`  分类: ${item.category}`);
      console.log(`  数量: ${item.quantity}`);
      console.log(`  状态: ${item.status}`);
      console.log(`  序列号: ${item.serialNumber || 'N/A'}`);
      console.log(`  isActive: ${item.isActive}`);
      
      if (item.quantity > 0 && item.status === 'AVAILABLE') {
        console.log(`  ✅ 会显示在仓库订货列表中`);
      } else {
        console.log(`  ❌ 不会显示在仓库订货列表中`);
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAdminInventory();
