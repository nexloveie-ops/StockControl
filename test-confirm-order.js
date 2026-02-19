// 测试确认订单
const axios = require('axios');

async function testConfirmOrder() {
  try {
    const orderId = '699529067be3749f907a52c2'; // 从查询结果中获取的订单ID
    
    console.log('🔍 测试确认订单:', orderId);
    
    // 直接确认订单
    console.log('\n📤 发送确认请求...');
    const confirmResponse = await axios.put(
      `http://localhost:8080/api/warehouse/orders/${orderId}/confirm`,
      { confirmedBy: 'warehouse1' }
    );
    
    console.log('✅ 确认成功:', confirmResponse.data);
    
  } catch (error) {
    console.error('❌ 测试失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testConfirmOrder();
