# 📋 merchant.html 页面状态说明

## 当前状态

merchant.html 页面已恢复到原始版本。

---

## ⚠️ 已知问题

### 问题1: API端点不存在

merchant.html 页面调用的以下API端点在后端不存在：

1. `/api/merchant/inventory` - 商户库存
2. `/api/merchant/sales` - 销售记录
3. `/api/merchant/repairs` - 维修记录
4. `/api/merchant/stats` - 统计数据
5. `/api/merchant/tax-report` - 税务报表

### 问题2: 错误信息

由于API不存在，页面会显示：
```
加载失败: Unexpected token '<'
```

这是因为服务器返回404 HTML页面，而JavaScript尝试将其解析为JSON。

---

## 🎯 建议方案

### 方案1: 使用现有页面（推荐）

普通用户（retail_user）可以使用以下页面：

#### 仓库管理员页面
- **URL**: http://localhost:3000/prototype-working.html
- **功能**: 完整的库存管理、入库、销售功能
- **优点**: 功能完整，API已实现
- **缺点**: 界面是为仓管员设计的

#### 修改auth-guard.js
将普通用户的主页改为prototype-working.html：

```javascript
// 在 auth-guard.js 中
const ROLE_HOME_PAGES = {
  [USER_ROLES.ADMIN]: '/admin.html',
  [USER_ROLES.WAREHOUSE_MANAGER]: '/prototype-working.html',
  [USER_ROLES.WAREHOUSE_STAFF]: '/prototype-working.html',
  [USER_ROLES.RETAIL_USER]: '/prototype-working.html',  // 改为这个
  [USER_ROLES.MERCHANT]: '/prototype-working.html'       // 改为这个
};
```

---

### 方案2: 简化merchant.html（需要开发）

创建一个简化版的merchant页面，只包含必要功能：

#### 需要实现的功能
1. **查看库存** - 复用现有的 `/api/products` API
2. **销售产品** - 复用现有的 `/api/sales/*` API
3. **查看销售记录** - 需要新的API或复用现有的

#### 需要的工作量
- 后端: 2-3小时（创建或适配API）
- 前端: 3-4小时（修改merchant.html）
- 测试: 1-2小时

---

### 方案3: 完整开发merchant功能（不推荐）

实现merchant.html的所有功能：
- 销售业务
- 维修业务
- 库存管理
- 仓库订货
- 税务报表

**工作量**: 20-30小时
**优先级**: 低（功能与现有系统重叠）

---

## 🔧 临时解决方案

### 立即可用的方法

#### 1. 修改登录后跳转

修改 `public/auth-guard.js`：

```javascript
const ROLE_HOME_PAGES = {
  [USER_ROLES.ADMIN]: '/admin.html',
  [USER_ROLES.WAREHOUSE_MANAGER]: '/prototype-working.html',
  [USER_ROLES.WAREHOUSE_STAFF]: '/prototype-working.html',
  [USER_ROLES.RETAIL_USER]: '/prototype-working.html',  // ← 修改这里
  [USER_ROLES.MERCHANT]: '/prototype-working.html'       // ← 修改这里
};
```

#### 2. 添加页面权限

修改 `public/auth-guard.js`：

```javascript
const PAGE_ROLES = {
  // ... 其他页面
  '/prototype-working.html': [
    USER_ROLES.WAREHOUSE_STAFF, 
    USER_ROLES.WAREHOUSE_MANAGER, 
    USER_ROLES.RETAIL_USER,  // ← 添加这个
    USER_ROLES.ADMIN
  ],
  // ...
};
```

这样普通用户登录后会直接跳转到功能完整的prototype-working.html页面。

---

## 📊 页面功能对比

| 功能 | merchant.html | prototype-working.html |
|------|---------------|------------------------|
| 查看库存 | ❌ API不存在 | ✅ 完整实现 |
| 销售产品 | ❌ API不存在 | ✅ 完整实现 |
| 入库管理 | ❌ 无此功能 | ✅ 完整实现 |
| 供应商管理 | ❌ 无此功能 | ✅ 完整实现 |
| 客户管理 | ❌ 无此功能 | ✅ 完整实现 |
| 维修业务 | ❌ API不存在 | ❌ 无此功能 |
| 税务报表 | ❌ API不存在 | ❌ 无此功能 |

---

## ✅ 推荐操作

### 立即执行（5分钟）

1. **修改auth-guard.js**
   - 将retail_user的主页改为 `/prototype-working.html`
   - 添加retail_user对prototype-working.html的访问权限

2. **测试**
   - 使用普通用户登录
   - 验证跳转到prototype-working.html
   - 验证功能可用

### 代码修改

```javascript
// 文件: public/auth-guard.js

// 1. 修改角色主页映射
const ROLE_HOME_PAGES = {
  [USER_ROLES.ADMIN]: '/admin.html',
  [USER_ROLES.WAREHOUSE_MANAGER]: '/prototype-working.html',
  [USER_ROLES.WAREHOUSE_STAFF]: '/prototype-working.html',
  [USER_ROLES.RETAIL_USER]: '/prototype-working.html',  // 修改
  [USER_ROLES.MERCHANT]: '/prototype-working.html'       // 修改
};

// 2. 修改页面权限
const PAGE_ROLES = {
  '/prototype.html': [USER_ROLES.WAREHOUSE_STAFF, USER_ROLES.WAREHOUSE_MANAGER, USER_ROLES.ADMIN],
  '/prototype-working.html': [
    USER_ROLES.WAREHOUSE_STAFF, 
    USER_ROLES.WAREHOUSE_MANAGER, 
    USER_ROLES.RETAIL_USER,  // 添加
    USER_ROLES.MERCHANT,     // 添加
    USER_ROLES.ADMIN
  ],
  // ... 其他页面
};
```

---

## 🎯 未来计划

### 如果需要merchant专用页面

可以考虑：
1. 复制prototype-working.html为merchant-simple.html
2. 移除不需要的功能（入库、供应商管理等）
3. 保留核心功能（库存查看、销售）
4. 简化界面，更适合商户使用

### 工作量估算
- 复制和简化: 2-3小时
- 测试: 1小时
- 总计: 3-4小时

---

## 📝 总结

**当前状态**: merchant.html页面的API不存在，无法正常使用

**推荐方案**: 让普通用户使用prototype-working.html页面

**实施步骤**:
1. 修改auth-guard.js（2处修改）
2. 测试登录和功能
3. 完成

**时间**: 5分钟

---

**更新时间**: 2026-02-03
**版本**: 1.0
**状态**: ✅ 已恢复原始版本，建议使用prototype-working.html
