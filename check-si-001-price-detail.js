// 检查SI-001的价格详情
require('dotenv').config();
const mongoose = require('mongoose');

async function checkSI001PriceDetail() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const AdminInventory = require('./models/AdminInventory');
    
    const si001Products = await AdminInventory.find({ invoiceNumber: 'SI-001' }).lean();
    
    console.log(`📦 SI-001产品详情 (共${si001Products.length}个产品):\n`);
    
    let totalCostPrice = 0;
    let totalWithVAT23 = 0;
    let totalWithVAT135 = 0;
    
    // 显示前5个产品的详细信息
    console.log('前5个产品示例:');
    si001Products.slice(0, 5).forEach((product, index) => {
      console.log(`\n产品 ${index + 1}:`);
      console.log(`  名称: ${product.productName}`);
      console.log(`  型号: ${product.model}`);
      console.log(`  颜色: ${product.color}`);
      console.log(`  数量: ${product.quantity}`);
      console.log(`  costPrice: €${product.costPrice}`);
      console.log(`  税率: ${product.taxClassification}`);
      
      const itemTotal = product.costPrice * product.quantity;
      totalCostPrice += itemTotal;
      
      if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
        const withVAT = itemTotal * 1.23;
        totalWithVAT23 += withVAT;
        console.log(`  小计(不含税): €${itemTotal.toFixed(2)}`);
        console.log(`  小计(含税23%): €${withVAT.toFixed(2)}`);
      } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
        const withVAT = itemTotal * 1.135;
        totalWithVAT135 += withVAT;
        console.log(`  小计(不含税): €${itemTotal.toFixed(2)}`);
        console.log(`  小计(含税13.5%): €${withVAT.toFixed(2)}`);
      }
    });
    
    // 计算所有产品的总计
    console.log('\n\n📊 所有产品汇总:');
    si001Products.forEach(product => {
      const itemTotal = product.costPrice * product.quantity;
      totalCostPrice += itemTotal;
    });
    
    console.log(`\n总计 costPrice × quantity: €${totalCostPrice.toFixed(2)}`);
    console.log('\n如果costPrice是不含税价格:');
    console.log(`  含税总额(23%): €${(totalCostPrice * 1.23).toFixed(2)}`);
    console.log(`  税额: €${(totalCostPrice * 0.23).toFixed(2)}`);
    
    console.log('\n如果costPrice是含税价格:');
    console.log(`  含税总额: €${totalCostPrice.toFixed(2)}`);
    console.log(`  不含税金额: €${(totalCostPrice / 1.23).toFixed(2)}`);
    console.log(`  税额: €${(totalCostPrice - totalCostPrice / 1.23).toFixed(2)}`);
    
    console.log('\n❓ 请确认: SI-001的costPrice是含税还是不含税？');
    console.log('   如果€1740是税前价格，那么costPrice应该是不含税的');
    console.log('   如果€1740是税后价格，那么costPrice应该是含税的');
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkSI001PriceDetail();
