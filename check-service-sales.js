const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

async function checkServiceSales() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const SalesInvoice = require('./models/SalesInvoice');
    
    console.log('🔍 查询最近的销售订单\n');
    
    // 查询最近的销售订单（不限日期）
    const sales = await SalesInvoice.find({})
      .sort({ orderDate: -1 })
      .limit(10)
      .lean();
    
    console.log(`找到 ${sales.length} 条今日销售记录\n`);
    
    sales.forEach((sale, index) => {
      console.log(`\n=== 销售订单 ${index + 1} ===`);
      console.log(`  完整数据:`, JSON.stringify(sale, null, 2));
    });
    
    // 专门查询包含service的订单
    console.log('\n\n🔍 查询包含service类型的销售订单\n');
    
    const serviceSales = await SalesInvoice.find({
      'items.quickSaleCategory': 'services'
    }).sort({ orderDate: -1 }).limit(5).lean();
    
    console.log(`找到 ${serviceSales.length} 条包含service的销售记录\n`);
    
    serviceSales.forEach((sale, index) => {
      console.log(`\n=== Service销售 ${index + 1} ===`);
      console.log(`  发票号: ${sale.invoiceNumber}`);
      console.log(`  商户: ${sale.merchantId}`);
      console.log(`  日期: ${sale.orderDate}`);
      
      const serviceItems = sale.items.filter(item => item.quickSaleCategory === 'services');
      console.log(`  Service项目数: ${serviceItems.length}`);
      
      serviceItems.forEach((item, i) => {
        console.log(`    ${i + 1}. ${item.productName}`);
        console.log(`       描述: ${item.quickSaleDescription}`);
        console.log(`       数量: ${item.quantity}`);
        console.log(`       单价: €${item.price}`);
        console.log(`       总价: €${item.price * item.quantity}`);
      });
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  }
}

checkServiceSales();
