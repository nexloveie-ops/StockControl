/**
 * 检查销售记录中的 originalCondition 字段
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkSaleOriginalCondition() {
  try {
    console.log('=== 检查销售记录中的 originalCondition ===\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    // 查询最近的销售记录
    const sales = await MerchantSale.find()
      .sort({ date: -1 })
      .limit(5)
      .lean();
    
    console.log(`找到 ${sales.length} 条销售记录\n`);
    
    sales.forEach((sale, index) => {
      console.log(`=== 销售记录 ${index + 1} ===`);
      console.log(`订单号: ${sale.saleId || sale.invoiceNumber || sale._id}`);
      console.log(`日期: ${new Date(sale.date).toLocaleString('zh-CN')}`);
      console.log(`商户: ${sale.merchantId}`);
      console.log(`商品数量: ${sale.items.length}`);
      console.log('');
      
      sale.items.forEach((item, itemIndex) => {
        console.log(`  商品 ${itemIndex + 1}: ${item.productName}`);
        console.log(`    数量: ${item.quantity}`);
        console.log(`    价格: €${item.price}`);
        console.log(`    序列号: ${item.serialNumber || '无'}`);
        console.log(`    originalCondition: ${item.originalCondition || '❌ 未设置'}`);
        console.log(`    originalCategory: ${item.originalCategory || '❌ 未设置'}`);
        console.log('');
      });
    });
    
    // 统计有多少销售记录缺少 originalCondition
    const allSales = await MerchantSale.find().lean();
    let totalItems = 0;
    let itemsWithoutOriginalCondition = 0;
    
    allSales.forEach(sale => {
      sale.items.forEach(item => {
        totalItems++;
        if (!item.originalCondition) {
          itemsWithoutOriginalCondition++;
        }
      });
    });
    
    console.log('=== 统计 ===');
    console.log(`总商品数: ${totalItems}`);
    console.log(`缺少 originalCondition: ${itemsWithoutOriginalCondition}`);
    console.log(`百分比: ${((itemsWithoutOriginalCondition / totalItems) * 100).toFixed(1)}%`);
    
    if (itemsWithoutOriginalCondition > 0) {
      console.log('\n⚠️ 发现问题：部分销售记录缺少 originalCondition 字段');
      console.log('这会导致退款时无法正确判断原始成色');
    } else {
      console.log('\n✅ 所有销售记录都有 originalCondition 字段');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkSaleOriginalCondition();
