require('dotenv').config();
const mongoose = require('mongoose');

async function fixStockQuantity() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    
    // 查找 galaxy A53 产品
    const product = await ProductNew.findOne({ name: /galaxy A53/i });
    
    if (!product) {
      console.log('❌ 未找到产品');
      return;
    }
    
    console.log(`产品: ${product.name}`);
    console.log(`当前 stockQuantity: ${product.stockQuantity}`);
    console.log(`序列号总数: ${product.serialNumbers.length}`);
    
    // 计算可用序列号数量
    const availableCount = product.serialNumbers.filter(sn => sn.status === 'available').length;
    const soldCount = product.serialNumbers.filter(sn => sn.status === 'sold').length;
    
    console.log(`可用序列号: ${availableCount}`);
    console.log(`已售序列号: ${soldCount}`);
    
    // 更新 stockQuantity
    product.stockQuantity = availableCount;
    
    // 如果没有可用序列号，标记为不活跃
    if (availableCount === 0) {
      product.isActive = false;
      console.log('⚠️ 没有可用库存，标记为不活跃');
    }
    
    await product.save();
    
    console.log(`\n✅ 已更新 stockQuantity: ${product.stockQuantity}`);
    console.log(`✅ isActive: ${product.isActive}`);
    
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

fixStockQuantity();
