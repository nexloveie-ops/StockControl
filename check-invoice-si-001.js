require('dotenv').config();
const mongoose = require('mongoose');

async function checkInvoiceSI001() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const AdminInventory = require('./models/AdminInventory');
    
    // 查询SI-001的所有产品
    const products = await AdminInventory.find({ invoiceNumber: 'SI-001' }).lean();
    
    if (products.length === 0) {
      console.log('❌ 未找到SI-001的产品');
      return;
    }
    
    console.log(`📦 SI-001 发票详情:`);
    console.log(`供货商: ${products[0].supplier}`);
    console.log(`创建日期: ${products[0].createdAt}`);
    console.log(`产品数量: ${products.length}\n`);
    
    let totalAmount = 0;
    let totalTax = 0;
    
    products.forEach((item, index) => {
      console.log(`\n产品 ${index + 1}:`);
      console.log(`  名称: ${item.productName}`);
      console.log(`  型号: ${item.model || 'N/A'}`);
      console.log(`  颜色: ${item.color || 'N/A'}`);
      console.log(`  数量: ${item.quantity}`);
      console.log(`  成本价: €${item.costPrice}`);
      console.log(`  税分类: ${item.taxClassification}`);
      
      const itemTotal = item.costPrice * item.quantity;
      totalAmount += itemTotal;
      
      // 计算税额
      let itemTax = 0;
      if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
        itemTax = itemTotal - (itemTotal / 1.23);
        console.log(`  税额计算: €${itemTotal.toFixed(2)} - (€${itemTotal.toFixed(2)} / 1.23) = €${itemTax.toFixed(2)}`);
      } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
        itemTax = itemTotal - (itemTotal / 1.135);
        console.log(`  税额计算: €${itemTotal.toFixed(2)} - (€${itemTotal.toFixed(2)} / 1.135) = €${itemTax.toFixed(2)}`);
      } else if (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'Margin VAT') {
        itemTax = 0;
        console.log(`  税额: €0.00 (Margin VAT采购时不计税)`);
      } else {
        itemTax = 0;
        console.log(`  税额: €0.00 (${item.taxClassification})`);
      }
      
      totalTax += itemTax;
      
      console.log(`  小计: €${itemTotal.toFixed(2)}`);
      console.log(`  税额: €${itemTax.toFixed(2)}`);
    });
    
    console.log(`\n\n📊 发票汇总:`);
    console.log(`总金额: €${totalAmount.toFixed(2)}`);
    console.log(`总税额: €${totalTax.toFixed(2)}`);
    console.log(`不含税金额: €${(totalAmount - totalTax).toFixed(2)}`);
    
    // 检查是否有异常数据
    if (totalTax < 0) {
      console.log(`\n⚠️  警告: 税额为负数！这是不正常的。`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkInvoiceSI001();
