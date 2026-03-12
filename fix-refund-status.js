const mongoose = require('mongoose');
require('dotenv').config();

async function fixRefundStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    console.log('🔍 查找所有有退款信息但状态不是refunded的订单...\n');
    
    // 查找所有有退款日期但状态不是refunded的订单
    const incorrectSales = await MerchantSale.find({
      refundDate: { $exists: true, $ne: null },
      status: { $ne: 'refunded' }
    }).lean();
    
    console.log(`找到 ${incorrectSales.length} 条需要修复的订单\n`);
    
    if (incorrectSales.length === 0) {
      console.log('✅ 没有需要修复的订单');
      return;
    }
    
    console.log('📋 需要修复的订单列表:\n');
    incorrectSales.forEach((sale, i) => {
      console.log(`${i + 1}. 订单 ${sale._id.toString().slice(-8)}`);
      console.log(`   商户: ${sale.merchantId}`);
      console.log(`   销售日期: ${new Date(sale.saleDate).toLocaleDateString('zh-CN')}`);
      console.log(`   当前状态: ${sale.status}`);
      console.log(`   退款日期: ${new Date(sale.refundDate).toLocaleDateString('zh-CN')}`);
      console.log(`   退款金额: €${sale.refundAmount || 0}`);
      console.log('');
    });
    
    // 询问是否修复
    console.log('🔧 准备将这些订单的状态更新为 "refunded"...\n');
    
    // 批量更新
    const result = await MerchantSale.updateMany(
      {
        refundDate: { $exists: true, $ne: null },
        status: { $ne: 'refunded' }
      },
      {
        $set: { status: 'refunded' }
      }
    );
    
    console.log(`✅ 更新完成！`);
    console.log(`   匹配的订单数: ${result.matchedCount}`);
    console.log(`   更新的订单数: ${result.modifiedCount}`);
    console.log('');
    
    // 验证修复结果
    const fixed = await MerchantSale.findById('69b16fd70988845670dacb91').lean();
    if (fixed) {
      console.log('✅ 验证订单 69b16fd70988845670dacb91:');
      console.log(`   状态: ${fixed.status}`);
      console.log(`   退款日期: ${new Date(fixed.refundDate).toLocaleString('zh-CN')}`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

fixRefundStatus();
