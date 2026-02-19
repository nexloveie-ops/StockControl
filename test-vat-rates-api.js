// 测试税率API
const axios = require('axios');

async function testVatRatesAPI() {
  try {
    console.log('🔍 测试税率API\n');
    
    const response = await axios.get('http://localhost:8080/api/vat-rates');
    
    console.log('✅ API响应成功');
    console.log('状态码:', response.status);
    console.log('数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data.data && response.data.data.length > 0) {
      console.log(`\n✅ 找到 ${response.data.data.length} 个税率:`);
      response.data.data.forEach((rate, idx) => {
        console.log(`  ${idx + 1}. ${rate.name} (${rate.code})`);
      });
    } else {
      console.log('\n⚠️  税率数据为空');
    }
    
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

testVatRatesAPI();
