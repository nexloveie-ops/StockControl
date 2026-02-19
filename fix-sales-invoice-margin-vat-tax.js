const mongoose = require('mongoose');
require('dotenv').config();

async function fixSalesInvoiceMarginVatTax() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    const SalesInvoice = require('./models/SalesInvoice');
    const ProductNew = require('./models/ProductNew');
    
    const invoiceNumber = 'SI-1771434626583-0001';
    
    const invoice = await SalesInvoice.findOne({ invoiceNumber });
    
    if (!invoice) {
      console.log('❌ 未找到发票');
      return;
    }
    
    console.log(`\n📋 修复销售发票: ${invoiceNumber}`);
    console.log(`当前总金额: €${invoice.totalAmount}`);
    console.log(`当前税额: €${invoice.taxAmount || 0}`);
    console.log(`\n开始重新计算税额...\n`);
    
    let newSubtotal = 0;
    let newTotalTaxAmount = 0;
    
    for (let i = 0; i < invoice.items.length; i++) {
      const item = invoice.items[i];
      
      // 查找产品获取成本价
      const product = await ProductNew.findById(item.product);
      
      if (!product) {
        console.log(`产品 ${i + 1}: ⚠️  未找到产品记录，跳过`);
        continue;
      }
      
      const costPrice = product.costPrice || 0;
      const sellingPrice = item.totalPrice || 0;
      const vatRate = item.vatRate;
      
      console.log(`产品 ${i + 1}: ${product.name}`);
      console.log(`  税率: ${vatRate}`);
      console.log(`  成本价: €${costPrice.toFixed(2)}`);
      console.log(`  当前销售价(不含税): €${sellingPrice.toFixed(2)}`);
      console.log(`  当前税额: €${item.taxAmount || 0}`);
      
      // 检查是否是 Margin VAT
      const isMarginVAT = vatRate.toUpperCase().includes('MARGIN');
      
      let newTaxAmount, newTotalPriceExcludingTax;
      
      if (isMarginVAT) {
        // Margin VAT: 对差额（利润）征税
        // 注意：item.totalPrice 是不含税的销售价
        // 我们需要先计算含税的销售价，然后重新计算税额
        
        // 从产品获取批发价（含税销售价）
        const wholesalePrice = product.wholesalePrice || 0;
        const totalWholesalePrice = wholesalePrice * item.quantity;
        const totalCost = costPrice * item.quantity;
        const profit = totalWholesalePrice - totalCost;
        
        newTaxAmount = profit * 23 / 123;
        newTotalPriceExcludingTax = totalWholesalePrice - newTaxAmount;
        
        console.log(`  批发价(含税): €${wholesalePrice.toFixed(2)}`);
        console.log(`  总批发价: €${totalWholesalePrice.toFixed(2)}`);
        console.log(`  总成本: €${totalCost.toFixed(2)}`);
        console.log(`  利润: €${profit.toFixed(2)}`);
        console.log(`  ✅ 新税额: €${newTaxAmount.toFixed(2)}`);
        console.log(`  ✅ 新销售价(不含税): €${newTotalPriceExcludingTax.toFixed(2)}`);
      } else {
        // 标准 VAT: 保持原有逻辑
        newTaxAmount = item.taxAmount || 0;
        newTotalPriceExcludingTax = sellingPrice;
        console.log(`  保持原有税额: €${newTaxAmount.toFixed(2)}`);
      }
      
      // 更新 item
      invoice.items[i].taxAmount = newTaxAmount;
      invoice.items[i].totalPrice = newTotalPriceExcludingTax;
      invoice.items[i].unitPrice = newTotalPriceExcludingTax / item.quantity;
      
      newSubtotal += newTotalPriceExcludingTax;
      newTotalTaxAmount += newTaxAmount;
      
      console.log('');
    }
    
    // 更新发票总额
    invoice.subtotal = newSubtotal;
    invoice.taxAmount = newTotalTaxAmount;
    invoice.totalAmount = newSubtotal + newTotalTaxAmount;
    
    console.log('='.repeat(80));
    console.log(`\n新的发票总额:`);
    console.log(`  不含税金额: €${newSubtotal.toFixed(2)}`);
    console.log(`  税额: €${newTotalTaxAmount.toFixed(2)}`);
    console.log(`  总金额: €${invoice.totalAmount.toFixed(2)}`);
    
    // 保存更新
    await invoice.save();
    
    console.log(`\n✅ 发票已更新`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixSalesInvoiceMarginVatTax();
