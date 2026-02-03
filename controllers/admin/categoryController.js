const ProductCategory = require('../../models/ProductCategory');

// 获取所有产品分类
exports.getCategories = async (req, res) => {
  try {
    const categories = await ProductCategory.find({ isActive: true })
      .sort({ sortOrder: 1, type: 1 });
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 创建产品分类
exports.createCategory = async (req, res) => {
  try {
    const category = new ProductCategory(req.body);
    await category.save();
    
    res.status(201).json({
      success: true,
      data: category,
      message: '分类创建成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 更新产品分类
exports.updateCategory = async (req, res) => {
  try {
    const category = await ProductCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: '分类未找到'
      });
    }
    
    res.json({
      success: true,
      data: category,
      message: '分类更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 删除产品分类
exports.deleteCategory = async (req, res) => {
  try {
    const category = await ProductCategory.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: '分类未找到'
      });
    }
    
    // 检查是否有产品使用此分类
    const ProductNew = require('../../models/ProductNew');
    const productCount = await ProductNew.countDocuments({ 
      productType: category.type,
      isActive: true 
    });
    
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        error: `无法删除分类，还有 ${productCount} 个产品使用此分类`
      });
    }
    
    // 软删除
    category.isActive = false;
    await category.save();
    
    res.json({
      success: true,
      message: '分类删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};