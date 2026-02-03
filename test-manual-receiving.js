require('dotenv').config();
const mongoose = require('mongoose');
const ProductNew = require('./models/ProductNew');
const PurchaseInvoice = require('./models/PurchaseInvoice');

async function testReceiving() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 检查最近的入库记录
    console.log('📋 检查最近的入库发票:');
    console.log('='.repeat(60));
    const recentInvoices = await PurchaseInvoice.find()
      .sort({ createdAt: -1 })
      .limit(5);
    
    if (recentInvoices.length === 0) {
      console.log('⚠️  没有找到任何入库发票记录');
    } else {
      console.log(`找到 ${recentInvoices.length} 个最近的发票:\n`);
      recentInvoices.forEach((invoice, index) => {
        console.log(`${index + 1}. 发票号: ${invoice.invoiceNumber}`);
        console.log(`   供应商: ${invoice.supplier?.name || '未知'}`);
        console.log(`   产品数量: ${invoice.products?.length || 0}`);
        console.log(`   总金额: €${invoice.totalAmount?.toFixed(2) || '0.00'}`);
        console.log(`   创建时间: ${invoice.createdAt}`);
        console.log(`   userId: ${invoice.userId || '无'}`);
        console.log(`   groupId: ${invoice.groupId || '无'}`);
        console.log('');
      });
    }

    // 检查最近的产品记录（使用ProductNew模型）
    console.log('\n📦 检查最近的产品记录 (ProductNew):');
    console.log('='.repeat(60));
    const recentProducts = await ProductNew.find()
      .sort({ createdAt: -1 })
      .limit(10);
    
    if (recentProducts.length === 0) {
      console.log('⚠️  没有找到任何产品记录');
    } else {
      console.log(`找到 ${recentProducts.length} 个最近的产品:\n`);
      recentProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   分类: ${product.productType}`);
        console.log(`   数量: ${product.stockQuantity}`);
        console.log(`   进货价: €${product.costPrice?.toFixed(2) || '0.00'}`);
        console.log(`   批发价: €${product.wholesalePrice?.toFixed(2) || '0.00'}`);
        console.log(`   零售价: €${product.retailPrice?.toFixed(2) || '0.00'}`);
        console.log(`   createdBy: ${product.createdBy || '无'}`);
        console.log(`   创建时间: ${product.createdAt}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

testReceiving();
