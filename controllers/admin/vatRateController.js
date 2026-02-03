const VatRate = require('../../models/VatRate');

// 获取所有税率
exports.getVatRates = async (req, res) => {
  try {
    const vatRates = await VatRate.find({ isActive: true })
      .sort({ sortOrder: 1, rate: -1 });
    
    res.json({
      success: true,
      data: vatRates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 创建税率
exports.createVatRate = async (req, res) => {
  try {
    const vatRate = new VatRate(req.body);
    await vatRate.save();
    
    res.status(201).json({
      success: true,
      data: vatRate,
      message: '税率创建成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 更新税率
exports.updateVatRate = async (req, res) => {
  try {
    const vatRate = await VatRate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!vatRate) {
      return res.status(404).json({
        success: false,
        error: '税率未找到'
      });
    }
    
    res.json({
      success: true,
      data: vatRate,
      message: '税率更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 删除税率
exports.deleteVatRate = async (req, res) => {
  try {
    const vatRate = await VatRate.findById(req.params.id);
    
    if (!vatRate) {
      return res.status(404).json({
        success: false,
        error: '税率未找到'
      });
    }
    
    // 检查是否有产品使用此税率
    const ProductNew = require('../../models/ProductNew');
    const productCount = await ProductNew.countDocuments({ 
      vatRate: vatRate.code,
      isActive: true 
    });
    
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        error: `无法删除税率，还有 ${productCount} 个产品使用此税率`
      });
    }
    
    // 检查是否有分类使用此税率
    const ProductCategory = require('../../models/ProductCategory');
    const categoryCount = await ProductCategory.countDocuments({ 
      defaultVatRate: vatRate.code,
      isActive: true 
    });
    
    if (categoryCount > 0) {
      return res.status(400).json({
        success: false,
        error: `无法删除税率，还有 ${categoryCount} 个分类使用此税率`
      });
    }
    
    // 软删除
    vatRate.isActive = false;
    await vatRate.save();
    
    res.json({
      success: true,
      message: '税率删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
