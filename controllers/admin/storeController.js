const StoreGroup = require('../../models/StoreGroup');
const Store = require('../../models/Store');
const UserNew = require('../../models/UserNew');

// ==================== 店面组管理 ====================

// 获取店面组列表
exports.getStoreGroups = async (req, res) => {
  try {
    const storeGroups = await StoreGroup.find({ isActive: true })
      .populate('createdBy', 'username', 'UserNew')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: storeGroups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 创建店面组
exports.createStoreGroup = async (req, res) => {
  try {
    req.body.createdBy = req.user?.id || '000000000000000000000000';
    
    const storeGroup = new StoreGroup(req.body);
    await storeGroup.save();
    
    res.status(201).json({
      success: true,
      data: storeGroup,
      message: '店面组创建成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 更新店面组
exports.updateStoreGroup = async (req, res) => {
  try {
    const storeGroup = await StoreGroup.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!storeGroup) {
      return res.status(404).json({
        success: false,
        error: '店面组未找到'
      });
    }
    
    res.json({
      success: true,
      data: storeGroup,
      message: '店面组更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 删除店面组
exports.deleteStoreGroup = async (req, res) => {
  try {
    const storeGroup = await StoreGroup.findById(req.params.id);
    
    if (!storeGroup) {
      return res.status(404).json({
        success: false,
        error: '店面组未找到'
      });
    }
    
    // 检查是否有店面使用此组
    const storeCount = await Store.countDocuments({ storeGroup: req.params.id });
    
    if (storeCount > 0) {
      return res.status(400).json({
        success: false,
        error: `无法删除店面组，还有 ${storeCount} 个店面属于此组`
      });
    }
    
    storeGroup.isActive = false;
    await storeGroup.save();
    
    res.json({
      success: true,
      message: '店面组删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ==================== 店面管理 ====================

// 获取店面列表
exports.getStores = async (req, res) => {
  try {
    const stores = await Store.find({ isActive: true })
      .populate('storeGroup', 'name')
      .populate('createdBy', 'username', 'UserNew')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: stores
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取单个店面
exports.getStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)
      .populate('storeGroup')
      .populate('createdBy', 'username', 'UserNew');
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: '店面未找到'
      });
    }
    
    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 创建店面
exports.createStore = async (req, res) => {
  try {
    req.body.createdBy = req.user?.id || '000000000000000000000000';
    
    const store = new Store(req.body);
    await store.save();
    
    await store.populate('storeGroup', 'name');
    
    res.status(201).json({
      success: true,
      data: store,
      message: '店面创建成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 更新店面
exports.updateStore = async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('storeGroup', 'name');
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: '店面未找到'
      });
    }
    
    res.json({
      success: true,
      data: store,
      message: '店面更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 删除店面
exports.deleteStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: '店面未找到'
      });
    }
    
    store.isActive = false;
    await store.save();
    
    res.json({
      success: true,
      message: '店面删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};