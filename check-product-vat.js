require('dotenv').config();
const mongoose = require('mongoose');
const ProductNew = require('./models/ProductNew');

async function checkProductVAT() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 查找包含 "Vat Margin" 的产品
    const products = await ProductNew.find({
      name: /Vat [Mm]argin/i
    });

    console.log(`📦 找到 ${products.length} 个包含 "Vat Margin" 的产品:\n`);

    products.forEach(product => {
      console.log(`产品: ${product.name}`);
      console.log(`  SKU: ${product.sku}`);
      console.log(`  分类: ${product.productType}`);
      console.log(`  VAT Rate: ${product.vatRate}`);
      console.log(`  进货价: €${product.costPrice}`);
      console.log(`  批发价: €${product.wholesalePrice}`);
      console.log(`  零售价: €${product.retailPrice}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

checkProductVAT();
