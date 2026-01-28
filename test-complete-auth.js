// 完整的用户认证功能测试
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAuthFlow() {
  console.log('🚀 开始测试用户认证功能...\n');

  try {
    // 1. 测试用户注册
    console.log('1️⃣ 测试用户注册...');
    const registerData = {
      username: 'testuser',
      email: 'testuser@example.com',
      password: '123456',
      role: 'manager'
    };

    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, registerData);
    console.log('✅ 注册成功:', {
      message: registerResponse.data.message,
      user: registerResponse.data.user
    });
    const token = registerResponse.data.token;

    // 2. 测试用户登录
    console.log('\n2️⃣ 测试用户登录...');
    const loginData = {
      username: 'testuser',
      password: '123456'
    };

    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
    console.log('✅ 登录成功:', {
      message: loginResponse.data.message,
      user: loginResponse.data.user
    });

    // 3. 测试获取用户信息
    console.log('\n3️⃣ 测试获取用户信息...');
    const meResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 获取用户信息成功:', {
      username: meResponse.data.username,
      email: meResponse.data.email,
      role: meResponse.data.role
    });

    // 4. 测试无效token
    console.log('\n4️⃣ 测试无效token...');
    try {
      await axios.get(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: 'Bearer invalid-token' }
      });
    } catch (error) {
      console.log('✅ 无效token正确被拒绝:', error.response.data.error);
    }

    // 5. 测试重复注册
    console.log('\n5️⃣ 测试重复注册...');
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, registerData);
    } catch (error) {
      console.log('✅ 重复注册正确被拒绝:', error.response.data.error);
    }

    // 6. 测试错误密码登录
    console.log('\n6️⃣ 测试错误密码登录...');
    try {
      await axios.post(`${BASE_URL}/api/auth/login`, {
        username: 'testuser',
        password: 'wrongpassword'
      });
    } catch (error) {
      console.log('✅ 错误密码正确被拒绝:', error.response.data.error);
    }

    console.log('\n🎉 所有认证功能测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 检查服务器是否运行
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ 服务器运行正常\n');
    return true;
  } catch (error) {
    console.error('❌ 服务器未运行，请先启动: npm start');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testAuthFlow();
  }
}

main();