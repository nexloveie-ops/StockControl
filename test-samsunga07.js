const mongoose = require('mongoose');
require('dotenv').config();

async function testSamsungA07() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    // 查找产品
    console.log('=== 查找 SAMSUNGA07 产品 ===');
    const products = await ProductNew.find({
      name: { $regex: 'SAMSUNGA07', $options: 'i' }
    }).lean();
    
    console.log(`找到 ${products.length} 个产品:\n`);
    
    products.forEach((product, idx) => {
      console.log(`产品 ${idx + 1}:`);
      console.log(`  _id: ${product._id}`);
      console.log(`  name: ${product.name}`);
      console.log(`  stockQuantity: ${product.stockQuantity}`);
      console.log('');
    });
    
    if (products.length > 0) {
      const productId = products[0]._id;
      console.log(`\n=== 测试 API: /api/admin/products/${productId}/purchase-invoices ===\n`);
      
      // 模拟API逻辑
      const PurchaseInvoice = require('./models/PurchaseInvoice');
      
      const invoices = await PurchaseInvoice.find({
        'items.product': productId
      })
      .populate('supplier', 'name contact.email contact.phone contact.address')
      .populate('items.product', 'name barcode serialNumbers')
      .sort({ createdAt: -1 });
      
      console.log(`PurchaseInvoice 找到 ${invoices.length} 张发票`);
      
      // 查找 AdminInventory
      const adminProducts = await AdminInventory.find({
        productName: products[0].name,
        isActive: true
      })
      .populate('supplier', 'name code phone email address')
      .sort({ createdAt: -1 })
      .lean();
      
      console.log(`AdminInventory 找到 ${adminProducts.length} 个记录`);
      
      if (adminProducts.length > 0) {
        console.log('\nAdminInventory 详情:');
        adminProducts.forEach((item, idx) => {
          console.log(`\n记录 ${idx + 1}:`);
          console.log(`  productName: ${item.productName}`);
          console.log(`  invoiceNumber: ${item.invoiceNumber}`);
          console.log(`  supplier: ${item.supplier}`);
          console.log(`  costPrice: ${item.costPrice}`);
          console.log(`  quantity: ${item.quantity}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
    console.error('错误堆栈:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

testSamsungA07();
