// 检查销售发票 SI-1770857743240-0001 的税额计算
require('dotenv').config();
const mongoose = require('mongoose');

async function checkSalesInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const SalesInvoice = require('./models/SalesInvoice');
    
    const invoiceNumber = 'SI-1770857743240-0001';
    
    // 查询销售发票
    const invoice = await SalesInvoice.findOne({ invoiceNumber }).lean();
    
    if (!invoice) {
      console.log(`❌ 找不到发票: ${invoiceNumber}`);
      return;
    }
    
    console.log(`📄 销售发票: ${invoiceNumber}\n`);
    console.log('基本信息:');
    console.log(`  客户: ${invoice.customerName || 'N/A'}`);
    console.log(`  日期: ${invoice.saleDate}`);
    console.log(`  状态: ${invoice.status}`);
    console.log(`  产品数量: ${invoice.products?.length || 0}\n`);
    
    // 显示产品详情
    console.log('产品详情:');
    console.log('─'.repeat(120));
    console.log('产品名称'.padEnd(30) + '型号'.padEnd(20) + '成色'.padEnd(15) + '税率'.padEnd(15) + '售价'.padEnd(12) + '成本'.padEnd(12) + '利润');
    console.log('─'.repeat(120));
    
    let totalSalePrice = 0;
    let totalCostPrice = 0;
    let totalProfit = 0;
    let totalTaxAmount = 0;
    
    invoice.products.forEach((product, index) => {
      const productName = product.productName || 'N/A';
      const model = product.model || '';
      const condition = product.condition || '';
      const taxClassification = product.taxClassification || '';
      const salePrice = product.salePrice || 0;
      const costPrice = product.costPrice || 0;
      const profit = salePrice - costPrice;
      
      console.log(
        productName.substring(0, 28).padEnd(30) +
        model.substring(0, 18).padEnd(20) +
        condition.substring(0, 13).padEnd(15) +
        taxClassification.padEnd(15) +
        `€${salePrice.toFixed(2)}`.padEnd(12) +
        `€${costPrice.toFixed(2)}`.padEnd(12) +
        `€${profit.toFixed(2)}`
      );
      
      totalSalePrice += salePrice;
      totalCostPrice += costPrice;
      totalProfit += profit;
      
      // 计算税额
      let taxAmount = 0;
      if (taxClassification === 'VAT_23' || taxClassification === 'VAT 23%') {
        // 标准VAT 23%: 税额 = 售价 - (售价 / 1.23)
        taxAmount = salePrice - (salePrice / 1.23);
      } else if (taxClassification === 'VAT_13_5' || taxClassification === 'VAT 13.5%') {
        // VAT 13.5%: 税额 = 售价 - (售价 / 1.135)
        taxAmount = salePrice - (salePrice / 1.135);
      } else if (taxClassification === 'MARGIN_VAT' || taxClassification === 'MARGIN_VAT_0') {
        // Margin VAT: 税额 = (售价 - 成本) - ((售价 - 成本) / 1.23)
        const margin = salePrice - costPrice;
        taxAmount = margin - (margin / 1.23);
      }
      // VAT_0: 税额 = 0
      
      totalTaxAmount += taxAmount;
    });
    
    console.log('─'.repeat(120));
    console.log(
      '总计'.padEnd(65) +
      `€${totalSalePrice.toFixed(2)}`.padEnd(12) +
      `€${totalCostPrice.toFixed(2)}`.padEnd(12) +
      `€${totalProfit.toFixed(2)}`
    );
    console.log('─'.repeat(120));
    
    console.log('\n📊 税额计算:');
    console.log(`  总销售额(含税): €${totalSalePrice.toFixed(2)}`);
    console.log(`  总成本: €${totalCostPrice.toFixed(2)}`);
    console.log(`  总利润: €${totalProfit.toFixed(2)}`);
    console.log(`  应缴税额: €${totalTaxAmount.toFixed(2)}`);
    
    // 检查发票中存储的税额
    console.log('\n📋 发票中存储的数据:');
    console.log(`  totalAmount: €${invoice.totalAmount || 0}`);
    console.log(`  taxAmount: €${invoice.taxAmount || 0}`);
    console.log(`  profit: €${invoice.profit || 0}`);
    
    if (Math.abs((invoice.taxAmount || 0) - totalTaxAmount) > 0.01) {
      console.log(`\n⚠️  税额不匹配！`);
      console.log(`  发票中存储: €${(invoice.taxAmount || 0).toFixed(2)}`);
      console.log(`  重新计算: €${totalTaxAmount.toFixed(2)}`);
      console.log(`  差异: €${Math.abs((invoice.taxAmount || 0) - totalTaxAmount).toFixed(2)}`);
    } else {
      console.log(`\n✅ 税额计算正确`);
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkSalesInvoice();
