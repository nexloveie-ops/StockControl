const fetch = require('node-fetch');

async function testAPI() {
  try {
    const response = await fetch('http://localhost:8080/api/admin/purchase-orders/admin-SI-3688');
    const data = await response.json();
    
    console.log('API返回的items数量:', data.data.items.length);
    console.log('\n前3个产品的condition字段:\n');
    
    data.data.items.slice(0, 3).forEach((item, i) => {
      console.log(`产品 ${i + 1}:`);
      console.log(`  名称: ${item.productName}`);
      console.log(`  描述: ${item.description}`);
      console.log(`  成色: ${item.condition || '(空字符串或undefined)'}`);
      console.log(`  来源: ${item.source}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('错误:', error.message);
  }
}

testAPI();
