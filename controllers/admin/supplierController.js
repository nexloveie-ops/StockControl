const SupplierNew = require('../../models/SupplierNew');
const UserNew = require('../../models/UserNew');

// 获取供应商列表
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await SupplierNew.find({ isActive: true })
      .populate('createdBy', 'username', 'UserNew')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取单个供应商
exports.getSupplier = async (req, res) => {
  try {
    const supplier = await SupplierNew.findById(req.params.id)
      .populate('createdBy', 'username', 'UserNew');
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: '供应商未找到'
      });
    }
    
    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 创建供应商
exports.createSupplier = async (req, res) => {
  try {
    req.body.createdBy = req.user?.id || '000000000000000000000000';
    
    const supplier = new SupplierNew(req.body);
    await supplier.save();
    
    res.status(201).json({
      success: true,
      data: supplier,
      message: '供应商创建成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 更新供应商
exports.updateSupplier = async (req, res) => {
  try {
    req.body.updatedBy = req.user?.id || '000000000000000000000000';
    
    const supplier = await SupplierNew.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: '供应商未找到'
      });
    }
    
    res.json({
      success: true,
      data: supplier,
      message: '供应商更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 删除供应商
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await SupplierNew.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: '供应商未找到'
      });
    }
    
    supplier.isActive = false;
    supplier.updatedBy = req.user?.id || '000000000000000000000000';
    await supplier.save();
    
    res.json({
      success: true,
      message: '供应商删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取供应商的发票
exports.getSupplierInvoices = async (req, res) => {
  try {
    const PurchaseInvoice = require('../../models/PurchaseInvoice');
    
    const invoices = await PurchaseInvoice.find({ 
      supplier: req.params.id 
    }).sort({ invoiceDate: -1 });
    
    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};