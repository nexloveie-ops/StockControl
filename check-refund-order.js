const mongoose = require('mongoose');
require('dotenv').config();

async function checkRefundOrder() {
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
    
    console.log('📦 订单信息:');
    console.log(`订单ID: ${order._id}`);
    console.log(`商户ID: ${order.merchantId}`);
    console.log(`销售日期: ${order.saleDate}`);
    console.log(`订单状态: ${order.status}`);
    console.log(`总金额: €${order.totalAmount}`);
    console.log(`退款金额: €${order.refundAmount || 0}`);
    console.log(`\n产品列表 (${order.items.length}):`);
    
    order.items.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.productName}`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   价格: €${item.price}`);
      console.log(`   总价: €${item.price * item.quantity}`);
      console.log(`   税分类: ${item.taxClassification}`);
      console.log(`   库存ID: ${item.inventoryId || 'N/A'}`);
      console.log(`   维修订单ID: ${item.repairOrderId || 'N/A'}`);
      console.log(`   快速销售: ${item.isQuickSale || false}`);
      if (item.isQuickSale) {
        console.log(`   快速销售类别: ${item.quickSaleCategory || 'N/A'}`);
      }
    });
    
    if (order.refundItems && order.refundItems.length > 0) {
      console.log(`\n\n🔄 退款项目 (${order.refundItems.length}):`);
      order.refundItems.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.productName || 'N/A'}`);
        console.log(`   退款数量: ${item.quantity || 'N/A'}`);
        console.log(`   退款金额: €${item.refundAmount || 'N/A'}`);
      });
    }
    
    console.log('\n\n📊 分析:');
    console.log(`订单状态: ${order.status}`);
    
    if (order.status === 'refunded') {
      console.log('⚠️  问题: 订单状态为 "refunded"，表示整个订单被退款');
      console.log('   这会导致所有产品都从本日明细中消失');
      console.log('   应该: 部分退款时，订单状态应该保持 "completed"');
    } else if (order.status === 'completed') {
      console.log('✅ 订单状态正确: "completed"');
    }
    
    // 检查本日销售查询逻辑
    console.log('\n\n🔍 测试本日销售查询:');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaySales = await MerchantSale.find({
      merchantId: order.merchantId,
      saleDate: { $gte: today, $lt: tomorrow },
      status: 'completed'  // 只查询completed状态
    });
    
    console.log(`查询条件: status = 'completed'`);
    console.log(`找到 ${todaySales.length} 条记录`);
    
    const foundOrder = todaySales.find(sale => sale._id.toString() === orderId);
    if (foundOrder) {
      console.log(`✅ 订单 ${orderId} 在查询结果中`);
    } else {
      console.log(`❌ 订单 ${orderId} 不在查询结果中`);
      console.log(`   原因: 订单状态为 "${order.status}"，但查询条件要求 "completed"`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkRefundOrder();
