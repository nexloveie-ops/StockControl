require('dotenv').config();
const mongoose = require('mongoose');
const ProductNew = require('./models/ProductNew');

async function fixMarginVATProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 查找所有包含 "Margin" 关键字的产品
    const products = await ProductNew.find({
      name: /margin/i
    });

    console.log(`📦 找到 ${products.length} 个包含 "Margin" 的产品\n`);

    let updatedCount = 0;

    for (const product of products) {
      if (product.vatRate !== 'VAT 0%') {
        console.log(`更新产品: ${product.name}`);
        console.log(`  旧 VAT Rate: ${product.vatRate}`);
        
        product.vatRate = 'VAT 0%';
        await product.save();
        
        console.log(`  新 VAT Rate: ${product.vatRate}`);
        console.log('');
        updatedCount++;
      }
    }

    console.log(`✅ 更新完成！共更新 ${updatedCount} 个产品`);

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

fixMarginVATProducts();
