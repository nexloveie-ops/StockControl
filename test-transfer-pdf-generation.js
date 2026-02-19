const mongoose = require('mongoose');
require('dotenv').config();

async function testPDFGeneration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const InventoryTransfer = require('./models/InventoryTransfer');
    const CompanyInfo = require('./models/CompanyInfo');
    
    const transferNumber = 'TRF20260218001';
    
    console.log(`📄 测试PDF生成数据: ${transferNumber}\n`);
    
    const [transfer, companyInfo] = await Promise.all([
      InventoryTransfer.findOne({ transferNumber: transferNumber }).lean(),
      CompanyInfo.findOne({ isDefault: true }).lean()
    ]);
    
    if (!transfer) {
      console.log('❌ 调货记录不存在');
      return;
    }
    
    console.log('调货记录:');
    console.log(`  transferNumber: ${transfer.transferNumber}`);
    console.log(`  transferType: ${transfer.transferType}`);
    console.log(`  status: ${transfer.status}`);
    console.log(`  fromMerchant: ${transfer.fromMerchant}`);
    console.log(`  toMerchant: ${transfer.toMerchant}`);
    console.log(`\n商品列表:`);
    
    transfer.items.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.productName}`);
      console.log(`   quantity: ${item.quantity}`);
      console.log(`   transferPrice: €${item.transferPrice}`);
      console.log(`   taxClassification: "${item.taxClassification}"`);
      console.log(`   taxClassification类型: ${typeof item.taxClassification}`);
      
      // 模拟PDF生成中的税率映射
      const taxClassMap = {
        'VAT_23': 'VAT 23%',
        'SERVICE_VAT_13_5': 'VAT 13.5%',
        'MARGIN_VAT_0': 'Margin VAT',
        'VAT_0': 'VAT 0%'
      };
      
      const taxText = taxClassMap[item.taxClassification] || item.taxClassification || 'N/A';
      console.log(`   PDF中显示的税率: "${taxText}"`);
    });
    
    console.log(`\n\n如果PDF显示的是 "0.0%"，说明：`);
    console.log(`1. taxClassification的值不在taxClassMap中`);
    console.log(`2. 或者taxClassification是数字类型（如0.0）而不是字符串`);
    console.log(`3. 或者使用了其他PDF生成代码`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

testPDFGeneration();
