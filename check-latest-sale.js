/**
 * 检查最新的销售记录
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkLatestSale() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    // 查询最新的销售记录
    const sale = await MerchantSale.findOne()
      .sort({ createdAt: -1 })
      .lean();
    
    if (!sale) {
      console.log('❌ 没有找到销售记录');
      return;
    }
    
    console.log('=== 最新销售记录 ===');
    console.log(`订单号: ${sale.saleId || sale.invoiceNumber || sale._id}`);
    console.log(`创建时间: ${new Date(sale.createdAt).toLocaleString('zh-CN')}`);
    console.log(`商户: ${sale.merchantId}`);
    console.log(`总金额: €${sale.totalAmount}`);
    console.log('');
    
    console.log('=== 商品明细 ===');
    sale.items.forEach((item, index) => {
      console.log(`商品 ${index + 1}: ${item.productName}`);
      console.log(`  数量: ${item.quantity}`);
      console.log(`  价格: €${item.price}`);
      console.log(`  序列号: ${item.serialNumber || '无'}`);
      console.log(`  originalCondition: ${item.originalCondition || '❌ 未设置'}`);
      console.log(`  originalCategory: ${item.originalCategory || '❌ 未设置'}`);
      
      // 判断逻辑
      const originalCondition = item.originalCondition || '全新';
      const isBrandNew = originalCondition === 'Brand New' || 
                         originalCondition === '全新' || 
                         originalCondition === 'BRAND NEW';
      
      console.log(`  → 使用的 originalCondition: ${originalCondition}`);
      console.log(`  → isBrandNew: ${isBrandNew}`);
      console.log(`  → 预期: ${item.originalCondition ? (item.originalCondition === 'BRAND NEW' || item.originalCondition === 'Brand New' || item.originalCondition === '全新' ? '显示所有成色' : '不显示"全新"') : '使用默认值，显示所有成色'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

checkLatestSale();
