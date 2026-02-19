const mongoose = require('mongoose');
require('dotenv').config();

async function checkiPhone15Plus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    
    console.log('=== 查找 iPhone15Plus 产品 ===');
    const products = await ProductNew.find({
      name: { $regex: 'iPhone.*15.*Plus', $options: 'i' }
    }).lean();
    
    console.log(`找到 ${products.length} 个产品:\n`);
    
    products.forEach((product, idx) => {
      console.log(`产品 ${idx + 1}:`);
      console.log(`  _id: ${product._id}`);
      console.log(`  name: ${product.name}`);
      console.log(`  stockQuantity: ${product.stockQuantity}`);
      console.log(`  createdAt: ${product.createdAt}`);
      console.log('');
    });
    
    if (products.length > 0) {
      const productId = products[0]._id;
      const productName = products[0].name;
      
      console.log('\n=== 查找 PurchaseInvoice ===');
      const invoices = await PurchaseInvoice.find({
        'items.product': productId
      }).lean();
      
      console.log(`找到 ${invoices.length} 张发票\n`);
      
      if (invoices.length > 0) {
        invoices.forEach((invoice, idx) => {
          console.log(`发票 ${idx + 1}:`);
          console.log(`  invoiceNumber: ${invoice.invoiceNumber}`);
          console.log(`  invoiceDate: ${invoice.invoiceDate}`);
          console.log(`  items数量: ${invoice.items.length}`);
          console.log('');
        });
      }
      
      console.log('\n=== 查找 AdminInventory ===');
      const adminProducts = await AdminInventory.find({
        productName: { $regex: productName, $options: 'i' }
      }).lean();
      
      console.log(`找到 ${adminProducts.length} 个记录\n`);
      
      if (adminProducts.length > 0) {
        adminProducts.forEach((item, idx) => {
          console.log(`记录 ${idx + 1}:`);
          console.log(`  productName: ${item.productName}`);
          console.log(`  invoiceNumber: ${item.invoiceNumber}`);
          console.log(`  supplier: ${item.supplier}`);
          console.log(`  serialNumber: ${item.serialNumber}`);
          console.log(`  createdAt: ${item.createdAt}`);
          console.log('');
        });
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ 数据库连接已关闭');
  }
}

checkiPhone15Plus();
