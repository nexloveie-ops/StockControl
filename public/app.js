console.log('JavaScript文件加载成功');

// 显示结果函数
function showResult(elementId, message, isSuccess = true) {
    console.log('显示结果:', message);
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = message;
        element.className = `result ${isSuccess ? 'success' : 'error'}`;
    }
}

// 测试API连接
async function testAPI() {
    console.log('测试API连接...');
    try {
        const response = await fetch('/health');
        const data = await response.json();
        console.log('API响应:', data);
        showResult('apiResult', `API连接成功: ${data.status}`);
    } catch (error) {
        console.error('API测试失败:', error);
        showResult('apiResult', `API连接失败: ${error.message}`, false);
    }
}

// 用户注册
async function register() {
    console.log('开始注册...');
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;

    if (!username || !email || !password) {
        showResult('registerResult', '请填写所有必填字段', false);
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, role })
        });

        const data = await response.json();
        console.log('注册响应:', data);

        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            showResult('registerResult', `注册成功！\n用户: ${data.user.username}\n角色: ${data.user.role}`);
        } else {
            showResult('registerResult', `注册失败: ${data.error}`, false);
        }
    } catch (error) {
        console.error('注册请求失败:', error);
        showResult('registerResult', `请求失败: ${error.message}`, false);
    }
}

// 用户登录
async function login() {
    console.log('开始登录...');
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showResult('loginResult', '请填写用户名和密码', false);
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        console.log('登录响应:', data);

        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            showResult('loginResult', `登录成功！\n用户: ${data.user.username}\n角色: ${data.user.role}`);
        } else {
            showResult('loginResult', `登录失败: ${data.error}`, false);
        }
    } catch (error) {
        console.error('登录请求失败:', error);
        showResult('loginResult', `请求失败: ${error.message}`, false);
    }
}

// 获取用户信息
async function getUserInfo() {
    console.log('获取用户信息...');
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        showResult('userInfoResult', '请先登录', false);
        return;
    }

    try {
        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        console.log('用户信息响应:', data);

        if (response.ok) {
            showResult('userInfoResult', 
                `用户信息:\n` +
                `ID: ${data._id}\n` +
                `用户名: ${data.username}\n` +
                `邮箱: ${data.email}\n` +
                `角色: ${data.role}\n` +
                `状态: ${data.isActive ? '活跃' : '禁用'}\n` +
                `创建时间: ${new Date(data.createdAt).toLocaleString()}`
            );
        } else {
            showResult('userInfoResult', `获取失败: ${data.error}`, false);
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
        showResult('userInfoResult', `请求失败: ${error.message}`, false);
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('authToken');
    showResult('userInfoResult', '已退出登录');
}

// 健康检查
async function testHealth() {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        showResult('apiResult', `健康检查: ${data.status}\n时间: ${new Date(data.timestamp).toLocaleString()}`);
    } catch (error) {
        showResult('apiResult', `健康检查失败: ${error.message}`, false);
    }
}

// 数据库测试
async function testDatabase() {
    try {
        const response = await fetch('/api/test-db');
        const data = await response.json();
        showResult('apiResult', `数据库测试: ${data.message}\n用户数量: ${data.userCount}\n时间: ${new Date(data.timestamp).toLocaleString()}`);
    } catch (error) {
        showResult('apiResult', `数据库测试失败: ${error.message}`, false);
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面DOM加载完成');
    
    // 自动测试API连接
    testHealth();
    
    // 检查是否有保存的token
    const token = localStorage.getItem('authToken');
    if (token) {
        console.log('发现保存的token，自动获取用户信息');
        getUserInfo();
    }
});