const axios = require('axios');

async function testAPI() {
  try {
    const productId = '6995f49584800e3267664877'; // iPhone 13 的 productId
    
    console.log(`🔍 测试 API: /api/warehouse/products/${productId}/available\n`);
    
    const response = await axios.get(`http://localhost:8080/api/warehouse/products/${productId}/available`);
    
    console.log('📦 API 响应:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data.length > 0) {
      console.log('\n✅ 返回的产品:');
      response.data.data.forEach((product, index) => {
        console.log(`\n   产品 ${index + 1}:`);
        console.log(`     _id: ${product._id}`);
        console.log(`     name: ${product.name}`);
        console.log(`     model: ${product.model}`);
        console.log(`     color: ${product.color}`);
        console.log(`     serialNumber: ${product.serialNumber || 'N/A'}`);
        console.log(`     imei: ${product.imei || 'N/A'}`);
        console.log(`     quantity: ${product.quantity}`);
        console.log(`     source: ${product.source}`);
        
        // 检查前端判断逻辑
        const hasImeiOrSerial = product.imei || product.serialNumber;
        console.log(`     前端判断为设备: ${hasImeiOrSerial ? 'YES' : 'NO'}`);
      });
      
      // 模拟前端判断
      console.log('\n🔧 模拟前端判断:');
      const isDevice = response.data.data.some(p => p.imei || p.serialNumber);
      console.log(`   isDevice = ${isDevice}`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

testAPI();
