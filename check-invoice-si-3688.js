require('dotenv').config();
const mongoose = require('mongoose');

// 加载模型
require('./models/PurchaseInvoice');
require('./models/AdminInventory');
require('./models/Supplier');
require('./models/SupplierNew');

async function checkInvoiceSI3688() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 查询采购发票
    const PurchaseInvoice = mongoose.model('PurchaseInvoice');
    const invoice = await PurchaseInvoice.findOne({ invoiceNumber: 'SI-3688' });
    
    if (invoice) {
      console.log('📄 采购发票信息 (PurchaseInvoice):');
      console.log('发票编号:', invoice.invoiceNumber);
      console.log('供货商ID:', invoice.supplier);
      console.log('发票日期:', invoice.invoiceDate);
      console.log('币种:', invoice.currency);
      console.log('总金额:', invoice.totalAmount);
      console.log('小计:', invoice.subtotal);
      console.log('税额:', invoice.taxAmount);
      console.log('\n产品明细:');
      invoice.items.forEach((item, index) => {
        console.log(`\n产品 ${index + 1}:`);
        console.log('  产品ID:', item.product);
        console.log('  数量:', item.quantity);
        console.log('  单价:', item.unitCost);
        console.log('  总价:', item.totalCost);
        console.log('  税率:', item.vatRate);
      });
      
      // 计算总采购价
      const totalPurchasePrice = invoice.items.reduce((sum, item) => sum + item.totalCost, 0);
      console.log('\n💰 采购发票总采购价 (不含税):', totalPurchasePrice.toFixed(2));
      console.log('💰 采购发票总金额 (含税):', invoice.totalAmount?.toFixed(2) || 'N/A');
    } else {
      console.log('❌ 未找到发票编号为 SI-3688 的采购发票');
    }

    // 查询AdminInventory中的产品
    const AdminInventory = mongoose.model('AdminInventory');
    const adminProducts = await AdminInventory.find({ invoiceNumber: 'SI-3688' });
    
    if (adminProducts.length > 0) {
      console.log('\n\n📦 AdminInventory中的产品:');
      console.log(`找到 ${adminProducts.length} 个产品\n`);
      
      let totalCostPrice = 0;
      let totalWholesalePrice = 0;
      let totalRetailPrice = 0;
      
      adminProducts.forEach((product, index) => {
        console.log(`产品 ${index + 1}:`);
        console.log('  产品名称:', product.productName);
        console.log('  型号:', product.model);
        console.log('  颜色:', product.color);
        console.log('  序列号:', product.serialNumber || 'N/A');
        console.log('  数量:', product.quantity);
        console.log('  进货价 (costPrice):', product.costPrice);
        console.log('  批发价 (wholesalePrice):', product.wholesalePrice);
        console.log('  零售价 (retailPrice):', product.retailPrice);
        console.log('  税分类:', product.taxClassification);
        console.log('  位置:', product.location);
        console.log('  状态:', product.status);
        
        totalCostPrice += product.costPrice * product.quantity;
        totalWholesalePrice += product.wholesalePrice * product.quantity;
        totalRetailPrice += product.retailPrice * product.quantity;
        console.log('');
      });
      
      console.log('💰 AdminInventory总进货价 (costPrice × quantity):', totalCostPrice.toFixed(2));
      console.log('💰 AdminInventory总批发价 (wholesalePrice × quantity):', totalWholesalePrice.toFixed(2));
      console.log('💰 AdminInventory总零售价 (retailPrice × quantity):', totalRetailPrice.toFixed(2));
      
      // 计算含税金额
      console.log('\n📊 含税金额计算:');
      adminProducts.forEach((product, index) => {
        let taxMultiplier = 1.0;
        if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
          taxMultiplier = 1.23;
        } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
          taxMultiplier = 1.135;
        }
        
        const totalCostIncludingTax = product.costPrice * product.quantity;
        const totalCostExcludingTax = totalCostIncludingTax / taxMultiplier;
        const taxAmount = totalCostIncludingTax - totalCostExcludingTax;
        
        console.log(`产品 ${index + 1} (${product.productName}):`);
        console.log('  含税总价:', totalCostIncludingTax.toFixed(2));
        console.log('  不含税总价:', totalCostExcludingTax.toFixed(2));
        console.log('  税额:', taxAmount.toFixed(2));
        console.log('  税率:', product.taxClassification);
      });
      
      // 汇总含税金额
      const totalIncludingTax = adminProducts.reduce((sum, product) => {
        return sum + (product.costPrice * product.quantity);
      }, 0);
      
      const totalExcludingTax = adminProducts.reduce((sum, product) => {
        let taxMultiplier = 1.0;
        if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
          taxMultiplier = 1.23;
        } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
          taxMultiplier = 1.135;
        }
        const totalCostIncludingTax = product.costPrice * product.quantity;
        return sum + (totalCostIncludingTax / taxMultiplier);
      }, 0);
      
      const totalTax = totalIncludingTax - totalExcludingTax;
      
      console.log('\n💰 汇总:');
      console.log('  总金额 (含税):', totalIncludingTax.toFixed(2));
      console.log('  小计 (不含税):', totalExcludingTax.toFixed(2));
      console.log('  税额:', totalTax.toFixed(2));
    } else {
      console.log('\n❌ AdminInventory中未找到发票编号为 SI-3688 的产品');
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkInvoiceSI3688();
