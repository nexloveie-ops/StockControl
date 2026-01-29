# 权限控制系统说明

## 概述

系统已实现基于角色的权限控制（RBAC），防止用户在不同角色页面之间随意跳转。

## 用户角色

### 1. 仓库管理员 (warehouse_staff)
**测试账号**: `warehouse1` / `warehouse123`

**可访问页面**:
- ✅ `/prototype.html` - 仓库管理主页
- ✅ `/inventory.html` - 库存管理
- ✅ `/receiving.html` - 入库管理
- ✅ `/product-management.html` - 产品管理
- ✅ `/sales.html` - 销售管理

**不可访问**:
- ❌ `/merchant.html` - 批发商户页面
- ❌ `/admin.html` - 管理员控制台（除非是管理员）

### 2. 批发商户 (merchant)
**测试账号**: 
- `merchant_vip` / `merchant123`
- `merchant_gold` / `merchant123`
- `customer1` / `customer123`

**可访问页面**:
- ✅ `/merchant.html` - 批发商户中心（唯一主页）

**不可访问**:
- ❌ `/prototype.html` - 仓库管理
- ❌ `/inventory.html` - 仓库库存
- ❌ `/receiving.html` - 入库管理
- ❌ `/product-management.html` - 产品管理
- ❌ `/sales.html` - 仓库销售
- ❌ `/admin.html` - 管理员控制台

### 3. 管理员 (admin)
**测试账号**: `admin` / `admin123`

**可访问页面**:
- ✅ 所有页面（拥有最高权限）

## 权限控制机制

### 1. 登录时设置角色
```javascript
// 在 login.html 中
localStorage.setItem('userRole', user.role);
```

### 2. 页面加载时检查权限
```javascript
// auth-guard.js 自动执行
window.addEventListener('DOMContentLoaded', checkPagePermission);
```

### 3. 权限验证流程
```
用户访问页面
    ↓
检查是否登录
    ↓
检查用户角色
    ↓
验证角色是否有权限访问该页面
    ↓
有权限 → 正常显示页面
无权限 → 弹出提示 → 跳转到角色主页
```

### 4. 登出时清除角色
```javascript
// 使用 AuthGuard.logout()
localStorage.removeItem('userRole');
```

## 登录后跳转规则

| 用户角色 | 登录后跳转页面 |
|---------|--------------|
| warehouse_staff | /prototype.html |
| merchant | /merchant.html |
| admin | /admin.html |

## 测试场景

### 场景1: 批发商尝试访问仓库页面
1. 使用 `merchant_vip` 登录
2. 登录后自动跳转到 `/merchant.html`
3. 尝试手动访问 `/inventory.html`
4. 系统弹出提示："您没有权限访问此页面"
5. 自动跳转回 `/merchant.html`

### 场景2: 仓库管理员尝试访问批发商页面
1. 使用 `warehouse1` 登录
2. 登录后自动跳转到 `/prototype.html`
3. 尝试手动访问 `/merchant.html`
4. 系统弹出提示："您没有权限访问此页面"
5. 自动跳转回 `/prototype.html`

### 场景3: 管理员访问所有页面
1. 使用 `admin` 登录
2. 登录后跳转到 `/admin.html`
3. 可以访问任何页面（仓库、批发商、管理员）
4. 所有页面都正常显示

## 实现文件

### 核心文件
- `public/auth-guard.js` - 权限控制核心逻辑

### 已更新的页面
- ✅ `public/login.html` - 添加角色设置
- ✅ `public/prototype.html` - 添加权限检查
- ✅ `public/inventory.html` - 添加权限检查
- ✅ `public/receiving.html` - 添加权限检查
- ✅ `public/product-management.html` - 添加权限检查
- ✅ `public/sales.html` - 添加权限检查
- ✅ `public/merchant.html` - 添加权限检查
- ✅ `public/admin.html` - 添加权限检查

## 安全特性

### 1. 前端权限控制
- 页面加载时自动检查权限
- 无权限自动跳转
- 防止用户通过URL直接访问

### 2. 统一登出
- 所有页面使用 `AuthGuard.logout()`
- 清除所有登录信息（username, userRole, loginTime）
- 跳转到登录页面

### 3. 角色隔离
- 批发商只能看到自己的数据
- 仓库管理员只能管理仓库
- 管理员拥有全部权限

## 后续优化建议

### 1. 后端权限验证
- 前端权限控制只是第一层防护
- 建议在后端API中也添加权限验证
- 验证用户token和角色

### 2. 更细粒度的权限
- 功能级权限（如：只读、编辑、删除）
- 数据级权限（如：只能看自己的数据）

### 3. 权限配置化
- 将权限配置存储在数据库
- 支持动态调整权限
- 支持自定义角色

## 常见问题

### Q1: 用户刷新页面后会丢失权限吗？
A: 不会。权限信息存储在 localStorage 中，刷新页面后仍然有效。

### Q2: 如何添加新的角色？
A: 在 `auth-guard.js` 中的 `USER_ROLES` 添加新角色，并在 `PAGE_ROLES` 中配置该角色可访问的页面。

### Q3: 如何添加新的受保护页面？
A: 
1. 在页面的 `<head>` 中添加 `<script src="/auth-guard.js"></script>`
2. 在 `auth-guard.js` 的 `PAGE_ROLES` 中配置该页面的访问权限

### Q4: 管理员为什么可以访问所有页面？
A: 在 `PAGE_ROLES` 中，所有页面的权限列表都包含 `USER_ROLES.ADMIN`。

## 更新日志

### 2026-01-29
- ✅ 创建权限控制系统 (`auth-guard.js`)
- ✅ 更新登录页面，添加角色设置
- ✅ 为所有页面添加权限检查
- ✅ 统一登出逻辑
- ✅ 实现基于角色的页面访问控制
- ✅ 防止不同角色之间的页面跳转
