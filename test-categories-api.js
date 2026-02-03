const fetch = require('node-fetch');

async function testAPIs() {
  console.log('🧪 测试分类和成色 API\n');

  try {
    // 测试分类 API
    console.log('1️⃣ 测试 /api/admin/categories');
    console.log('='.repeat(60));
    const categoriesResponse = await fetch('http://localhost:3000/api/admin/categories');
    console.log(`状态码: ${categoriesResponse.status}`);
    
    if (categoriesResponse.ok) {
      const categoriesData = await categoriesResponse.json();
      console.log(`✅ 成功获取数据`);
      console.log(`数据结构:`, JSON.stringify(categoriesData, null, 2));
    } else {
      console.log(`❌ 请求失败: ${categoriesResponse.statusText}`);
    }

    console.log('\n');

    // 测试成色 API
    console.log('2️⃣ 测试 /api/admin/conditions');
    console.log('='.repeat(60));
    const conditionsResponse = await fetch('http://localhost:3000/api/admin/conditions');
    console.log(`状态码: ${conditionsResponse.status}`);
    
    if (conditionsResponse.ok) {
      const conditionsData = await conditionsResponse.json();
      console.log(`✅ 成功获取数据`);
      console.log(`数据结构:`, JSON.stringify(conditionsData, null, 2));
    } else {
      console.log(`❌ 请求失败: ${conditionsResponse.statusText}`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testAPIs();
