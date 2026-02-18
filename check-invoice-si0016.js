const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

async function checkInvoice() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const AdminInventory = require('./models/AdminInventory');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    const SupplierNew = require('./models/SupplierNew');
    
    const invoiceNumber = 'SI-0016';
    
    console.log(`🔍 查询发票 ${invoiceNumber} 的数据\n`);
    
    // 1. 查询 PurchaseInvoice
    console.log('=== PurchaseInvoice 表 ===');
    const invoice = await PurchaseInvoice.findOne({ invoiceNumber }).lean();
    
    if (invoice) {
      console.log(`✅ 找到发票记录`);
      
      // 获取供应商信息
      let supplierName = '未知';
      if (invoice.supplier) {
        const supplier = await SupplierNew.findById(invoice.supplier).lean();
        supplierName = supplier?.name || '未知';
      }
      
      console.log(`  供应商: ${supplierName}`);
      console.log(`  日期: ${invoice.invoiceDate}`);
      console.log(`  总金额: €${invoice.totalAmount}`);
      console.log(`  产品数量: ${invoice.items?.length || 0}`);
      
      if (invoice.items && invoice.items.length > 0) {
        console.log('\n  产品列表:');
        invoice.items.forEach((item, index) => {
          console.log(`    ${index + 1}. ${item.productName || item.description || '未知产品'}`);
          console.log(`       数量: ${item.quantity}`);
          console.log(`       单价: €${item.unitCost}`);
          console.log(`       税率: ${item.vatRate}`);
          console.log(`       序列号: ${item.serialNumbers?.join(', ') || '无'}`);
          console.log(`       condition字段: ${item.condition || '❌ 无'}`);
        });
      }
    } else {
      console.log(`❌ 未找到发票记录`);
    }
    
    // 2. 查询 AdminInventory
    console.log('\n\n=== AdminInventory 表 ===');
    const adminProducts = await AdminInventory.find({ invoiceNumber }).lean();
    
    console.log(`找到 ${adminProducts.length} 条记录\n`);
    
    adminProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.productName}`);
      console.log(`   序列号: ${product.serialNumber || '无'}`);
      console.log(`   成色: ${product.condition || '❌ 无'}`);
      console.log(`   税务分类: ${product.taxClassification || '无'}`);
      console.log(`   来源: ${product.source || '未设置'}`);
      console.log(`   型号: ${product.model || '无'}`);
      console.log(`   颜色: ${product.color || '无'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  }
}

checkInvoice();
