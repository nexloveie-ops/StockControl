require('dotenv').config();
const mongoose = require('mongoose');
const SalesInvoice = require('./models/SalesInvoice');
const ProductNew = require('./models/ProductNew');
const Customer = require('./models/Customer');

async function checkInvoices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');

    // 查询问题发票
    const invoiceNumbers = ['SI-1769998537832-0002', 'SI-1769998524159-0001'];
    
    for (const invoiceNumber of invoiceNumbers) {
      console.log('\n' + '='.repeat(80));
      console.log(`📋 检查发票: ${invoiceNumber}`);
      console.log('='.repeat(80));
      
      const invoice = await SalesInvoice.findOne({ invoiceNumber })
        .populate('customer', 'name')
        .populate('items.product');
      
      if (!invoice) {
        console.log(`❌ 未找到发票: ${invoiceNumber}`);
        continue;
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
        console.log(`    数量: ${item.quantity}`);
        console.log(`    单价: €${item.unitPrice.toFixed(2)}`);
        console.log(`    总价: €${item.totalPrice.toFixed(2)}`);
        console.log(`    VAT Rate: ${item.vatRate}`);
        console.log(`    项目税额: €${item.taxAmount.toFixed(2)}`);
        
        if (product) {
          console.log(`    产品 VAT Rate: ${product.vatRate}`);
          console.log(`    产品成本价: €${product.costPrice.toFixed(2)}`);
          
          // 重新计算税额
          let itemTax = 0;
          const totalPrice = item.totalPrice;
          const costPrice = product.costPrice * item.quantity;
          
          if (product.vatRate === 'VAT 0%') {
            // Margin VAT: 税额 = (卖价 - 成本价) × 23/123
            if (costPrice > 0) {
              itemTax = (totalPrice - costPrice) * (23 / 123);
              console.log(`    ✅ Margin VAT 计算: (€${totalPrice.toFixed(2)} - €${costPrice.toFixed(2)}) × 23/123 = €${itemTax.toFixed(2)}`);
            } else {
              console.log(`    ⚠️ 成本价为 0，无法计算 Margin VAT`);
            }
          } else if (product.vatRate === 'VAT 23%') {
            // VAT 23%: 税额 = 总价 × 23/123
            itemTax = totalPrice * (23 / 123);
            console.log(`    ✅ VAT 23% 计算: €${totalPrice.toFixed(2)} × 23/123 = €${itemTax.toFixed(2)}`);
          } else if (product.vatRate === 'VAT 13.5%') {
            // Service VAT 13.5%: 税额 = 总价 × 13.5/113.5
            itemTax = totalPrice * (13.5 / 113.5);
            console.log(`    ✅ VAT 13.5% 计算: €${totalPrice.toFixed(2)} × 13.5/113.5 = €${itemTax.toFixed(2)}`);
          }
          
          recalculatedTax += itemTax;
        }
      }
      
      console.log(`\n📊 汇总:`);
      console.log(`  原始税额: €${invoice.taxAmount.toFixed(2)}`);
      console.log(`  重新计算税额: €${recalculatedTax.toFixed(2)}`);
      console.log(`  差异: €${(recalculatedTax - invoice.taxAmount).toFixed(2)}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkInvoices();
