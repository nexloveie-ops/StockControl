require('dotenv').config();
const mongoose = require('mongoose');

async function checkProductTaxClassification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 连接到数据库');
    
    const AdminInventory = require('./models/AdminInventory');
    const ProductNew = require('./models/ProductNew');
    
    console.log('\n📦 检查 AdminInventory 产品税务分类:');
    const adminProducts = await AdminInventory.find({ isActive: true }).limit(10);
    adminProducts.forEach(product => {
      console.log({
        productName: product.productName,
        model: product.model,
        color: product.color,
        taxClassification: product.taxClassification,
        wholesalePrice: product.wholesalePrice,
        quantity: product.quantity
      });
    });
    
    console.log('\n📦 检查 ProductNew 产品税务分类:');
    const productNewItems = await ProductNew.find({ isActive: true }).limit(10);
    productNewItems.forEach(product => {
      console.log({
        name: product.name,
        brand: product.brand,
        model: product.model,
        vatRate: product.vatRate,
        wholesalePrice: product.wholesalePrice,
        stockQuantity: product.stockQuantity
      });
    });
    
    await mongoose.connection.close();
    console.log('\n✅ 检查完成');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkProductTaxClassification();
