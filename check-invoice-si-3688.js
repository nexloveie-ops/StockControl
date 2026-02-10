require('dotenv').config();
const mongoose = require('mongoose');

async function checkInvoiceSI3688() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const PurchaseInvoice = require('./models/PurchaseInvoice');
    const AdminInventory = require('./models/AdminInventory');
    const SupplierNew = require('./models/SupplierNew');

    // 查找SI-3688发票
    const invoice = await PurchaseInvoice.findOne({ invoiceNumber: 'SI-3688' })
      .populate('supplier', 'name code')
      .lean();

    if (!invoice) {
      console.log('❌ 未找到SI-3688发票');
      await mongoose.connection.close();
      return;
    }

    console.log('=== PurchaseInvoice数据 ===');
    console.log(`发票号: ${invoice.invoiceNumber}`);
    console.log(`供货商: ${invoice.supplier?.name || 'N/A'}`);
    console.log(`items数量: ${invoice.items?.length || 0}`);
    console.log(`小计(不含税): €${invoice.subtotal?.toFixed(2)}`);
    console.log(`税额: €${invoice.taxAmount?.toFixed(2)}`);
    console.log(`总金额(含税): €${invoice.totalAmount?.toFixed(2)}`);
    
    console.log('\nPurchaseInvoice items:');
    invoice.items?.forEach((item, index) => {
      console.log(`  ${index + 1}. 数量: ${item.quantity}, 单价: €${item.unitCost}, 总价: €${item.totalCost}, 税率: ${item.vatRate}, 税额: €${item.taxAmount || 0}`);
    });

    // 查找AdminInventory中的产品
    const adminProducts = await AdminInventory.find({ 
      invoiceNumber: 'SI-3688' 
    }).lean();

    console.log(`\n=== AdminInventory数据 ===`);
    console.log(`找到 ${adminProducts.length} 个产品\n`);

    if (adminProducts.length > 0) {
      let totalCostIncludingTax = 0;
      let totalCostExcludingTax = 0;
      let totalTaxAmount = 0;

      adminProducts.forEach((product, index) => {
        let taxMultiplier = 1.0;
        if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
          taxMultiplier = 1.23;
        } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
          taxMultiplier = 1.135;
        }

        const costIncludingTax = product.costPrice * product.quantity;
        const costExcludingTax = costIncludingTax / taxMultiplier;
        const taxAmount = costIncludingTax - costExcludingTax;

        totalCostIncludingTax += costIncludingTax;
        totalCostExcludingTax += costExcludingTax;
        totalTaxAmount += taxAmount;

        if (index < 5) {
          console.log(`  ${index + 1}. ${product.productName} - ${product.model} - ${product.color}`);
          console.log(`     数量: ${product.quantity}, 单价: €${product.costPrice}, 税率: ${product.taxClassification}`);
          console.log(`     含税总价: €${costIncludingTax.toFixed(2)}, 不含税: €${costExcludingTax.toFixed(2)}, 税额: €${taxAmount.toFixed(2)}`);
        }
      });

      if (adminProducts.length > 5) {
        console.log(`  ... 还有 ${adminProducts.length - 5} 个产品`);
      }

      console.log(`\nAdminInventory汇总:`);
      console.log(`  总金额(含税): €${totalCostIncludingTax.toFixed(2)}`);
      console.log(`  总金额(不含税): €${totalCostExcludingTax.toFixed(2)}`);
      console.log(`  税额: €${totalTaxAmount.toFixed(2)}`);
    }

    // 计算合并后的总额
    console.log('\n=== 合并后应该显示 ===');
    const purchaseSubtotal = invoice.subtotal || 0;
    const purchaseTax = invoice.taxAmount || 0;
    const purchaseTotal = invoice.totalAmount || 0;

    let adminTotal = 0;
    let adminSubtotal = 0;
    let adminTax = 0;

    adminProducts.forEach(product => {
      let taxMultiplier = 1.0;
      if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
        taxMultiplier = 1.23;
      } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
        taxMultiplier = 1.135;
      }

      const costIncludingTax = product.costPrice * product.quantity;
      const costExcludingTax = costIncludingTax / taxMultiplier;
      const taxAmount = costIncludingTax - costExcludingTax;

      adminTotal += costIncludingTax;
      adminSubtotal += costExcludingTax;
      adminTax += taxAmount;
    });

    console.log(`  小计(不含税): €${(purchaseSubtotal + adminSubtotal).toFixed(2)}`);
    console.log(`  税额: €${(purchaseTax + adminTax).toFixed(2)}`);
    console.log(`  总金额(含税): €${(purchaseTotal + adminTotal).toFixed(2)}`);

    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    await mongoose.connection.close();
  }
}

checkInvoiceSI3688();
