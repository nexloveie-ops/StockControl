const ProductNew = require('../../models/ProductNew');
const ProductCategory = require('../../models/ProductCategory');
const PurchaseInvoice = require('../../models/PurchaseInvoice');
const UserNew = require('../../models/UserNew');

// 获取产品列表
exports.getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      condition, 
      vatRate, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 构建查询条件
    let query = { isActive: true };
    
    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (vatRate) query.vatRate = vatRate;
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { sku: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { model: new RegExp(search, 'i') },
        { barcode: new RegExp(search, 'i') }
      ];
    }

    // 排序
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await ProductNew.find(query)
      .populate('category', 'name type')
      .populate('createdBy', 'username', 'UserNew')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ProductNew.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取单个产品
exports.getProduct = async (req, res) => {
  try {
    const product = await ProductNew.findById(req.params.id)
      .populate('category')
      .populate({
        path: 'purchaseInvoices',
        populate: {
          path: 'supplier',
          select: 'name code'
        }
      })
      .populate('createdBy', 'username', 'UserNew')
      .populate('updatedBy', 'username', 'UserNew');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: '产品未找到'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 创建产品
exports.createProduct = async (req, res) => {
  try {
    // 验证分类是否存在
    const category = await ProductCategory.findById(req.body.category);
    if (!category) {
      return res.status(400).json({
        success: false,
        error: '产品分类不存在'
      });
    }

    // 如果没有指定税务分类，使用分类的默认值
    if (!req.body.vatRate) {
      req.body.vatRate = category.defaultVatRate;
    }

    // 如果没有指定成色，使用分类的默认值
    if (!req.body.condition) {
      req.body.condition = category.defaultCondition;
    }

    // 设置创建者
    req.body.createdBy = req.user?.id || '000000000000000000000000';

    const product = new ProductNew(req.body);
    await product.save();

    // 填充关联数据
    await product.populate('category', 'name type');

    res.status(201).json({
      success: true,
      data: product,
      message: '产品创建成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 更新产品
exports.updateProduct = async (req, res) => {
  try {
    // 设置更新者
    req.body.updatedBy = req.user?.id || '000000000000000000000000';

    const product = await ProductNew.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('category', 'name type');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: '产品未找到'
      });
    }

    res.json({
      success: true,
      data: product,
      message: '产品更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 删除产品
exports.deleteProduct = async (req, res) => {
  try {
    const product = await ProductNew.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: '产品未找到'
      });
    }

    // 软删除
    product.isActive = false;
    product.updatedBy = req.user?.id || '000000000000000000000000';
    await product.save();

    res.json({
      success: true,
      message: '产品删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};