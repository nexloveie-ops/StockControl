// 检查SI-001当前状态
require('dotenv').config();
const mongoose = require('mongoose');

async function checkSI001Status() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const AdminInventory = require('./models/AdminInventory');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    
    // 1. 检查PurchaseInvoice表
    console.log('📋 检查PurchaseInvoice表中的SI-001...');
    const purchaseInvoices = await PurchaseInvoice.find({ invoiceNumber: 'SI-001' });
    console.log(`   找到 ${purchaseInvoices.length} 条记录`);
    
    if (purchaseInvoices.length > 0) {
      purchaseInvoices.forEach((invoice, index) => {
        console.log(`\n   记录 ${index + 1}:`);
        console.log(`   ID: ${invoice._id}`);
        console.log(`   发票号: ${invoice.invoiceNumber}`);
        console.log(`   供货商: ${invoice.supplier}`);
        console.log(`   总金额: €${invoice.totalAmount}`);
        console.log(`   税额: €${invoice.taxAmount}`);
        console.log(`   产品数量: ${invoice.items?.length || 0}`);
        console.log(`   创建时间: ${invoice.createdAt}`);
      });
    }
    
    // 2. 检查AdminInventory表
    console.log('\n📋 检查AdminInventory表中的SI-001...');
    const adminProducts = await AdminInventory.find({ invoiceNumber: 'SI-001' });
    console.log(`   找到 ${adminProducts.length} 个产品`);
    
    if (adminProducts.length > 0) {
      let totalAmount = 0;
      let taxAmount = 0;
      
      adminProducts.forEach(product => {
        const itemTotal = product.costPrice * product.quantity;
        totalAmount += itemTotal;
        
        if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
          taxAmount += itemTotal - (itemTotal / 1.23);
        } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
          taxAmount += itemTotal - (itemTotal / 1.135);
        }
      });
      
      console.log(`   供货商: ${adminProducts[0].supplier}`);
      console.log(`   总金额: €${totalAmount.toFixed(2)}`);
      console.log(`   税额: €${taxAmount.toFixed(2)}`);
      console.log(`   创建时间: ${adminProducts[0].createdAt}`);
    }
    
    // 3. 总结
    console.log('\n📊 总结:');
    console.log(`   PurchaseInvoice表: ${purchaseInvoices.length} 条记录`);
    console.log(`   AdminInventory表: ${adminProducts.length} 个产品`);
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkSI001Status();
