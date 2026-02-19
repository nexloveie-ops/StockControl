// 测试 Margin VAT 税务分类修复
const mongoose = require('mongoose');
require('dotenv').config();

async function testMarginVatFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    
    console.log('=== 测试 Margin VAT 税务分类转换 ===\n');
    
    // 查找所有 Margin VAT 产品
    const marginProducts = await ProductNew.find({
      vatRate: { $regex: /margin/i }
    }).limit(5);
    
    console.log(`找到 ${marginProducts.length} 个 Margin VAT 产品:\n`);
    
    marginProducts.forEach((product, idx) => {
      console.log(`${idx + 1}. ${product.name}`);
      console.log(`   vatRate: "${product.vatRate}"`);
      console.log(`   condition: ${product.condition}`);
      console.log(`   stockQuantity: ${product.stockQuantity}`);
      
      // 测试转换逻辑
      const vatRateLower = (product.vatRate || '').toLowerCase();
      let taxClassification = 'VAT_23';
      
      if (product.vatRate === 'VAT 23%') {
        taxClassification = 'VAT_23';
      } else if (product.vatRate === 'VAT 13.5%') {
        taxClassification = 'SERVICE_VAT_13_5';
      } else if (vatRateLower.includes('margin') || product.vatRate === 'VAT 0%') {
        taxClassification = 'MARGIN_VAT_0';
      }
      
      console.log(`   ✅ 转换后: ${taxClassification}\n`);
    });
    
    console.log('=== 测试结果 ===');
    console.log('所有包含 "margin" 的 vatRate 都应该转换为 MARGIN_VAT_0');
    console.log('包括: "Margin VAT", "Margin Vat", "Margin Vat 0%"');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testMarginVatFix();
