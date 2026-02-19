const mongoose = require('mongoose');
require('dotenv').config();

async function fixAllMarginVatInvoices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    const SalesInvoice = require('./models/SalesInvoice');
    const ProductNew = require('./models/ProductNew');
    
    // 查找所有包含 Margin VAT 的发票
    const invoices = await SalesInvoice.find({
      'items.vatRate': /Margin/i
    });
    
    console.log(`\n找到 ${invoices.length} 个包含 Margin VAT 的销售发票\n`);
    
    for (const invoice of invoices) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 处理发票: ${invoice.invoiceNumber}`);
      console.log(`   当前总金额: €${invoice.totalAmount.toFixed(2)}`);
      console.log(`   当前税额: €${(invoice.taxAmount || 0).toFixed(2)}`);
      
      let newSubtotal = 0;
      let newTotalTaxAmount = 0;
      let needsUpdate = false;
      
      for (let i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i];
        
        // 查找产品获取成本价和批发价
        const product = await ProductNew.findById(item.product);
        
        if (!product) {
          console.log(`   产品 ${i + 1}: ⚠️  未找到产品记录，跳过`);
          // 保持原值
          newSubtotal += item.totalPrice || 0;
          newTotalTaxAmount += item.taxAmount || 0;
          continue;
        }
        
        const vatRate = item.vatRate;
        const isMarginVAT = vatRate.toUpperCase().includes('MARGIN');
        
        if (isMarginVAT) {
          // 使用产品的批发价作为实际销售价（含税）
          const wholesalePrice = product.wholesalePrice || 0;
          const totalSellingPrice = wholesalePrice * item.quantity;
          const costPrice = product.costPrice || 0;
          const totalCost = costPrice * item.quantity;
          const profit = totalSellingPrice - totalCost;
          
          // 计算税额
          const taxAmount = profit * 23 / 123;
          const totalPriceExcludingTax = totalSellingPrice - taxAmount;
          
          // 检查是否需要更新
          if (Math.abs((item.taxAmount || 0) - taxAmount) > 0.01) {
            needsUpdate = true;
            console.log(`   产品 ${i + 1}: ${product.name}`);
            console.log(`      销售价: €${totalSellingPrice.toFixed(2)}, 成本: €${totalCost.toFixed(2)}, 利润: €${profit.toFixed(2)}`);
            console.log(`      旧税额: €${(item.taxAmount || 0).toFixed(2)} → 新税额: €${taxAmount.toFixed(2)}`);
          }
          
          // 更新 item
          invoice.items[i].taxAmount = taxAmount;
          invoice.items[i].totalPrice = totalPriceExcludingTax;
          invoice.items[i].unitPrice = totalPriceExcludingTax / item.quantity;
          
          newSubtotal += totalPriceExcludingTax;
          newTotalTaxAmount += taxAmount;
        } else {
          // 非 Margin VAT，保持原值
          newSubtotal += item.totalPrice || 0;
          newTotalTaxAmount += item.taxAmount || 0;
        }
      }
      
      if (needsUpdate) {
        // 更新发票总额
        invoice.subtotal = newSubtotal;
        invoice.taxAmount = newTotalTaxAmount;
        invoice.totalAmount = newSubtotal + newTotalTaxAmount;
        
        await invoice.save();
        
        console.log(`   ✅ 已更新:`);
        console.log(`      不含税金额: €${newSubtotal.toFixed(2)}`);
        console.log(`      税额: €${newTotalTaxAmount.toFixed(2)}`);
        console.log(`      总金额: €${invoice.totalAmount.toFixed(2)}`);
      } else {
        console.log(`   ℹ️  无需更新（税额已正确）`);
      }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n✅ 所有 Margin VAT 发票已处理完成`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

fixAllMarginVatInvoices();
