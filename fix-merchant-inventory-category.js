require('dotenv').config();
const mongoose = require('mongoose');
const MerchantInventory = require('./models/MerchantInventory');
const ProductCategory = require('./models/ProductCategory');

async function fixCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    // 查找所有 category 看起来像 ObjectId 的记录（24个字符的十六进制字符串）
    const inventory = await MerchantInventory.find({
      category: /^[0-9a-f]{24}$/i
    });
    
    console.log(`\n📦 找到 ${inventory.length} 条需要修复的记录`);
    
    let fixed = 0;
    let failed = 0;
    
    for (const item of inventory) {
      try {
        // 尝试查找对应的分类
        const category = await ProductCategory.findById(item.category);
        
        if (category) {
          const categoryName = category.type || category.name || '未分类';
          console.log(`✓ ${item.productName}: "${item.category}" -> "${categoryName}"`);
          
          item.category = categoryName;
          await item.save();
          fixed++;
        } else {
          console.log(`✗ ${item.productName}: 找不到分类 ${item.category}，设为"未分类"`);
          item.category = '未分类';
          await item.save();
          failed++;
        }
      } catch (error) {
        console.error(`✗ 修复失败 ${item.productName}:`, error.message);
        failed++;
      }
    }
    
    console.log(`\n✅ 修复完成: ${fixed} 成功, ${failed} 失败`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

fixCategories();
