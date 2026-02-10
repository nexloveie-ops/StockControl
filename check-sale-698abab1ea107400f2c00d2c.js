require('dotenv').config();
const mongoose = require('mongoose');

async function checkSale() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const MerchantSale = require('./models/MerchantSale');
    
    const saleId = '698abab1ea107400f2c00d2c';
    console.log(`🔍 查询订单: ${saleId}\n`);
    
    const sale = await MerchantSale.findById(saleId);
    
    if (!sale) {
      console.log('❌ 未找到该订单');
      return;
    }
    
    console.log('📋 订单信息:');
    console.log('='.repeat(80));
    console.log(`订单ID: ${sale._id}`);
    console.log(`商户ID: ${sale.merchantId}`);
    console.log(`订单状态: ${sale.status || 'ACTIVE'}`);
    console.log(`销售日期: ${sale.saleDate}`);
    console.log(`客户电话: ${sale.customerPhone || 'N/A'}`);
    console.log(`支付方式: ${sale.paymentMethod}`);
    console.log(`总金额: €${sale.totalAmount.toFixed(2)}`);
    console.log(`总税额: €${(sale.totalTax || 0).toFixed(2)}`);
    
    console.log('\n📦 订单商品:');
    console.log('='.repeat(80));
    
    if (sale.items && sale.items.length > 0) {
      sale.items.forEach((item, index) => {
        console.log(`\n商品 ${index + 1}:`);
        console.log(`  产品名称: ${item.productName}`);
        console.log(`  序列号: ${item.serialNumber || 'N/A'}`);
        console.log(`  数量: ${item.quantity}`);
        console.log(`  单价: €${item.price.toFixed(2)}`);
        console.log(`  成本: €${item.costPrice.toFixed(2)}`);
        console.log(`  税额: €${item.taxAmount.toFixed(2)}`);
        console.log(`  税务分类: ${item.taxClassification}`);
        console.log(`  小计: €${(item.price * item.quantity).toFixed(2)}`);
        console.log(`  利润: €${((item.price - item.costPrice) * item.quantity).toFixed(2)}`);
      });
    } else {
      console.log('  无商品信息');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 退款状态分析:');
    console.log('='.repeat(80));
    
    if (sale.status === 'REFUNDED') {
      console.log('❌ 该订单已被退款');
      console.log('   - 订单状态: REFUNDED');
      console.log('   - 所有商品已退款');
      console.log('   - 该订单不应计入销售统计');
      console.log('   - 该订单不应计入税务报表');
    } else {
      console.log('✅ 该订单状态正常');
      console.log('   - 订单状态: ' + (sale.status || 'ACTIVE'));
      console.log('   - 所有商品有效');
      console.log('   - 该订单应计入销售统计');
      console.log('   - 该订单应计入税务报表');
    }
    
    // 检查是否有退款相关字段
    console.log('\n📊 退款相关字段:');
    console.log('='.repeat(80));
    console.log(`refundDate: ${sale.refundDate || 'N/A'}`);
    console.log(`refundReason: ${sale.refundReason || 'N/A'}`);
    console.log(`refundAmount: ${sale.refundAmount ? '€' + sale.refundAmount.toFixed(2) : 'N/A'}`);
    
    // 显示完整的sale对象（用于调试）
    console.log('\n🔧 完整订单对象 (JSON):');
    console.log('='.repeat(80));
    console.log(JSON.stringify(sale, null, 2));
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkSale();
