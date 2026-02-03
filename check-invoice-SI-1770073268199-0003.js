require('dotenv').config();
const mongoose = require('mongoose');
const SalesInvoice = require('./models/SalesInvoice');
const ProductNew = require('./models/ProductNew');
const Customer = require('./models/Customer');

async function checkInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const invoiceNumber = 'SI-1770073268199-0003';
    
    console.log('='.repeat(80));
    console.log(`📋 检查发票: ${invoiceNumber}`);
    console.log('='.repeat(80));
    
    const invoice = await SalesInvoice.findOne({ invoiceNumber })
      .populate('customer', 'name')
      .populate('items.product');
    
    if (!invoice) {
      console.log(`❌ 未找到发票: ${invoiceNumber}`);
      await mongoose.connection.close();
      return;
    }
    
    console.log(`\n客户: ${invoice.customer?.name || 'Unknown'}`);
    console.log(`日期: ${invoice.invoiceDate}`);
    console.log(`总金额: €${invoice.totalAmount.toFixed(2)}`);
    console.log(`税额: €${invoice.taxAmount.toFixed(2)}`);
    console.log(`小计: €${invoice.subtotal.toFixed(2)}`);
    
    console.log(`\n发票项目 (${invoice.items.length} 项):`);
    
    let recalculatedTax = 0;
    
    for (let i = 0; i < invoice.items.length; i++) {
      const item = invoice.items[i];
      const product = item.product;
      
      console.log(`\n  项目 ${i + 1}:`);
      console.log(`    产品: ${product?.name || 'Unknown'}`);
      console.log(`    品牌: ${product?.brand || 'N/A'}`);
      console.log(`    型号: ${product?.model || 'N/A'}`);
      console.log(`    成色: ${product?.condition || 'N/A'}`);
      console.log(`    数量: ${item.quantity}`);
      console.log(`    单价: €${item.unitPrice.toFixed(2)}`);
      console.log(`    总价: €${item.totalPrice.toFixed(2)}`);
      console.log(`    发票项目 VAT Rate: ${item.vatRate}`);
      console.log(`    发票项目税额: €${item.taxAmount.toFixed(2)}`);
      
      if (product) {
        console.log(`\n    📦 产品信息:`);
        console.log(`       产品 VAT Rate: ${product.vatRate}`);
        console.log(`       产品成本价: €${product.costPrice.toFixed(2)}`);
        console.log(`       产品批发价: €${product.wholesalePrice?.toFixed(2) || 'N/A'}`);
        console.log(`       产品零售价: €${product.retailPrice.toFixed(2)}`);
        
        // 重新计算税额
        let itemTax = 0;
        const totalPrice = item.totalPrice;
        const costPrice = product.costPrice * item.quantity;
        
        console.log(`\n    🧮 税额计算:`);
        
        if (product.vatRate === 'VAT 0%') {
          // Margin VAT: 税额 = (卖价 - 成本价) × 23/123
          if (costPrice > 0) {
            itemTax = (totalPrice - costPrice) * (23 / 123);
            console.log(`       公式: Margin VAT`);
            console.log(`       计算: (€${totalPrice.toFixed(2)} - €${costPrice.toFixed(2)}) × 23/123`);
            console.log(`       结果: €${itemTax.toFixed(2)}`);
          } else {
            console.log(`       ⚠️ 成本价为 0，无法计算 Margin VAT`);
          }
        } else if (product.vatRate === 'VAT 23%') {
          // VAT 23%: 税额 = 总价 × 23/123
          itemTax = totalPrice * (23 / 123);
          console.log(`       公式: VAT 23%`);
          console.log(`       计算: €${totalPrice.toFixed(2)} × 23/123`);
          console.log(`       结果: €${itemTax.toFixed(2)}`);
        } else if (product.vatRate === 'VAT 13.5%') {
          // Service VAT 13.5%: 税额 = 总价 × 13.5/113.5
          itemTax = totalPrice * (13.5 / 113.5);
          console.log(`       公式: Service VAT 13.5%`);
          console.log(`       计算: €${totalPrice.toFixed(2)} × 13.5/113.5`);
          console.log(`       结果: €${itemTax.toFixed(2)}`);
        }
        
        recalculatedTax += itemTax;
        
        // 比较
        if (Math.abs(itemTax - item.taxAmount) > 0.01) {
          console.log(`       ❌ 差异: €${(itemTax - item.taxAmount).toFixed(2)}`);
        } else {
          console.log(`       ✅ 税额正确`);
        }
      }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 汇总:`);
    console.log(`${'='.repeat(80)}`);
    console.log(`原始税额: €${invoice.taxAmount.toFixed(2)}`);
    console.log(`重新计算税额: €${recalculatedTax.toFixed(2)}`);
    console.log(`差异: €${(recalculatedTax - invoice.taxAmount).toFixed(2)}`);
    
    if (Math.abs(recalculatedTax - invoice.taxAmount) > 0.01) {
      console.log(`\n❌ 税额计算错误！`);
    } else {
      console.log(`\n✅ 税额计算正确！`);
    }

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkInvoice();
