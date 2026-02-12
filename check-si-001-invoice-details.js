require('dotenv').config();
const mongoose = require('mongoose');

async function checkSI001InvoiceDetails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const AdminInventory = require('./models/AdminInventory');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    
    console.log('📋 查询SI-001发票详情...\n');
    
    // 1. 先查询PurchaseInvoice表
    const purchaseInvoice = await PurchaseInvoice.findOne({ invoiceNumber: 'SI-001' }).lean();
    
    if (purchaseInvoice) {
      console.log('✅ 在PurchaseInvoice表中找到SI-001:');
      console.log(`  发票号: ${purchaseInvoice.invoiceNumber}`);
      console.log(`  供货商: ${purchaseInvoice.supplier}`);
      console.log(`  总金额: €${purchaseInvoice.totalAmount}`);
      console.log(`  税额: €${purchaseInvoice.taxAmount}`);
      console.log(`  小计: €${purchaseInvoice.subtotal}`);
      console.log(`  产品数: ${purchaseInvoice.items?.length || 0}`);
      
      if (purchaseInvoice.items && purchaseInvoice.items.length > 0) {
        console.log(`\n  产品列表:`);
        purchaseInvoice.items.forEach((item, idx) => {
          console.log(`    ${idx + 1}. ${item.productName || 'N/A'} x${item.quantity} @ €${item.unitPrice} = €${item.totalPrice}`);
          console.log(`       税额: €${item.taxAmount || 0}`);
        });
      }
    } else {
      console.log('❌ 在PurchaseInvoice表中未找到SI-001');
    }
    
    // 2. 查询AdminInventory表
    console.log('\n\n📦 查询AdminInventory表中的SI-001产品:\n');
    const adminProducts = await AdminInventory.find({ invoiceNumber: 'SI-001' }).lean();
    
    if (adminProducts.length > 0) {
      console.log(`✅ 在AdminInventory表中找到 ${adminProducts.length} 个产品\n`);
      
      let totalAmount = 0;
      let totalTax = 0;
      let totalQuantity = 0;
      
      console.log('产品列表:');
      adminProducts.forEach((item, idx) => {
        const itemTotal = item.costPrice * item.quantity;
        let itemTax = 0;
        
        if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
          itemTax = itemTotal - (itemTotal / 1.23);
        } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
          itemTax = itemTotal - (itemTotal / 1.135);
        }
        
        totalAmount += itemTotal;
        totalTax += itemTax;
        totalQuantity += item.quantity;
        
        if (idx < 5) {
          console.log(`  ${idx + 1}. ${item.productName} ${item.model || ''} ${item.color || ''}`);
          console.log(`     数量: ${item.quantity}, 单价: €${item.costPrice}, 小计: €${itemTotal.toFixed(2)}, 税额: €${itemTax.toFixed(2)}`);
        }
      });
      
      if (adminProducts.length > 5) {
        console.log(`  ... 还有 ${adminProducts.length - 5} 个产品`);
      }
      
      console.log(`\n📊 AdminInventory汇总:`);
      console.log(`  总产品数: ${adminProducts.length}`);
      console.log(`  总数量: ${totalQuantity}`);
      console.log(`  总金额: €${totalAmount.toFixed(2)}`);
      console.log(`  总税额: €${totalTax.toFixed(2)}`);
      console.log(`  不含税: €${(totalAmount - totalTax).toFixed(2)}`);
    } else {
      console.log('❌ 在AdminInventory表中未找到SI-001产品');
    }
    
    // 3. 模拟Invoice Details API的逻辑
    console.log('\n\n🔍 模拟Invoice Details API逻辑:\n');
    
    const invoiceId = 'admin-SI-001';
    let invoice = null;
    let invoiceNumber = null;
    
    if (invoiceId.startsWith('admin-')) {
      invoiceNumber = invoiceId.replace('admin-', '');
      console.log(`检测到admin格式，发票号: ${invoiceNumber}`);
      
      // 尝试从PurchaseInvoice查找
      invoice = await PurchaseInvoice.findOne({ invoiceNumber }).lean();
      
      if (!invoice) {
        console.log('PurchaseInvoice中未找到，查询AdminInventory...');
        
        // 从AdminInventory查找产品
        const adminProducts = await AdminInventory.find({ invoiceNumber }).lean();
        
        if (adminProducts.length > 0) {
          console.log(`找到 ${adminProducts.length} 个产品，构造虚拟发票对象`);
          
          // 构造虚拟发票对象
          invoice = {
            _id: `admin-${invoiceNumber}`,
            invoiceNumber: invoiceNumber,
            supplier: { name: adminProducts[0].supplier || '未知供货商' },
            invoiceDate: adminProducts[0].createdAt,
            items: [],
            source: 'AdminInventory'
          };
          
          // 注意：这里items是空的！API可能没有填充items数组
          console.log(`⚠️  警告: items数组为空！`);
        }
      }
    }
    
    console.log(`\n发票对象:`);
    console.log(`  发票号: ${invoice?.invoiceNumber}`);
    console.log(`  供货商: ${invoice?.supplier?.name}`);
    console.log(`  产品数: ${invoice?.items?.length || 0}`);
    console.log(`  来源: ${invoice?.source || 'PurchaseInvoice'}`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkSI001InvoiceDetails();
