// 测试 iPhone 8 采购历史API
const axios = require('axios');

async function testIPhone8API() {
  try {
    const productId = '69952a28916340abda45c925'; // iPhone 8 的 ProductNew ID
    
    console.log('🔍 测试 iPhone 8 采购历史API\n');
    console.log(`产品ID: ${productId}\n`);
    
    const response = await axios.get(
      `http://localhost:8080/api/admin/products/${productId}/purchase-invoices`
    );
    
    console.log('✅ API响应成功');
    console.log('发票数量:', response.data.count);
    console.log('\n发票详情:');
    console.log(JSON.stringify(response.data.data, null, 2));
    
  } catch (error) {
    console.error('❌ API调用失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testIPhone8API();
