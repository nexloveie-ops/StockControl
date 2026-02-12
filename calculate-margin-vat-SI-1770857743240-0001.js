// 计算销售发票 SI-1770857743240-0001 的正确Margin VAT税额
require('dotenv').config();
const mongoose = require('mongoose');

async function calculateMarginVAT() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const SalesInvoice = require('./models/SalesInvoice');
    const ProductNew = require('./models/ProductNew');
    
    const invoiceNumber = 'SI-1770857743240-0001';
    
    const invoice = await SalesInvoice.findOne({ invoiceNumber }).lean();
    
    if (!invoice) {
      console.log(`❌ 找不到发票: ${invoiceNumber}`);
      return;
    }
    
    console.log(`📄 销售发票: ${invoiceNumber}\n`);
    console.log(`产品数量: ${invoice.items.length}`);
    console.log(`总销售额: €${invoice.totalAmount}`);
    console.log(`发票中存储的税额: €${invoice.taxAmount}\n`);
    
    console.log('产品详情和税额计算:');
    console.log('─'.repeat(130));
    console.log('产品'.padEnd(20) + '序列号'.padEnd(20) + '成色'.padEnd(15) + '税率'.padEnd(15) + '售价'.padEnd(12) + '成本'.padEnd(12) + '差价'.padEnd(12) + '税额');
    console.log('─'.repeat(130));
    
    let totalSalePrice = 0;
    let totalCostPrice = 0;
    let totalMargin = 0;
    let totalTaxAmount = 0;
    
    for (const item of invoice.items) {
      const productId = item.product;
      const serialNumber = item.serialNumbers?.[0] || 'N/A';
      const salePrice = item.totalPrice || 0;
      const condition = item.condition || '';
      const vatRate = item.vatRate || '';
      
      // 查询产品获取成本价
      const product = await ProductNew.findById(productId).lean();
      const costPrice = product?.costPrice || 0;
      
      // 计算差价和税额
      const margin = salePrice - costPrice;
      let taxAmount = 0;
      
      if (vatRate === 'VAT 0%' || vatRate === 'MARGIN_VAT' || vatRate === 'MARGIN_VAT_0') {
        // Margin VAT: 对差价征收23%税
        // 税额 = 差价 - (差价 / 1.23)
        taxAmount = margin - (margin / 1.23);
      } else if (vatRate === 'VAT 23%' || vatRate === 'VAT_23') {
        // 标准VAT: 对售价征收23%税
        taxAmount = salePrice - (salePrice / 1.23);
      } else if (vatRate === 'VAT 13.5%' || vatRate === 'VAT_13_5') {
        // VAT 13.5%
        taxAmount = salePrice - (salePrice / 1.135);
      }
      
      console.log(
        item.description.substring(0, 18).padEnd(20) +
        serialNumber.substring(0, 18).padEnd(20) +
        condition.substring(0, 13).padEnd(15) +
        vatRate.padEnd(15) +
        `€${salePrice.toFixed(2)}`.padEnd(12) +
        `€${costPrice.toFixed(2)}`.padEnd(12) +
        `€${margin.toFixed(2)}`.padEnd(12) +
        `€${taxAmount.toFixed(2)}`
      );
      
      totalSalePrice += salePrice;
      totalCostPrice += costPrice;
      totalMargin += margin;
      totalTaxAmount += taxAmount;
    }
    
    console.log('─'.repeat(130));
    console.log(
      '总计'.padEnd(50) +
      `€${totalSalePrice.toFixed(2)}`.padEnd(12) +
      `€${totalCostPrice.toFixed(2)}`.padEnd(12) +
      `€${totalMargin.toFixed(2)}`.padEnd(12) +
      `€${totalTaxAmount.toFixed(2)}`
    );
    console.log('─'.repeat(130));
    
    console.log('\n📊 税额计算总结:');
    console.log(`  总销售额(含税): €${totalSalePrice.toFixed(2)}`);
    console.log(`  总成本: €${totalCostPrice.toFixed(2)}`);
    console.log(`  总差价(利润): €${totalMargin.toFixed(2)}`);
    console.log(`  应缴税额(Margin VAT 23%): €${totalTaxAmount.toFixed(2)}`);
    
    console.log('\n📋 与发票中存储的数据对比:');
    console.log(`  发票存储的税额: €${invoice.taxAmount.toFixed(2)}`);
    console.log(`  正确的税额: €${totalTaxAmount.toFixed(2)}`);
    
    if (Math.abs(invoice.taxAmount - totalTaxAmount) > 0.01) {
      console.log(`  ⚠️  差异: €${Math.abs(invoice.taxAmount - totalTaxAmount).toFixed(2)}`);
      console.log(`\n❌ 发票中的税额计算错误！应该是 €${totalTaxAmount.toFixed(2)}`);
    } else {
      console.log(`  ✅ 税额计算正确`);
    }
    
    console.log('\n💡 Margin VAT计算说明:');
    console.log('  Margin VAT只对差价(售价-成本)征税');
    console.log('  税额 = 差价 - (差价 / 1.23)');
    console.log('  或者: 税额 = 差价 × (23/123) ≈ 差价 × 0.187');
    
  } catch (error) {
    console.error('❌ 计算失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

calculateMarginVAT();
