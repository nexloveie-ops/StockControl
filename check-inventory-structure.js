const mongoose = require('mongoose');
require('dotenv').config();

async function checkInventoryStructure() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 查询所有库存
    const inventory = await MerchantInventory.find({
      merchantId: 'Mobile123',
      isActive: true
    }).limit(20).sort({ createdAt: -1 });
    
    console.log(`📊 找到 ${inventory.length} 条库存记录\n`);
    
    // 统计category的不同值
    const categories = {};
    const conditions = {};
    
    inventory.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.productName}`);
      console.log(`   Category: "${item.category}"`);
      console.log(`   Condition: "${item.condition}"`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   价格: €${item.retailPrice}`);
      console.log(`   序列号: ${item.serialNumber || 'N/A'}`);
      console.log(`   状态: ${item.status}`);
      
      // 统计
      categories[item.category] = (categories[item.category] || 0) + 1;
      conditions[item.condition] = (conditions[item.condition] || 0) + 1;
    });
    
    console.log('\n\n📈 Category 统计:');
    Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`   "${cat}": ${count} 条`);
    });
    
    console.log('\n📈 Condition 统计:');
    Object.entries(conditions).sort((a, b) => b[1] - a[1]).forEach(([cond, count]) => {
      console.log(`   "${cond}": ${count} 条`);
    });
    
    // 检查是否有混合使用的情况
    console.log('\n\n🔍 检查数据一致性:');
    
    // 检查全新机
    const brandNewItems = inventory.filter(item => 
      item.condition === 'Brand New' || 
      item.condition === 'BRAND_NEW' || 
      item.condition === '全新'
    );
    
    if (brandNewItems.length > 0) {
      console.log(`\n✅ 全新机 (${brandNewItems.length} 条):`);
      const brandNewCategories = [...new Set(brandNewItems.map(item => item.category))];
      console.log(`   使用的Category: ${brandNewCategories.join(', ')}`);
    }
    
    // 检查二手机
    const usedItems = inventory.filter(item => 
      item.condition === 'Pre-Owned' || 
      item.condition === 'Used' || 
      item.condition === '二手' ||
      item.condition === 'Refurbished'
    );
    
    if (usedItems.length > 0) {
      console.log(`\n✅ 二手机 (${usedItems.length} 条):`);
      const usedCategories = [...new Set(usedItems.map(item => item.category))];
      console.log(`   使用的Category: ${usedCategories.join(', ')}`);
    }
    
    // 检查配件
    const accessoryItems = inventory.filter(item => 
      item.category && (
        item.category.includes('配件') || 
        item.category.includes('Accessory') || 
        item.category.includes('Accessories')
      )
    );
    
    if (accessoryItems.length > 0) {
      console.log(`\n✅ 配件 (${accessoryItems.length} 条):`);
      const accessoryConditions = [...new Set(accessoryItems.map(item => item.condition))];
      console.log(`   使用的Condition: ${accessoryConditions.join(', ')}`);
    }
    
    console.log('\n\n💡 建议:');
    console.log('1. Category应该表示产品类型（如：Smartphones, Tablets, Accessories）');
    console.log('2. Condition应该表示产品成色（如：Brand New, Pre-Owned, Refurbished）');
    console.log('3. 不应该在Category中混入成色信息（如："全新手机"、"二手平板"）');
    console.log('4. 标准化建议：');
    console.log('   - Category: "Smartphones", "Tablets", "Accessories", "Laptops"等');
    console.log('   - Condition: "Brand New", "Pre-Owned", "Refurbished", "Damaged"等');
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkInventoryStructure();
