// ==================== 用户管理功能 ====================
// 版本: 1.2 - 添加群组用户数量调试
// 更新时间: 2026-02-06
console.log('✅ admin-user-management.js 已加载 - 版本 1.2');

// 全局变量
window.allUsers = [];
window.allGroups = [];

// 加载用户列表
async function loadUsers() {
  const container = document.getElementById('usersTable');
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  try {
    const response = await fetch(`${API_BASE}/admin/users`);
    const result = await response.json();
    
    if (result.success && result.data.length > 0) {
      window.allUsers = result.data;
      displayUsers(result.data);
    } else {
      container.innerHTML = '<div class="empty">暂无用户</div>';
    }
    
    // 同时加载群组列表用于筛选
    await loadGroupsForFilter();
    
    if (typeof i18n !== 'undefined') i18n.translateDynamicContent();
  } catch (error) {
    container.innerHTML = `<div class="empty">加载失败: ${error.message}</div>`;
  }
}

// 显示用户列表
function displayUsers(users) {
  const container = document.getElementById('usersTable');
  
  const html = `
    <table>
      <thead>
        <tr>
          <th>用户名</th>
          <th>邮箱</th>
          <th>角色</th>
          <th>姓名</th>
          <th>电话</th>
          <th>所属群组</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(user => `
          <tr>
            <td><strong>${user.username}</strong></td>
            <td>${user.email}</td>
            <td>${getRoleBadge(user.role)}</td>
            <td>${user.profile?.firstName || ''} ${user.profile?.lastName || ''}</td>
            <td>${user.profile?.phone || '-'}</td>
            <td>${user.retailInfo?.storeGroup?.name || '-'}</td>
            <td>${user.isActive ? '<span class="badge badge-success">活跃</span>' : '<span class="badge badge-danger">停用</span>'}</td>
            <td>${new Date(user.createdAt).toLocaleDateString('zh-CN')}</td>
            <td>
              <button class="btn-sm btn-info" onclick="editUser('${user._id}')">编辑</button>
              <button class="btn-sm btn-danger" onclick="deleteUser('${user._id}', '${user.username}')">
                ${user.isActive ? '停用' : '启用'}
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  container.innerHTML = html;
}

// 筛选用户
function filterUsers() {
  const roleFilter = document.getElementById('roleFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;
  const groupFilter = document.getElementById('groupFilter').value;
  const searchText = document.getElementById('userSearch').value.toLowerCase();
  
  let filtered = window.allUsers;
  
  // 角色筛选
  if (roleFilter) {
    filtered = filtered.filter(u => u.role === roleFilter);
  }
  
  // 状态筛选
  if (statusFilter === 'active') {
    filtered = filtered.filter(u => u.isActive);
  } else if (statusFilter === 'inactive') {
    filtered = filtered.filter(u => !u.isActive);
  }
  
  // 群组筛选
  if (groupFilter) {
    filtered = filtered.filter(u => u.retailInfo?.storeGroup?._id === groupFilter);
  }
  
  // 搜索
  if (searchText) {
    filtered = filtered.filter(u => 
      u.username.toLowerCase().includes(searchText) ||
      u.email.toLowerCase().includes(searchText) ||
      (u.profile?.firstName && u.profile.firstName.toLowerCase().includes(searchText)) ||
      (u.profile?.lastName && u.profile.lastName.toLowerCase().includes(searchText))
    );
  }
  
  displayUsers(filtered);
}

// 显示创建用户模态框
async function showCreateUserModal() {
  document.getElementById('userModalTitle').textContent = '添加用户';
  document.getElementById('userForm').reset();
  document.getElementById('userId').value = '';
  document.getElementById('userPassword').required = true;
  document.getElementById('userIsActive').checked = true;
  
  // 加载群组列表
  await loadGroupsForUserForm();
  
  document.getElementById('userModal').style.display = 'block';
}

// 编辑用户
async function editUser(userId) {
  try {
    console.log('=== 开始编辑用户 ===');
    console.log('传入的userId:', userId, '类型:', typeof userId);
    console.log('window.allUsers数量:', window.allUsers.length);
    console.log('window.allUsers:', window.allUsers);
    
    // 将userId转换为字符串进行比较（MongoDB的_id可能是对象）
    const user = window.allUsers.find(u => {
      const uIdStr = String(u._id);
      const userIdStr = String(userId);
      console.log('比较:', uIdStr, '===', userIdStr, '结果:', uIdStr === userIdStr);
      return uIdStr === userIdStr;
    });
    
    if (!user) {
      console.error('❌ 用户不存在！');
      console.error('传入的userId:', userId);
      console.error('可用用户:', window.allUsers.map(u => ({ 
        id: u._id, 
        idType: typeof u._id,
        idString: String(u._id),
        username: u.username 
      })));
      alert('用户不存在');
      return;
    }
    
    console.log('✅ 找到用户:', user.username);
    console.log('用户完整数据:', user);
    console.log('用户retailInfo:', user.retailInfo);
    console.log('用户storeGroup:', user.retailInfo?.storeGroup);
    
    document.getElementById('userModalTitle').textContent = '编辑用户';
    document.getElementById('userId').value = user._id;
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = false;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userFirstName').value = user.profile?.firstName || '';
    document.getElementById('userLastName').value = user.profile?.lastName || '';
    document.getElementById('userPhone').value = user.profile?.phone || '';
    document.getElementById('userIsActive').checked = user.isActive;
    
    // 公司信息
    document.getElementById('userCompanyName').value = user.companyInfo?.companyName || '';
    document.getElementById('userRegistrationNumber').value = user.companyInfo?.registrationNumber || '';
    document.getElementById('userVatNumber').value = user.companyInfo?.vatNumber || '';
    document.getElementById('userCompanyPhone').value = user.companyInfo?.contactPhone || '';
    document.getElementById('userCompanyEmail').value = user.companyInfo?.contactEmail || '';
    document.getElementById('userCompanyStreet').value = user.companyInfo?.address?.street || '';
    document.getElementById('userCompanyCity').value = user.companyInfo?.address?.city || '';
    document.getElementById('userCompanyState').value = user.companyInfo?.address?.state || '';
    document.getElementById('userCompanyPostalCode').value = user.companyInfo?.address?.postalCode || '';
    document.getElementById('userCompanyCountry').value = user.companyInfo?.address?.country || '';
    
    // 加载群组列表
    await loadGroupsForUserForm();
    
    // 普通用户字段
    if (user.role === 'retail_user') {
      const storeGroupId = user.retailInfo?.storeGroup?._id || user.retailInfo?.storeGroup || '';
      console.log('设置storeGroup值:', storeGroupId);
      
      document.getElementById('userStoreType').value = user.retailInfo?.storeType || 'single_store';
      document.getElementById('userStoreGroup').value = storeGroupId;
      document.getElementById('userCanViewGroupInventory').checked = user.retailInfo?.canViewGroupInventory || false;
      document.getElementById('userCanTransferFromGroup').checked = user.retailInfo?.canTransferFromGroup || false;
      
      console.log('userStoreGroup select的值已设置为:', document.getElementById('userStoreGroup').value);
    }
    
    // 显示/隐藏普通用户字段
    toggleRetailFields();
    
    document.getElementById('userModal').style.display = 'block';
  } catch (error) {
    console.error('加载用户信息失败:', error);
    alert('加载用户信息失败: ' + error.message);
  }
}

// 保存用户
async function saveUser(event) {
  event.preventDefault();
  
  const userId = document.getElementById('userId').value;
  const role = document.getElementById('userRole').value;
  
  const userData = {
    username: document.getElementById('userUsername').value,
    email: document.getElementById('userEmail').value,
    role: role,
    profile: {
      firstName: document.getElementById('userFirstName').value,
      lastName: document.getElementById('userLastName').value,
      phone: document.getElementById('userPhone').value
    },
    isActive: document.getElementById('userIsActive').checked,
    // 公司信息
    companyInfo: {
      companyName: document.getElementById('userCompanyName').value,
      registrationNumber: document.getElementById('userRegistrationNumber').value,
      vatNumber: document.getElementById('userVatNumber').value,
      contactPhone: document.getElementById('userCompanyPhone').value,
      contactEmail: document.getElementById('userCompanyEmail').value,
      address: {
        street: document.getElementById('userCompanyStreet').value,
        city: document.getElementById('userCompanyCity').value,
        state: document.getElementById('userCompanyState').value,
        postalCode: document.getElementById('userCompanyPostalCode').value,
        country: document.getElementById('userCompanyCountry').value
      }
    }
  };
  
  // 密码（创建时必填，编辑时可选）
  const password = document.getElementById('userPassword').value;
  if (password) {
    userData.password = password;
  }
  
  // 普通用户特殊字段
  if (role === 'retail_user') {
    const storeGroupValue = document.getElementById('userStoreGroup').value;
    userData.retailInfo = {
      storeType: document.getElementById('userStoreType').value,
      storeGroup: storeGroupValue || null,
      canViewGroupInventory: document.getElementById('userCanViewGroupInventory').checked,
      canTransferFromGroup: document.getElementById('userCanTransferFromGroup').checked
    };
    
    console.log('保存用户 - retailInfo:', userData.retailInfo);
    console.log('保存用户 - storeGroup值:', storeGroupValue);
  }
  
  console.log('保存用户数据:', userData);
  console.log('用户ID:', userId);
  
  try {
    const url = userId ? `${API_BASE}/admin/users/${userId}` : `${API_BASE}/admin/users`;
    const method = userId ? 'PUT' : 'POST';
    
    console.log('请求URL:', url);
    console.log('请求方法:', method);
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    console.log('响应状态:', response.status);
    
    const result = await response.json();
    console.log('响应结果:', result);
    
    if (result.success) {
      alert(result.message || '保存成功');
      closeUserModal();
      loadUsers();
    } else {
      alert('保存失败: ' + result.error);
    }
  } catch (error) {
    console.error('保存用户错误:', error);
    alert('保存失败: ' + error.message);
  }
}

// 删除用户
async function deleteUser(userId, username) {
  if (!confirm(`确定要停用用户 "${username}" 吗？`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert(result.message || '用户已停用');
      loadUsers();
    } else {
      alert('操作失败: ' + result.error);
    }
  } catch (error) {
    alert('操作失败: ' + error.message);
  }
}

// 关闭用户模态框
function closeUserModal() {
  document.getElementById('userModal').style.display = 'none';
}

// 切换普通用户字段显示
function toggleRetailFields() {
  const role = document.getElementById('userRole').value;
  const retailFields = document.getElementById('retailFields');
  retailFields.style.display = role === 'retail_user' ? 'block' : 'none';
}

// 加载群组列表（用于筛选）
async function loadGroupsForFilter() {
  try {
    const response = await fetch(`${API_BASE}/admin/store-groups`);
    const result = await response.json();
    
    if (result.success) {
      window.allGroups = result.data;
      const select = document.getElementById('groupFilter');
      if (select) {
        select.innerHTML = '<option value="">全部群组</option>' +
          result.data.filter(g => g.isActive).map(g => 
            `<option value="${g._id}">${g.name} (${g.code})</option>`
          ).join('');
      }
    }
  } catch (error) {
    console.error('加载群组列表失败:', error);
  }
}

// 加载群组列表（用于用户表单）
async function loadGroupsForUserForm() {
  try {
    const response = await fetch(`${API_BASE}/admin/store-groups`);
    const result = await response.json();
    
    if (result.success) {
      const select = document.getElementById('userStoreGroup');
      if (select) {
        select.innerHTML = '<option value="">无群组（独立用户）</option>' +
          result.data.filter(g => g.isActive).map(g => 
            `<option value="${g._id}">${g.name} (${g.code})</option>`
          ).join('');
      }
    }
  } catch (error) {
    console.error('加载群组列表失败:', error);
  }
}

// ==================== 群组管理功能 ====================

// 显示群组管理
async function showGroupManagement() {
  document.getElementById('groupModal').style.display = 'block';
  await loadGroups();
}

// 关闭群组管理
function closeGroupModal() {
  document.getElementById('groupModal').style.display = 'none';
}

// 加载群组列表
async function loadGroups() {
  const container = document.getElementById('groupsTable');
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  try {
    const response = await fetch(`${API_BASE}/admin/store-groups`);
    const result = await response.json();
    
    console.log('📊 群组API返回:', result);
    console.log('📊 群组数量:', result.data?.length);
    
    if (result.success && result.data.length > 0) {
      // 打印第一个群组的详细信息
      console.log('📊 第一个群组详情:', result.data[0]);
      console.log('📊 第一个群组userCount:', result.data[0].userCount);
      
      const html = `
        <table>
          <thead>
            <tr>
              <th>群组名称</th>
              <th>群组代码</th>
              <th>用户数量</th>
              <th>库存共享</th>
              <th>店面调货</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${result.data.map(group => {
              console.log(`渲染群组 ${group.name}, userCount: ${group.userCount}`);
              return `
              <tr>
                <td><strong>${group.name}</strong></td>
                <td><span class="badge badge-info">${group.code}</span></td>
                <td>${group.userCount || 0} 人</td>
                <td>${group.settings?.allowInventorySharing ? '✅' : '❌'}</td>
                <td>${group.settings?.allowStoreTransfers ? '✅' : '❌'}</td>
                <td>${group.isActive ? '<span class="badge badge-success">活跃</span>' : '<span class="badge badge-danger">停用</span>'}</td>
                <td>${new Date(group.createdAt).toLocaleDateString('zh-CN')}</td>
                <td>
                  <button class="btn-sm btn-info" onclick="editGroup('${group._id}')">编辑</button>
                  <button class="btn-sm btn-danger" onclick="deleteGroup('${group._id}', '${group.name}', ${group.userCount || 0})">
                    ${group.isActive ? '停用' : '启用'}
                  </button>
                </td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      `;
      container.innerHTML = html;
    } else {
      container.innerHTML = '<div class="empty">暂无群组</div>';
    }
  } catch (error) {
    console.error('❌ 加载群组失败:', error);
    container.innerHTML = `<div class="empty">加载失败: ${error.message}</div>`;
  }
}

// 显示创建群组模态框
function showCreateGroupModal() {
  document.getElementById('groupFormModalTitle').textContent = '添加群组';
  document.getElementById('groupForm').reset();
  document.getElementById('groupId').value = '';
  document.getElementById('groupIsActive').checked = true;
  document.getElementById('groupAllowInventorySharing').checked = true;
  document.getElementById('groupAllowStoreTransfers').checked = true;
  document.getElementById('groupFormModal').style.display = 'block';
}

// 编辑群组
async function editGroup(groupId) {
  try {
    const response = await fetch(`${API_BASE}/admin/store-groups`);
    const result = await response.json();
    
    if (result.success) {
      const group = result.data.find(g => g._id === groupId);
      if (!group) {
        alert('群组不存在');
        return;
      }
      
      document.getElementById('groupFormModalTitle').textContent = '编辑群组';
      document.getElementById('groupId').value = group._id;
      document.getElementById('groupName').value = group.name;
      document.getElementById('groupCode').value = group.code;
      document.getElementById('groupDescription').value = group.description || '';
      document.getElementById('groupAllowInventorySharing').checked = group.settings?.allowInventorySharing !== false;
      document.getElementById('groupAllowStoreTransfers').checked = group.settings?.allowStoreTransfers !== false;
      document.getElementById('groupUniformPricing').checked = group.settings?.uniformPricing || false;
      document.getElementById('groupCentralInventoryManagement').checked = group.settings?.centralInventoryManagement || false;
      document.getElementById('groupIsActive').checked = group.isActive;
      
      document.getElementById('groupFormModal').style.display = 'block';
    }
  } catch (error) {
    alert('加载群组信息失败: ' + error.message);
  }
}

// 保存群组
async function saveGroup(event) {
  event.preventDefault();
  
  const groupId = document.getElementById('groupId').value;
  const groupData = {
    name: document.getElementById('groupName').value,
    code: document.getElementById('groupCode').value.toUpperCase(),
    description: document.getElementById('groupDescription').value,
    settings: {
      allowInventorySharing: document.getElementById('groupAllowInventorySharing').checked,
      allowStoreTransfers: document.getElementById('groupAllowStoreTransfers').checked,
      uniformPricing: document.getElementById('groupUniformPricing').checked,
      centralInventoryManagement: document.getElementById('groupCentralInventoryManagement').checked
    },
    isActive: document.getElementById('groupIsActive').checked
  };
  
  console.log('保存群组数据:', groupData);
  console.log('群组ID:', groupId);
  
  try {
    const url = groupId ? `${API_BASE}/admin/store-groups/${groupId}` : `${API_BASE}/admin/store-groups`;
    const method = groupId ? 'PUT' : 'POST';
    
    console.log('请求URL:', url);
    console.log('请求方法:', method);
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupData)
    });
    
    console.log('响应状态:', response.status);
    
    const result = await response.json();
    console.log('响应结果:', result);
    
    if (result.success) {
      alert(result.message || '保存成功');
      closeGroupFormModal();
      loadGroups();
      loadGroupsForFilter(); // 刷新筛选器中的群组列表
    } else {
      alert('保存失败: ' + result.error);
    }
  } catch (error) {
    console.error('保存群组错误:', error);
    alert('保存失败: ' + error.message);
  }
}

// 删除群组
async function deleteGroup(groupId, groupName, userCount) {
  if (userCount > 0) {
    alert(`该群组还有 ${userCount} 个活跃用户，无法删除`);
    return;
  }
  
  if (!confirm(`确定要停用群组 "${groupName}" 吗？`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/admin/store-groups/${groupId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert(result.message || '群组已停用');
      loadGroups();
      loadGroupsForFilter(); // 刷新筛选器中的群组列表
    } else {
      alert('操作失败: ' + result.error);
    }
  } catch (error) {
    alert('操作失败: ' + error.message);
  }
}

// 关闭群组表单模态框
function closeGroupFormModal() {
  document.getElementById('groupFormModal').style.display = 'none';
}

// 获取角色徽章
function getRoleBadge(role) {
  const badges = {
    'admin': '<span class="badge badge-danger">管理员</span>',
    'warehouse_manager': '<span class="badge badge-warning">仓库管理员</span>',
    'retail_user': '<span class="badge badge-info">普通用户</span>'
  };
  return badges[role] || role;
}
