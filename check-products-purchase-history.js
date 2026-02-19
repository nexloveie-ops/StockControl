const mongoose = require('mongoose');
require('dotenv').config();

async function checkProductsPurchaseHistory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    const serialNumbers = ['CZXDS001', 'CZXDS002', 'CZXDS003', '357196596034087'];
    
    console.log('检查产品的采购历史和税务设置:\n');
    
    for (const sn of serialNumbers) {
      console.log(`\n序列号: ${sn}`);
      console.log('='.repeat(50));
      
      // 查找 ProductNew
      const product = await ProductNew.findOne({
        'serialNumbers.serialNumber': sn
      });
      
      if (product) {
        console.log(`ProductNew:`);
        console.log(`  产品名称: ${product.name}`);
        console.log(`  税率: ${product.vatRate}`);
        console.log(`  税务分类: ${product.taxClassification || 'N/A'}`);
        console.log(`  成本价: €${product.costPrice || 'N/A'}`);
        console.log(`  批发价: €${product.wholesalePrice || 'N/A'}`);
        console.log(`  零售价: €${product.retailPrice || 'N/A'}`);
        console.log(`  成色: ${product.condition || 'N/A'}`);
      }
      
      // 查找 AdminInventory
      const adminInv = await AdminInventory.findOne({
        'serialNumbers.serialNumber': sn
      });
      
      if (adminInv) {
        console.log(`\nAdminInventory (采购记录):`);
        console.log(`  产品名称: ${adminInv.productName}`);
        console.log(`  税务分类: ${adminInv.taxClassification || 'N/A'}`);
        console.log(`  税率: ${adminInv.vatRate || 'N/A'}`);
        console.log(`  成本价: €${adminInv.costPrice || 'N/A'}`);
        console.log(`  批发价: €${adminInv.wholesalePrice || 'N/A'}`);
        console.log(`  零售价: €${adminInv.retailPrice || 'N/A'}`);
        console.log(`  供货商发票: ${adminInv.invoiceNumber || 'N/A'}`);
        console.log(`  成色: ${adminInv.condition || 'N/A'}`);
      }
      
      if (!product && !adminInv) {
        console.log('  ⚠️  未找到产品记录');
      }
    }
    
    console.log('\n\n💡 税务说明:');
    console.log('- Margin VAT (差额征税): 适用于二手商品，只对利润部分征税');
    console.log('- VAT 23%: 适用于新商品，对全额征税');
    console.log('- 如果这些产品是从供货商采购的新品，应该使用 VAT 23%');
    console.log('- 如果这些产品是二手商品，使用 Margin VAT 是正确的');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkProductsPurchaseHistory();
