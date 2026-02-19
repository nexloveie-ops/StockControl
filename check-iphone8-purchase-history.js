// 检查 iPhone 8 的采购历史记录
const mongoose = require('mongoose');
require('dotenv').config();

async function checkIPhone8PurchaseHistory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    
    console.log('=== 检查 iPhone 8 采购历史 ===\n');
    
    // 1. 查找 iPhone 8 产品
    const iphone8Products = await ProductNew.find({
      name: /iPhone 8/i
    }).lean();
    
    console.log(`📱 找到 ${iphone8Products.length} 个 iPhone 8 产品:\n`);
    
    iphone8Products.forEach((product, idx) => {
      console.log(`${idx + 1}. ${product.name}`);
      console.log(`   ID: ${product._id}`);
      console.log(`   序列号数量: ${product.serialNumbers?.length || 0}`);
      console.log(`   库存: ${product.stockQuantity}`);
      console.log('');
    });
    
    // 2. 查找 AdminInventory 中的 iPhone 8
    const adminIphone8 = await AdminInventory.find({
      productName: /iPhone 8/i
    }).lean();
    
    console.log(`📦 AdminInventory 中找到 ${adminIphone8.length} 个 iPhone 8:\n`);
    
    adminIphone8.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.productName}`);
      console.log(`   ID: ${item._id}`);
      console.log(`   发票号: ${item.invoiceNumber}`);
      console.log(`   序列号: ${item.serialNumber}`);
      console.log(`   数量: ${item.quantity}`);
      console.log('');
    });
    
    // 3. 查找 PurchaseInvoice 中包含 iPhone 8 的发票
    const invoices = await PurchaseInvoice.find({
      'items.productName': /iPhone 8/i
    }).populate('supplier', 'name').lean();
    
    console.log(`📋 PurchaseInvoice 中找到 ${invoices.length} 个包含 iPhone 8 的发票:\n`);
    
    invoices.forEach((invoice, idx) => {
      console.log(`${idx + 1}. 发票号: ${invoice.invoiceNumber}`);
      console.log(`   供应商: ${invoice.supplier?.name || 'N/A'}`);
      console.log(`   日期: ${invoice.invoiceDate}`);
      
      const iphone8Items = invoice.items.filter(item => 
        item.productName && item.productName.toLowerCase().includes('iphone 8')
      );
      
      console.log(`   iPhone 8 产品数量: ${iphone8Items.length}`);
      iphone8Items.forEach((item, itemIdx) => {
        console.log(`     ${itemIdx + 1}. ${item.productName}`);
        console.log(`        数量: ${item.quantity}`);
        console.log(`        单价: €${item.unitCost}`);
        console.log(`        序列号: ${item.serialNumbers?.join(', ') || 'N/A'}`);
      });
      console.log('');
    });
    
    // 4. 分析重复原因
    console.log('=== 分析 ===');
    console.log('检查是否有重复的发票记录或产品记录');
    
    // 检查是否有相同发票号的记录
    const invoiceNumbers = invoices.map(inv => inv.invoiceNumber);
    const duplicateInvoices = invoiceNumbers.filter((num, idx) => 
      invoiceNumbers.indexOf(num) !== idx
    );
    
    if (duplicateInvoices.length > 0) {
      console.log('⚠️  发现重复的发票号:', duplicateInvoices);
    }
    
    // 检查 AdminInventory 中是否有相同发票号的重复记录
    const adminInvoiceNumbers = adminIphone8.map(item => item.invoiceNumber);
    const duplicateAdminInvoices = adminInvoiceNumbers.filter((num, idx) => 
      adminInvoiceNumbers.indexOf(num) !== idx
    );
    
    if (duplicateAdminInvoices.length > 0) {
      console.log('⚠️  AdminInventory 中发现重复的发票号:', duplicateAdminInvoices);
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkIPhone8PurchaseHistory();
