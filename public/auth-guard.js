/**
 * 权限控制系统
 * 用于限制不同角色用户访问特定页面
 */

// 用户角色定义
const USER_ROLES = {
  WAREHOUSE_STAFF: 'warehouse_staff',    // 仓库管理员
  MERCHANT: 'merchant',                  // 批发商户
  ADMIN: 'admin'                         // 管理员
};

// 页面角色映射 - 定义每个页面允许访问的角色
const PAGE_ROLES = {
  // 仓库管理系统页面
  '/prototype.html': [USER_ROLES.WAREHOUSE_STAFF, USER_ROLES.ADMIN],
  '/inventory.html': [USER_ROLES.WAREHOUSE_STAFF, USER_ROLES.ADMIN],
  '/receiving.html': [USER_ROLES.WAREHOUSE_STAFF, USER_ROLES.ADMIN],
  '/product-management.html': [USER_ROLES.WAREHOUSE_STAFF, USER_ROLES.ADMIN],
  '/sales.html': [USER_ROLES.WAREHOUSE_STAFF, USER_ROLES.ADMIN],
  
  // 批发商户页面
  '/merchant.html': [USER_ROLES.MERCHANT, USER_ROLES.ADMIN],
  
  // 管理员页面
  '/admin.html': [USER_ROLES.ADMIN],
  
  // 公共页面（所有人都可以访问）
  '/login.html': [USER_ROLES.WAREHOUSE_STAFF, USER_ROLES.MERCHANT, USER_ROLES.ADMIN],
  '/index.html': [USER_ROLES.WAREHOUSE_STAFF, USER_ROLES.MERCHANT, USER_ROLES.ADMIN]
};

// 角色主页映射 - 定义每个角色的默认主页
const ROLE_HOME_PAGES = {
  [USER_ROLES.WAREHOUSE_STAFF]: '/prototype-working.html',
  [USER_ROLES.MERCHANT]: '/merchant.html',
  [USER_ROLES.ADMIN]: '/admin.html'
};

/**
 * 获取当前用户角色
 * @returns {string|null} 用户角色
 */
function getCurrentUserRole() {
  return localStorage.getItem('userRole');
}

/**
 * 设置用户角色
 * @param {string} role - 用户角色
 */
function setUserRole(role) {
  localStorage.setItem('userRole', role);
}

/**
 * 获取当前页面路径
 * @returns {string} 页面路径
 */
function getCurrentPage() {
  return window.location.pathname;
}

/**
 * 检查用户是否有权限访问当前页面
 * @param {string} userRole - 用户角色
 * @param {string} pagePath - 页面路径
 * @returns {boolean} 是否有权限
 */
function hasPermission(userRole, pagePath) {
  // 如果页面没有在映射中定义，默认允许访问
  if (!PAGE_ROLES[pagePath]) {
    return true;
  }
  
  // 检查用户角色是否在允许的角色列表中
  return PAGE_ROLES[pagePath].includes(userRole);
}

/**
 * 获取用户角色的主页
 * @param {string} userRole - 用户角色
 * @returns {string} 主页路径
 */
function getRoleHomePage(userRole) {
  return ROLE_HOME_PAGES[userRole] || '/login.html';
}

/**
 * 权限检查 - 在页面加载时调用
 * 如果用户没有权限，自动跳转到其角色的主页
 */
function checkPagePermission() {
  const currentPage = getCurrentPage();
  const userRole = getCurrentUserRole();
  
  // 如果是登录页面，不需要检查权限
  if (currentPage === '/login.html' || currentPage === '/' || currentPage === '/index.html') {
    return;
  }
  
  // 如果用户未登录，跳转到登录页
  if (!userRole) {
    console.warn('用户未登录，跳转到登录页');
    window.location.href = '/login.html';
    return;
  }
  
  // 检查权限
  if (!hasPermission(userRole, currentPage)) {
    console.warn(`用户角色 ${userRole} 无权访问页面 ${currentPage}`);
    alert('您没有权限访问此页面，将跳转到您的主页');
    
    // 跳转到用户角色对应的主页
    const homePage = getRoleHomePage(userRole);
    window.location.href = homePage;
    return;
  }
  
  console.log(`权限检查通过: ${userRole} 可以访问 ${currentPage}`);
}

/**
 * 登出功能
 * 清除用户信息并跳转到登录页
 */
function logout() {
  if (confirm('确定要退出登录吗？')) {
    // 清除所有登录信息
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('loginTime');
    
    // 跳转到登录页面
    window.location.href = '/login.html';
  }
}

/**
 * 获取角色显示名称
 * @param {string} role - 角色代码
 * @returns {string} 角色显示名称
 */
function getRoleDisplayName(role) {
  const roleNames = {
    [USER_ROLES.WAREHOUSE_STAFF]: '仓库管理员',
    [USER_ROLES.MERCHANT]: '批发商户',
    [USER_ROLES.ADMIN]: '管理员'
  };
  return roleNames[role] || '未知角色';
}

// 页面加载时自动执行权限检查
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', checkPagePermission);
}

// 导出函数供其他脚本使用
if (typeof window !== 'undefined') {
  window.AuthGuard = {
    USER_ROLES,
    getCurrentUserRole,
    setUserRole,
    hasPermission,
    getRoleHomePage,
    checkPagePermission,
    logout,
    getRoleDisplayName
  };
}
