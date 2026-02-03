/**
 * 测试登录API
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testLogin(username, password) {
  console.log(`\n🧪 测试登录: ${username}`);
  console.log('='.repeat(50));
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 登录成功');
      console.log(`   用户名: ${result.data.user.username}`);
      console.log(`   邮箱: ${result.data.user.email}`);
      console.log(`   角色: ${result.data.user.role}`);
      console.log(`   状态: ${result.data.user.isActive ? '活跃' : '停用'}`);
      console.log(`   消息: ${result.data.message}`);
    } else {
      console.log('❌ 登录失败');
      console.log(`   错误: ${result.error}`);
    }
  } catch (error) {
    console.log('❌ 请求失败');
    console.log(`   错误: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 开始测试登录API...\n');
  
  // 测试管理员账号
  await testLogin('admin', 'admin');
  
  // 测试仓库管理员账号
  await testLogin('warehouse', 'warehouse');
  
  // 测试错误密码
  await testLogin('admin', 'wrongpassword');
  
  // 测试不存在的用户
  await testLogin('nonexistent', 'password');
  
  console.log('\n✅ 测试完成！\n');
}

main();
