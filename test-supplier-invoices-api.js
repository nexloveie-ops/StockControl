const mongoose = require('mongoose');
require('dotenv').config();

async function testSupplierInvoicesAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    const AdminInventory = require('./models/AdminInventory');
    const SupplierNew = require('./models/SupplierNew');
    
    // 查找Mobigo Limited供货商
    const supplier = await SupplierNew.findOne({ name: 'Mobigo Limited' });
    console.log(`供货商: ${supplier.name} (${supplier._id})\n`);
    
    // 查询PurchaseInvoice
    const invoices = await PurchaseInvoice.find({ supplier: supplier._id })
      .populate('supplier', 'name code')
      .lean();
    
    console.log(`PurchaseInvoice表中找到 ${invoices.length} 个发票\n`);
    
    if (invoices.length > 0) {
      const invoice = invoices[0];
      console.log('PurchaseInvoice数据:');
      console.log(`  发票号: ${invoice.invoiceNumber}`);
      console.log(`  supplier类型: ${typeof invoice.supplier}`);
      console.log(`  supplier:`, invoice.supplier);
      console.log(`  items数量: ${invoice.items.length}`);
      console.log(`  subtotal: €${invoice.subtotal.toFixed(2)}`);
      console.log(`  taxAmount: €${invoice.taxAmount.toFixed(2)}`);
      console.log(`  totalAmount: €${invoice.totalAmount.toFixed(2)}`);
    }
    
    // 查询AdminInventory
    const adminProducts = await AdminInventory.find({ 
      supplier: supplier.name,
      invoiceNumber: 'SI-003'
    }).lean();
    
    console.log(`\nAdminInventory表中找到 ${adminProducts.length} 个产品（SI-003）\n`);
    
    if (adminProducts.length > 0) {
      // 计算AdminInventory的总金额
      let totalAmount = 0;
      let totalTax = 0;
      
      adminProducts.forEach(product => {
        let taxMultiplier = 1.0;
        if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
          taxMultiplier = 1.23;
        } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
          taxMultiplier = 1.135;
        }
        
        const costIncludingTax = product.costPrice * product.quantity;
        const costExcludingTax = costIncludingTax / taxMultiplier;
        const tax = costIncludingTax - costExcludingTax;
        
        totalAmount += costIncludingTax;
        totalTax += tax;
      });
      
      console.log('AdminInventory计算结果:');
      console.log(`  总金额(含税): €${totalAmount.toFixed(2)}`);
      console.log(`  总金额(不含税): €${(totalAmount - totalTax).toFixed(2)}`);
      console.log(`  税额: €${totalTax.toFixed(2)}`);
      
      console.log(`\n合并后应该显示:`);
      console.log(`  小计(不含税): €${(200 / 1.23 + totalAmount - totalTax).toFixed(2)}`);
      console.log(`  税额: €${(46 + totalTax).toFixed(2)}`);
      console.log(`  总金额(含税): €${(246 + totalAmount).toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

testSupplierInvoicesAPI();
