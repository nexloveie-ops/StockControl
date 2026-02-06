const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkSalesDiscount() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    // 查询最近的销售记录
    const sales = await MerchantSale.find({ merchantId: 'MurrayDundrum' })
      .sort({ saleDate: -1 })
      .limit(5);
    
    console.log(`找到 ${sales.length} 条销售记录\n`);
    
    sales.forEach((sale, index) => {
      console.log(`${index + 1}. 销售记录 ${sale._id}`);
      console.log(`   日期: ${sale.saleDate.toLocaleString('zh-CN')}`);
      console.log(`   支付方式: ${sale.paymentMethod}`);
      console.log(`   小计 (subtotal): ${sale.subtotal ? '€' + sale.subtotal.toFixed(2) : '无'}`);
      console.log(`   折扣 (discount): ${sale.discount ? '€' + sale.discount.toFixed(2) : '€0.00'}`);
      console.log(`   实际收款 (totalAmount): €${sale.totalAmount.toFixed(2)}`);
      console.log(`   总税额 (totalTax): €${sale.totalTax.toFixed(2)}`);
      console.log(`   产品数量: ${sale.items.length}`);
      
      if (sale.subtotal && sale.discount > 0) {
        const discountPercent = (sale.discount / sale.subtotal * 100).toFixed(1);
        console.log(`   折扣比例: ${discountPercent}%`);
      }
      
      console.log(`   产品明细:`);
      sale.items.forEach((item, i) => {
        const itemTotal = item.price * item.quantity;
        console.log(`     ${i + 1}. ${item.productName}`);
        console.log(`        数量: ${item.quantity}`);
        console.log(`        单价: €${item.price.toFixed(2)}`);
        console.log(`        小计: €${itemTotal.toFixed(2)}`);
        console.log(`        税额: €${item.taxAmount.toFixed(2)}`);
        console.log(`        税分类: ${item.taxClassification}`);
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

checkSalesDiscount();
