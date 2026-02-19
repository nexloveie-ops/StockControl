const mongoose = require('mongoose');
require('dotenv').config();

async function fixColor() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    const ProductNew = require('./models/ProductNew');
    
    const serialNumber = '35532010';
    
    const product = await ProductNew.findOne({
      'serialNumbers.serialNumber': serialNumber
    });
    
    if (!product) {
      console.log('❌ 未找到产品');
      return;
    }
    
    console.log(`\n修改前:`);
    console.log(`  名称: ${product.name}`);
    console.log(`  颜色: ${product.color}`);
    
    // 修改颜色
    product.color = 'Black';
    await product.save();
    
    console.log(`\n修改后:`);
    console.log(`  名称: ${product.name}`);
    console.log(`  颜色: ${product.color}`);
    console.log(`\n✅ 修改完成`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixColor();
