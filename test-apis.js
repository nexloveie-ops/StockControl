const fetch = require('node-fetch');

async function testAPIs() {
  const baseUrl = 'http://localhost:8080';
  
  console.log('🧪 测试API端点...\n');
  
  try {
    // 测试税率API
    console.log('1️⃣ 测试 /api/vat-rates');
    const vatResponse = await fetch(`${baseUrl}/api/vat-rates`);
    const vatData = await vatResponse.json();
    console.log('   状态:', vatResponse.status);
    console.log('   数据:', JSON.stringify(vatData, null, 2));
    console.log('');
    
    // 测试分类API
    console.log('2️⃣ 测试 /api/categories');
    const catResponse = await fetch(`${baseUrl}/api/categories`);
    const catData = await catResponse.json();
    console.log('   状态:', catResponse.status);
    console.log('   数据:', JSON.stringify(catData, null, 2));
    console.log('');
    
    // 测试成色API
    console.log('3️⃣ 测试 /api/merchant/conditions');
    const condResponse = await fetch(`${baseUrl}/api/merchant/conditions`);
    const condData = await condResponse.json();
    console.log('   状态:', condResponse.status);
    console.log('   数据:', JSON.stringify(condData, null, 2));
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testAPIs();
