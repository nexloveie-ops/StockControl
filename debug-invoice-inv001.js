const mongoose = require('mongoose');
require('dotenv').config();

const PurchaseInvoice = require('./models/PurchaseInvoice');
const AdminInventory = require('./models/AdminInventory');

async function debugInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const invoiceNumber = 'INV-001';
    
    console.log('=== 查询 PurchaseInvoice ===');
    const purchaseInvoice = await PurchaseInvoice.findOne({ invoiceNumber }).lean();
    if (purchaseInvoice) {
      console.log('发票号:', purchaseInvoice.invoiceNumber);
      console.log('Items 数量:', purchaseInvoice.items.length);
      purchaseInvoice.items.forEach((item, idx) => {
        console.log(`\nItem ${idx + 1}:`);
        console.log('  productName:', item.productName);
        console.log('  description:', item.description);
        console.log('  serialNumbers:', item.serialNumbers);
        console.log('  quantity:', item.quantity);
        console.log('  unitCost:', item.unitCost);
        console.log('  vatRate:', item.vatRate);
      });
    } else {
      console.log('未找到 PurchaseInvoice');
    }
    
    console.log('\n=== 查询 AdminInventory ===');
    const adminProducts = await AdminInventory.find({ invoiceNumber }).lean();
    console.log('产品数量:', adminProducts.length);
    adminProducts.forEach((product, idx) => {
      console.log(`\n产品 ${idx + 1}:`);
      console.log('  productName:', product.productName);
      console.log('  model:', product.model);
      console.log('  color:', product.color);
      console.log('  serialNumber:', product.serialNumber);
      console.log('  quantity:', product.quantity);
      console.log('  costPrice:', product.costPrice);
      console.log('  taxClassification:', product.taxClassification);
      console.log('  condition:', product.condition);
    });
    
    console.log('\n=== 去重逻辑测试 ===');
    const adminSerialNumbers = new Set(
      adminProducts
        .filter(p => p.serialNumber)
        .map(p => p.serialNumber)
    );
    console.log('AdminInventory 序列号集合:', Array.from(adminSerialNumbers));
    
    if (purchaseInvoice) {
      purchaseInvoice.items.forEach((item, idx) => {
        console.log(`\nPurchaseInvoice Item ${idx + 1}:`);
        console.log('  serialNumbers:', item.serialNumbers);
        console.log('  是否有序列号:', item.serialNumbers && item.serialNumbers.length > 0);
        if (item.serialNumbers && item.serialNumbers.length > 0) {
          const hasOverlap = item.serialNumbers.some(sn => adminSerialNumbers.has(sn));
          console.log('  是否与AdminInventory重复:', hasOverlap);
          console.log('  应该被过滤:', hasOverlap);
        } else {
          console.log('  应该被保留: true (没有序列号)');
        }
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

debugInvoice();
