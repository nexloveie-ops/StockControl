const mongoose = require('mongoose');
require('dotenv').config();

async function verifyServiceSales() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    // 查询所有包含快速销售service的记录
    const serviceSales = await MerchantSale.find({
      'items.isQuickSale': true,
      'items.quickSaleCategory': 'services'
    }).sort({ saleDate: -1 }).limit(10);
    
    console.log(`📊 找到 ${serviceSales.length} 条快速销售service记录\n`);
    
    if (serviceSales.length > 0) {
      serviceSales.forEach((sale, index) => {
        console.log(`\n=== 记录 ${index + 1} ===`);
        console.log(`销售ID: ${sale._id}`);
        console.log(`商户ID: ${sale.merchantId}`);
        console.log(`销售日期: ${sale.saleDate}`);
        console.log(`客户电话: ${sale.customerPhone || '未提供'}`);
        console.log(`总金额: €${sale.totalAmount}`);
        console.log(`支付方式: ${sale.paymentMethod}`);
        
        // 显示service项目
        const serviceItems = sale.items.filter(item => 
          item.isQuickSale && item.quickSaleCategory === 'services'
        );
        
        console.log(`\nService项目 (${serviceItems.length}):`);
        serviceItems.forEach((item, i) => {
          console.log(`  ${i + 1}. ${item.productName}`);
          console.log(`     描述: ${item.quickSaleDescription || '无'}`);
          console.log(`     价格: €${item.price} x ${item.quantity}`);
          console.log(`     税分类: ${item.taxClassification}`);
          console.log(`     税额: €${item.taxAmount.toFixed(2)}`);
          console.log(`     isQuickSale: ${item.isQuickSale}`);
          console.log(`     quickSaleCategory: ${item.quickSaleCategory}`);
        });
      });
    } else {
      console.log('❌ 没有找到快速销售的service记录');
      console.log('\n请检查：');
      console.log('1. 是否进行了快速销售的service？');
      console.log('2. 快速销售时是否选择了"服务"类别？');
      console.log('3. 数据是否正确保存到MerchantSale表？');
    }
    
    // 查询今天的所有MerchantSale记录
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = await MerchantSale.find({
      saleDate: { $gte: today }
    }).sort({ saleDate: -1 });
    
    console.log(`\n\n📅 今天的所有销售记录: ${todaySales.length} 条`);
    todaySales.forEach((sale, index) => {
      console.log(`\n${index + 1}. 销售ID: ${sale._id}`);
      console.log(`   时间: ${sale.saleDate}`);
      console.log(`   金额: €${sale.totalAmount}`);
      console.log(`   项目数: ${sale.items.length}`);
      sale.items.forEach((item, i) => {
        console.log(`   - ${item.productName} (快速销售: ${item.isQuickSale || false}, 类别: ${item.quickSaleCategory || 'N/A'})`);
      });
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

verifyServiceSales();
