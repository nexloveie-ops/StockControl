const mongoose = require('mongoose');
require('dotenv').config();

async function fixRetailSalesTax() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    const MerchantSale = require('./models/MerchantSale');
    
    // 查找所有销售记录
    const sales = await MerchantSale.find({});
    
    console.log(`\n找到 ${sales.length} 条销售记录`);
    
    for (const sale of sales) {
      console.log(`\n=== 处理销售记录: ${sale._id} ===`);
      console.log(`商户: ${sale.merchantId}, 日期: ${sale.saleDate}`);
      
      let needUpdate = false;
      let totalTax = 0;
      
      // 重新计算每个项目的税额
      for (const item of sale.items) {
        // 标准化税分类
        let taxClassification = item.taxClassification || 'VAT_23';
        
        if (taxClassification === 'VAT 23%' || taxClassification === 'VAT_23') {
          taxClassification = 'VAT_23';
        } else if (taxClassification === 'VAT 13.5%' || taxClassification === 'Service VAT 13.5%' || taxClassification === 'SERVICE_VAT_13_5') {
          taxClassification = 'SERVICE_VAT_13_5';
        } else if (taxClassification === 'VAT 0%' || taxClassification === 'Margin VAT' || taxClassification === 'MARGIN_VAT_0') {
          taxClassification = 'MARGIN_VAT_0';
        } else {
          taxClassification = 'VAT_23';
        }
        
        // 计算税额
        let taxAmount = 0;
        const itemTotal = item.price * item.quantity;
        const costPrice = item.costPrice || 0;
        
        switch (taxClassification) {
          case 'VAT_23':
            taxAmount = itemTotal * 23 / 123;
            break;
          case 'SERVICE_VAT_13_5':
            taxAmount = itemTotal * 13.5 / 113.5;
            break;
          case 'MARGIN_VAT_0':
            const margin = itemTotal - (costPrice * item.quantity);
            taxAmount = margin * 23 / 123;
            console.log(`  ${item.productName} (Margin VAT):`);
            console.log(`    卖价: €${itemTotal}`);
            console.log(`    成本: €${costPrice * item.quantity}`);
            console.log(`    利润: €${margin.toFixed(2)}`);
            console.log(`    旧税额: €${item.taxAmount.toFixed(2)}`);
            console.log(`    新税额: €${taxAmount.toFixed(2)}`);
            break;
          default:
            taxAmount = itemTotal * 23 / 123;
        }
        
        // 检查是否需要更新
        if (item.taxClassification !== taxClassification || 
            Math.abs(item.taxAmount - taxAmount) > 0.01) {
          needUpdate = true;
          
          if (item.taxClassification !== taxClassification) {
            console.log(`  ${item.productName}: 税分类 ${item.taxClassification} → ${taxClassification}`);
          }
          if (Math.abs(item.taxAmount - taxAmount) > 0.01) {
            console.log(`  ${item.productName}: 税额 €${item.taxAmount.toFixed(2)} → €${taxAmount.toFixed(2)}`);
          }
          
          item.taxClassification = taxClassification;
          item.taxAmount = taxAmount;
        }
        
        totalTax += taxAmount;
      }
      
      // 更新总税额
      if (needUpdate || Math.abs(sale.totalTax - totalTax) > 0.01) {
        sale.totalTax = totalTax;
        await sale.save();
        console.log(`✅ 销售记录已更新，总税额: €${totalTax.toFixed(2)}`);
      } else {
        console.log(`✓ 销售记录税额正确，无需更新`);
      }
    }
    
    console.log('\n✅ 所有销售记录处理完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

fixRetailSalesTax();
