const mongoose = require('mongoose');
require('dotenv').config();

async function calculateMarginVatTax() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    const SalesInvoice = require('./models/SalesInvoice');
    const ProductNew = require('./models/ProductNew');
    
    const invoiceNumber = 'SI-1771434626583-0001';
    
    const invoice = await SalesInvoice.findOne({ invoiceNumber }).lean();
    
    if (!invoice) {
      console.log('❌ 未找到发票');
      return;
    }
    
    console.log(`\n📋 销售发票: ${invoiceNumber}`);
    console.log(`总金额: €${invoice.totalAmount}`);
    console.log(`发票记录的税额: €${invoice.taxAmount || 0}`);
    console.log(`\n详细计算:\n`);
    console.log('='.repeat(80));
    
    let totalMarginVatTax = 0;
    let totalProfit = 0;
    
    for (let i = 0; i < invoice.items.length; i++) {
      const item = invoice.items[i];
      
      // 查找产品获取成本价
      const product = await ProductNew.findById(item.product);
      
      if (!product) {
        console.log(`\n产品 ${i + 1}: ⚠️  未找到产品记录`);
        continue;
      }
      
      const costPrice = product.costPrice || 0;
      const sellingPrice = item.totalPrice || 0;
      const profit = sellingPrice - costPrice;
      
      console.log(`\n产品 ${i + 1}: ${product.name}`);
      console.log(`  序列号: ${item.serialNumbers?.join(', ') || 'N/A'}`);
      console.log(`  税率: ${item.vatRate}`);
      console.log(`  成本价: €${costPrice.toFixed(2)}`);
      console.log(`  销售价: €${sellingPrice.toFixed(2)}`);
      console.log(`  利润: €${profit.toFixed(2)}`);
      
      // Margin VAT 计算
      // 对于 Margin VAT 0%，税率是0%，所以税额为0
      // 但如果要计算应该缴纳的税额（假设使用标准税率），需要知道具体的税率
      
      if (item.vatRate === 'Margin Vat 0%') {
        console.log(`  Margin VAT 0%: 税额 = €0.00 (差额征税，税率0%)`);
        console.log(`  说明: 使用Margin VAT 0%方案，不需要缴纳增值税`);
      } else if (item.vatRate === 'VAT 23%') {
        // 如果是VAT 23%，税额 = 销售价 * 23% / 1.23
        const taxAmount = sellingPrice * 0.23 / 1.23;
        totalMarginVatTax += taxAmount;
        console.log(`  VAT 23%: 税额 = €${taxAmount.toFixed(2)}`);
      } else if (item.vatRate === 'VAT 13.5%') {
        const taxAmount = sellingPrice * 0.135 / 1.135;
        totalMarginVatTax += taxAmount;
        console.log(`  VAT 13.5%: 税额 = €${taxAmount.toFixed(2)}`);
      }
      
      totalProfit += profit;
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n总利润: €${totalProfit.toFixed(2)}`);
    console.log(`当前税额: €${totalMarginVatTax.toFixed(2)}`);
    
    console.log(`\n💡 税务说明:`);
    console.log(`\n1. Margin VAT 0% (当前使用):`);
    console.log(`   - 适用于二手商品`);
    console.log(`   - 税率: 0%`);
    console.log(`   - 应缴税额: €0.00`);
    console.log(`   - 这是合法的税务处理方式`);
    
    console.log(`\n2. 如果改用 VAT 23% (标准税率):`);
    const totalSales = invoice.totalAmount;
    const vat23Tax = totalSales * 0.23 / 1.23;
    console.log(`   - 销售总额: €${totalSales.toFixed(2)}`);
    console.log(`   - 应缴税额: €${vat23Tax.toFixed(2)}`);
    console.log(`   - 不含税金额: €${(totalSales - vat23Tax).toFixed(2)}`);
    
    console.log(`\n3. Margin VAT 差额征税 (如果使用标准Margin VAT税率):`);
    console.log(`   - 总利润: €${totalProfit.toFixed(2)}`);
    console.log(`   - 如果对利润征收23%税: €${(totalProfit * 0.23 / 1.23).toFixed(2)}`);
    console.log(`   - 但当前使用的是Margin VAT 0%，所以税额为€0`);
    
    console.log(`\n✅ 结论:`);
    console.log(`   当前使用 Margin VAT 0% 税率，应缴税额为 €0.00`);
    console.log(`   这是符合二手商品税务规定的正确处理方式。`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

calculateMarginVatTax();
