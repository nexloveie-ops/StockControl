/**
 * 查找所有已退款的销售记录
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllRefundedSales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    // 查找所有已退款的销售记录
    console.log('=== 查找所有已退款的销售记录 ===\n');
    const refundedSales = await MerchantSale.find({
      status: 'refunded'
    }).sort({ refundDate: -1 }).lean();
    
    console.log(`找到 ${refundedSales.length} 条退款记录\n`);
    
    refundedSales.forEach((sale, index) => {
      console.log(`--- 退款记录 ${index + 1} ---`);
      console.log(`销售ID: ${sale._id}`);
      console.log(`商户: ${sale.merchantName || sale.merchantId}`);
      console.log(`销售日期: ${new Date(sale.saleDate).toLocaleString('zh-CN')}`);
      console.log(`退款日期: ${new Date(sale.refundDate).toLocaleString('zh-CN')}`);
      console.log(`退款原因: ${sale.refundReason || '未填写'}`);
      console.log(`总金额: €${sale.totalAmount}`);
      console.log('');
      
      console.log('  商品列表:');
      sale.items.forEach((item, itemIndex) => {
        console.log(`  ${itemIndex + 1}. ${item.productName}`);
        console.log(`     序列号: ${item.serialNumber || '无'}`);
        console.log(`     价格: €${item.price}`);
        console.log(`     数量: ${item.quantity}`);
        console.log(`     原始成色 (originalCondition): ${item.originalCondition || '未设置'}`);
        console.log(`     销售成色 (condition): ${item.condition || '未设置'}`);
        console.log(`     退回成色 (refundCondition): ${item.refundCondition || '未设置'}`);
        console.log('');
      });
      
      console.log('---\n');
    });
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

checkAllRefundedSales();
