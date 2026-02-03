const fetch = require('node-fetch');

async function testAPI() {
  try {
    // 获取 galaxy A53 的产品 ID
    const productId = '6980f67355482b816e958929';
    
    console.log(`测试 API: GET /api/warehouse/products/${productId}/available\n`);
    
    const response = await fetch(`http://localhost:3000/api/warehouse/products/${productId}/available`);
    const result = await response.json();
    
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(result, null, 2));
    
    if (result.success && result.data) {
      console.log(`\n找到 ${result.data.length} 个可用设备:`);
      result.data.forEach((device, index) => {
        console.log(`\n${index + 1}. ${device.name}`);
        console.log(`   ID: ${device._id}`);
        console.log(`   SN: ${device.serialNumber}`);
        console.log(`   IMEI: ${device.imei || '无'}`);
        console.log(`   颜色: ${device.color}`);
        console.log(`   成色: ${device.condition}`);
      });
    }
    
  } catch (error) {
    console.error('错误:', error);
  }
}

testAPI();
