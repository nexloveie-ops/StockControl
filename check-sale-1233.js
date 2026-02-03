require('dotenv').config();
const mongoose = require('mongoose');
const MerchantSale = require('./models/MerchantSale');
const MerchantInventory = require('./models/MerchantInventory');

async function checkSale() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    // 查找 IMEI 1233 的销售记录
    const sales = await MerchantSale.find({
      'items.serialNumber': '1233'
    }).sort({ saleDate: -1 });
    
    console.log(`\n📊 找到 ${sales.length} 条销售记录:`);
    
    sales.forEach((sale, index) => {
      console.log(`\n=== 销售记录 ${index + 1} ===`);
      console.log(`日期: ${sale.saleDate}`);
      console.log(`商户: ${sale.merchantId}`);
      
      sale.items.forEach(item => {
        if (item.serialNumber === '1233') {
          console.log(`\n产品: ${item.productName}`);
          console.log(`序列号: ${item.serialNumber}`);
          console.log(`数量: ${item.quantity}`);
          console.log(`销售价: €${item.price}`);
          console.log(`成本价: €${item.costPrice}`);
          console.log(`税务分类: ${item.taxClassification}`);
          console.log(`税额: €${item.taxAmount}`);
          
          // 计算应该的税额
          const saleTotal = item.price * item.quantity;
          const costTotal = item.costPrice * item.quantity;
          
          if (item.taxClassification === 'MARGIN_VAT_0') {
            const margin = saleTotal - costTotal;
            const correctTax = margin * 23 / 123;
            console.log(`\n✓ 正确计算:`);
            console.log(`  利润: €${margin.toFixed(2)}`);
            console.log(`  应该的税额: €${correctTax.toFixed(2)}`);
            console.log(`  实际税额: €${item.taxAmount.toFixed(2)}`);
            console.log(`  差异: €${(item.taxAmount - correctTax).toFixed(2)}`);
          }
        }
      });
    });
    
    // 查看库存中的批发价
    console.log('\n\n📦 查看库存记录:');
    const inventory = await MerchantInventory.find({
      serialNumber: '1233'
    });
    
    inventory.forEach(item => {
      console.log(`\n产品: ${item.productName}`);
      console.log(`成本价 (costPrice): €${item.costPrice}`);
      console.log(`批发价 (wholesalePrice): €${item.wholesalePrice}`);
      console.log(`零售价 (retailPrice): €${item.retailPrice}`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

checkSale();
