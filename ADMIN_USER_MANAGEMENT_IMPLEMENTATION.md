# 管理员用户管理功能实现指南

## 📋 功能概述

为管理员页面添加完整的用户管理和群组管理功能，包括：
- 用户的增删查改
- 用户角色管理（管理员、仓库管理员、普通用户）
- 群组管理（创建、编辑、删除群组）
- 用户筛选和搜索
- 群组成员管理

---

## ✅ 已完成的工作

### 1. 后端API（app.js）✅

已添加以下API端点：

#### 用户管理API
- `GET /api/admin/users` - 获取所有用户
- `POST /api/admin/users` - 创建新用户
- `PUT /api/admin/users/:id` - 更新用户信息
- `DELETE /api/admin/users/:id` - 删除用户（软删除）

#### 群组管理API
- `GET /api/admin/store-groups` - 获取所有群组
- `POST /api/admin/store-groups` - 创建新群组
- `PUT /api/admin/store-groups/:id` - 更新群组信息
- `DELETE /api/admin/store-groups/:id` - 删除群组（软删除）
- `GET /api/admin/store-groups/:id/users` - 获取群组的用户列表

### 2. 前端JavaScript（admin-user-management.js）✅

已创建独立的JavaScript文件，包含：
- 用户列表加载和显示
- 用户筛选（角色、状态、群组、搜索）
- 用户创建和编辑
- 用户删除（停用）
- 群组列表加载和显示
- 群组创建和编辑
- 群组删除（停用）

### 3. 前端引用（admin.html）✅

已在admin.html的head部分添加：
```html
<script src="/admin-user-management.js"></script>
```

---

## 🔧 需要手动添加的HTML

由于admin.html文件较大，需要手动添加以下HTML代码。

### 步骤1: 替换用户管理标签页

找到admin.html中的这部分代码（大约在第616-627行）：

```html
<!-- 用户管理 -->
<div id="users" class="tab-content">
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2>👥 用户列表</h2>
      <button class="btn btn-primary" onclick="showCreateUserModal()">➕ 添加用户</button>
    </div>
    <div id="usersTable">
      <div class="loading">加载中...</div>
    </div>
  </div>
</div>
```

替换为：

```html
<!-- 用户管理 -->
<div id="users" class="tab-content">
  <!-- 用户列表 -->
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2>👥 用户列表</h2>
      <div style="display: flex; gap: 10px;">
        <button class="btn" style="background: #48bb78; color: white;" onclick="showGroupManagement()">
          👥 群组管理
        </button>
        <button class="btn btn-primary" onclick="showCreateUserModal()">
          ➕ 添加用户
        </button>
      </div>
    </div>
    
    <!-- 筛选器 -->
    <div style="display: flex; gap: 15px; margin-bottom: 20px; padding: 15px; background: #f7fafc; border-radius: 8px;">
      <div>
        <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: 500;">角色筛选</label>
        <select id="roleFilter" onchange="filterUsers()" style="padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px;">
          <option value="">全部角色</option>
          <option value="admin">管理员</option>
          <option value="warehouse_manager">仓库管理员</option>
          <option value="retail_user">普通用户</option>
        </select>
      </div>
      <div>
        <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: 500;">状态筛选</label>
        <select id="statusFilter" onchange="filterUsers()" style="padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px;">
          <option value="">全部状态</option>
          <option value="active">活跃</option>
          <option value="inactive">停用</option>
        </select>
      </div>
      <div>
        <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: 500;">群组筛选</label>
        <select id="groupFilter" onchange="filterUsers()" style="padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px;">
          <option value="">全部群组</option>
          <!-- 动态加载群组选项 -->
        </select>
      </div>
      <div style="flex: 1;">
        <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: 500;">搜索</label>
        <input type="text" id="userSearch" placeholder="搜索用户名、邮箱..." 
               onkeyup="filterUsers()"
               style="width: 100%; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px;">
      </div>
    </div>
    
    <div id="usersTable">
      <div class="loading">加载中...</div>
    </div>
  </div>
</div>
```

### 步骤2: 在`</div>`（container结束）之后添加模态框

在admin.html中找到`</div>  <!-- container结束 -->`这一行（大约在第628行），在它之后、`<script>`标签之前添加以下HTML：

```html
<!-- 创建/编辑用户模态框 -->
<div id="userModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; overflow-y: auto;">
  <div style="max-width: 800px; margin: 50px auto; background: white; border-radius: 12px; padding: 30px;">
    <h2 id="userModalTitle">添加用户</h2>
    
    <form id="userForm" onsubmit="saveUser(event)" style="margin-top: 25px;">
      <input type="hidden" id="userId">
      
      <!-- 基本信息 -->
      <div style="margin-bottom: 25px;">
        <h3 style="font-size: 16px; margin-bottom: 15px; color: #4a5568;">基本信息</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">用户名 *</label>
            <input type="text" id="userUsername" required
                   style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">邮箱 *</label>
            <input type="email" id="userEmail" required
                   style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">密码 *</label>
            <input type="password" id="userPassword" 
                   style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;"
                   placeholder="编辑时留空表示不修改">
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">角色 *</label>
            <select id="userRole" required onchange="toggleRetailFields()"
                    style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
              <option value="">选择角色...</option>
              <option value="admin">管理员</option>
              <option value="warehouse_manager">仓库管理员</option>
              <option value="retail_user">普通用户</option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- 个人信息 -->
      <div style="margin-bottom: 25px;">
        <h3 style="font-size: 16px; margin-bottom: 15px; color: #4a5568;">个人信息</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">名字</label>
            <input type="text" id="userFirstName"
                   style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">姓氏</label>
            <input type="text" id="userLastName"
                   style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">电话</label>
            <input type="tel" id="userPhone"
                   style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
          </div>
        </div>
      </div>
      
      <!-- 普通用户特殊字段 -->
      <div id="retailFields" style="display: none; margin-bottom: 25px;">
        <h3 style="font-size: 16px; margin-bottom: 15px; color: #4a5568;">群组设置</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">所属群组</label>
            <select id="userStoreGroup"
                    style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
              <option value="">无群组（独立用户）</option>
              <!-- 动态加载群组选项 -->
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">店面类型</label>
            <select id="userStoreType"
                    style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
              <option value="single_store">单店</option>
              <option value="chain_store">连锁店</option>
            </select>
          </div>
        </div>
        <div style="margin-top: 15px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="userCanViewGroupInventory">
            <span>可以查看群组内其他店面库存</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-top: 8px;">
            <input type="checkbox" id="userCanTransferFromGroup">
            <span>可以从群组内其他店面调货</span>
          </label>
        </div>
      </div>
      
      <!-- 状态 -->
      <div style="margin-bottom: 25px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="userIsActive" checked>
          <span style="font-weight: 500;">账户激活</span>
        </label>
      </div>
      
      <!-- 按钮 -->
      <div style="display: flex; gap: 15px; justify-content: flex-end;">
        <button type="button" onclick="closeUserModal()" class="btn btn-secondary">
          取消
        </button>
        <button type="submit" class="btn btn-success">
          保存
        </button>
      </div>
    </form>
  </div>
</div>

<!-- 群组管理模态框 -->
<div id="groupModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; overflow-y: auto;">
  <div style="max-width: 1200px; margin: 50px auto; background: white; border-radius: 12px; padding: 30px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
      <h2>👥 群组管理</h2>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-primary" onclick="showCreateGroupModal()">
          ➕ 添加群组
        </button>
        <button class="btn btn-secondary" onclick="closeGroupModal()">
          关闭
        </button>
      </div>
    </div>
    
    <div id="groupsTable">
      <div class="loading">加载中...</div>
    </div>
  </div>
</div>

<!-- 创建/编辑群组模态框 -->
<div id="groupFormModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1001; overflow-y: auto;">
  <div style="max-width: 700px; margin: 50px auto; background: white; border-radius: 12px; padding: 30px;">
    <h2 id="groupFormModalTitle">添加群组</h2>
    
    <form id="groupForm" onsubmit="saveGroup(event)" style="margin-top: 25px;">
      <input type="hidden" id="groupId">
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 500;">群组名称 *</label>
          <input type="text" id="groupName" required
                 style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 500;">群组代码 *</label>
          <input type="text" id="groupCode" required
                 style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; text-transform: uppercase;">
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">描述</label>
        <textarea id="groupDescription" rows="3"
                  style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;"></textarea>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 16px; margin-bottom: 10px; color: #4a5568;">业务设置</h3>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 8px;">
          <input type="checkbox" id="groupAllowInventorySharing" checked>
          <span>允许店面间库存共享</span>
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 8px;">
          <input type="checkbox" id="groupAllowStoreTransfers" checked>
          <span>允许店面间调货</span>
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 8px;">
          <input type="checkbox" id="groupUniformPricing">
          <span>统一定价策略</span>
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="groupCentralInventoryManagement">
          <span>中央库存管理</span>
        </label>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="groupIsActive" checked>
          <span style="font-weight: 500;">群组激活</span>
        </label>
      </div>
      
      <div style="display: flex; gap: 15px; justify-content: flex-end;">
        <button type="button" onclick="closeGroupFormModal()" class="btn btn-secondary">
          取消
        </button>
        <button type="submit" class="btn btn-success">
          保存
        </button>
      </div>
    </form>
  </div>
</div>
```

---

## 🧪 测试步骤

### 1. 测试用户管理

1. 访问 http://localhost:3000/admin.html
2. 点击"👥 用户管理"标签
3. 查看用户列表
4. 测试筛选功能：
   - 按角色筛选
   - 按状态筛选
   - 按群组筛选
   - 搜索用户
5. 点击"➕ 添加用户"
6. 填写用户信息并保存
7. 编辑用户
8. 停用用户

### 2. 测试群组管理

1. 在用户管理页面，点击"👥 群组管理"
2. 查看群组列表
3. 点击"➕ 添加群组"
4. 填写群组信息并保存
5. 编辑群组
6. 停用群组（需要先确保群组内没有活跃用户）

### 3. 测试用户-群组关联

1. 创建一个群组
2. 创建一个普通用户
3. 在用户表单中选择刚创建的群组
4. 保存用户
5. 在用户列表中查看该用户的群组信息
6. 使用群组筛选器筛选该群组的用户

---

## 📊 数据结构

### 用户角色

- **admin**: 管理员 - 拥有所有权限
- **warehouse_manager**: 仓库管理员 - 管理库存、采购等
- **retail_user**: 普通用户 - 查看产品、创建销售订单

### 群组设置

- **allowInventorySharing**: 允许店面间库存共享
- **allowStoreTransfers**: 允许店面间调货
- **uniformPricing**: 统一定价策略
- **centralInventoryManagement**: 中央库存管理

---

## ⚠️ 注意事项

1. **密码安全**
   - 创建用户时密码是必填项
   - 编辑用户时，留空密码表示不修改
   - 密码在后端自动加密

2. **软删除**
   - 删除用户和群组都是软删除（设置isActive=false）
   - 不会真正从数据库中删除记录

3. **群组删除限制**
   - 只有当群组内没有活跃用户时才能删除
   - 删除前会检查用户数量

4. **权限自动设置**
   - 创建用户时，根据角色自动设置默认权限
   - 修改角色时，权限会重新设置

---

## 🔗 相关文件

- `StockControl-main/app.js` - 后端API
- `StockControl-main/public/admin-user-management.js` - 前端JavaScript
- `StockControl-main/public/admin.html` - 管理员页面
- `StockControl-main/models/UserNew.js` - 用户模型
- `StockControl-main/models/StoreGroup.js` - 群组模型

---

**创建时间**: 2026-02-03
**版本**: 1.0
**状态**: ✅ 后端和JavaScript完成，需要手动添加HTML
