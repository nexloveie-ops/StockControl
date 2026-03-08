const mongoose = require('mongoose');
require('dotenv').config();

async function fixPartialRefundOrder() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    const orderId = '69acc63293780121974812e5';
    
    // 查询订单
    const order = await MerchantSale.findById(orderId);
    
    if (!order) {
      console.log('❌ 订单不存在');
      return;
    }
    
    console.log('📦 订单当前状态:');
    console.log(`订单ID: ${order._id}`);
    console.log(`订单状态: ${order.status}`);
    console.log(`总金额: €${order.totalAmount}`);
    console.log(`退款金额: €${order.refundAmount || 0}`);
    console.log(`产品数量: ${order.items.length}`);
    console.log(`退款项目数量: ${order.refundItems ? order.refundItems.length : 0}`);
    
    // 判断是否为部分退款
    const isPartialRefund = order.refundAmount < order.totalAmount;
    
    console.log('\n📊 分析:');
    if (isPartialRefund) {
      console.log(`✅ 这是部分退款 (€${order.refundAmount} < €${order.totalAmount})`);
      console.log(`   应该将订单状态从 "refunded" 改为 "completed"`);
      
      // 修复订单状态
      order.status = 'completed';
      await order.save();
      
      console.log('\n✅ 订单状态已修复为 "completed"');
      console.log('   现在未退款的产品应该会显示在本日明细中');
    } else {
      console.log(`⚠️  这是全部退款 (€${order.refundAmount} = €${order.totalAmount})`);
      console.log(`   订单状态 "refunded" 是正确的`);
    }
    
    // 验证修复
    console.log('\n🔍 验证修复结果:');
    const updatedOrder = await MerchantSale.findById(orderId);
    console.log(`订单状态: ${updatedOrder.status}`);
    
    // 测试查询
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaySales = await MerchantSale.find({
      merchantId: order.merchantId,
      saleDate: { $gte: today, $lt: tomorrow },
      status: 'completed'
    });
    
    const foundOrder = todaySales.find(sale => sale._id.toString() === orderId);
    if (foundOrder) {
      console.log(`✅ 订单现在会显示在本日销售明细中`);
      console.log(`   产品列表:`);
      foundOrder.items.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.productName} - €${item.price * item.quantity}`);
      });
    } else {
      console.log(`❌ 订单仍然不在本日销售明细中`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

fixPartialRefundOrder();
