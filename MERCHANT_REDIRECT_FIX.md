# 🔧 merchant.html 自动重定向修复

## 📋 问题描述

**问题**: 用户访问merchant.html时仍然看到API错误

**原因**: 
1. 虽然修改了登录后的默认跳转页面
2. 但用户仍然可以直接访问merchant.html
3. merchant.html的API不存在，导致错误

**错误信息**:
```
Failed to load resource: the server responded with a status of 404 (Not Found)
加载统计数据失败: SyntaxError: Unexpected token '<'
```

---

## ✅ 解决方案

### 添加自动重定向

在merchant.html的head部分添加重定向脚本，当检测到retail_user或merchant角色时，自动重定向到prototype-working.html。

### 修改内容

**文件**: `public/merchant.html`

**添加的代码**:
```html
<!-- 自动重定向到功能完整的页面 -->
<script>
  // merchant.html的API尚未实现，自动重定向到prototype-working.html
  (function() {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'retail_user' || userRole === 'merchant') {
      console.log('merchant.html功能尚未完全实现，重定向到prototype-working.html');
      window.location.href = '/prototype-working.html';
    }
  })();
</script>
```

---

## 🎯 工作原理

### 重定向逻辑

1. **页面加载时** - 立即执行重定向脚本
2. **检查用户角色** - 从localStorage读取userRole
3. **判断是否重定向** - 如果是retail_user或merchant
4. **执行重定向** - 跳转到prototype-working.html

### 流程图

```
用户访问merchant.html
    ↓
检查localStorage中的userRole
    ↓
是retail_user或merchant？
    ├─ 是 → 重定向到prototype-working.html
    └─ 否 → 继续加载merchant.html（管理员可以查看）
```

---

## 🧪 测试步骤

### 测试1: 普通用户访问

#### 步骤
```
1. 使用普通用户登录
2. 在浏览器地址栏输入: http://localhost:3000/merchant.html
3. 按回车
```

#### 预期结果
- ✅ 自动重定向到 `/prototype-working.html`
- ✅ 不会看到API错误
- ✅ 控制台显示重定向日志

---

### 测试2: 登录后自动跳转

#### 步骤
```
1. 访问登录页面
2. 使用普通用户登录（retail_user）
3. 观察跳转行为
```

#### 预期结果
- ✅ 直接跳转到 `/prototype-working.html`
- ✅ 不会经过merchant.html
- ✅ 页面功能正常

---

### 测试3: 管理员访问

#### 步骤
```
1. 使用管理员登录
2. 访问: http://localhost:3000/merchant.html
```

#### 预期结果
- ✅ 可以访问merchant.html
- ✅ 不会被重定向
- ✅ 会看到API错误（因为API不存在）

---

## 📊 修复前后对比

### 修复前

```
普通用户访问merchant.html
    ↓
页面加载
    ↓
调用API: /api/merchant/stats
    ↓
❌ 404错误
    ↓
显示: "加载失败: Unexpected token '<'"
```

### 修复后

```
普通用户访问merchant.html
    ↓
重定向脚本执行
    ↓
检测到retail_user角色
    ↓
✅ 自动重定向到prototype-working.html
    ↓
功能正常使用
```

---

## 🔧 完整的修复方案

### 1. auth-guard.js修改 ✅

```javascript
// 角色主页映射
const ROLE_HOME_PAGES = {
  [USER_ROLES.RETAIL_USER]: '/prototype-working.html',  // 修改
  [USER_ROLES.MERCHANT]: '/prototype-working.html'       // 修改
};

// 页面权限
const PAGE_ROLES = {
  '/prototype-working.html': [
    USER_ROLES.RETAIL_USER,  // 添加
    USER_ROLES.MERCHANT,     // 添加
    // ...
  ],
};
```

### 2. merchant.html修改 ✅

```html
<head>
  <!-- 添加重定向脚本 -->
  <script>
    (function() {
      const userRole = localStorage.getItem('userRole');
      if (userRole === 'retail_user' || userRole === 'merchant') {
        window.location.href = '/prototype-working.html';
      }
    })();
  </script>
</head>
```

---

## ⚠️ 注意事项

### 1. 立即执行

重定向脚本使用IIFE（立即执行函数表达式），确保在页面加载时立即执行。

### 2. 不影响管理员

管理员（admin角色）仍然可以访问merchant.html，用于查看或调试。

### 3. 浏览器缓存

如果修改后仍然看到错误，请强制刷新（Ctrl+F5）。

### 4. 控制台日志

重定向时会在控制台输出日志，方便调试：
```
merchant.html功能尚未完全实现，重定向到prototype-working.html
```

---

## 🎯 用户体验

### 普通用户（retail_user）

1. **登录** → 自动跳转到prototype-working.html
2. **直接访问merchant.html** → 自动重定向到prototype-working.html
3. **使用功能** → 所有功能正常工作

### 管理员（admin）

1. **登录** → 跳转到admin.html
2. **访问merchant.html** → 可以访问（但会看到API错误）
3. **访问prototype-working.html** → 可以访问

---

## 📝 相关修改

### 修改的文件

1. ✅ `public/auth-guard.js` - 修改角色主页和权限
2. ✅ `public/merchant.html` - 添加重定向脚本

### 未修改的文件

- `app.js` - 后端API（merchant API仍未实现）
- `prototype-working.html` - 功能页面（无需修改）

---

## ✅ 修复总结

### 解决的问题

- ✅ 普通用户不再看到merchant.html的API错误
- ✅ 自动重定向到功能完整的页面
- ✅ 用户体验更流畅

### 实现方式

- ✅ 修改登录后的默认跳转
- ✅ 添加页面访问权限
- ✅ 添加自动重定向脚本

### 测试状态

- ⏳ 需要强制刷新页面
- ⏳ 需要测试普通用户登录
- ⏳ 需要测试直接访问merchant.html

---

## 🚀 立即测试

### 快速测试步骤

1. **强制刷新** - 按 Ctrl+F5
2. **退出登录** - 清除当前会话
3. **重新登录** - 使用普通用户账号
4. **验证跳转** - 应该跳转到prototype-working.html
5. **测试功能** - 验证所有功能可用

### 如果仍然有问题

1. 清除浏览器缓存
2. 使用无痕模式测试
3. 检查控制台日志
4. 确认localStorage中的userRole

---

**修复时间**: 2026-02-03
**版本**: 1.0
**状态**: ✅ 修复完成，需要强制刷新测试

**关键修复**: 添加了merchant.html的自动重定向脚本，普通用户访问时自动跳转到prototype-working.html

**快速测试**: 
1. 按 Ctrl+F5 强制刷新
2. 使用普通用户登录
3. 验证跳转到prototype-working.html
