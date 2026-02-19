const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllIPhone15Plus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const ProductNew = require('./models/ProductNew');
    
    // 查找所有 iPhone 15 Plus（包括inactive的）
    const products = await ProductNew.find({
      name: /iPhone 15 Plus/i
    });
    
    console.log(`📱 找到 ${products.length} 个 iPhone 15 Plus 产品（包括inactive）\n`);
    
    for (const product of products) {
      console.log(`\n产品 ${product._id}:`);
      console.log(`  名称: ${product.name}`);
      console.log(`  颜色: ${product.color}`);
      console.log(`  成色: ${product.condition}`);
      console.log(`  isActive: ${product.isActive}`);
      console.log(`  库存数量: ${product.stockQuantity}`);
      console.log(`  序列号数量: ${product.serialNumbers?.length || 0}`);
      
      if (product.serialNumbers && product.serialNumbers.length > 0) {
        const availableCount = product.serialNumbers.filter(sn => sn.status === 'available').length;
        const soldCount = product.serialNumbers.filter(sn => sn.status === 'sold').length;
        const transferredCount = product.serialNumbers.filter(sn => sn.status === 'transferred').length;
        
        console.log(`  序列号状态统计:`);
        console.log(`    available: ${availableCount}`);
        console.log(`    sold: ${soldCount}`);
        console.log(`    transferred: ${transferredCount}`);
        
        if (availableCount > 0) {
          console.log(`  ✅ 有可用序列号，应该显示在仓库订货列表`);
        } else {
          console.log(`  ❌ 没有可用序列号，不应该显示在仓库订货列表`);
        }
      } else {
        console.log(`  ⚠️  没有序列号记录`);
        if (product.stockQuantity > 0) {
          console.log(`  ✅ 但stockQuantity > 0，会显示在仓库订货列表（可能是配件类型）`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAllIPhone15Plus();
