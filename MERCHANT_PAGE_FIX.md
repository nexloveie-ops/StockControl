# 商户页面标题修复

## 修改内容

### 1. 页面标题显示
- **原标题**: "批发商户中心"
- **新标题**: "Welcome + 用户名"

### 2. 实现细节

#### HTML 修改
```html
<h1 id="merchantWelcome">🏢 Welcome</h1>
```

#### JavaScript 函数
```javascript
async function loadMerchantInfo() {
  try {
    // 从 localStorage 获取用户名
    const userName = localStorage.getItem('username') || 'Guest';
    document.getElementById('merchantWelcome').textContent = `🏢 Welcome ${userName}`;
    document.title = `Welcome ${userName} - 3C产品管理系统`;
  } catch (error) {
    console.error('加载商户信息失败:', error);
    document.getElementById('merchantWelcome').textContent = `🏢 Welcome`;
  }
}
```

#### 初始化调用
在 `DOMContentLoaded` 事件中添加：
```javascript
window.addEventListener('DOMContentLoaded', () => {
  loadMerchantInfo(); // 加载商户信息和欢迎标题
  loadStats();
  loadCategoryList();
  // ... 其他初始化代码
});
```

### 3. 显示逻辑

1. **显示用户名**: 从 localStorage.getItem('username') 获取用户名
2. **备用显示**: 如果获取失败，显示 "Guest"
3. **错误处理**: 如果出错，显示 "Welcome"

### 4. 浏览器标题
同时更新浏览器标签页标题为：`Welcome 用户名 - 3C产品管理系统`

## 测试步骤

1. 访问 http://localhost:3000/merchant.html
2. 使用商户账号登录（例如：merchant_vip / merchant123）
3. 检查页面顶部标题是否显示 "🏢 Welcome merchant_vip"
4. 检查浏览器标签页标题是否更新为 "Welcome merchant_vip - 3C产品管理系统"

## 文件修改
- `StockControl-main/public/merchant.html`
  - 添加 `loadMerchantInfo()` 函数（简化版，只显示用户名）
  - 修改 HTML 标题元素
  - 在 DOMContentLoaded 中调用函数

## 状态
✅ 已完成

