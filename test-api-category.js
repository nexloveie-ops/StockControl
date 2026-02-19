const axios = require('axios');

async function testAPI() {
  try {
    console.log('🔍 测试API返回的category字段\n');
    
    const response = await axios.get('http://localhost:8080/api/merchant/warehouse-products');
    
    if (!response.data.success) {
      console.error('❌ API调用失败');
      return;
    }
    
    console.log(`总产品组数: ${response.data.data.length}\n`);
    
    response.data.data.forEach((group, index) => {
      console.log(`产品组 ${index + 1}:`);
      console.log(`  category: "${group.category}"`);
      console.log(`  productType: "${group.productType}"`);
      console.log(`  brand: "${group.brand}"`);
      console.log(`  totalAvailable: ${group.totalAvailable}`);
      console.log(`  子产品数: ${group.products.length}`);
      if (group.products.length > 0) {
        console.log(`  第一个子产品名称: "${group.products[0].name}"`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

testAPI();
