// 检查待确认订单
const axios = require('axios');

async function checkPendingOrders() {
  try {
    console.log('🔍 查询待确认订单...\n');
    
    const response = await axios.get('http://localhost:8080/api/warehouse/orders', {
      params: { status: 'pending' }
    });
    
    const orders = response.data.data;
    console.log(`📋 找到 ${orders.length} 个待确认订单:\n`);
    
    orders.forEach((order, idx) => {
      console.log(`${idx + 1}. 订单号: ${order.orderNumber}`);
      console.log(`   订单ID: ${order._id}`);
      console.log(`   商户: ${order.merchantName}`);
      console.log(`   总金额: €${order.totalAmount}`);
      console.log(`   产品数量: ${order.items.length}`);
      console.log(`   状态: ${order.status}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 查询失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

checkPendingOrders();
