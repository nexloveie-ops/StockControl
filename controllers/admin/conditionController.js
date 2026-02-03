const ProductCondition = require('../../models/ProductCondition');

// 获取所有设备成色
exports.getConditions = async (req, res) => {
  try {
    const conditions = await ProductCondition.find({ isActive: true })
      .sort({ sortOrder: 1, code: 1 });
    
    res.json({
      success: true,
      data: conditions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 创建设备成色
exports.createCondition = async (req, res) => {
  try {
    const condition = new ProductCondition(req.body);
    await condition.save();
    
    res.status(201).json({
      success: true,
      data: condition,
      message: '设备成色创建成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 更新设备成色
exports.updateCondition = async (req, res) => {
  try {
    const condition = await ProductCondition.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!condition) {
      return res.status(404).json({
        success: false,
        error: '设备成色未找到'
      });
    }
    
    res.json({
      success: true,
      data: condition,
      message: '设备成色更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 删除设备成色
exports.deleteCondition = async (req, res) => {
  try {
    const condition = await ProductCondition.findById(req.params.id);
    
    if (!condition) {
      return res.status(404).json({
        success: false,
        error: '设备成色未找到'
      });
    }
    
    // 检查是否有产品使用此成色
    const ProductNew = require('../../models/ProductNew');
    const productCount = await ProductNew.countDocuments({ 
      condition: condition.code,
      isActive: true 
    });
    
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        error: `无法删除成色，还有 ${productCount} 个产品使用此成色`
      });
    }
    
    // 软删除
    condition.isActive = false;
    await condition.save();
    
    res.json({
      success: true,
      message: '设备成色删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
