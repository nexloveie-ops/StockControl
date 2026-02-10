/**
 * 删除有问题的订单 WO-20260210-3898
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function deleteOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    // 查找订单
    const order = await WarehouseOrder.findOne({
      orderNumber: 'WO-20260210-3898'
    });
    
    if (!order) {
      console.log('❌ 未找到订单 WO-20260210-3898');
      return;
    }
    
    console.log('=== 订单信息 ===');
    console.log(`订单号: ${order.orderNumber}`);
    console.log(`状态: ${order.status}`);
    console.log(`商户: ${order.merchantId}`);
    console.log(`商品数: ${order.items.length}`);
    console.log(`总金额: €${order.totalAmount}`);
    console.log('');
    
    // 确认删除
    console.log('⚠️  准备删除此订单...');
    console.log('原因: 订单中的 productId 在数据库中不存在，无法确认订单');
    console.log('');
    
    await order.deleteOne();
    
    console.log('✅ 订单已删除');
    console.log('');
    console.log('📝 下一步:');
    console.log('1. 刷新仓库管理页面');
    console.log('2. 重新创建订单，确保选择正确的产品');
    console.log('3. 新订单应该可以正常确认');
    
  } catch (error) {
    console.error('❌ 删除失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

deleteOrder();
