const mongoose = require('mongoose');
require('dotenv').config();

async function fixInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    const SalesInvoice = require('./models/SalesInvoice');
    const ProductNew = require('./models/ProductNew');
    
    const invoiceNumber = 'SI-1771434662304-0002';
    
    const invoice = await SalesInvoice.findOne({ invoiceNumber });
    
    if (!invoice) {
      console.log('❌ 未找到发票');
      return;
    }
    
    console.log(`\n📋 修复销售发票: ${invoiceNumber}`);
    console.log(`当前总金额: €${invoice.totalAmount}`);
    console.log(`当前税额: €${invoice.taxAmount || 0}`);
    console.log(`\n⚠️  问题：发票中的 totalPrice 已经是实际销售价（含税）`);
    console.log(`   我们需要根据实际销售价重新分配税额和不含税金额\n`);
    
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
      const vatRate = item.vatRate;
      
      // 当前发票中的销售价（这是实际的含税销售价）
      const actualSellingPrice = item.totalPrice || 0;
      
      // 检查是否是 Margin VAT
      const isMarginVAT = vatRate.toUpperCase().includes('MARGIN');
      
      let newTaxAmount, newTotalPriceExcludingTax;
      
      if (isMarginVAT) {
        // Margin VAT: 对差额（利润）征税
        const totalCost = costPrice * item.quantity;
        const profit = actualSellingPrice - totalCost;
        
        newTaxAmount = profit * 23 / 123;
        newTotalPriceExcludingTax = actualSellingPrice - newTaxAmount;
        
        console.log(`产品 ${i + 1}: ${product.name}`);
        console.log(`  实际销售价(含税): €${actualSellingPrice.toFixed(2)}`);
        console.log(`  成本: €${totalCost.toFixed(2)}`);
        console.log(`  利润: €${profit.toFixed(2)}`);
        console.log(`  税额: €${newTaxAmount.toFixed(2)}`);
        console.log(`  不含税金额: €${newTotalPriceExcludingTax.toFixed(2)}`);
      } else {
        // 标准 VAT: 保持原有逻辑
        newTaxAmount = item.taxAmount || 0;
        newTotalPriceExcludingTax = actualSellingPrice;
      }
      
      // 更新 item
      invoice.items[i].taxAmount = newTaxAmount;
      invoice.items[i].totalPrice = newTotalPriceExcludingTax;
      invoice.items[i].unitPrice = newTotalPriceExcludingTax / item.quantity;
      
      newSubtotal += newTotalPriceExcludingTax;
      newTotalTaxAmount += newTaxAmount;
    }
    
    // 更新发票总额
    const originalTotal = invoice.totalAmount;
    invoice.subtotal = newSubtotal;
    invoice.taxAmount = newTotalTaxAmount;
    invoice.totalAmount = newSubtotal + newTotalTaxAmount;
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n发票总额对比:`);
    console.log(`  原总金额: €${originalTotal.toFixed(2)}`);
    console.log(`  新总金额: €${invoice.totalAmount.toFixed(2)}`);
    console.log(`  差异: €${(invoice.totalAmount - originalTotal).toFixed(2)}`);
    console.log(`\n  不含税金额: €${newSubtotal.toFixed(2)}`);
    console.log(`  税额: €${newTotalTaxAmount.toFixed(2)}`);
    
    // 保存更新
    await invoice.save();
    
    console.log(`\n✅ 发票已更新`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixInvoice();
