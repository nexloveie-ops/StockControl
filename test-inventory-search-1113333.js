/**
 * 测试库存搜索 API - 搜索序列号 1113333
 */

const axios = require('axios');

async function testInventorySearch() {
  try {
    const baseURL = 'http://localhost:3000';
    
    // 1. 登录获取 token
    console.log('=== 步骤 1: 登录 ===');
    const loginResponse = await axios.post(`${baseURL}/api/login`, {
      username: 'murrayranelagh',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ 登录成功');
    console.log('');
    
    // 2. 搜索序列号 1113333
    console.log('=== 步骤 2: 搜索序列号 1113333 ===');
    const searchResponse = await axios.get(`${baseURL}/api/merchant/inventory`, {
      params: {
        search: '1113333'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`返回记录数: ${searchResponse.data.data.length}`);
    console.log('');
    
    if (searchResponse.data.data.length === 0) {
      console.log('❌ 没有找到序列号 1113333');
      return;
    }
    
    // 显示找到的记录
    searchResponse.data.data.forEach((item, index) => {
      console.log(`=== 记录 ${index + 1} ===`);
      console.log(`产品名称: ${item.productName}`);
      console.log(`序列号: ${item.serialNumber}`);
      console.log(`成色: ${item.condition}`);
      console.log(`分类: ${item.category}`);
      console.log(`数量: ${item.quantity}`);
      console.log(`状态: ${item.status}`);
      console.log(`商户: ${item.merchantName}`);
      console.log('');
    });
    
    console.log('✅ 搜索成功');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testInventorySearch();
