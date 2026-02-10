const mongoose = require('mongoose');
require('dotenv').config();

const AdminInventory = require('./models/AdminInventory');

async function testTaxCalculation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    // 查询SI-003订单的产品
    const products = await AdminInventory.find({ 
      invoiceNumber: 'SI-003' 
    }).limit(5);
    
    console.log(`找到 ${products.length} 个产品样本\n`);
    
    products.forEach((product, index) => {
      console.log(`\n产品 ${index + 1}:`);
      console.log(`  名称: ${product.productName}`);
      console.log(`  型号: ${product.model}`);
      console.log(`  颜色: ${product.color}`);
      console.log(`  数量: ${product.quantity}`);
      console.log(`  进货价(含税): €${product.costPrice.toFixed(2)}`);
      console.log(`  税率分类: ${product.taxClassification}`);
      
      // 计算税额
      let vatRate = 'VAT 0%';
      let taxMultiplier = 1.0;
      
      if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
        vatRate = 'VAT 23%';
        taxMultiplier = 1.23;
      } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
        vatRate = 'VAT 13.5%';
        taxMultiplier = 1.135;
      }
      
      const totalCostIncludingTax = product.costPrice * product.quantity;
      const totalCostExcludingTax = totalCostIncludingTax / taxMultiplier;
      const taxAmount = totalCostIncludingTax - totalCostExcludingTax;
      
      console.log(`\n  计算结果:`);
      console.log(`  税率: ${vatRate}`);
      console.log(`  总价(含税): €${totalCostIncludingTax.toFixed(2)}`);
      console.log(`  总价(不含税): €${totalCostExcludingTax.toFixed(2)}`);
      console.log(`  税额: €${taxAmount.toFixed(2)}`);
      console.log(`  验证: €${totalCostExcludingTax.toFixed(2)} + €${taxAmount.toFixed(2)} = €${totalCostIncludingTax.toFixed(2)}`);
    });
    
    // 计算所有SI-003产品的总税额
    const allProducts = await AdminInventory.find({ invoiceNumber: 'SI-003' });
    
    let totalAmount = 0;
    let totalTax = 0;
    
    allProducts.forEach(product => {
      let taxMultiplier = 1.0;
      
      if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
        taxMultiplier = 1.23;
      } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
        taxMultiplier = 1.135;
      }
      
      const totalCostIncludingTax = product.costPrice * product.quantity;
      const totalCostExcludingTax = totalCostIncludingTax / taxMultiplier;
      const taxAmount = totalCostIncludingTax - totalCostExcludingTax;
      
      totalAmount += totalCostIncludingTax;
      totalTax += taxAmount;
    });
    
    console.log(`\n\n=== SI-003 订单总计 ===`);
    console.log(`产品总数: ${allProducts.length}`);
    console.log(`总金额(含税): €${totalAmount.toFixed(2)}`);
    console.log(`总金额(不含税): €${(totalAmount - totalTax).toFixed(2)}`);
    console.log(`总税额: €${totalTax.toFixed(2)}`);
    console.log(`验证: €${(totalAmount - totalTax).toFixed(2)} + €${totalTax.toFixed(2)} = €${totalAmount.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

testTaxCalculation();
