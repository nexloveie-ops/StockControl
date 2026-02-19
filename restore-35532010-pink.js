const mongoose = require('mongoose');
require('dotenv').config();

async function restoreColor() {
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
    
    console.log(`修改前: ${product.color}`);
    
    // 恢复为Pink
    product.color = 'Pink';
    await product.save();
    
    console.log(`修改后: ${product.color}`);
    console.log('✅ 已恢复为Pink');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

restoreColor();
