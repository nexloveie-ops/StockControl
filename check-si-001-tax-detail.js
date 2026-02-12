require('dotenv').config();
const mongoose = require('mongoose');

async function checkSI001TaxDetail() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const AdminInventory = require('./models/AdminInventory');
    
    // 查询SI-001的所有产品
    const products = await AdminInventory.find({ invoiceNumber: 'SI-001' }).lean();
    
    console.log(`📦 SI-001 详细税额计算:\n`);
    
    let totalCostPrice = 0;
    let totalTaxInclusive = 0;
    let totalTaxExclusive = 0;
    let totalTaxAmount = 0;
    
    // 只显示第一个产品的详细信息
    const firstProduct = products[0];
    console.log(`示例产品 (第1个):`);
    console.log(`  名称: ${firstProduct.productName}`);
    console.log(`  数量: ${firstProduct.quantity}`);
    console.log(`  成本价: €${firstProduct.costPrice}`);
    console.log(`  税分类: ${firstProduct.taxClassification}`);
    console.log(`  小计: €${firstProduct.costPrice * firstProduct.quantity}\n`);
    
    products.forEach((item, index) => {
      const itemTotal = item.costPrice * item.quantity;
      totalCostPrice += itemTotal;
      
      // 假设1: costPrice是含税价
      const taxInclusive = itemTotal - (itemTotal / 1.23);
      totalTaxInclusive += taxInclusive;
      
      // 假设2: costPrice是不含税价
      const taxExclusive = itemTotal * 0.23;
      totalTaxExclusive += taxExclusive;
    });
    
    console.log(`\n📊 汇总计算:\n`);
    console.log(`总成本价: €${totalCostPrice.toFixed(2)}`);
    console.log(`\n假设1: costPrice是含税价 (Tax-Inclusive)`);
    console.log(`  不含税金额: €${(totalCostPrice / 1.23).toFixed(2)}`);
    console.log(`  税额: €${totalTaxInclusive.toFixed(2)}`);
    console.log(`  含税总额: €${totalCostPrice.toFixed(2)}`);
    
    console.log(`\n假设2: costPrice是不含税价 (Tax-Exclusive)`);
    console.log(`  不含税金额: €${totalCostPrice.toFixed(2)}`);
    console.log(`  税额: €${totalTaxExclusive.toFixed(2)}`);
    console.log(`  含税总额: €${(totalCostPrice + totalTaxExclusive).toFixed(2)}`);
    
    console.log(`\n\n🤔 你说税额应该是 €463.37，让我反推:`);
    const expectedTax = 463.37;
    
    // 如果税额是463.37，反推不含税金额
    // 方法1: 假设含税价是1740
    const netAmount1 = 1740 - expectedTax;
    const verifyTax1 = netAmount1 * 0.23;
    console.log(`\n方法1: 如果含税价€1740，税额€463.37`);
    console.log(`  不含税金额: €${netAmount1.toFixed(2)}`);
    console.log(`  验证税额: €${netAmount1.toFixed(2)} × 0.23 = €${verifyTax1.toFixed(2)}`);
    console.log(`  ${Math.abs(verifyTax1 - expectedTax) < 0.01 ? '✅ 匹配' : '❌ 不匹配'}`);
    
    // 方法2: 假设不含税价是X，税额是463.37
    const netAmount2 = expectedTax / 0.23;
    const totalWithTax2 = netAmount2 + expectedTax;
    console.log(`\n方法2: 如果税额€463.37 (税率23%)`);
    console.log(`  不含税金额: €${expectedTax.toFixed(2)} / 0.23 = €${netAmount2.toFixed(2)}`);
    console.log(`  含税总额: €${netAmount2.toFixed(2)} + €${expectedTax.toFixed(2)} = €${totalWithTax2.toFixed(2)}`);
    
    // 方法3: 检查是否有其他产品
    console.log(`\n\n📋 产品统计:`);
    console.log(`  产品数量: ${products.length}`);
    console.log(`  总数量: ${products.reduce((sum, p) => sum + p.quantity, 0)}`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkSI001TaxDetail();
