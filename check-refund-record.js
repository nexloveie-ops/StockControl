const mongoose = require('mongoose');
require('dotenv').config();

async function checkRefundRecord() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    const orderId = '69b16fd70988845670dacb91';
    
    console.log(`🔍 查询订单: ${orderId}\n`);
    
    // 查询这条订单
    const sale = await MerchantSale.findById(orderId).lean();
    
    if (!sale) {
      console.log('❌ 订单不存在');
      return;
    }
    
    console.log('📋 订单详细信息:\n');
    console.log(`订单ID: ${sale._id}`);
    console.log(`商户: ${sale.merchantId}`);
    console.log(`销售日期: ${new Date(sale.saleDate).toLocaleString('zh-CN')}`);
    console.log(`状态: ${sale.status}`);
    console.log(`总金额: €${sale.totalAmount}`);
    console.log(`客户: ${sale.customerName || 'N/A'} (${sale.customerPhone || 'N/A'})`);
    console.log(`支付方式: ${sale.paymentMethod}`);
    console.log('');
    
    console.log('🔄 退款信息:');
    console.log(`退款日期: ${sale.refundDate ? new Date(sale.refundDate).toLocaleString('zh-CN') : 'N/A'}`);
    console.log(`退款金额: €${sale.refundAmount || 0}`);
    console.log(`退款项目: ${sale.refundItems ? JSON.stringify(sale.refundItems) : 'N/A'}`);
    console.log('');
    
    console.log('📦 销售项目:');
    sale.items.forEach((item, i) => {
      console.log(`\n  ${i + 1}. ${item.productName}`);
      console.log(`     - 数量: ${item.quantity}`);
      console.log(`     - 价格: €${item.price}`);
      console.log(`     - 成本: €${item.costPrice}`);
      console.log(`     - 税务分类: ${item.taxClassification}`);
      console.log(`     - 快速销售: ${item.isQuickSale || false}`);
      console.log(`     - 序列号: ${item.serialNumber || 'N/A'}`);
      if (item.refundCondition) {
        console.log(`     - 退回成色: ${item.refundCondition}`);
      }
    });
    console.log('');
    
    console.log('📊 状态分析:');
    if (sale.status === 'refunded') {
      console.log('✅ 这条记录已经退款');
      console.log('❌ 但它仍然出现在税务报表中，这是一个BUG！');
    } else if (sale.status === 'completed') {
      console.log('❌ 这条记录状态是 completed，没有退款');
      console.log('💡 如果你已经退款，状态应该是 refunded');
    } else if (sale.status === 'cancelled') {
      console.log('✅ 这条记录已经取消');
    } else {
      console.log(`❓ 未知状态: ${sale.status}`);
    }
    console.log('');
    
    // 检查创建和更新时间
    console.log('⏰ 时间戳:');
    console.log(`创建时间: ${new Date(sale.createdAt).toLocaleString('zh-CN')}`);
    console.log(`更新时间: ${new Date(sale.updatedAt).toLocaleString('zh-CN')}`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkRefundRecord();
