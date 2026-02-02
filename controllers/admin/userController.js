const UserNew = require('../../models/UserNew');

// 获取用户列表
exports.getUsers = async (req, res) => {
  try {
    const users = await UserNew.find({ isActive: true })
      .select('-password')
      .populate('createdBy', 'username', 'UserNew')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取单个用户
exports.getUser = async (req, res) => {
  try {
    const user = await UserNew.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'username', 'UserNew')
      .populate('retailInfo.storeGroup', 'name')
      .populate('retailInfo.store', 'name');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户未找到'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 创建用户
exports.createUser = async (req, res) => {
  try {
    req.body.createdBy = req.user?.id || '000000000000000000000000';
    
    const user = new UserNew(req.body);
    user.setDefaultPermissions();
    await user.save();
    
    // 返回时不包含密码
    const userResponse = await UserNew.findById(user._id).select('-password');
    
    res.status(201).json({
      success: true,
      data: userResponse,
      message: '用户创建成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 更新用户
exports.updateUser = async (req, res) => {
  try {
    // 如果包含密码，需要重新加密
    if (req.body.password) {
      const user = await UserNew.findById(req.params.id);
      user.password = req.body.password;
      delete req.body.password;
      Object.assign(user, req.body);
      await user.save();
      
      const userResponse = await UserNew.findById(user._id).select('-password');
      return res.json({
        success: true,
        data: userResponse,
        message: '用户更新成功'
      });
    }
    
    const user = await UserNew.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户未找到'
      });
    }
    
    res.json({
      success: true,
      data: user,
      message: '用户更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 删除用户
exports.deleteUser = async (req, res) => {
  try {
    const user = await UserNew.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户未找到'
      });
    }
    
    user.isActive = false;
    await user.save();
    
    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 更新用户权限
exports.updateUserPermissions = async (req, res) => {
  try {
    const user = await UserNew.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户未找到'
      });
    }
    
    user.permissions = req.body.permissions;
    await user.save();
    
    const userResponse = await UserNew.findById(user._id).select('-password');
    
    res.json({
      success: true,
      data: userResponse,
      message: '用户权限更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 更新用户状态
exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await UserNew.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户未找到'
      });
    }
    
    res.json({
      success: true,
      data: user,
      message: `用户已${isActive ? '启用' : '禁用'}`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};