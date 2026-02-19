const mongoose = require('mongoose');
require('dotenv').config();

async function checkMobile123Sales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    const mobile123Sales = await MerchantSale.find({ merchantId: 'Mobile123' });
    
    console.log(`📊 Mobile123 的销售记录: ${mobile123Sales.length} 条\n`);
    
    if (mobile123Sales.length > 0) {
      mobile123Sales.forEach((sale, index) => {
        console.log(`\n${index + 1}. 订单号: ${sale.orderNumber || 'N/A'}`);
        console.log(`   日期: ${sale.saleDate}`);
        console.log(`   状态: ${sale.status}`);
        console.log(`   类型: ${sale.saleType || 'N/A'}`);
        console.log(`   总额: €${sale.totalAmount}`);
        console.log(`   商品:`);
        if (sale.items && sale.items.length > 0) {
          sale.items.forEach((item, i) => {
            console.log(`     ${i + 1}. ${item.productName} x${item.quantity} - €${item.price}`);
          });
        }
      });
    } else {
      console.log('✅ Mobile123 没有销售记录');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkMobile123Sales();
