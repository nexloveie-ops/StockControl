const mongoose = require('mongoose');
require('dotenv').config();

async function checkIPhone14White() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const AdminInventory = require('./models/AdminInventory');
    
    console.log('📱 检查 iPhone 14 White 的数据\n');
    console.log('='.repeat(80));
    
    // 检查 AdminInventory 中的 iPhone 14 White
    const adminItems = await AdminInventory.find({
      productName: /iPhone 14/i,
      color: /white/i,
      isActive: true,
      condition: 'PRE-OWNED',
      status: 'AVAILABLE',
      quantity: { $gt: 0 }
    }).sort({ serialNumber: 1 });
    
    console.log(`\n找到 ${adminItems.length} 个 iPhone 14 White 产品\n`);
    
    adminItems.forEach((item, index) => {
      console.log(`${index + 1}. 产品 ${item._id}:`);
      console.log(`   名称: ${item.productName}`);
      console.log(`   颜色: ${item.color}`);
      console.log(`   型号: ${item.model}`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   序列号: ${item.serialNumber || 'N/A'}`);
      console.log(`   批发价: €${item.wholesalePrice}`);
      console.log(`   零售价: €${item.retailPrice}`);
      console.log('');
    });
    
    // 按颜色分组统计
    const colorGroups = {};
    adminItems.forEach(item => {
      const color = item.color || 'Unknown';
      if (!colorGroups[color]) {
        colorGroups[color] = {
          count: 0,
          totalQuantity: 0,
          items: []
        };
      }
      colorGroups[color].count++;
      colorGroups[color].totalQuantity += item.quantity;
      colorGroups[color].items.push(item);
    });
    
    console.log('\n按颜色分组统计:');
    Object.entries(colorGroups).forEach(([color, data]) => {
      console.log(`  ${color}: ${data.count} 条记录, 总数量 ${data.totalQuantity}`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkIPhone14White();
