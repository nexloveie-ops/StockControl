/**
 * 验证序列号 1116666 的退款成色是否已保存
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function verifyRefundCondition() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    // 直接查询销售记录
    const sale = await MerchantSale.findById('698aa3ba4b86e7c17798f87d');
    
    if (!sale) {
      console.log('❌ 没有找到销售记录');
      return;
    }
    
    console.log('=== 销售记录详情 ===');
    console.log(`销售ID: ${sale._id}`);
    console.log(`状态: ${sale.status}`);
    console.log(`退款日期: ${new Date(sale.refundDate).toLocaleString('zh-CN')}`);
    console.log('');
    
    console.log('=== 商品列表 ===');
    sale.items.forEach((item, index) => {
      console.log(`商品 ${index + 1}:`);
      console.log(`  产品名称: ${item.productName}`);
      console.log(`  序列号: ${item.serialNumber}`);
      console.log(`  inventoryId: ${item.inventoryId}`);
      console.log(`  condition: ${item.condition || '未设置'}`);
      console.log(`  originalCondition: ${item.originalCondition || '未设置'}`);
      console.log(`  refundCondition: ${item.refundCondition || '未设置'}`);
      console.log('');
      
      // 检查字段是否存在
      console.log(`  字段检查:`);
      console.log(`    hasOwnProperty('refundCondition'): ${item.hasOwnProperty('refundCondition')}`);
      console.log(`    refundCondition === undefined: ${item.refundCondition === undefined}`);
      console.log(`    refundCondition === null: ${item.refundCondition === null}`);
      console.log(`    refundCondition === '': ${item.refundCondition === ''}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

verifyRefundCondition();
