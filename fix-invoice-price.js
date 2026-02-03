require('dotenv').config();
const mongoose = require('mongoose');

async function fixInvoicePrice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const SalesInvoice = require('./models/SalesInvoice');
    
    // 查找发票
    const invoice = await SalesInvoice.findOne({ invoiceNumber: 'SI-1770079679409-0001' });
    
    if (!invoice) {
      console.log('❌ 未找到发票');
      return;
    }
    
    console.log(`发票编号: ${invoice.invoiceNumber}`);
    console.log(`发票日期: ${invoice.invoiceDate}`);
    console.log(`\n产品列表:`);
    
    // 显示所有产品
    invoice.items.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.description}`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   单价(不含税): €${item.unitPrice.toFixed(2)}`);
      console.log(`   总价(不含税): €${item.totalPrice.toFixed(2)}`);
      console.log(`   税率: ${item.vatRate}`);
      console.log(`   税额: €${item.taxAmount.toFixed(2)}`);
      
      // 计算含税价格
      const unitPriceIncludingTax = item.unitPrice + (item.taxAmount / item.quantity);
      const totalPriceIncludingTax = item.totalPrice + item.taxAmount;
      console.log(`   单价(含税): €${unitPriceIncludingTax.toFixed(2)}`);
      console.log(`   总价(含税): €${totalPriceIncludingTax.toFixed(2)}`);
    });
    
    // 查找IPhone 16 Pro Max产品
    const itemIndex = invoice.items.findIndex(item => 
      item.description.toLowerCase().includes('iphone 16 pro max')
    );
    
    if (itemIndex === -1) {
      console.log('\n❌ 未找到IPhone 16 Pro Max产品');
      return;
    }
    
    const item = invoice.items[itemIndex];
    console.log(`\n\n找到产品: ${item.description}`);
    console.log(`当前单价(含税): €${(item.unitPrice + (item.taxAmount / item.quantity)).toFixed(2)}`);
    console.log(`目标单价(含税): €825.00`);
    
    // 计算新的价格
    // 含税价格 = 825
    // 税率 = VAT 23% (即 23/123)
    const newUnitPriceIncludingTax = 825;
    const taxMultiplier = item.vatRate === 'VAT 23%' ? 0.23 : 
                         item.vatRate === 'VAT 13.5%' ? 0.135 : 0;
    
    // 不含税价格 = 含税价格 / (1 + 税率)
    const newUnitPriceExcludingTax = newUnitPriceIncludingTax / (1 + taxMultiplier);
    const newTotalPriceExcludingTax = newUnitPriceExcludingTax * item.quantity;
    const newTaxAmount = newUnitPriceIncludingTax - newUnitPriceExcludingTax;
    const newTotalTaxAmount = newTaxAmount * item.quantity;
    
    console.log(`\n新价格计算:`);
    console.log(`单价(不含税): €${newUnitPriceExcludingTax.toFixed(2)}`);
    console.log(`总价(不含税): €${newTotalPriceExcludingTax.toFixed(2)}`);
    console.log(`单项税额: €${newTaxAmount.toFixed(2)}`);
    console.log(`总税额: €${newTotalTaxAmount.toFixed(2)}`);
    
    // 计算发票总额的变化
    const oldSubtotal = invoice.subtotal;
    const oldTaxAmount = invoice.taxAmount;
    const oldTotalAmount = invoice.totalAmount;
    
    const subtotalDiff = newTotalPriceExcludingTax - item.totalPrice;
    const taxDiff = newTotalTaxAmount - item.taxAmount;
    
    const newSubtotal = oldSubtotal + subtotalDiff;
    const newInvoiceTaxAmount = oldTaxAmount + taxDiff;
    const newTotalAmount = newSubtotal + newInvoiceTaxAmount;
    
    console.log(`\n发票总额变化:`);
    console.log(`旧小计(不含税): €${oldSubtotal.toFixed(2)} → 新小计: €${newSubtotal.toFixed(2)}`);
    console.log(`旧税额: €${oldTaxAmount.toFixed(2)} → 新税额: €${newInvoiceTaxAmount.toFixed(2)}`);
    console.log(`旧总额: €${oldTotalAmount.toFixed(2)} → 新总额: €${newTotalAmount.toFixed(2)}`);
    
    // 更新产品价格
    invoice.items[itemIndex].unitPrice = newUnitPriceExcludingTax;
    invoice.items[itemIndex].totalPrice = newTotalPriceExcludingTax;
    invoice.items[itemIndex].taxAmount = newTotalTaxAmount;
    
    // 更新发票总额
    invoice.subtotal = newSubtotal;
    invoice.taxAmount = newInvoiceTaxAmount;
    invoice.totalAmount = newTotalAmount;
    
    // 保存更新
    await invoice.save();
    
    console.log(`\n✅ 发票已更新！`);
    
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

fixInvoicePrice();
