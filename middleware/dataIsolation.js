/**
 * 数据隔离中间件
 * 根据用户权限设置查询过滤条件
 */

const UserNew = require('../models/UserNew');

/**
 * 获取用户的数据查询过滤条件
 * @param {string} username - 用户名
 * @param {boolean} viewGroupData - 是否查看群组数据（默认 false）
 * @returns {Object} 查询过滤条件
 */
async function getUserDataFilter(username, viewGroupData = false) {
  if (!username) {
    throw new Error('用户未登录');
  }
  
  // 查询用户信息
  const user = await UserNew.findOne({ username });
  
  if (!user) {
    // 如果用户不在 UserNew 表中，可能是旧系统的用户
    // 默认只能查看自己的数据
    console.warn(`⚠️  用户 ${username} 不在 UserNew 表中，使用默认隔离策略`);
    return { merchantId: username };
  }
  
  // 管理员可以看到所有数据
  if (user.role === 'admin') {
    console.log(`✅ 管理员 ${username} 可以查看所有数据`);
    return {}; // 空对象表示不过滤
  }
  
  // 如果明确要求查看群组数据，且用户有权限
  if (viewGroupData) {
    const canViewGroup = user.retailInfo?.canViewGroupInventory === true;
    const storeGroup = user.retailInfo?.storeGroup;
    
    if (canViewGroup && storeGroup) {
      // 查看群组内所有成员的数据
      console.log(`✅ 用户 ${username} 查看组 ${storeGroup} 的群组数据`);
      return { storeGroup };
    } else {
      console.log(`⚠️  用户 ${username} 没有群组或无权限，只能查看自己的数据`);
      return { merchantId: username };
    }
  }
  
  // 默认：只能查看自己的数据（日常操作）
  console.log(`✅ 用户 ${username} 查看自己的数据`);
  return { merchantId: username };
}

/**
 * 中间件：为请求添加数据过滤条件（默认只查看自己的数据）
 */
async function applyDataIsolation(req, res, next) {
  try {
    // 从多个来源尝试获取用户名
    const username = req.session?.username || 
                     req.user?.username || 
                     req.query.merchantId ||
                     req.body.merchantId;
    
    if (!username) {
      return res.status(401).json({ error: '用户未登录' });
    }
    
    // 默认只查看自己的数据
    req.dataFilter = await getUserDataFilter(username, false);
    req.currentUsername = username;
    
    next();
  } catch (error) {
    console.error('数据隔离中间件错误:', error);
    res.status(401).json({ error: error.message });
  }
}

/**
 * 中间件：为请求添加群组数据过滤条件（查看群组数据）
 */
async function applyGroupDataFilter(req, res, next) {
  try {
    // 从多个来源尝试获取用户名
    const username = req.session?.username || 
                     req.user?.username || 
                     req.query.merchantId ||
                     req.body.merchantId;
    
    if (!username) {
      return res.status(401).json({ error: '用户未登录' });
    }
    
    // 查看群组数据
    req.dataFilter = await getUserDataFilter(username, true);
    req.currentUsername = username;
    
    next();
  } catch (error) {
    console.error('群组数据中间件错误:', error);
    res.status(401).json({ error: error.message });
  }
}

/**
 * 获取用户信息（包含店铺组信息）
 * @param {string} username - 用户名
 * @returns {Object} 用户信息
 */
async function getUserInfo(username) {
  const user = await UserNew.findOne({ username })
    .populate('retailInfo.storeGroup')
    .populate('retailInfo.store');
  
  return user;
}

module.exports = {
  getUserDataFilter,
  applyDataIsolation,
  applyGroupDataFilter,
  getUserInfo
};
