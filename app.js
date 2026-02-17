const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const OpenAI = require('openai');
require('dotenv').config();

// 导入数据隔离中间件
const { applyDataIsolation, applyGroupDataFilter, getUserInfo } = require('./middleware/dataIsolation');

const app = express();

// OpenAI配置
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here'
});

// 文件上传配置
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('只支持图片和PDF文件'), false);
    }
  }
});

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// 数据库连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

let isDbConnected = false;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB 连接成功');
    isDbConnected = true;
  })
  .catch(err => {
    console.error('❌ MongoDB 连接失败:', err.message);
    console.log('📝 应用将在无数据库模式下运行');
    isDbConnected = false;
  });

// 数据库状态检查中间件
const checkDbConnection = (req, res, next) => {
  if (!isDbConnected) {
    return res.status(503).json({
      success: false,
      error: '数据库未连接',
      message: '请配置MongoDB连接后重试'
    });
  }
  next();
};

// 导入新的数据模型
const ProductCategory = require('./models/ProductCategory');
const ProductNew = require('./models/ProductNew');
const SupplierNew = require('./models/SupplierNew');
const PurchaseInvoice = require('./models/PurchaseInvoice');
const UserNew = require('./models/UserNew');
const StoreGroup = require('./models/StoreGroup');
const Store = require('./models/Store');
const StoreInventory = require('./models/StoreInventory');
const Customer = require('./models/Customer');
const SalesInvoice = require('./models/SalesInvoice');
const CompanyInfo = require('./models/CompanyInfo');

// 导入路由
const adminRoutes = require('./routes/admin');

// 使用路由
app.use('/api/admin', adminRoutes);

// 兼容旧版API的路由
app.get('/api/stats', async (req, res) => {
  try {
    const ProductNew = require('./models/ProductNew');
    const UserNew = require('./models/UserNew');
    const SupplierNew = require('./models/SupplierNew');
    
    // 查询所有激活的产品
    const allProducts = await ProductNew.find({ isActive: true });
    
    // 统计可销售的产品（有库存或有可用序列号）
    const availableProducts = allProducts.filter(product => {
      // 如果有可用序列号，就算可销售
      const hasAvailableSerials = product.serialNumbers && 
        product.serialNumbers.some(sn => sn.status === 'available');
      
      // 如果库存大于0，也算可销售
      const hasStock = product.stockQuantity > 0;
      
      return hasAvailableSerials || hasStock;
    });
    
    const stats = {
      totalProducts: availableProducts.length, // 可销售的产品总数
      availableProducts: availableProducts.length, // 可销售的产品数
      totalUsers: await UserNew.countDocuments({ isActive: true }),
      totalSuppliers: await SupplierNew.countDocuments({ isActive: true }),
      totalInvoices: 0, // 暂时设为0，因为还没有销售发票模型
      totalOrders: 0, // 暂时设为0
      productsByCategory: {
        accessories: availableProducts.filter(p => 
          p.productType && !p.productType.toLowerCase().includes('device')
        ).length,
        newDevices: availableProducts.filter(p => 
          p.productType && p.productType.toLowerCase().includes('device') && 
          p.condition === 'Brand New'
        ).length,
        usedDevices: availableProducts.filter(p => 
          p.productType && p.productType.toLowerCase().includes('device') && 
          p.condition === 'Pre-Owned'
        ).length
      }
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const { category, status, search, includeOutOfStock } = req.query;
    
    // 构建 ProductNew 查询
    let productQuery = { isActive: true };
    
    // 如果有搜索条件，允许搜索已售产品（用于追溯）
    // 如果没有搜索条件，默认不显示已售产品
    if (!search && includeOutOfStock !== 'true') {
      productQuery.stockQuantity = { $gt: 0 };
    }
    
    // 分类筛选
    if (category) {
      productQuery.productType = category;
    }
    
    // 状态筛选
    if (status) {
      productQuery.status = status;
    }
    
    // 搜索功能
    if (search) {
      productQuery.$or = [
        { name: new RegExp(search, 'i') },
        { sku: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { model: new RegExp(search, 'i') },
        { barcode: new RegExp(search, 'i') },
        { 'serialNumbers.serialNumber': new RegExp(search, 'i') },
        { notes: new RegExp(search, 'i') }
      ];
    }
    
    // 构建 AdminInventory 查询
    let adminQuery = { 
      isActive: true,
      status: 'AVAILABLE'
    };
    
    if (!search && includeOutOfStock !== 'true') {
      adminQuery.quantity = { $gt: 0 };
    }
    
    if (category) {
      adminQuery.category = category;
    }
    
    if (search) {
      adminQuery.$or = [
        { productName: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { model: new RegExp(search, 'i') },
        { color: new RegExp(search, 'i') },
        { barcode: new RegExp(search, 'i') },
        { serialNumber: new RegExp(search, 'i') },
        { notes: new RegExp(search, 'i') }
      ];
    }
    
    console.log('📦 /api/products 查询:', { 
      category, 
      search, 
      includeOutOfStock, 
      hasStockFilter: !!productQuery.stockQuantity,
      reason: search ? '有搜索条件-允许查询已售产品' : '无搜索条件-只显示有库存产品'
    });
    
    // 并行查询两个集合
    const [productNewItems, adminInventoryItems] = await Promise.all([
      ProductNew.find(productQuery)
        .populate('category', 'name type')
        .sort({ createdAt: -1 }),
      AdminInventory.find(adminQuery)
        .sort({ createdAt: -1 })
    ]);
    
    console.log(`✅ ProductNew: ${productNewItems.length} 个, AdminInventory: ${adminInventoryItems.length} 个`);
    
    // 处理 ProductNew 产品
    const productsWithTaxInclusivePrices = productNewItems.map(product => {
      const productObj = product.toObject();
      
      // 计算含税进货价
      const vatRate = productObj.vatRate || 'VAT 23%';
      let taxMultiplier = 1.0;
      
      if (vatRate === 'VAT 23%') {
        taxMultiplier = 1.23;
      } else if (vatRate === 'VAT 13.5%') {
        taxMultiplier = 1.135;
      } else if (vatRate === 'VAT 0%') {
        taxMultiplier = 1.0;
      }
      
      const costPriceIncludingTax = (productObj.costPrice || 0) * taxMultiplier;
      
      return {
        ...productObj,
        costPriceIncludingTax, // 含税进货价（用于显示）
        costPriceExcludingTax: productObj.costPrice, // 不含税进货价（备用）
        costPrice: costPriceIncludingTax,
        purchasePrice: costPriceIncludingTax,
        source: 'ProductNew'
      };
    });
    
    // 处理 AdminInventory 产品，转换为与 ProductNew 兼容的格式
    const adminProducts = adminInventoryItems.map(item => {
      const itemObj = item.toObject();
      
      // 计算含税进货价
      const taxClassification = itemObj.taxClassification || 'VAT_23';
      let taxMultiplier = 1.0;
      
      if (taxClassification === 'VAT_23') {
        taxMultiplier = 1.23;
      } else if (taxClassification === 'SERVICE_VAT_13_5') {
        taxMultiplier = 1.135;
      } else if (taxClassification === 'MARGIN_VAT_0') {
        taxMultiplier = 1.0;
      }
      
      const costPriceIncludingTax = (itemObj.costPrice || 0) * taxMultiplier;
      
      return {
        _id: itemObj._id,
        name: itemObj.productName,
        sku: `${itemObj.productName}-${itemObj.model}-${itemObj.color}`.replace(/\s+/g, '-'),
        brand: itemObj.brand || '',
        model: itemObj.model || '',
        color: itemObj.color || '',
        productType: itemObj.category,
        category: { type: itemObj.category, name: itemObj.category },
        condition: itemObj.condition,
        stockQuantity: itemObj.quantity,
        quantity: itemObj.quantity,
        costPrice: costPriceIncludingTax,
        costPriceIncludingTax: costPriceIncludingTax,
        costPriceExcludingTax: itemObj.costPrice,
        purchasePrice: costPriceIncludingTax,
        wholesalePrice: itemObj.wholesalePrice,
        retailPrice: itemObj.retailPrice,
        vatRate: taxClassification === 'VAT_23' ? 'VAT 23%' : 
                 taxClassification === 'SERVICE_VAT_13_5' ? 'VAT 13.5%' : 'VAT 0%',
        taxClassification: itemObj.taxClassification,
        barcode: itemObj.barcode || '',
        serialNumbers: itemObj.serialNumber ? [{ serialNumber: itemObj.serialNumber }] : [],
        notes: itemObj.notes || '',
        isActive: itemObj.isActive,
        status: itemObj.status,
        source: 'AdminInventory',
        createdAt: itemObj.createdAt,
        updatedAt: itemObj.updatedAt
      };
    });
    
    // 合并两个数组
    const allProducts = [...productsWithTaxInclusivePrices, ...adminProducts];
    
    // 按创建时间排序
    allProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ 
      success: true, 
      data: allProducts,
      summary: {
        productNew: productNewItems.length,
        adminInventory: adminInventoryItems.length,
        total: allProducts.length
      }
    });
  } catch (error) {
    console.error('❌ /api/products 错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/suppliers', async (req, res) => {
  try {
    const SupplierNew = require('./models/SupplierNew');
    const suppliers = await SupplierNew.find({ isActive: true });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const UserNew = require('./models/UserNew');
    const users = await UserNew.find({ isActive: true }).select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取用户profile（包括公司信息）
app.get('/api/users/profile', async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ success: false, error: '缺少用户名参数' });
    }
    
    const UserNew = require('./models/UserNew');
    const CompanyInfo = require('./models/CompanyInfo');
    
    const user = await UserNew.findOne({ username, isActive: true })
      .select('-password')
      .populate('retailInfo.storeGroup', 'name code')
      .populate('retailInfo.store', 'name');
    
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    
    // 获取默认的公司信息
    const defaultCompanyInfo = await CompanyInfo.findOne({ isDefault: true });
    
    // 将公司信息添加到用户数据中
    const userData = user.toObject();
    userData.companyInfo = defaultCompanyInfo || userData.companyInfo;
    
    res.json({ success: true, data: userData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/invoices', (req, res) => {
  res.json({ success: true, data: [] }); // 暂时返回空数组
});

app.get('/api/purchase-orders', (req, res) => {
  res.json({ success: true, data: [] }); // 暂时返回空数组
});

// 获取单个采购订单/发票详情（包含AdminInventory数据）
app.get('/api/purchase-orders/:id', checkDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    const AdminInventory = require('./models/AdminInventory');
    const SupplierNew = require('./models/SupplierNew');
    
    console.log(`\n📋 获取发票详情: ${id}`);
    
    let invoice = null;
    let invoiceNumber = null;
    
    // 检查是否是发票编号格式（如"admin-SI-003"）
    if (id.startsWith('admin-')) {
      invoiceNumber = id.replace('admin-', '');
      console.log(`   检测到发票编号格式: ${invoiceNumber}`);
      
      // 尝试从PurchaseInvoice查找
      invoice = await PurchaseInvoice.findOne({ invoiceNumber })
        .populate('supplier', 'name code phone email address')
        .populate('items.product', 'name sku barcode')
        .lean();
      
      if (!invoice) {
        console.log(`   PurchaseInvoice中未找到，查询AdminInventory`);
        
        // 从AdminInventory查找产品
        const adminProducts = await AdminInventory.find({ invoiceNumber }).lean();
        
        if (adminProducts.length === 0) {
          console.log(`❌ 发票不存在: ${invoiceNumber}`);
          return res.status(404).json({
            success: false,
            error: '发票不存在'
          });
        }
        
        console.log(`   AdminInventory中找到 ${adminProducts.length} 个产品`);
        
        // 获取供货商信息
        const supplierId = adminProducts[0].supplier;
        const supplier = supplierId ? await SupplierNew.findById(supplierId).lean() : null;
        
        // 构造虚拟发票对象
        invoice = {
          _id: `admin-${invoiceNumber}`,
          invoiceNumber: invoiceNumber,
          supplier: supplier || { name: '未知供货商' },
          invoiceDate: adminProducts[0].createdAt,
          dueDate: null,
          currency: 'EUR',
          paymentStatus: '已付款',
          paidAmount: 0,
          status: '已完成',
          receivingStatus: '已收货',
          notes: '此发票仅存在于库存系统中',
          payments: [],
          attachments: [],
          createdAt: adminProducts[0].createdAt,
          updatedAt: adminProducts[0].updatedAt,
          items: [],
          source: 'AdminInventory'
        };
      }
    } else {
      // 按ObjectId查询
      invoice = await PurchaseInvoice.findById(id)
        .populate('supplier', 'name code phone email address')
        .populate('items.product', 'name sku barcode')
        .lean();
      
      if (!invoice) {
        console.log(`❌ 发票不存在: ${id}`);
        return res.status(404).json({
          success: false,
          error: '发票不存在'
        });
      }
      
      invoiceNumber = invoice.invoiceNumber;
    }
    
    console.log(`✅ 找到发票: ${invoiceNumber}`);
    console.log(`   PurchaseInvoice items: ${invoice.items?.length || 0}`);
    
    // 查询AdminInventory中关联到该订单号的产品
    const adminProducts = await AdminInventory.find({ 
      invoiceNumber: invoiceNumber
    }).lean();
    
    console.log(`   AdminInventory products: ${adminProducts.length}`);
    
    // 格式化AdminInventory产品为发票items格式
    const adminItems = adminProducts.map(product => ({
      _id: product._id,
      description: `${product.productName} - ${product.model} - ${product.color}`,
      product: product._id,
      productName: product.productName,
      model: product.model,
      color: product.color,
      quantity: product.quantity,
      unitCost: product.costPrice,
      totalCost: product.costPrice * product.quantity,
      vatRate: product.taxClassification === 'VAT_23' ? 'VAT 23%' : 
               product.taxClassification === 'VAT_13_5' ? 'VAT 13.5%' : 'VAT 0%',
      taxAmount: 0, // AdminInventory价格已含税
      serialNumbers: product.serialNumber ? [product.serialNumber] : [],
      location: product.location,
      condition: product.condition,
      source: 'AdminInventory'
    }));
    
    // 合并PurchaseInvoice items和AdminInventory items
    const allItems = [
      ...(invoice.items || []).map(item => ({
        ...item,
        source: 'PurchaseInvoice'
      })),
      ...adminItems
    ];
    
    console.log(`   合并后总items: ${allItems.length}`);
    
    // 重新计算总金额
    const totalFromAdmin = adminItems.reduce((sum, item) => sum + item.totalCost, 0);
    const totalFromInvoice = (invoice.items || []).reduce((sum, item) => sum + (item.totalCost || 0), 0);
    
    const responseData = {
      ...invoice,
      items: allItems,
      totalAmount: totalFromInvoice + totalFromAdmin,
      adminInventoryCount: adminItems.length,
      purchaseInvoiceCount: (invoice.items || []).length
    };
    
    console.log(`   返回数据: items=${responseData.items.length}, total=€${responseData.totalAmount}`);
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('❌ 获取采购订单详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 产品分组API（用于库存管理页面）
app.get('/api/products/groups', async (req, res) => {
  try {
    const ProductNew = require('./models/ProductNew');
    const ProductCategory = require('./models/ProductCategory');
    
    // 只查询有库存的产品
    const products = await ProductNew.find({ 
      isActive: true,
      stockQuantity: { $gt: 0 }
    }).populate('category', 'name type');
    
    // 按分类分组
    const groups = {};
    
    products.forEach(product => {
      const key = `${product.category?.type || 'Unknown'}_${product.condition}`;
      
      if (!groups[key]) {
        groups[key] = {
          productType: product.category?.type || 'Unknown',
          category: product.condition,
          products: [],
          productIds: [],
          totalStock: 0,
          availableStock: 0,
          totalValue: 0
        };
      }
      
      groups[key].products.push(product);
      groups[key].productIds.push(product._id);
      groups[key].totalStock += product.stockQuantity;
      groups[key].availableStock += product.stockQuantity; // 简化处理
      groups[key].totalValue += product.retailPrice * product.stockQuantity;
    });
    
    // 转换为数组并添加统计信息
    const groupArray = Object.values(groups).map(group => {
      // 计算最近进货（最新的创建日期）
      const latestProcurement = group.products.reduce((latest, p) => {
        return !latest || new Date(p.createdAt) > new Date(latest) 
          ? p.createdAt 
          : latest;
      }, null);
      
      // 计算平均价格
      const avgPurchasePrice = group.products.reduce((sum, p) => sum + p.costPrice, 0) / group.products.length;
      const avgRetailPrice = group.products.reduce((sum, p) => sum + p.retailPrice, 0) / group.products.length;
      
      return {
        productType: group.productType,
        category: group.category,
        totalStock: group.totalStock,
        availableStock: group.availableStock,
        totalValue: group.totalValue,
        latestProcurement,
        avgPurchasePrice,
        avgRetailPrice,
        productCount: group.products.length,
        last30DaysSales: 0, // 暂时设为0
        estimatedMonths: 'N/A'
      };
    });
    
    res.json({ success: true, data: groupArray });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 产品分组详情API
app.get('/api/products/group-details', async (req, res) => {
  try {
    const { productType, category } = req.query;
    
    console.log('📦 产品分组详情查询:', { productType, category });
    
    if (!productType || !category) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少productType或category参数' 
      });
    }
    
    const ProductNew = require('./models/ProductNew');
    const ProductCategory = require('./models/ProductCategory');
    
    // 查找匹配的产品（只查询有库存的）
    const categoryDoc = await ProductCategory.findOne({ type: productType });
    const query = { 
      isActive: true,
      stockQuantity: { $gt: 0 }, // 只查询有库存的产品
      condition: category,
      ...(categoryDoc ? { category: categoryDoc._id } : {})
    };
    
    console.log('🔍 查询条件:', JSON.stringify(query, null, 2));
    
    const rawProducts = await ProductNew.find(query).populate('category', 'name type');
    
    console.log(`✅ 找到 ${rawProducts.length} 个有库存的产品`);
    rawProducts.forEach(p => {
      console.log(`  - ${p.name}: 库存=${p.stockQuantity}`);
    });
    
    if (rawProducts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '未找到产品' 
      });
    }
    
    // 转换产品数据格式以匹配前端期望
    const transformedProducts = rawProducts.map(product => {
      // 计算税额（简化处理）
      let taxRate = 0;
      if (product.vatRate === 'VAT 23%') taxRate = 0.23;
      else if (product.vatRate === 'VAT 13.5%') taxRate = 0.135;
      
      const purchaseTax = product.costPrice * taxRate / (1 + taxRate);
      const purchasePriceExTax = product.costPrice - purchaseTax;
      
      return {
        _id: product._id,
        name: product.name,
        sku: product.sku || '',
        brand: product.brand || '',
        model: product.model || '',
        category: product.condition, // 使用condition作为category
        productType: product.category?.type || productType,
        barcode: product.barcode || '',
        serialNumber: product.serialNumbers?.[0]?.serialNumber || '',
        quantity: product.stockQuantity,
        purchasePrice: purchasePriceExTax || 0,
        purchaseTax: purchaseTax || 0,
        wholesalePrice: product.costPrice || 0,
        suggestedRetailPrice: product.retailPrice || 0,
        taxClassification: product.vatRate === 'VAT 23%' ? 'VAT_23' : 
                          product.vatRate === 'VAT 13.5%' ? 'SERVICE_VAT_13_5' : 'MARGIN_VAT_0',
        status: product.stockQuantity > 0 ? 'AVAILABLE' : 'SOLD',
        warehouseLocation: product.specifications?.get('location') || 'A1-01',
        conditionGrade: product.condition === 'Pre-Owned' ? 'B' : 'A',
        procurementDate: product.createdAt,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      };
    });
    
    // 计算统计信息
    let totalStock = 0;
    let availableStock = 0;
    let totalValue = 0;
    
    transformedProducts.forEach(product => {
      totalStock += product.quantity;
      if (product.status === 'AVAILABLE') {
        availableStock += product.quantity;
      }
      totalValue += product.suggestedRetailPrice * product.quantity;
    });
    
    // 最近进货日期
    const latestProcurement = transformedProducts.reduce((latest, p) => {
      return !latest || new Date(p.procurementDate) > new Date(latest) 
        ? p.procurementDate 
        : latest;
    }, null);
    
    res.json({ 
      success: true, 
      data: {
        productType,
        category,
        products: transformedProducts,
        statistics: {
          totalStock,
          availableStock,
          totalValue: totalValue || 0,
          latestProcurement,
          monthlySales: 0,
          last30DaysSales: 0,
          estimatedMonths: 'N/A',
          productCount: transformedProducts.length
        }
      }
    });
  } catch (error) {
    console.error('Group details API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'StockControl 新系统运行中',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// 数据库状态检查
app.get('/api/db-status', (req, res) => {
  res.json({
    success: true,
    connected: isDbConnected,
    message: isDbConnected ? 'MongoDB连接正常' : 'MongoDB未连接'
  });
});

// ==================== 图片识别API ====================
// 上传并识别发票图片
app.post('/api/admin/recognize-invoice', upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传文件'
      });
    }

    console.log('收到文件:', req.file.originalname, req.file.mimetype, req.file.size);

    // 检查OpenAI API密钥
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      console.log('OpenAI API密钥未配置，使用模拟数据');
      return res.json({
        success: true,
        data: generateMockRecognitionData(req.file.originalname)
      });
    }

    // 将文件转换为base64
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    // 调用OpenAI Vision API
    console.log('调用OpenAI Vision API...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // 使用最新的GPT-4o模型，支持视觉
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `请分析这张发票图片，提取以下信息并以JSON格式返回：
              {
                "supplier": {
                  "name": "供应商名称",
                  "address": "供应商地址",
                  "phone": "电话号码",
                  "email": "邮箱地址",
                  "confidence": 95
                },
                "invoice": {
                  "number": "发票号码",
                  "date": "发票日期(YYYY-MM-DD格式)",
                  "dueDate": "到期日期",
                  "currency": "货币(EUR/USD/CNY等)"
                },
                "products": [
                  {
                    "name": "产品名称",
                    "brand": "品牌",
                    "model": "型号",
                    "color": "颜色",
                    "quantity": 数量,
                    "unitPrice": 单价,
                    "totalPrice": 总价,
                    "category": "产品分类(手机配件/电脑配件/车载配件/数据线/全新设备/二手设备/维修等)",
                    "confidence": 90
                  }
                ],
                "totals": {
                  "subtotal": 小计,
                  "tax": 税额,
                  "total": 总计
                }
              }
              
              请仔细识别图片中的文字信息，如果某些信息不清楚或无法识别，请在confidence字段中反映出来。`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1500
    });

    const content = response.choices[0].message.content;
    console.log('OpenAI响应:', content);

    // 尝试解析JSON响应
    let recognitionData;
    try {
      // 提取JSON部分（可能包含在代码块中）
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      recognitionData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('解析OpenAI响应失败:', parseError);
      // 如果解析失败，返回模拟数据
      recognitionData = generateMockRecognitionData(req.file.originalname);
    }

    res.json({
      success: true,
      data: recognitionData
    });

  } catch (error) {
    console.error('图片识别失败:', error);
    
    // 如果OpenAI API调用失败，返回模拟数据
    res.json({
      success: true,
      data: generateMockRecognitionData(req.file ? req.file.originalname : 'unknown'),
      note: '使用模拟数据（API调用失败）'
    });
  }
});

// 生成模拟识别数据
function generateMockRecognitionData(filename = '') {
  const lowerFilename = filename.toLowerCase();
  
  // 根据文件名生成不同的供应商数据
  const suppliers = [
    {
      name: 'TechSource Ltd',
      address: 'Dublin Technology Park, Ireland',
      phone: '+353-1-234-5678',
      email: 'orders@techsource.ie',
      confidence: 96
    },
    {
      name: 'Mobile Parts Pro',
      address: 'Cork Business Park, Ireland', 
      phone: '+353-21-456-7890',
      email: 'sales@mobileparts.ie',
      confidence: 93
    },
    {
      name: 'Electronics Wholesale Ltd',
      address: 'Galway Industrial Estate, Ireland',
      phone: '+353-91-123-4567', 
      email: 'info@elecwholesale.ie',
      confidence: 89
    },
    {
      name: 'Digital Components Ireland',
      address: 'Limerick Tech Hub, Ireland',
      phone: '+353-61-987-6543',
      email: 'orders@digitalcomp.ie', 
      confidence: 91
    },
    {
      name: 'Celtic Tech Supplies',
      address: 'Waterford Business Centre, Ireland',
      phone: '+353-51-234-5678',
      email: 'info@celtictechsupplies.ie',
      confidence: 88
    }
  ];
  
  // 根据文件名和当前时间选择供应商（更随机）
  let supplierIndex = 0;
  if (lowerFilename.includes('mobile') || lowerFilename.includes('phone')) {
    supplierIndex = 1;
  } else if (lowerFilename.includes('electronic') || lowerFilename.includes('elec')) {
    supplierIndex = 2;
  } else if (lowerFilename.includes('digital') || lowerFilename.includes('comp')) {
    supplierIndex = 3;
  } else if (lowerFilename.includes('celtic') || lowerFilename.includes('waterford')) {
    supplierIndex = 4;
  } else {
    // 根据文件名哈希和当前时间选择
    const hash = filename.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    supplierIndex = Math.abs(hash + Date.now()) % suppliers.length;
  }
  
  const supplier = suppliers[supplierIndex];
  
  // 生成不同的产品数据
  const productSets = [
    [
      {
        name: 'iPhone 15 Pro 保护壳',
        brand: 'Apple',
        model: 'A2848',
        color: '透明',
        quantity: 50,
        unitPrice: 8.50,
        wholesalePrice: 10.20, // 批发价
        totalPrice: 425.00,
        category: '手机配件',
        condition: 'Brand New',
        barcode: '1234567890123',
        confidence: 94
      },
      {
        name: 'USB-C 充电线',
        brand: 'Anker',
        model: 'A8856',
        color: '黑色',
        quantity: 100,
        unitPrice: 3.20,
        wholesalePrice: 3.84, // 批发价
        totalPrice: 320.00,
        category: '数据线',
        condition: 'Brand New',
        barcode: '2345678901234',
        confidence: 91
      }
    ],
    [
      {
        name: 'Samsung Galaxy S24 钢化膜',
        brand: 'Samsung',
        model: 'S24-GLASS',
        quantity: 200,
        unitPrice: 2.80,
        wholesalePrice: 3.36, // 批发价
        totalPrice: 560.00,
        category: '手机配件',
        condition: 'Brand New',
        barcode: '3456789012345',
        confidence: 89
      },
      {
        name: 'iPhone 14 Pro Max',
        brand: 'Apple',
        model: 'A2894',
        quantity: 1,
        unitPrice: 850.00,
        wholesalePrice: 950.00, // 批发价
        totalPrice: 850.00,
        category: '二手设备',
        condition: 'Pre-Owned',
        serialNumber: '359123456789012',
        confidence: 95
      }
    ],
    [
      {
        name: 'MacBook Pro 充电器',
        brand: 'Apple',
        model: 'MagSafe3-96W',
        quantity: 25,
        unitPrice: 45.00,
        wholesalePrice: 54.00, // 批发价
        totalPrice: 1125.00,
        category: '电脑配件',
        condition: 'Brand New',
        barcode: '4567890123456',
        confidence: 92
      },
      {
        name: 'MacBook Air M2',
        brand: 'Apple',
        model: 'MBA-M2-13',
        quantity: 1,
        unitPrice: 1200.00,
        wholesalePrice: 1350.00, // 批发价
        totalPrice: 1200.00,
        category: '全新设备',
        condition: 'Brand New',
        serialNumber: 'C02YX1234567',
        confidence: 98
      }
    ],
    [
      {
        name: '蓝牙耳机',
        brand: 'Sony',
        model: 'WH-1000XM5',
        quantity: 15,
        unitPrice: 180.00,
        wholesalePrice: 216.00, // 批发价
        totalPrice: 2700.00,
        category: 'audio',
        condition: 'Brand New',
        barcode: '5678901234567',
        confidence: 95
      },
      {
        name: 'iPad Pro 11"',
        brand: 'Apple',
        model: 'IPAD-PRO-11-2024',
        quantity: 1,
        unitPrice: 750.00,
        wholesalePrice: 825.00, // 批发价
        totalPrice: 750.00,
        category: '二手设备',
        condition: 'Pre-Owned',
        serialNumber: 'DMPH2X1234567',
        confidence: 92
      }
    ]
  ];
  
  const products = productSets[supplierIndex];
  const subtotal = products.reduce((sum, p) => sum + p.totalPrice, 0);
  const tax = subtotal * 0.23; // 23% VAT
  const total = subtotal + tax;
  
  return {
    supplier: supplier,
    invoice: {
      number: `INV-2026-${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'EUR'
    },
    products: products,
    totals: {
      subtotal: subtotal,
      tax: tax,
      total: total
    }
  };
}

// ==================== 入库管理API ====================
// 确认入库 - 保存供应商、产品和采购订单
app.post('/api/admin/receiving/confirm', async (req, res) => {
  try {
    const { supplier, products, invoiceInfo } = req.body;
    
    if (!supplier || !products || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少必要的入库信息'
      });
    }

    console.log('开始处理入库确认:', { supplier: supplier.name, productCount: products.length });

    // 1. 检查或创建供应商
    let supplierDoc = await SupplierNew.findOne({ 
      $or: [
        { name: supplier.name },
        { 'contact.email': supplier.email }
      ]
    });

    if (!supplierDoc) {
      console.log('创建新供应商:', supplier.name);
      
      // 获取系统用户ID（admin用户）
      const UserNew = require('./models/UserNew');
      let systemUser = await UserNew.findOne({ username: 'admin' });
      if (!systemUser) {
        // 如果没有admin用户，创建一个系统用户
        systemUser = new UserNew({
          username: 'system',
          email: 'system@stockcontrol.com',
          password: 'system123',
          role: 'admin',
          fullName: 'System User',
          isActive: true
        });
        await systemUser.save();
      }
      
      supplierDoc = new SupplierNew({
        name: supplier.name,
        code: supplier.name.replace(/\s+/g, '').toUpperCase().substring(0, 10) + Date.now().toString().slice(-3), // 生成唯一代码
        contact: {
          person: supplier.contactPerson || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          address: {
            street: supplier.address || '',
            city: '',
            state: '',
            postalCode: '',
            country: 'Ireland'
          }
        },
        financial: {
          paymentTerms: 'net30', // 使用小写的枚举值
          currency: 'EUR'
        },
        notes: `通过图片识别自动创建 - 置信度: ${supplier.confidence}%`,
        createdBy: systemUser._id,
        isActive: true
      });
      await supplierDoc.save();
    }

    // 2. 创建或更新产品
    const createdProducts = [];
    const updatedProducts = [];
    for (const product of products) {
      try {
        // 查找产品分类
        let category = await ProductCategory.findOne({ 
          $or: [
            { type: product.category },
            { name: product.category }
          ]
        });
        if (!category) {
          // 创建新分类
          category = new ProductCategory({
            name: product.category,
            type: product.category,
            vatRate: product.vatRate || 'VAT 23%',
            isActive: true
          });
          await category.save();
          console.log('创建新产品分类:', product.category);
        }

        // 生成SKU（如果产品没有SKU）
        const generateSKU = (name, brand, model) => {
          const namePart = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4);
          const brandPart = (brand || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 3);
          const modelPart = (model || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 3);
          const timestamp = Date.now().toString().slice(-4);
          return `${namePart}${brandPart}${modelPart}${timestamp}`.substring(0, 20);
        };

        // 检查产品是否已存在（更严格的匹配）
        let productDoc = await ProductNew.findOne({
          name: product.name,
          brand: product.brand || '',
          model: product.model || ''
        });

        if (productDoc) {
          // 更新库存
          productDoc.stockQuantity += product.quantity;
          productDoc.lastProcurementDate = new Date();
          productDoc.condition = product.condition || productDoc.condition;
          
          // 更新条码（如果提供）
          if (product.barcode && !productDoc.barcode) {
            productDoc.barcode = product.barcode;
          }
          
          // 添加序列号（如果提供）
          if (product.serialNumber) {
            const existingSerial = productDoc.serialNumbers.find(sn => sn.serialNumber === product.serialNumber);
            if (!existingSerial) {
              productDoc.serialNumbers.push({
                serialNumber: product.serialNumber,
                color: product.color || '',
                status: 'available',
                purchaseInvoice: null // 稍后会更新
              });
              console.log(`  ✅ 添加序列号: ${product.serialNumber}${product.color ? ` (${product.color})` : ''}`);
            } else {
              console.log(`  ⚠️  序列号已存在: ${product.serialNumber}`);
            }
          }
          
          // 更新价格（如果新价格更低，可能是更好的采购价）
          if (product.unitPrice < productDoc.costPrice) {
            productDoc.costPrice = product.unitPrice;
          }
          
          // 更新批发价（如果提供）
          if (product.wholesalePrice && product.wholesalePrice > productDoc.costPrice) {
            productDoc.wholesalePrice = product.wholesalePrice;
          }
          
          // 更新零售价（如果提供，应该高于批发价）
          if (product.retailPrice && product.retailPrice > (productDoc.wholesalePrice || productDoc.costPrice)) {
            productDoc.retailPrice = product.retailPrice;
          }
          
          await productDoc.save();
          updatedProducts.push(productDoc);
          console.log('更新现有产品库存:', product.name, '+', product.quantity,
                     `进货价: €${product.unitPrice}`, `批发价: €${product.wholesalePrice || 'N/A'}`,
                     product.serialNumber ? `新增序列号: ${product.serialNumber}` : '');
        } else {
          // 获取系统用户ID（admin用户）
          const UserNew = require('./models/UserNew');
          let systemUser = await UserNew.findOne({ username: 'admin' });
          if (!systemUser) {
            // 如果没有admin用户，创建一个系统用户
            systemUser = new UserNew({
              username: 'system',
              email: 'system@stockcontrol.com',
              password: 'system123',
              role: 'admin',
              fullName: 'System User',
              isActive: true
            });
            await systemUser.save();
          }

          // 创建新产品
          productDoc = new ProductNew({
            name: product.name,
            sku: generateSKU(product.name, product.brand, product.model),
            brand: product.brand || '',
            model: product.model || '',
            color: product.color || '',
            category: category._id,
            productType: product.category, // 使用category作为productType
            condition: product.condition || 'Brand New',
            costPrice: product.unitPrice || 0, // 进货价
            wholesalePrice: product.wholesalePrice || (product.unitPrice || 0) * 1.2, // 批发价或默认20%毛利
            retailPrice: product.retailPrice || (product.wholesalePrice || (product.unitPrice || 0) * 1.2) * 1.3, // 零售价或默认30%毛利
            stockQuantity: product.quantity || 0,
            vatRate: product.vatRate || 'VAT 23%',
            barcode: product.barcode || undefined,
            serialNumbers: product.serialNumber ? [{
              serialNumber: product.serialNumber,
              color: product.color || '',
              status: 'available',
              purchaseInvoice: null // 稍后会更新
            }] : [],
            specifications: new Map(),
            isActive: true,
            lastProcurementDate: new Date(),
            createdBy: systemUser._id
          });
          
          await productDoc.save();
          createdProducts.push(productDoc);
          console.log('✅ 创建新产品成功:', product.name, 'SKU:', productDoc.sku, '库存:', product.quantity, 
                     `进货价: €${product.unitPrice}`, `批发价: €${product.wholesalePrice || productDoc.wholesalePrice}`, `零售价: €${product.retailPrice || productDoc.retailPrice}`,
                     product.serialNumber ? `序列号: ${product.serialNumber}` : '', 
                     product.barcode ? `条码: ${product.barcode}` : '');
        }
      } catch (productError) {
        console.error('❌ 处理产品失败:', product.name, productError.message);
        console.error('产品数据:', JSON.stringify(product, null, 2));
        console.error('错误详情:', productError);
        // 继续处理其他产品，不要中断整个流程
      }
    }

    // 3. 创建采购发票记录
    if (invoiceInfo) {
      try {
        // 获取系统用户ID（admin用户）
        const UserNew = require('./models/UserNew');
        let systemUser = await UserNew.findOne({ username: 'admin' });
        if (!systemUser) {
          // 如果没有admin用户，创建一个系统用户
          systemUser = new UserNew({
            username: 'system',
            email: 'system@stockcontrol.com',
            password: 'system123',
            role: 'admin',
            fullName: 'System User',
            isActive: true
          });
          await systemUser.save();
        }

        // 计算税额
        const calculateTaxAmount = (products) => {
          return products.reduce((totalTax, p) => {
            const itemSubtotal = (p.quantity || 1) * (p.unitPrice || 0);
            let itemTax = 0;
            
            // 根据VAT税率计算税额
            if (p.vatRate === 'VAT 23%') {
              itemTax = itemSubtotal * 0.23;
            } else if (p.vatRate === 'VAT 13.5%') {
              itemTax = itemSubtotal * 0.135;
            } else if (p.vatRate === 'VAT 0%') {
              itemTax = 0;
            }
            
            return totalTax + itemTax;
          }, 0);
        };
        
        const subtotalAmount = invoiceInfo.subtotal || products.reduce((sum, p) => sum + ((p.quantity || 1) * (p.unitPrice || 0)), 0);
        const taxAmount = calculateTaxAmount(products);
        const totalAmount = subtotalAmount + taxAmount;

        const invoice = new PurchaseInvoice({
          supplier: supplierDoc._id,
          invoiceNumber: invoiceInfo.number || `INV-${Date.now()}`,
          invoiceDate: new Date(invoiceInfo.date) || new Date(),
          dueDate: new Date(invoiceInfo.dueDate) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          currency: invoiceInfo.currency || 'EUR',
          items: products.map((p) => {
            // 查找对应的产品文档
            const productDoc = [...createdProducts, ...updatedProducts].find(doc => {
              // 通过序列号或名称匹配
              if (p.serialNumber && doc.serialNumbers) {
                return doc.serialNumbers.some(sn => sn.serialNumber === p.serialNumber);
              }
              return doc.name === p.name;
            });
            
            const itemSubtotal = (p.quantity || 1) * (p.unitPrice || 0);
            let itemTax = 0;
            
            // 计算单项税额
            if (p.vatRate === 'VAT 23%') {
              itemTax = itemSubtotal * 0.23;
            } else if (p.vatRate === 'VAT 13.5%') {
              itemTax = itemSubtotal * 0.135;
            }
            
            return {
              product: productDoc ? productDoc._id : null,
              description: p.name,
              quantity: p.quantity,
              unitCost: p.unitPrice,
              totalCost: p.totalPrice || itemSubtotal,
              vatRate: p.vatRate || 'VAT 23%',
              taxAmount: itemTax,
              serialNumbers: p.serialNumber ? [p.serialNumber] : (p.barcode ? [] : [])
            };
          }).filter(item => item.product), // 只包含有效的产品ID
          subtotal: subtotalAmount,
          taxAmount: taxAmount,
          totalAmount: totalAmount,
          status: 'received',
          receivingStatus: 'complete',
          notes: '通过图片识别自动创建',
          createdBy: systemUser._id
        });
        await invoice.save();
        console.log('创建采购发票:', invoiceInfo.number, '包含', invoice.items.length, '个产品');
        
        // 打印序列号信息用于调试
        invoice.items.forEach((item, idx) => {
          if (item.serialNumbers && item.serialNumbers.length > 0) {
            console.log(`  产品 ${idx + 1}: ${item.description}, 序列号: ${item.serialNumbers.join(', ')}`);
          }
        });
      } catch (invoiceError) {
        console.error('创建采购发票失败:', invoiceError);
        // 不要因为发票创建失败而中断整个流程
      }
    }

    res.json({
      success: true,
      message: '入库成功',
      data: {
        supplier: supplierDoc,
        productsCreated: createdProducts.length,
        productsUpdated: updatedProducts.length
      }
    });

  } catch (error) {
    console.error('入库确认失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 批量创建产品变体
app.post('/api/admin/inventory/batch-create-variants', checkDbConnection, async (req, res) => {
  try {
    const AdminInventory = require('./models/AdminInventory');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    
    const {
      merchantId,  // 这里实际上是管理员ID，保持参数名兼容前端
      productName,
      category,
      brand,
      invoiceNumber,  // 新增：订单号
      supplier,       // 新增：供货商
      location,       // 新增：位置
      dimension1Label,
      dimension1Values,
      dimension2Label,
      dimension2Values,
      costPrice,
      wholesalePrice,
      retailPrice,
      taxClassification,
      initialQuantity,
      condition,
      notes
    } = req.body;
    
    // 验证必填字段
    if (!productName || !category || !dimension1Values || !dimension2Values) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段'
      });
    }
    
    if (!supplier || !location) {
      return res.status(400).json({
        success: false,
        error: '缺少供货商或位置信息'
      });
    }
    
    // 验证数组
    if (!Array.isArray(dimension1Values) || !Array.isArray(dimension2Values)) {
      return res.status(400).json({
        success: false,
        error: '维度值必须是数组'
      });
    }
    
    if (dimension1Values.length === 0 || dimension2Values.length === 0) {
      return res.status(400).json({
        success: false,
        error: '维度值不能为空'
      });
    }
    
    // 验证供货商是否存在（如果提供了订单号）
    if (invoiceNumber) {
      const SupplierNew = require('./models/SupplierNew');
      const supplierDoc = await SupplierNew.findOne({ name: supplier });
      
      if (!supplierDoc) {
        return res.status(400).json({
          success: false,
          error: `供货商 "${supplier}" 不存在`
        });
      }
    }
    
    // 生成所有变体组合
    const variants = [];
    
    for (const dim1Value of dimension1Values) {
      for (const dim2Value of dimension2Values) {
        const variant = {
          productName: productName.trim(),
          category: category.trim(),
          brand: brand ? brand.trim() : '',
          model: dim1Value.trim(),  // 维度1存储在model字段
          color: dim2Value.trim(),  // 维度2存储在color字段
          quantity: initialQuantity || 0,
          costPrice: parseFloat(costPrice) || 0,
          wholesalePrice: parseFloat(wholesalePrice) || 0,
          retailPrice: parseFloat(retailPrice) || 0,
          taxClassification: taxClassification || 'VAT_23',
          condition: condition || 'BRAND_NEW',
          supplier: supplier,
          location: location,
          source: invoiceNumber ? 'invoice' : 'manual',
          invoiceNumber: invoiceNumber || undefined,
          status: 'AVAILABLE',
          salesStatus: 'UNSOLD',
          notes: notes || '',
          isActive: true
        };
        
        variants.push(variant);
      }
    }
    
    // 批量插入到管理员库存
    const createdVariants = await AdminInventory.insertMany(variants);
    
    console.log(`✅ 批量创建变体成功: ${createdVariants.length} 个变体`);
    console.log(`   产品: ${productName}`);
    console.log(`   供货商: ${supplier}`);
    console.log(`   位置: ${location}`);
    if (invoiceNumber) {
      console.log(`   订单号: ${invoiceNumber}`);
    }
    console.log(`   ${dimension1Label || 'Model'}: ${dimension1Values.join(', ')}`);
    console.log(`   ${dimension2Label || 'Color'}: ${dimension2Values.join(', ')}`);
    
    res.json({
      success: true,
      message: `成功创建 ${createdVariants.length} 个产品变体`,
      data: {
        created: createdVariants.length,
        productName: productName,
        supplier: supplier,
        location: location,
        invoiceNumber: invoiceNumber || null,
        dimension1Count: dimension1Values.length,
        dimension2Count: dimension2Values.length,
        variants: createdVariants
      }
    });
    
  } catch (error) {
    console.error('批量创建变体失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取采购订单列表
app.get('/api/admin/purchase-orders', async (req, res) => {
  try {
    const orders = await PurchaseInvoice.find({ isActive: true })
      .populate('supplier', 'name contact.email contact.phone')
      .sort({ createdAt: -1 })
      .limit(50);
    
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      invoiceNumber: order.invoiceNumber,
      supplier: order.supplier ? {
        name: order.supplier.name,
        email: order.supplier.contact?.email || '',
        phone: order.supplier.contact?.phone || ''
      } : { name: '未知供应商', email: '', phone: '' },
      invoiceDate: order.invoiceDate,
      totalAmount: order.totalAmount,
      currency: order.currency,
      status: order.status,
      itemCount: order.items ? order.items.length : 0,
      notes: order.notes
    }));
    
    res.json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('获取采购订单失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取单个采购发票详情
app.get('/api/admin/purchase-orders/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const AdminInventory = require('./models/AdminInventory');
    const SupplierNew = require('./models/SupplierNew');
    
    console.log(`\n📋 [Admin API] 获取发票详情: ${invoiceId}`);
    
    let invoice = null;
    let invoiceNumber = null;
    
    // 检查是否是发票编号格式（如"admin-SI-003"）
    if (invoiceId.startsWith('admin-')) {
      invoiceNumber = invoiceId.replace('admin-', '');
      console.log(`   检测到发票编号格式: ${invoiceNumber}`);
      
      // 尝试从PurchaseInvoice查找
      invoice = await PurchaseInvoice.findOne({ invoiceNumber })
        .populate('supplier', 'name contact.email contact.phone contact.address')
        .populate('items.product', 'name barcode serialNumbers');
      
      if (!invoice) {
        console.log(`   PurchaseInvoice中未找到，查询AdminInventory和MerchantInventory`);
        
        // 从AdminInventory查找产品
        const adminProducts = await AdminInventory.find({ invoiceNumber }).lean();
        
        // 从MerchantInventory查找产品（从notes字段匹配发票号）
        const MerchantInventory = require('./models/MerchantInventory');
        const merchantProducts = await MerchantInventory.find({
          notes: { $regex: new RegExp(`发票号:\\s*${invoiceNumber}`, 'i') }
        }).lean();
        
        console.log(`   AdminInventory中找到 ${adminProducts.length} 个产品`);
        console.log(`   MerchantInventory中找到 ${merchantProducts.length} 个产品`);
        
        // 合并产品列表
        const allProducts = [...adminProducts, ...merchantProducts];
        
        if (allProducts.length === 0) {
          console.log(`❌ 发票不存在: ${invoiceNumber}`);
          return res.status(404).json({
            success: false,
            error: '发票不存在'
          });
        }
        
        // 获取供货商信息
        let supplierName = '未知供货商';
        let supplierId = null;
        
        // 优先从AdminInventory获取供货商
        if (adminProducts.length > 0 && adminProducts[0].supplier) {
          supplierName = adminProducts[0].supplier;
          console.log(`   从AdminInventory获取供货商: ${supplierName}`);
        } 
        // 如果AdminInventory没有，从MerchantInventory的notes提取
        else if (merchantProducts.length > 0) {
          // 遍历所有产品，找到第一个包含供货商ID的notes
          for (const product of merchantProducts) {
            if (product.notes) {
              const supplierMatch = product.notes.match(/供货商ID:\s*([^\s|]+)/i);
              if (supplierMatch) {
                supplierId = supplierMatch[1].trim();
                console.log(`   从MerchantInventory获取供货商ID: ${supplierId}`);
                break; // 找到就退出循环
              }
            }
          }
          
          if (!supplierId) {
            console.log(`   ⚠️ 所有产品的notes中都未找到供货商ID`);
          }
        }
        
        // 查询完整的供货商信息
        let supplierInfo = null;
        const Supplier = require('./models/Supplier');
        
        if (supplierId) {
          // 按ID查询
          try {
            supplierInfo = await Supplier.findById(supplierId).lean();
            if (supplierInfo) {
              supplierName = supplierInfo.name;
              console.log(`   ✅ 找到供货商: ${supplierName}`);
            } else {
              console.log(`   ⚠️ 未找到供货商ID: ${supplierId}`);
              // 尝试按名称查询
              supplierInfo = await Supplier.findOne({ name: supplierId }).lean();
              if (supplierInfo) {
                supplierName = supplierInfo.name;
                console.log(`   ✅ 按名称找到供货商: ${supplierName}`);
              }
            }
          } catch (err) {
            console.log(`   ❌ 查询供货商失败: ${err.message}`);
          }
        } else if (supplierName && supplierName !== '未知供货商') {
          // 按名称查询
          supplierInfo = await Supplier.findOne({ name: supplierName }).lean();
          if (supplierInfo) {
            console.log(`   ✅ 找到供货商: ${supplierName}`);
          } else {
            console.log(`   ⚠️ 未找到供货商: ${supplierName}`);
          }
        }
        
        const supplier = await SupplierNew.findOne({ name: supplierName }).lean();
        
        // 构造虚拟发票对象
        invoice = {
          _id: `admin-${invoiceNumber}`,
          invoiceNumber: invoiceNumber,
          supplier: supplier || { name: supplierName },
          invoiceDate: allProducts[0].createdAt,
          dueDate: null,
          currency: 'EUR',
          paymentStatus: '已付款',
          paidAmount: 0,
          status: '已完成',
          receivingStatus: '已收货',
          notes: merchantProducts.length > 0 ? '此发票包含商户手动录入的产品' : '此发票仅存在于库存系统中',
          payments: [],
          attachments: [],
          createdAt: allProducts[0].createdAt,
          updatedAt: allProducts[0].updatedAt,
          items: [],
          source: merchantProducts.length > 0 ? 'MerchantInventory' : 'AdminInventory'
        };
      }
    } else {
      // 按ObjectId查询
      invoice = await PurchaseInvoice.findById(invoiceId)
        .populate('supplier', 'name contact.email contact.phone contact.address')
        .populate('items.product', 'name barcode serialNumbers');
      
      if (!invoice) {
        console.log(`❌ 发票不存在: ${invoiceId}`);
        return res.status(404).json({
          success: false,
          error: '发票不存在'
        });
      }
      
      invoiceNumber = invoice.invoiceNumber;
    }
    
    console.log(`✅ 找到发票: ${invoiceNumber}`);
    console.log(`   PurchaseInvoice items: ${invoice.items?.length || 0}`);
    
    // 查询AdminInventory中关联到该订单号的产品
    const adminProducts = await AdminInventory.find({ 
      invoiceNumber: invoiceNumber
    }).lean();
    
    // 查询MerchantInventory中关联到该订单号的产品
    const MerchantInventory = require('./models/MerchantInventory');
    const merchantProducts = await MerchantInventory.find({
      notes: { $regex: new RegExp(`发票号:\\s*${invoiceNumber}`, 'i') }
    }).lean();
    
    console.log(`   AdminInventory products: ${adminProducts.length}`);
    console.log(`   MerchantInventory products: ${merchantProducts.length}`);
    
    // 格式化PurchaseInvoice items
    const purchaseInvoiceItems = (invoice.items || []).map(item => {
      // PurchaseInvoice中的unitCost和totalCost应该是不含税价格
      const vatRate = item.vatRate || 'VAT 23%';
      let taxMultiplier = 1.0;
      
      if (vatRate === 'VAT 23%') {
        taxMultiplier = 1.23;
      } else if (vatRate === 'VAT 13.5%') {
        taxMultiplier = 1.135;
      } else if (vatRate === 'VAT 0%') {
        taxMultiplier = 1.0;
      }
      
      const unitCostExcludingTax = item.unitCost || 0;  // 不含税单价
      const totalCostExcludingTax = item.totalCost || 0;  // 不含税总价
      const taxAmount = totalCostExcludingTax * (taxMultiplier - 1);  // 税额
      const totalCostIncludingTax = totalCostExcludingTax + taxAmount;  // 含税总价
      
      return {
        _id: item._id,
        product: item.product ? item.product._id : null,
        productName: item.product ? item.product.name : '未知产品',
        description: item.description,
        quantity: item.quantity,
        unitCost: unitCostExcludingTax, // 税前单价（采购发票显示税前价格）
        totalCost: totalCostIncludingTax, // 含税总价
        unitCostExcludingTax: item.unitCost, // 不含税单价（备用）
        totalCostExcludingTax: item.totalCost, // 不含税总价（备用）
        vatRate: vatRate,
        taxAmount: item.taxAmount || 0,
        serialNumbers: item.serialNumbers || [],
        barcode: item.product ? item.product.barcode : '',
        source: 'PurchaseInvoice'
      };
    });
    
    // 格式化AdminInventory产品为发票items格式
    const adminItems = adminProducts.map(product => {
      // 正确映射税率
      let vatRate = 'VAT 0%';
      let taxMultiplier = 1.0;
      
      if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
        vatRate = 'VAT 23%';
        taxMultiplier = 1.23;
      } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
        vatRate = 'VAT 13.5%';
        taxMultiplier = 1.135;
      } else if (product.taxClassification === 'VAT_0' || product.taxClassification === 'VAT 0%') {
        vatRate = 'VAT 0%';
        taxMultiplier = 1.0;
      }
      
      // AdminInventory的costPrice是税前价格（不含税）
      const unitCostExcludingTax = product.costPrice;  // 不含税单价
      const totalCostExcludingTax = unitCostExcludingTax * product.quantity;  // 不含税总价
      const taxAmount = totalCostExcludingTax * (taxMultiplier - 1);  // 税额
      const unitCostIncludingTax = unitCostExcludingTax * taxMultiplier;  // 含税单价
      const totalCostIncludingTax = totalCostExcludingTax + taxAmount;  // 含税总价
      
      return {
        _id: product._id,
        product: product._id,
        productName: product.productName,
        description: `${product.productName} - ${product.model} - ${product.color}`,
        quantity: product.quantity,
        unitCost: unitCostExcludingTax, // 税前单价（采购发票显示税前价格）
        totalCost: totalCostIncludingTax, // 含税总价
        unitCostExcludingTax: unitCostExcludingTax, // 不含税单价
        totalCostExcludingTax: totalCostExcludingTax, // 不含税总价
        unitCostIncludingTax: unitCostIncludingTax, // 含税单价（备用）
        vatRate: vatRate,
        taxAmount: taxAmount, // 税额
        serialNumbers: product.serialNumber ? [product.serialNumber] : [],
        barcode: product.barcode || '',
        location: product.location,
        condition: product.condition,
        source: 'AdminInventory'
      };
    });
    
    // 格式化MerchantInventory产品为发票items格式
    const merchantItems = merchantProducts.map(product => {
      // 正确映射税率
      let vatRate = 'VAT 0%';
      let taxMultiplier = 1.0;
      
      if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
        vatRate = 'VAT 23%';
        taxMultiplier = 1.23;
      } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
        vatRate = 'VAT 13.5%';
        taxMultiplier = 1.135;
      } else if (product.taxClassification === 'VAT_0' || product.taxClassification === 'VAT 0%') {
        vatRate = 'VAT 0%';
        taxMultiplier = 1.0;
      }
      
      // MerchantInventory的costPrice是税前价格（不含税）
      const unitCostExcludingTax = product.costPrice;  // 不含税单价
      const totalCostExcludingTax = unitCostExcludingTax * (product.quantity || 1);  // 不含税总价
      const taxAmount = totalCostExcludingTax * (taxMultiplier - 1);  // 税额
      const unitCostIncludingTax = unitCostExcludingTax * taxMultiplier;  // 含税单价
      const totalCostIncludingTax = totalCostExcludingTax + taxAmount;  // 含税总价
      
      return {
        _id: product._id,
        product: product._id,
        productName: product.productName,
        description: `${product.productName}${product.model ? ' - ' + product.model : ''}${product.color ? ' - ' + product.color : ''}`,
        quantity: product.quantity || 1,
        unitCost: unitCostExcludingTax, // 税前单价（采购发票显示税前价格）
        totalCost: totalCostIncludingTax, // 含税总价
        unitCostExcludingTax: unitCostExcludingTax, // 不含税单价
        totalCostExcludingTax: totalCostExcludingTax, // 不含税总价
        unitCostIncludingTax: unitCostIncludingTax, // 含税单价（备用）
        vatRate: vatRate,
        taxAmount: taxAmount, // 税额
        serialNumbers: product.serialNumber ? [product.serialNumber] : [],
        barcode: product.barcode || '',
        condition: product.condition,
        source: 'MerchantInventory'
      };
    });
    
    // 合并所有items
    const allItems = [...purchaseInvoiceItems, ...adminItems, ...merchantItems];
    
    console.log(`   合并后总items: ${allItems.length}`);
    
    // 重新计算总金额、小计和税额
    const totalAmount = allItems.reduce((sum, item) => sum + item.totalCost, 0);
    const subtotal = allItems.reduce((sum, item) => sum + item.totalCostExcludingTax, 0);
    const taxAmount = allItems.reduce((sum, item) => sum + item.taxAmount, 0);
    
    const formattedInvoice = {
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      supplier: invoice.supplier ? {
        name: invoice.supplier.name,
        email: invoice.supplier.contact?.email || '',
        phone: invoice.supplier.contact?.phone || '',
        address: invoice.supplier.contact?.address || ''
      } : { name: '未知供应商', email: '', phone: '', address: '' },
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      status: invoice.status,
      paymentStatus: invoice.paymentStatus,
      receivingStatus: invoice.receivingStatus,
      totalAmount: totalAmount,
      subtotal: subtotal,
      taxAmount: taxAmount,
      paidAmount: invoice.paidAmount,
      notes: invoice.notes,
      items: allItems,
      adminInventoryCount: adminItems.length,
      purchaseInvoiceCount: purchaseInvoiceItems.length,
      payments: invoice.payments || [],
      attachments: invoice.attachments || [],
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt
    };
    
    console.log(`   返回数据: items=${formattedInvoice.items.length}, total=€${formattedInvoice.totalAmount.toFixed(2)}, tax=€${formattedInvoice.taxAmount.toFixed(2)}`);
    
    res.json({
      success: true,
      data: formattedInvoice
    });
  } catch (error) {
    console.error('❌ 获取采购发票详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 添加采购发票付款记录
app.post('/api/admin/purchase-orders/:invoiceId/payment', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { amount, paymentMethod, reference, paymentDate, notes } = req.body;
    
    console.log(`\n💰 [Admin API] 添加付款记录: ${invoiceId}`);
    console.log(`   金额: €${amount}`);
    console.log(`   付款方式: ${paymentMethod}`);
    console.log(`   Reference: ${reference || 'N/A'}`);
    
    // 验证必填字段
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: '付款金额必须大于0'
      });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        error: '付款方式不能为空'
      });
    }
    
    const invoice = await PurchaseInvoice.findById(invoiceId);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: '发票不存在'
      });
    }
    
    // 创建付款记录
    const payment = {
      amount: parseFloat(amount),
      paymentMethod: paymentMethod,
      reference: reference || '',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes: notes || '',
      createdAt: new Date()
    };
    
    // 添加到payments数组
    if (!invoice.payments) {
      invoice.payments = [];
    }
    invoice.payments.push(payment);
    
    // 更新已付金额
    invoice.paidAmount = (invoice.paidAmount || 0) + parseFloat(amount);
    
    // 更新付款状态
    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.paymentStatus = 'paid';
    } else if (invoice.paidAmount > 0) {
      invoice.paymentStatus = 'partial';
    } else {
      invoice.paymentStatus = 'pending';
    }
    
    await invoice.save();
    
    console.log(`✅ 付款记录添加成功`);
    console.log(`   已付金额: €${invoice.paidAmount.toFixed(2)}`);
    console.log(`   总金额: €${invoice.totalAmount.toFixed(2)}`);
    console.log(`   付款状态: ${invoice.paymentStatus}`);
    
    res.json({
      success: true,
      message: '付款记录添加成功',
      data: {
        payment: payment,
        paidAmount: invoice.paidAmount,
        totalAmount: invoice.totalAmount,
        remainingAmount: invoice.totalAmount - invoice.paidAmount,
        paymentStatus: invoice.paymentStatus
      }
    });
  } catch (error) {
    console.error('❌ 添加付款记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 别名路径（兼容旧代码）- 采购发票详情
app.get('/api/purchase-invoices/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const invoice = await PurchaseInvoice.findById(invoiceId)
      .populate('supplier', 'name contact.email contact.phone contact.address')
      .populate('items.product', 'name barcode serialNumbers');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: '发票不存在'
      });
    }
    
    const formattedInvoice = {
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      supplier: invoice.supplier ? {
        name: invoice.supplier.name,
        email: invoice.supplier.contact?.email || '',
        phone: invoice.supplier.contact?.phone || '',
        address: invoice.supplier.contact?.address || ''
      } : { name: '未知供应商', email: '', phone: '', address: '' },
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      status: invoice.status,
      paymentStatus: invoice.paymentStatus,
      receivingStatus: invoice.receivingStatus,
      totalAmount: invoice.totalAmount,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      paidAmount: invoice.paidAmount,
      notes: invoice.notes,
      items: invoice.items.map(item => {
        // 计算含税价格
        const vatRate = item.vatRate || 'VAT 23%';
        let taxMultiplier = 1.0;
        
        if (vatRate === 'VAT 23%') {
          taxMultiplier = 1.23;
        } else if (vatRate === 'VAT 13.5%') {
          taxMultiplier = 1.135;
        } else if (vatRate === 'VAT 0%') {
          taxMultiplier = 1.0;
        }
        
        const unitCostIncludingTax = (item.unitCost || 0) * taxMultiplier;
        const totalCostIncludingTax = (item.totalCost || 0) * taxMultiplier;
        
        return {
          _id: item._id,
          product: item.product ? item.product._id : null,
          productName: item.product ? item.product.name : '未知产品',
          description: item.description,
          quantity: item.quantity,
          unitCost: unitCostIncludingTax, // 含税单价
          totalCost: totalCostIncludingTax, // 含税总价
          unitCostExcludingTax: item.unitCost, // 不含税单价（备用）
          totalCostExcludingTax: item.totalCost, // 不含税总价（备用）
          vatRate: vatRate,
          taxAmount: item.taxAmount || 0,
          serialNumbers: item.serialNumbers || [],
          barcode: item.product ? item.product.barcode : ''
        };
      }),
      payments: invoice.payments || [],
      attachments: invoice.attachments || [],
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt
    };
    
    res.json({
      success: true,
      data: formattedInvoice
    });
  } catch (error) {
    console.error('获取采购发票详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 仓库订单API (Warehouse Order APIs) ====================

// 生成订单号
function generateOrderNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `WO-${dateStr}-${randomStr}`;
}

// 商户端：获取仓库产品列表（可订购的产品）
app.get('/api/warehouse/products', applyDataIsolation, async (req, res) => {
  try {
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const { category, search } = req.query;
    
    // 查询 ProductNew（传统产品）
    let productQuery = { 
      isActive: true,
      stockQuantity: { $gt: 0 }  // 只显示有库存的产品
    };
    
    if (category) {
      productQuery.category = category;
    }
    
    if (search) {
      productQuery.$or = [
        { name: new RegExp(search, 'i') },
        { sku: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { model: new RegExp(search, 'i') }
      ];
    }
    
    // 查询 AdminInventory（配件变体）
    let adminQuery = {
      isActive: true,
      quantity: { $gt: 0 },
      status: 'AVAILABLE'
    };
    
    if (category) {
      adminQuery.category = category;
    }
    
    if (search) {
      adminQuery.$or = [
        { productName: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { model: new RegExp(search, 'i') },
        { color: new RegExp(search, 'i') }
      ];
    }
    
    // 并行查询两个集合
    const [productNewItems, adminInventoryItems] = await Promise.all([
      ProductNew.find(productQuery)
        .populate('category', 'name type')
        .select('name sku brand model color category stockQuantity costPrice wholesalePrice retailPrice')
        .sort({ category: 1, name: 1 }),
      AdminInventory.find(adminQuery)
        .select('productName brand model color category quantity costPrice wholesalePrice retailPrice')
        .sort({ category: 1, productName: 1 })
    ]);
    
    // 转换 ProductNew 格式
    const products = productNewItems.map(p => ({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      brand: p.brand || '',
      model: p.model || '',
      color: p.color || '',
      category: p.category?.type || p.category?.name || '',
      quantity: p.stockQuantity,
      costPrice: p.costPrice,
      wholesalePrice: p.wholesalePrice,
      retailPrice: p.retailPrice,
      source: 'ProductNew'
    }));
    
    // 转换 AdminInventory 格式
    const adminProducts = adminInventoryItems.map(item => ({
      _id: item._id,
      name: item.productName,
      sku: `${item.productName}-${item.model}-${item.color}`.replace(/\s+/g, '-'),
      brand: item.brand || '',
      model: item.model || '',
      color: item.color || '',
      category: item.category,
      quantity: item.quantity,
      costPrice: item.costPrice,
      wholesalePrice: item.wholesalePrice,
      retailPrice: item.retailPrice,
      source: 'AdminInventory'
    }));
    
    // 合并两个数组
    const allProducts = [...products, ...adminProducts];
    
    // 按分类和名称排序
    allProducts.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
    
    res.json({
      success: true,
      data: allProducts,
      summary: {
        productNew: products.length,
        adminInventory: adminProducts.length,
        total: allProducts.length
      }
    });
  } catch (error) {
    console.error('获取仓库产品失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 仓管员：获取某个产品的所有可用库存（用于发货时选择具体设备）
app.get('/api/warehouse/products/:productId/available', async (req, res) => {
  try {
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const { productId } = req.params;
    
    // 先尝试从 ProductNew 查找
    let baseProduct = await ProductNew.findById(productId);
    let isAdminInventory = false;
    
    // 如果 ProductNew 中没有，尝试从 AdminInventory 查找
    if (!baseProduct) {
      baseProduct = await AdminInventory.findById(productId);
      isAdminInventory = true;
    }
    
    if (!baseProduct) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    // 处理 AdminInventory 产品（配件）
    if (isAdminInventory) {
      const availableQuantity = baseProduct.quantity || 0;
      
      if (availableQuantity > 0) {
        return res.json({
          success: true,
          data: [{
            _id: baseProduct._id,
            name: baseProduct.productName,
            brand: baseProduct.brand,
            model: baseProduct.model,
            color: baseProduct.color,
            condition: baseProduct.condition,
            quantity: availableQuantity,
            source: 'AdminInventory'
          }]
        });
      }
      
      // 没有可用库存
      return res.json({
        success: true,
        data: []
      });
    }
    
    // 处理 ProductNew 产品
    // 检查产品是否有序列号（设备）
    if (baseProduct.serialNumbers && baseProduct.serialNumbers.length > 0) {
      // 设备：返回每个可用的序列号作为单独的产品
      const availableDevices = baseProduct.serialNumbers
        .filter(sn => sn.status === 'available')
        .map(sn => ({
          _id: sn._id,
          name: baseProduct.name,
          brand: baseProduct.brand,
          model: baseProduct.model,
          serialNumber: sn.serialNumber,
          imei: sn.imei || null,
          color: baseProduct.color,
          condition: baseProduct.condition,
          quantity: 1,
          source: 'ProductNew'
        }));
      
      return res.json({
        success: true,
        data: availableDevices
      });
    }
    
    // 配件：返回产品本身（按 stockQuantity）
    const availableQuantity = baseProduct.stockQuantity || 0;
    
    if (availableQuantity > 0) {
      return res.json({
        success: true,
        data: [{
          _id: baseProduct._id,
          name: baseProduct.name,
          brand: baseProduct.brand,
          model: baseProduct.model,
          color: baseProduct.color,
          condition: baseProduct.condition,
          quantity: availableQuantity,
          source: 'ProductNew'
        }]
      });
    }
    
    // 没有可用库存
    res.json({
      success: true,
      data: []
    });
    
  } catch (error) {
    console.error('Get available products failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 商户端：创建仓库订单
app.post('/api/warehouse/orders', applyDataIsolation, async (req, res) => {
  try {
    const WarehouseOrder = require('./models/WarehouseOrder');
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const UserNew = require('./models/UserNew');
    
    const { items, deliveryMethod, deliveryAddress, pickupLocation, notes } = req.body;
    const merchantId = req.currentUsername;
    
    // 获取商户信息
    const user = await UserNew.findOne({ username: merchantId });
    const merchantName = user?.profile?.firstName || merchantId;
    
    // 验证并计算订单项目
    const orderItems = [];
    let totalAmount = 0;
    let subtotalAmount = 0;
    let totalTaxAmount = 0;
    
    for (const item of items) {
      // 先尝试从 ProductNew 查找
      let product = await ProductNew.findById(item.productId);
      let isAdminInventory = false;
      
      // 如果 ProductNew 中没有，尝试从 AdminInventory 查找
      if (!product) {
        product = await AdminInventory.findById(item.productId);
        isAdminInventory = true;
      }
      
      if (!product) {
        return res.status(400).json({ 
          success: false, 
          error: `产品不存在: ${item.productId}` 
        });
      }
      
      // 检查库存
      const availableQty = isAdminInventory ? product.quantity : product.stockQuantity;
      if (availableQty < item.quantity) {
        const productName = isAdminInventory ? product.productName : product.name;
        return res.status(400).json({ 
          success: false, 
          error: `${productName} 库存不足，当前库存: ${availableQty}` 
        });
      }
      
      // 获取产品信息
      const productName = isAdminInventory ? product.productName : product.name;
      const wholesalePrice = product.wholesalePrice || product.costPrice;
      
      // 批发价是含税价格
      const itemTotal = wholesalePrice * item.quantity;
      
      // 获取税务分类
      let taxClassification = 'VAT_23';
      if (isAdminInventory) {
        // AdminInventory 的 taxClassification 可能是 'VAT 23%' 格式，需要转换
        const adminTaxClass = product.taxClassification || 'VAT_23';
        if (adminTaxClass === 'VAT 23%' || adminTaxClass === 'VAT_23') {
          taxClassification = 'VAT_23';
        } else if (adminTaxClass === 'VAT 13.5%' || adminTaxClass === 'SERVICE_VAT_13_5') {
          taxClassification = 'SERVICE_VAT_13_5';
        } else if (adminTaxClass === 'Margin VAT' || adminTaxClass === 'MARGIN_VAT_0') {
          taxClassification = 'MARGIN_VAT_0';
        } else if (adminTaxClass === 'VAT 0%' || adminTaxClass === 'VAT_0') {
          taxClassification = 'VAT_0';
        } else {
          taxClassification = 'VAT_23'; // 默认
        }
      } else {
        if (product.vatRate === 'VAT 23%') {
          taxClassification = 'VAT_23';
        } else if (product.vatRate === 'VAT 13.5%' || product.vatRate === 'Service VAT 13.5%') {
          taxClassification = 'SERVICE_VAT_13_5';
        } else if (product.vatRate === 'VAT 0%' || product.vatRate === 'Margin VAT') {
          taxClassification = 'MARGIN_VAT_0';
        }
      }
      
      // 计算税额
      let itemTaxAmount = 0;
      let itemSubtotal = 0;
      let displayTaxAmount = 0; // 用于显示的税额
      
      if (taxClassification === 'VAT_23') {
        // VAT 23%: 税额 = 总价 × 23/123
        itemTaxAmount = itemTotal * (23 / 123);
        itemSubtotal = itemTotal - itemTaxAmount;
        displayTaxAmount = itemTaxAmount; // VAT 23% 显示实际税额
      } else if (taxClassification === 'SERVICE_VAT_13_5') {
        // Service VAT 13.5%: 税额 = 总价 × 13.5/113.5
        itemTaxAmount = itemTotal * (13.5 / 113.5);
        itemSubtotal = itemTotal - itemTaxAmount;
        displayTaxAmount = itemTaxAmount; // Service VAT 显示实际税额
      } else if (taxClassification === 'MARGIN_VAT_0') {
        // Margin VAT: 买方采购时税额为0
        // 只有卖方销售给最终客户时才对差价征税
        itemTaxAmount = 0;
        itemSubtotal = itemTotal;
        displayTaxAmount = 0;
      } else {
        // VAT_0 或其他
        itemTaxAmount = 0;
        itemSubtotal = itemTotal;
        displayTaxAmount = 0;
      }
      
      totalAmount += itemTotal;
      subtotalAmount += itemSubtotal;
      totalTaxAmount += displayTaxAmount; // 使用显示税额累计
      
      console.log('📦 Product info:', {
        productName,
        brand: product.brand,
        model: product.model,
        color: product.color,
        condition: product.condition,
        taxClassification: taxClassification,
        itemTaxAmount: itemTaxAmount,
        displayTaxAmount: displayTaxAmount,
        source: isAdminInventory ? 'AdminInventory' : 'ProductNew'
      });
      
      orderItems.push({
        productId: product._id,
        productName: productName,
        sku: product.sku || '',
        brand: product.brand || '',
        model: product.model || '',
        color: product.color || '',
        condition: product.condition || '',
        quantity: item.quantity,
        wholesalePrice: wholesalePrice,
        subtotal: itemTotal,
        taxClassification: taxClassification,
        taxAmount: displayTaxAmount, // 保存显示税额
        source: isAdminInventory ? 'AdminInventory' : 'ProductNew'
      });
    }
    
    // 创建订单并预留库存
    const order = new WarehouseOrder({
      orderNumber: generateOrderNumber(),
      merchantId,
      merchantName,
      items: orderItems,
      totalAmount,
      subtotal: subtotalAmount,
      taxAmount: totalTaxAmount,
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress : '',
      pickupLocation: deliveryMethod === 'pickup' ? pickupLocation : '',
      notes,
      status: 'pending'
    });
    
    await order.save();
    
    console.log('✅ 订单创建成功:', {
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      itemsCount: order.items.length,
      items: order.items.map(item => ({
        productName: item.productName,
        taxClassification: item.taxClassification,
        taxAmount: item.taxAmount,
        subtotal: item.subtotal
      }))
    });
    
    // 预留库存：扣减仓库产品数量
    for (const item of items) {
      // 先尝试从 ProductNew 扣减
      let product = await ProductNew.findById(item.productId);
      if (product) {
        product.stockQuantity -= item.quantity;
        await product.save();
      } else {
        // 从 AdminInventory 扣减
        product = await AdminInventory.findById(item.productId);
        if (product) {
          product.quantity -= item.quantity;
          await product.save();
        }
      }
    }
    
    res.json({
      success: true,
      data: order,
      message: '订单创建成功，库存已预留'
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 商户端：获取我的订单列表
app.get('/api/warehouse/orders/my', applyDataIsolation, async (req, res) => {
  try {
    const WarehouseOrder = require('./models/WarehouseOrder');
    const { status } = req.query;
    
    let query = { merchantId: req.currentUsername };
    
    if (status) {
      query.status = status;
    }
    
    const orders = await WarehouseOrder.find(query)
      .sort({ orderedAt: -1 })
      .limit(100);
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 商户端/仓管员：获取订单详情
app.get('/api/warehouse/orders/:id', async (req, res) => {
  try {
    const WarehouseOrder = require('./models/WarehouseOrder');
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const UserNew = require('./models/UserNew');
    const CompanyInfo = require('./models/CompanyInfo');
    
    const currentUserId = req.query.userId; // 当前用户ID
    
    console.log(`\n🏢 查询仓库订单详情(by ID): ${req.params.id} (用户: ${currentUserId})`);
    
    // 不要 populate productId，因为：
    // 1. AdminInventory 产品不在 ProductNew 集合中
    // 2. 订单已经保存了所有需要的产品信息
    const order = await WarehouseOrder.findById(req.params.id).lean();
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }
    
    // 获取当前登录用户信息
    const currentUser = await UserNew.findOne({ username: currentUserId });
    
    // 获取商户信息
    const merchant = await UserNew.findOne({ username: order.merchantId });
    
    // 获取默认公司信息（仓库公司）
    const companyInfo = await CompanyInfo.findOne({ isDefault: true });
    
    // 判断当前用户是卖方还是买方
    let isSellerView = false;
    
    if (currentUser && currentUser.companyInfo && currentUser.companyInfo.companyName) {
      // 当前用户有公司信息
      const currentUserCompany = currentUser.companyInfo.companyName;
      
      // 卖方公司 = 仓库的公司（默认公司信息）
      const sellerCompany = companyInfo ? companyInfo.companyName : null;
      
      // 买方公司 = 商户的公司信息
      const buyerCompany = merchant && merchant.companyInfo ? merchant.companyInfo.companyName : null;
      
      // 如果当前用户的公司 = 卖方公司 → 卖方视角
      if (sellerCompany && currentUserCompany === sellerCompany) {
        isSellerView = true;
      }
      // 如果当前用户的公司 = 买方公司 → 买方视角
      else if (buyerCompany && currentUserCompany === buyerCompany) {
        isSellerView = false;
      }
      // 默认：如果是仓库管理员角色 → 卖方视角
      else if (currentUser.role && (currentUser.role.includes('warehouse') || currentUser.role.includes('admin'))) {
        isSellerView = true;
      }
    } else {
      // 没有公司信息，根据角色判断
      // 仓库相关角色（warehouse, warehouse_manager, admin）→ 卖方视角
      if (currentUser && currentUser.role && (currentUser.role.includes('warehouse') || currentUser.role.includes('admin'))) {
        isSellerView = true;
      }
    }
    
    console.log(`   当前用户角色: ${currentUser?.role || '无'}`);
    console.log(`   当前用户公司: ${currentUser?.companyInfo?.companyName || '无'}`);
    console.log(`   卖方公司: ${companyInfo?.companyName || '无'}`);
    console.log(`   买方公司: ${merchant?.companyInfo?.companyName || '无'}`);
    console.log(`   视角: ${isSellerView ? '卖方（显示差价税）' : '买方（Margin VAT税额=0）'}`);
    
    // 根据用户角色重新计算税额
    if (isSellerView) {
      // 卖方视角：重新计算Margin VAT产品的税额
      let recalculatedTotalTax = 0;
      
      for (const item of order.items) {
        if (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'MARGIN_VAT') {
          // Margin VAT: 卖方需要对差价征税
          let product = await ProductNew.findById(item.productId).lean();
          
          if (!product) {
            product = await AdminInventory.findById(item.productId).lean();
          }
          
          if (product && product.costPrice) {
            const costPrice = product.costPrice;
            const wholesalePrice = item.wholesalePrice;
            const margin = (wholesalePrice - costPrice) * item.quantity;
            
            if (margin > 0) {
              // 对差价征税：税额 = 差价 × 23/123
              const marginTax = margin * (23 / 123);
              item.taxAmount = marginTax; // 更新item的税额
              recalculatedTotalTax += marginTax;
              console.log(`   重新计算 ${item.productName}: €${marginTax.toFixed(2)}`);
            }
          }
        } else {
          // 其他税率使用订单中存储的税额
          recalculatedTotalTax += (item.taxAmount || 0);
        }
      }
      
      // 更新订单的总税额和小计
      order.taxAmount = recalculatedTotalTax;
      order.subtotal = order.totalAmount - recalculatedTotalTax;
    }
    // 买方视角：使用订单中存储的税额（不需要修改）
    
    // 添加商户的完整信息到返回数据
    if (merchant) {
      // 如果商户有公司信息，添加公司信息
      if (merchant.companyInfo) {
        order.merchantCompanyInfo = merchant.companyInfo;
        console.log(`   ✅ 添加商户公司信息: ${merchant.companyInfo.companyName}`);
      } else {
        // 如果没有公司信息，创建一个基本的公司信息对象
        order.merchantCompanyInfo = {
          companyName: merchant.profile?.companyName || order.merchantName || merchant.username,
          contactPerson: merchant.profile?.firstName || '',
          phone: merchant.profile?.phone || '',
          email: merchant.email || ''
        };
        console.log(`   ⚠️ 商户没有完整公司信息，使用基本信息: ${order.merchantCompanyInfo.companyName}`);
      }
    } else {
      console.log(`   ❌ 找不到商户用户`);
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order details failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 生成仓库订单 PDF
app.get('/api/warehouse/orders/:id/pdf', async (req, res) => {
  try {
    const WarehouseOrder = require('./models/WarehouseOrder');
    const CompanyInfo = require('./models/CompanyInfo');
    const UserNew = require('./models/UserNew');
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const PDFDocument = require('pdfkit');
    
    // 获取当前用户ID（从query参数）
    const currentUserId = req.query.userId;
    
    // 并行获取订单、公司信息和商户信息
    const [order, companyInfo] = await Promise.all([
      WarehouseOrder.findById(req.params.id),
      CompanyInfo.findOne({ isDefault: true })
    ]);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }
    
    // 获取商户信息
    const merchant = await UserNew.findOne({ username: order.merchantId });
    
    // 获取当前登录用户信息
    const currentUser = await UserNew.findOne({ username: currentUserId });
    
    // 判断当前用户是卖方还是买方
    // 通过比较当前用户的公司信息与订单的卖方/买方公司信息
    let isSellerView = false;
    
    if (currentUser && currentUser.companyInfo && currentUser.companyInfo.companyName) {
      // 当前用户有公司信息
      const currentUserCompany = currentUser.companyInfo.companyName;
      
      // 卖方公司 = 仓库的公司（默认公司信息）
      const sellerCompany = companyInfo ? companyInfo.companyName : null;
      
      // 买方公司 = 商户的公司信息
      const buyerCompany = merchant && merchant.companyInfo ? merchant.companyInfo.companyName : null;
      
      // 如果当前用户的公司 = 卖方公司 → 卖方视角
      if (sellerCompany && currentUserCompany === sellerCompany) {
        isSellerView = true;
      }
      // 如果当前用户的公司 = 买方公司 → 买方视角
      else if (buyerCompany && currentUserCompany === buyerCompany) {
        isSellerView = false;
      }
      // 默认：如果是仓库管理员角色 → 卖方视角
      else if (currentUser.role && (currentUser.role.includes('warehouse') || currentUser.role.includes('admin'))) {
        isSellerView = true;
      }
    } else {
      // 没有公司信息，根据角色判断
      // 仓库相关角色（warehouse, warehouse_manager, admin）→ 卖方视角
      if (currentUser && currentUser.role && (currentUser.role.includes('warehouse') || currentUser.role.includes('admin'))) {
        isSellerView = true;
      }
    }
    
    console.log(`\n📄 生成仓库订单PDF: ${order.orderNumber}`);
    console.log(`   当前用户: ${currentUserId}`);
    console.log(`   当前用户角色: ${currentUser?.role || '无'}`);
    console.log(`   当前用户公司: ${currentUser?.companyInfo?.companyName || '无'}`);
    console.log(`   卖方公司: ${companyInfo?.companyName || '无'}`);
    console.log(`   买方公司: ${merchant?.companyInfo?.companyName || '无'}`);
    console.log(`   视角: ${isSellerView ? '卖方（显示差价税）' : '买方（Margin VAT税额=0）'}`);
    
    // 判断是否是不同公司之间的交易
    const isDifferentCompany = merchant && 
                                merchant.companyInfo && 
                                merchant.companyInfo.companyName && 
                                companyInfo && 
                                merchant.companyInfo.companyName !== companyInfo.companyName;
    
    // 创建 PDF 文档
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
    
    // 将 PDF 输出到响应
    doc.pipe(res);
    
    // 标题 - 不同公司之间的交易显示INVOICE
    doc.fontSize(22).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text(order.orderNumber, { align: 'center' });
    doc.moveDown(1.5);
    
    // 双方公司信息 - 左右布局
    const infoStartY = doc.y;
    const leftX = 50;
    const rightX = 320;
    
    // FROM (仓库/卖方 - 我方公司)
    doc.fontSize(11).font('Helvetica-Bold').text('FROM:', leftX, infoStartY);
    let leftY = infoStartY + 15;
    doc.fontSize(10).font('Helvetica');
    
    if (companyInfo) {
      doc.font('Helvetica-Bold').text(companyInfo.companyName || 'N/A', leftX, leftY);
      leftY += 12;
      doc.font('Helvetica');
      
      if (companyInfo.address) {
        if (companyInfo.address.street) {
          doc.text(companyInfo.address.street, leftX, leftY, { width: 240 });
          leftY += 12;
        }
        const cityLine = [
          companyInfo.address.city,
          companyInfo.address.state,
          companyInfo.address.postalCode
        ].filter(Boolean).join(', ');
        if (cityLine) {
          doc.text(cityLine, leftX, leftY, { width: 240 });
          leftY += 12;
        }
        if (companyInfo.address.country) {
          doc.text(companyInfo.address.country, leftX, leftY);
          leftY += 12;
        }
      }
      
      if (companyInfo.taxNumber) {
        doc.text(`VAT: ${companyInfo.taxNumber}`, leftX, leftY);
        leftY += 12;
      }
      
      if (companyInfo.contact?.phone) {
        doc.text(`Tel: ${companyInfo.contact.phone}`, leftX, leftY);
        leftY += 12;
      }
      
      if (companyInfo.contact?.email) {
        doc.text(`Email: ${companyInfo.contact.email}`, leftX, leftY);
        leftY += 12;
      }
    } else {
      doc.text('Company information not available', leftX, leftY);
      leftY += 12;
    }
    
    // TO (商户/买方)
    doc.fontSize(11).font('Helvetica-Bold').text('TO:', rightX, infoStartY);
    let rightY = infoStartY + 15;
    doc.fontSize(10).font('Helvetica');
    
    if (merchant && merchant.companyInfo && merchant.companyInfo.companyName) {
      // 显示商户的公司信息
      doc.font('Helvetica-Bold').text(merchant.companyInfo.companyName, rightX, rightY, { width: 240 });
      rightY += 12;
      doc.font('Helvetica');
      
      if (merchant.companyInfo.address) {
        if (merchant.companyInfo.address.street) {
          doc.text(merchant.companyInfo.address.street, rightX, rightY, { width: 240 });
          rightY += 12;
        }
        const cityLine = [
          merchant.companyInfo.address.city,
          merchant.companyInfo.address.state,
          merchant.companyInfo.address.postalCode
        ].filter(Boolean).join(', ');
        if (cityLine) {
          doc.text(cityLine, rightX, rightY, { width: 240 });
          rightY += 12;
        }
        if (merchant.companyInfo.address.country) {
          doc.text(merchant.companyInfo.address.country, rightX, rightY);
          rightY += 12;
        }
      }
      
      if (merchant.companyInfo.taxNumber) {
        doc.text(`VAT: ${merchant.companyInfo.taxNumber}`, rightX, rightY);
        rightY += 12;
      }
    } else {
      // 如果没有公司信息，显示商户名称
      doc.font('Helvetica-Bold').text(order.merchantName || order.merchantId, rightX, rightY);
      rightY += 12;
    }
    
    // 移动到两列中较低的位置
    doc.y = Math.max(leftY, rightY) + 10;
    
    // 订单信息
    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice Date: ${new Date(order.orderedAt).toLocaleString('en-IE')}`, leftX, doc.y);
    doc.moveDown(0.5);
    
    const statusMap = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'shipped': 'Shipped',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    doc.text(`Status: ${statusMap[order.status] || order.status}`, leftX, doc.y);
    doc.moveDown(0.5);
    
    const deliveryMethodMap = {
      'delivery': 'Delivery',
      'pickup': 'Pickup'
    };
    doc.text(`Delivery Method: ${deliveryMethodMap[order.deliveryMethod] || order.deliveryMethod}`, leftX, doc.y);
    doc.moveDown(1);
    
    // 产品表格
    doc.fontSize(12).font('Helvetica-Bold').text('ITEMS', { underline: true });
    doc.moveDown(0.5);
    
    // 表格头
    const tableTop = doc.y;
    const col1X = 50;   // Product
    const col2X = 150;  // Model
    const col3X = 220;  // Color
    const col4X = 270;  // Tax
    const col5X = 330;  // Qty
    const col6X = 370;  // Price
    const col7X = 430;  // Tax Amt
    const col8X = 490;  // Subtotal
    
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Product', col1X, tableTop);
    doc.text('Model', col2X, tableTop);
    doc.text('Color', col3X, tableTop);
    doc.text('Tax', col4X, tableTop);
    doc.text('Qty', col5X, tableTop);
    doc.text('Price', col6X, tableTop);
    doc.text('Tax Amt', col7X, tableTop);
    doc.text('Subtotal', col8X, tableTop);
    
    // 表格线
    doc.moveTo(50, tableTop + 12).lineTo(560, tableTop + 12).stroke();
    
    // 产品行
    let currentY = tableTop + 20;
    doc.fontSize(7).font('Helvetica');
    
    // 税务分类映射
    const taxClassMap = {
      'VAT_23': 'VAT 23%',
      'SERVICE_VAT_13_5': 'VAT 13.5%',
      'MARGIN_VAT_0': 'Margin VAT',
      'VAT_0': 'VAT 0%'
    };
    
    // 重新计算总税额（根据用户角色）
    let recalculatedTotalTax = 0;
    
    if (isSellerView) {
      // 卖方视角：重新计算Margin VAT税额
      for (const item of order.items) {
        if (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'MARGIN_VAT') {
          // Margin VAT: 卖方需要对差价征税
          let product = await ProductNew.findById(item.productId).lean();
          
          if (!product) {
            product = await AdminInventory.findById(item.productId).lean();
          }
          
          if (product && product.costPrice) {
            const costPrice = product.costPrice;
            const wholesalePrice = item.wholesalePrice;
            const margin = (wholesalePrice - costPrice) * item.quantity;
            
            if (margin > 0) {
              // 对差价征税：税额 = 差价 × 23/123
              const marginTax = margin * (23 / 123);
              recalculatedTotalTax += marginTax;
            }
          }
        } else {
          // 其他税率使用订单中存储的税额
          recalculatedTotalTax += (item.taxAmount || 0);
        }
      }
    } else {
      // 买方视角：使用订单中存储的税额（Margin VAT = 0）
      recalculatedTotalTax = order.taxAmount || 0;
    }
    
    // 再次遍历显示产品
    for (const item of order.items) {
      // 检查是否需要新页面
      if (currentY > 720) {
        doc.addPage();
        currentY = 50;
        
        // 重新绘制表头
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('Product', col1X, currentY);
        doc.text('Model', col2X, currentY);
        doc.text('Color', col3X, currentY);
        doc.text('Tax', col4X, currentY);
        doc.text('Qty', col5X, currentY);
        doc.text('Price', col6X, currentY);
        doc.text('Tax Amt', col7X, currentY);
        doc.text('Subtotal', col8X, currentY);
        doc.moveTo(50, currentY + 12).lineTo(560, currentY + 12).stroke();
        currentY += 20;
        doc.fontSize(7).font('Helvetica');
      }
      
      // 产品名称
      const productName = item.productName.length > 16 ? item.productName.substring(0, 16) + '...' : item.productName;
      doc.text(productName, col1X, currentY, { width: 95 });
      
      // 型号
      const modelText = (item.model || '-').length > 12 ? (item.model || '-').substring(0, 12) + '...' : (item.model || '-');
      doc.text(modelText, col2X, currentY, { width: 65 });
      
      // 颜色
      const colorText = (item.color || '-').length > 8 ? (item.color || '-').substring(0, 8) + '...' : (item.color || '-');
      doc.text(colorText, col3X, currentY, { width: 45 });
      
      // 税务分类
      const taxText = taxClassMap[item.taxClassification] || item.taxClassification || 'N/A';
      doc.text(taxText, col4X, currentY, { width: 55 });
      
      // 数量
      doc.text(item.quantity.toString(), col5X, currentY);
      
      // 价格
      doc.text(`${item.wholesalePrice.toFixed(2)}`, col6X, currentY);
      
      // 税额 - 根据用户角色显示不同的税额
      let displayTaxAmount = item.taxAmount || 0;
      
      if (isSellerView && (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'MARGIN_VAT')) {
        // 卖方视角：重新计算Margin VAT税额（对差价征税）
        let product = await ProductNew.findById(item.productId).lean();
        
        if (!product) {
          product = await AdminInventory.findById(item.productId).lean();
        }
        
        if (product && product.costPrice) {
          const costPrice = product.costPrice;
          const wholesalePrice = item.wholesalePrice;
          const margin = (wholesalePrice - costPrice) * item.quantity;
          
          if (margin > 0) {
            // 对差价征税：税额 = 差价 × 23/123
            displayTaxAmount = margin * (23 / 123);
          }
        }
      }
      // 买方视角：使用订单中存储的税额（Margin VAT = 0）
      
      doc.text(`${displayTaxAmount.toFixed(2)}`, col7X, currentY);
      
      // 小计
      doc.text(`${item.subtotal.toFixed(2)}`, col8X, currentY);
      
      // 成色信息（如果有）
      if (item.condition) {
        currentY += 10;
        doc.fontSize(6).fillColor('#666666');
        doc.text(`Condition: ${item.condition}`, col1X, currentY);
        doc.fillColor('#000000').fontSize(7);
      }
      
      currentY += 18;
    }
    
    // 总计线
    doc.moveTo(50, currentY).lineTo(560, currentY).stroke();
    currentY += 8;
    
    // 税务汇总和总计
    doc.fontSize(9).font('Helvetica');
    
    // 小计（不含税）
    const subtotalAmount = order.totalAmount - recalculatedTotalTax;
    doc.text('Subtotal (excl. tax):', 380, currentY);
    doc.text(`EUR ${subtotalAmount.toFixed(2)}`, col8X, currentY);
    currentY += 15;
    
    // 税额 - 使用重新计算的税额
    doc.text('Total Tax:', 380, currentY);
    doc.text(`EUR ${recalculatedTotalTax.toFixed(2)}`, col8X, currentY);
    currentY += 15;
    
    // 总计线
    doc.moveTo(380, currentY).lineTo(560, currentY).stroke();
    currentY += 8;
    
    // 总计（含税）
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('TOTAL (incl. tax):', 380, currentY);
    doc.text(`EUR ${order.totalAmount.toFixed(2)}`, col8X, currentY);
    
    currentY += 25;
    
    // 银行信息（如果有）
    if (companyInfo && companyInfo.bankDetails && companyInfo.bankDetails.iban) {
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Bank Details:', 50, currentY);
      currentY += 12;
      doc.fontSize(9).font('Helvetica');
      doc.text(`IBAN: ${companyInfo.bankDetails.iban}`, 50, currentY);
      currentY += 10;
      if (companyInfo.bankDetails.bic) {
        doc.text(`BIC: ${companyInfo.bankDetails.bic}`, 50, currentY);
        currentY += 10;
      }
      if (companyInfo.bankDetails.bankName) {
        doc.text(`Bank: ${companyInfo.bankDetails.bankName}`, 50, currentY);
        currentY += 10;
      }
      currentY += 10;
    }
    
    // 税务说明
    doc.fontSize(7).font('Helvetica').fillColor('#666666');
    doc.text('* All prices are inclusive of tax', 50, currentY);
    doc.text('* Tax amounts are calculated based on the tax classification of each item', 50, currentY + 10);
    doc.fillColor('#000000');
    
    // 页脚
    const pageHeight = doc.page.height;
    doc.fontSize(8).font('Helvetica').fillColor('#666666').text(
      `Generated on ${new Date().toLocaleString('en-US')} | Page 1`,
      50,
      pageHeight - 50,
      { align: 'center' }
    );
    
    // 完成 PDF
    doc.end();
    
  } catch (error) {
    console.error('Generate PDF failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// 仓管员：获取所有订单
app.get('/api/warehouse/orders', async (req, res) => {
  try {
    const WarehouseOrder = require('./models/WarehouseOrder');
    const { status, merchantId } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (merchantId) {
      query.merchantId = merchantId;
    }
    
    const orders = await WarehouseOrder.find(query)
      .sort({ orderedAt: -1 })
      .limit(200);
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 仓管员：确认订单
app.put('/api/warehouse/orders/:id/confirm', async (req, res) => {
  try {
    const WarehouseOrder = require('./models/WarehouseOrder');
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    const order = await WarehouseOrder.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Order status is not pending' });
    }
    
    // 检查库存（支持 ProductNew 和 AdminInventory）
    for (const item of order.items) {
      // 先尝试从 ProductNew 查找
      let product = await ProductNew.findById(item.productId);
      let availableQty = 0;
      
      if (product) {
        availableQty = product.stockQuantity || 0;
      } else {
        // 从 AdminInventory 查找
        product = await AdminInventory.findById(item.productId);
        if (product) {
          availableQty = product.quantity || 0;
        }
      }
      
      if (!product) {
        return res.status(400).json({ 
          success: false, 
          error: `Product not found: ${item.productName}` 
        });
      }
      
      if (availableQty < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Insufficient stock for ${item.productName}. Available: ${availableQty}, Required: ${item.quantity}` 
        });
      }
    }
    
    // 更新订单状态
    order.status = 'confirmed';
    order.confirmedAt = new Date();
    order.confirmedBy = req.body.confirmedBy || 'warehouse';
    
    await order.save();
    
    console.log('✅ Order confirmed:', {
      orderNumber: order.orderNumber,
      confirmedAt: order.confirmedAt,
      confirmedBy: order.confirmedBy
    });
    
    res.json({
      success: true,
      data: order,
      message: 'Order confirmed successfully'
    });
  } catch (error) {
    console.error('Confirm order failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 仓管员：标记发货（只更新状态，不转移库存）
app.put('/api/warehouse/orders/:id/ship', async (req, res) => {
  try {
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    const order = await WarehouseOrder.findById(req.params.id);
    const { shipmentItems } = req.body;
    
    if (!order) {
      return res.status(404).json({ success: false, error: '订单不存在' });
    }
    
    if (order.status !== 'confirmed') {
      return res.status(400).json({ success: false, error: '订单必须先确认' });
    }
    
    if (!shipmentItems || shipmentItems.length === 0) {
      return res.status(400).json({ success: false, error: '缺少发货信息' });
    }
    
    // 保存发货信息到订单（用于后续商户确认收货时使用）
    order.shipmentDetails = shipmentItems;
    
    // 更新订单状态为已发货
    order.status = 'shipped';
    order.shippedAt = new Date();
    order.shippedBy = req.body.shippedBy || 'warehouse';
    
    await order.save();
    
    res.json({
      success: true,
      data: order,
      message: '订单已标记为发货，等待商户确认收货'
    });
  } catch (error) {
    console.error('发货失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 商户：确认收货（转移库存到商户）
app.put('/api/warehouse/orders/:id/complete', applyDataIsolation, async (req, res) => {
  try {
    console.log('🔍 确认收货 API 调用:', {
      orderId: req.params.id,
      currentUsername: req.currentUsername,
      body: req.body
    });
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const MerchantInventory = require('./models/MerchantInventory');
    const UserNew = require('./models/UserNew');
    
    // 辅助函数：查找产品（支持 ProductNew 和 AdminInventory）
    const findProduct = async (productId) => {
      let product = await ProductNew.findById(productId).populate('category', 'name type');
      let isAdminInventory = false;
      
      if (!product) {
        product = await AdminInventory.findById(productId);
        isAdminInventory = true;
      }
      
      console.log(`  📦 查找产品 ${productId}:`, {
        found: !!product,
        isAdminInventory,
        productName: product ? (isAdminInventory ? product.productName : product.name) : 'N/A'
      });
      
      return { product, isAdminInventory };
    };
    
    const order = await WarehouseOrder.findById(req.params.id);
    
    if (!order) {
      console.log('❌ 订单不存在:', req.params.id);
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    console.log('📋 订单信息:', {
      orderNumber: order.orderNumber,
      status: order.status,
      merchantId: order.merchantId,
      itemsCount: order.items.length
    });
    
    if (order.status !== 'shipped') {
      console.log('❌ 订单状态错误:', order.status);
      return res.status(400).json({ success: false, error: 'Order must be shipped first' });
    }
    
    // 获取商户的群组信息
    const merchant = await UserNew.findOne({ username: order.merchantId })
      .populate('retailInfo.storeGroup');
    const merchantStoreGroup = merchant?.retailInfo?.storeGroup?._id || null;
    
    // 验证是否是订单的商户
    if (order.merchantId !== req.currentUsername) {
      console.log('❌ 权限验证失败:', {
        orderMerchantId: order.merchantId,
        currentUsername: req.currentUsername
      });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    let shipmentItems = order.shipmentDetails || [];
    
    // 兼容性处理：如果是旧订单（没有 shipmentDetails），生成默认的发货信息
    if (shipmentItems.length === 0) {
      console.log(`⚠️  Old order ${order.orderNumber} has no shipmentDetails, generating default`);
      
      // 为每个订单项目生成默认的发货信息
      for (const item of order.items) {
        const { product, isAdminInventory } = await findProduct(item.productId);
        
        if (!product) {
          return res.status(400).json({ 
            success: false, 
            error: `Product not found: ${item.productName}` 
          });
        }
        
        // AdminInventory 产品都是配件，没有序列号
        if (isAdminInventory) {
          const availableQty = product.quantity || 0;
          if (availableQty < item.quantity) {
            return res.status(400).json({ 
              success: false, 
              error: `Insufficient stock for ${item.productName}. Required: ${item.quantity}, Available: ${availableQty}` 
            });
          }
          
          shipmentItems.push({
            isDevice: false,
            quantity: item.quantity
          });
        } else {
          // ProductNew 产品：判断是设备还是配件
          const isDevice = product.serialNumbers && product.serialNumbers.length > 0;
          
          if (isDevice) {
            // 设备：选择可用的序列号
            const availableSerialNumbers = product.serialNumbers
              .filter(sn => sn.status === 'available')
              .slice(0, item.quantity);
            
            if (availableSerialNumbers.length < item.quantity) {
              return res.status(400).json({ 
                success: false, 
                error: `Insufficient stock for ${item.productName}. Required: ${item.quantity}, Available: ${availableSerialNumbers.length}` 
              });
            }
            
            shipmentItems.push({
              isDevice: true,
              selectedProducts: availableSerialNumbers.map(sn => sn._id)
            });
          } else {
            // 配件：使用订单数量
            if (product.stockQuantity < item.quantity) {
              return res.status(400).json({ 
                success: false, 
                error: `Insufficient stock for ${item.productName}. Required: ${item.quantity}, Available: ${product.stockQuantity}` 
              });
            }
            
            shipmentItems.push({
              isDevice: false,
              quantity: item.quantity
            });
          }
        }
      }
      
      console.log(`✅ Generated ${shipmentItems.length} shipment items for old order`);
    }
    
    if (shipmentItems.length === 0) {
      return res.status(400).json({ success: false, error: '缺少发货信息' });
    }
    
    // 处理每个订单项目的库存转移
    for (let i = 0; i < order.items.length; i++) {
      const orderItem = order.items[i];
      const shipmentItem = shipmentItems[i];
      
      if (!shipmentItem) {
        return res.status(400).json({ 
          success: false, 
          error: `缺少 ${orderItem.productName} 的发货信息` 
        });
      }
      
      if (shipmentItem.isDevice) {
        // 设备：处理选中的序列号
        const selectedSerialNumberIds = shipmentItem.selectedProducts;
        
        if (!selectedSerialNumberIds || selectedSerialNumberIds.length !== orderItem.quantity) {
          return res.status(400).json({ 
            success: false, 
            error: `${orderItem.productName} 需要选择 ${orderItem.quantity} 台设备` 
          });
        }
        
        const { product, isAdminInventory } = await findProduct(orderItem.productId);
        
        if (!product) {
          return res.status(400).json({ 
            success: false, 
            error: `产品不存在: ${orderItem.productName}` 
          });
        }
        
        // AdminInventory 产品不应该有设备（序列号），这里应该是 ProductNew
        if (isAdminInventory) {
          return res.status(400).json({ 
            success: false, 
            error: `配件产品不应该有序列号: ${orderItem.productName}` 
          });
        }
        
        // 获取分类名称
        const categoryName = product.category?.type || product.category?.name || '未分类';
        
        // 转换 vatRate 为 taxClassification
        let taxClassification = 'VAT_23';
        if (product.vatRate === 'VAT 23%') {
          taxClassification = 'VAT_23';
        } else if (product.vatRate === 'VAT 13.5%') {
          taxClassification = 'SERVICE_VAT_13_5';
        } else if (product.vatRate === 'VAT 0%') {
          taxClassification = 'MARGIN_VAT_0';
        }
        
        // 为每个选中的序列号创建商户库存
        for (const snId of selectedSerialNumberIds) {
          // 在 serialNumbers 数组中找到对应的序列号
          const serialNumberObj = product.serialNumbers.find(sn => sn._id.toString() === snId.toString());
          
          if (!serialNumberObj || serialNumberObj.status !== 'available') {
            return res.status(400).json({ 
              success: false, 
              error: `序列号不可用: ${snId}` 
            });
          }
          
          // 创建商户库存记录（继承序列号信息）
          // 对于仓库调货，商户的成本价 = 仓库的批发价
          const merchantInventory = new MerchantInventory({
            merchantId: order.merchantId,
            merchantName: order.merchantName,
            storeGroup: merchantStoreGroup,
            productId: product._id,
            productName: product.name,
            brand: product.brand,
            model: product.model,
            category: categoryName,
            imei: serialNumberObj.imei || null,
            serialNumber: serialNumberObj.serialNumber,
            color: product.color,
            condition: product.condition,
            quantity: 1,
            costPrice: product.wholesalePrice, // 商户的成本价 = 仓库的批发价
            wholesalePrice: product.wholesalePrice,
            retailPrice: product.retailPrice,
            taxClassification: taxClassification,
            source: 'warehouse',
            sourceOrderId: order._id,
            status: 'active',
            isActive: true,
            notes: `从仓库订货 - 订单号: ${order.orderNumber} - SN: ${serialNumberObj.serialNumber}${serialNumberObj.imei ? ` - IMEI: ${serialNumberObj.imei}` : ''}`
          });
          
          await merchantInventory.save();
          
          // 标记序列号为已售出
          serialNumberObj.status = 'sold';
          serialNumberObj.soldTo = order.merchantId;
          serialNumberObj.soldAt = new Date();
        }
        
        // 更新 stockQuantity（可用序列号数量）
        const availableCount = product.serialNumbers.filter(sn => sn.status === 'available').length;
        product.stockQuantity = availableCount;
        
        // 如果没有可用序列号，标记产品为不活跃
        if (availableCount === 0) {
          product.isActive = false;
        }
        
        // 保存产品（更新 serialNumbers 状态和 stockQuantity）
        await product.save();
        
      } else {
        // 配件：按数量创建商户库存
        const quantity = shipmentItem.quantity;
        
        if (!quantity || quantity < 1 || quantity > orderItem.quantity) {
          return res.status(400).json({ 
            success: false, 
            error: `${orderItem.productName} 的发货数量无效` 
          });
        }
        
        const { product, isAdminInventory } = await findProduct(orderItem.productId);
        
        if (!product) {
          return res.status(400).json({ 
            success: false, 
            error: `产品不存在: ${orderItem.productName}` 
          });
        }
        
        // 获取分类名称和税务分类
        let categoryName, taxClassification;
        
        if (isAdminInventory) {
          // AdminInventory 产品
          categoryName = product.category || '未分类';
          
          // AdminInventory 的 taxClassification 格式：'VAT 23%', 'Margin VAT' 等
          // 需要转换为标准格式
          if (product.taxClassification === 'VAT 23%') {
            taxClassification = 'VAT_23';
          } else if (product.taxClassification === 'VAT 13.5%') {
            taxClassification = 'SERVICE_VAT_13_5';
          } else if (product.taxClassification === 'Margin VAT') {
            taxClassification = 'MARGIN_VAT_0';
          } else {
            taxClassification = 'VAT_23'; // 默认
          }
        } else {
          // ProductNew 产品
          categoryName = product.category?.type || product.category?.name || '未分类';
          
          // 转换 vatRate 为 taxClassification
          if (product.vatRate === 'VAT 23%') {
            taxClassification = 'VAT_23';
          } else if (product.vatRate === 'VAT 13.5%') {
            taxClassification = 'SERVICE_VAT_13_5';
          } else if (product.vatRate === 'VAT 0%') {
            taxClassification = 'MARGIN_VAT_0';
          } else {
            taxClassification = 'VAT_23'; // 默认
          }
        }
        
        // 创建商户库存记录（一条记录，数量为订单数量）
        // 对于仓库调货，商户的成本价 = 仓库的批发价
        const merchantInventory = new MerchantInventory({
          merchantId: order.merchantId,
          merchantName: order.merchantName,
          storeGroup: merchantStoreGroup,
          productId: product._id,
          productName: isAdminInventory ? product.productName : product.name,
          brand: product.brand,
          model: product.model,
          category: categoryName,
          color: product.color,
          condition: product.condition,
          quantity: quantity, // 使用订单数量，不是1
          costPrice: product.wholesalePrice, // 商户的成本价 = 仓库的批发价
          wholesalePrice: product.wholesalePrice,
          retailPrice: product.retailPrice,
          taxClassification: taxClassification,
          source: 'warehouse',
          sourceOrderId: order._id,
          status: 'active',
          isActive: true,
          notes: `从仓库订货 - 订单号: ${order.orderNumber}`
        });
        
        await merchantInventory.save();
        
        // 注意：库存已在创建订单时预留（扣减），这里不需要再次扣减
        // 只需要将库存转移到商户库存即可
      }
    }
    
    // 更新订单状态为已完成
    order.status = 'completed';
    order.completedAt = new Date();
    order.completedBy = req.currentUsername;
    
    await order.save();
    
    res.json({
      success: true,
      data: order,
      message: '收货确认成功，库存已入库'
    });
  } catch (error) {
    console.error('完成订单失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 仓管员：取消订单
app.put('/api/warehouse/orders/:id/cancel', async (req, res) => {
  try {
    const WarehouseOrder = require('./models/WarehouseOrder');
    const ProductNew = require('./models/ProductNew');
    
    const order = await WarehouseOrder.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, error: '订单不存在' });
    }
    
    if (order.status === 'completed' || order.status === 'cancelled') {
      return res.status(400).json({ success: false, error: '订单无法取消' });
    }
    
    if (order.status === 'shipped') {
      return res.status(400).json({ success: false, error: '已发货的订单无法取消' });
    }
    
    // 恢复预留的库存
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const shipmentItem = order.shipmentDetails && order.shipmentDetails[i];
      
      if (item.source === 'AdminInventory') {
        // 从AdminInventory恢复库存
        const AdminInventory = require('./models/AdminInventory');
        const product = await AdminInventory.findById(item.productId);
        if (product) {
          product.quantity += item.quantity;
          
          // 如果有库存，恢复为活跃状态
          if (product.quantity > 0) {
            product.isActive = true;
          }
          
          await product.save();
        }
      } else {
        // 从ProductNew恢复库存
        const product = await ProductNew.findById(item.productId);
        if (product) {
          // 检查是否是设备（有序列号）
          if (shipmentItem && shipmentItem.isDevice && shipmentItem.selectedProducts) {
            // 设备：恢复序列号状态为available
            for (const snId of shipmentItem.selectedProducts) {
              const serialNumberObj = product.serialNumbers.find(
                sn => sn._id.toString() === snId.toString()
              );
              if (serialNumberObj) {
                // 如果序列号状态是sold，恢复为available
                if (serialNumberObj.status === 'sold') {
                  serialNumberObj.status = 'available';
                  serialNumberObj.soldTo = null;
                  serialNumberObj.soldAt = null;
                }
              }
            }
            
            // 重新计算可用库存数量
            const availableCount = product.serialNumbers.filter(
              sn => sn.status === 'available'
            ).length;
            product.stockQuantity = availableCount;
            
            // 如果有可用库存，恢复为活跃状态
            if (availableCount > 0) {
              product.isActive = true;
            }
          } else {
            // 配件：直接增加库存数量
            product.stockQuantity += item.quantity;
            
            // 如果有库存，恢复为活跃状态
            if (product.stockQuantity > 0) {
              product.isActive = true;
            }
          }
          
          await product.save();
        }
      }
    }
    
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = req.body.reason || '';
    
    await order.save();
    
    res.json({
      success: true,
      data: order,
      message: '订单已取消，库存已恢复'
    });
  } catch (error) {
    console.error('取消订单失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 原有API ====================
// 获取可销售产品
app.get('/api/sales/available-products', async (req, res) => {
  try {
    const ProductNew = require('./models/ProductNew');
    const products = await ProductNew.find({ 
      isActive: true, 
      stockQuantity: { $gt: 0 } 
    })
    .populate('category', 'name type')
    .sort({ createdAt: -1 });
    
    // 转换为销售页面期望的格式
    const salesProducts = products.map(product => ({
      _id: product._id,
      name: product.name,
      sku: product.sku,
      category: product.category?.type || 'Unknown',
      condition: product.condition,
      retailPrice: product.retailPrice,
      stockQuantity: product.stockQuantity,
      brand: product.brand,
      model: product.model,
      vatRate: product.vatRate
    }));
    
    res.json({ success: true, data: salesProducts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取客户列表
app.get('/api/sales/customers', async (req, res) => {
  try {
    // 创建模拟客户数据
    const mockCustomers = [
      {
        _id: 'customer_001',
        name: '张三',
        email: 'zhangsan@example.com',
        phone: '+353-1-234-5678',
        customerType: 'RETAIL',
        address: 'Dublin, Ireland',
        discountRate: 0
      },
      {
        _id: 'customer_002',
        name: '李四电子商店',
        email: 'lisi@electronics.com',
        phone: '+353-1-345-6789',
        customerType: 'WHOLESALE',
        address: 'Cork, Ireland',
        discountRate: 10
      },
      {
        _id: 'customer_003',
        name: '王五',
        email: 'wangwu@gmail.com',
        phone: '+353-1-456-7890',
        customerType: 'RETAIL',
        address: 'Galway, Ireland',
        discountRate: 0
      },
      {
        _id: 'customer_004',
        name: 'TechMart批发',
        email: 'orders@techmart.ie',
        phone: '+353-1-567-8901',
        customerType: 'WHOLESALE',
        address: 'Limerick, Ireland',
        discountRate: 15
      }
    ];
    
    res.json({ success: true, data: mockCustomers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建销售发票
app.post('/api/sales/create-invoice', async (req, res) => {
  try {
    const { customer, items, notes } = req.body;
    
    // 计算发票总额
    let subtotal = 0;
    let totalTax = 0;
    
    items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      
      // 简化税额计算
      if (item.vatRate === 'VAT 23%') {
        totalTax += itemTotal * 0.23;
      } else if (item.vatRate === 'VAT 13.5%') {
        totalTax += itemTotal * 0.135;
      }
    });
    
    const totalAmount = subtotal + totalTax;
    
    // 创建模拟发票
    const invoice = {
      _id: `invoice_${Date.now()}`,
      invoiceNumber: `SI-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      customer: customer,
      items: items,
      subtotal: subtotal,
      taxAmount: totalTax,
      totalAmount: totalAmount,
      status: 'DRAFT',
      createdAt: new Date(),
      notes: notes || ''
    };
    
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 确认销售发票
app.post('/api/sales/finalize-invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    // 模拟确认发票
    const finalizedInvoice = {
      _id: invoiceId,
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      message: '发票已确认并发送给客户'
    };
    
    res.json({ success: true, data: finalizedInvoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 根路径
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-new.html'));
});

// ==================== 产品管理API ====================

// 产品追溯查询（必须在 products/:id 路由之前）
app.get('/api/admin/products/tracking', checkDbConnection, async (req, res) => {
  try {
    const { search } = req.query;
    
    if (!search) {
      return res.status(400).json({
        success: false,
        error: '请提供搜索条件'
      });
    }
    
    const ProductNew = require('./models/ProductNew');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    const SalesInvoice = require('./models/SalesInvoice');
    const MerchantInventory = require('./models/MerchantInventory');
    const MerchantSale = require('./models/MerchantSale');
    const InventoryTransfer = require('./models/InventoryTransfer');
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    // 搜索旧系统产品
    const products = await ProductNew.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { 'serialNumbers.serialNumber': { $regex: search, $options: 'i' } }
      ],
      isActive: true
    }).lean();
    
    // 搜索商户系统库存（按序列号或产品名称）
    const merchantInventories = await MerchantInventory.find({
      $or: [
        { productName: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ]
    }).lean();
    
    // 构建历史记录时间线
    const history = [];
    
    // === 处理旧系统数据 ===
    if (products.length > 0) {
      const productIds = products.map(p => p._id);
      
      // 检查是否搜索的是序列号
      const isSerialNumberSearch = products.some(p => 
        p.serialNumbers && p.serialNumbers.some(sn => 
          sn.serialNumber && sn.serialNumber.toLowerCase().includes(search.toLowerCase())
        )
      );
      
      // 查询采购历史
      const purchaseInvoices = await PurchaseInvoice.find({
        'items.product': { $in: productIds }
      })
        .populate('supplier', 'name code')
        .sort({ invoiceDate: -1 })
        .lean();
      
      // 查询销售历史
      const salesInvoices = await SalesInvoice.find({
        'items.product': { $in: productIds }
      })
        .populate('customer', 'name code')
        .sort({ invoiceDate: -1 })
        .lean();
      
      // 添加采购记录
      purchaseInvoices.forEach(invoice => {
        invoice.items.forEach(item => {
          const matchedProduct = products.find(p => p._id.toString() === item.product.toString());
          
          if (matchedProduct) {
            if (isSerialNumberSearch) {
              const hasMatchingSerial = item.serialNumbers && item.serialNumbers.some(sn => 
                sn.toLowerCase().includes(search.toLowerCase())
              );
              if (!hasMatchingSerial) return;
            }
            
            const vatRate = matchedProduct.vatRate || 'VAT 23%';
            const taxMultiplier = vatRate === 'VAT 23%' ? 1.23 : 
                                 vatRate === 'VAT 13.5%' ? 1.135 : 1.0;
            
            const unitPriceIncludingTax = item.unitCost * taxMultiplier;
            const totalPriceIncludingTax = item.totalCost * taxMultiplier;
            
            history.push({
              type: 'purchase',
              date: invoice.invoiceDate,
              invoiceNumber: invoice.invoiceNumber,
              invoiceId: invoice._id,
              partner: invoice.supplier,
              product: {
                id: matchedProduct._id,
                name: matchedProduct.name,
                sku: matchedProduct.sku,
                barcode: matchedProduct.barcode
              },
              quantity: item.quantity,
              unitPrice: unitPriceIncludingTax,
              totalPrice: totalPriceIncludingTax,
              vatRate: vatRate,
              serialNumbers: item.serialNumbers || [],
              status: invoice.status
            });
          }
        });
      });
      
      // 添加销售记录
      salesInvoices.forEach(invoice => {
        invoice.items.forEach(item => {
          const matchedProduct = products.find(p => p._id.toString() === item.product.toString());
          
          if (matchedProduct) {
            if (isSerialNumberSearch) {
              const hasMatchingSerial = item.serialNumbers && item.serialNumbers.some(sn => 
                sn.toLowerCase().includes(search.toLowerCase())
              );
              if (!hasMatchingSerial) return;
            }
            
            const vatRate = matchedProduct.vatRate || 'VAT 23%';
            const taxMultiplier = vatRate === 'VAT 23%' ? 1.23 : 
                                 vatRate === 'VAT 13.5%' ? 1.135 : 1.0;
            
            const unitPriceIncludingTax = item.unitPrice * taxMultiplier;
            const totalPriceIncludingTax = item.totalPrice * taxMultiplier;
            
            history.push({
              type: 'sales',
              date: invoice.invoiceDate,
              invoiceNumber: invoice.invoiceNumber,
              invoiceId: invoice._id,
              partner: invoice.customer,
              product: {
                id: matchedProduct._id,
                name: matchedProduct.name,
                sku: matchedProduct.sku,
                barcode: matchedProduct.barcode
              },
              quantity: item.quantity,
              unitPrice: unitPriceIncludingTax,
              totalPrice: totalPriceIncludingTax,
              vatRate: vatRate,
              serialNumbers: item.serialNumbers || [],
              status: invoice.status
            });
          }
        });
      });
    }
    
    // === 直接通过序列号查找发票（即使产品不存在） ===
    const purchaseInvoicesBySerial = await PurchaseInvoice.find({
      'items.serialNumbers': { $regex: search, $options: 'i' }
    })
      .populate('supplier', 'name code')
      .sort({ invoiceDate: -1 })
      .lean();
    
    purchaseInvoicesBySerial.forEach(invoice => {
      invoice.items.forEach(item => {
        // 检查是否包含搜索的序列号
        const hasMatchingSerial = item.serialNumbers && item.serialNumbers.some(sn => 
          sn.toLowerCase().includes(search.toLowerCase())
        );
        
        if (hasMatchingSerial) {
          // 检查是否已经添加过（避免重复）
          const alreadyAdded = history.some(h => 
            h.invoiceNumber === invoice.invoiceNumber && 
            h.serialNumbers && h.serialNumbers.some(sn => 
              item.serialNumbers.includes(sn)
            )
          );
          
          if (!alreadyAdded) {
            // 尝试获取产品信息
            let productInfo = {
              name: item.productName || '未知产品',
              sku: '',
              barcode: ''
            };
            
            // 如果有产品ID，尝试查找产品
            if (item.product) {
              const matchedProduct = products.find(p => p._id.toString() === item.product.toString());
              if (matchedProduct) {
                productInfo = {
                  id: matchedProduct._id,
                  name: matchedProduct.name,
                  sku: matchedProduct.sku,
                  barcode: matchedProduct.barcode
                };
              }
            }
            
            // 计算价格（使用默认税率23%）
            const taxMultiplier = 1.23;
            const unitPriceIncludingTax = (item.unitCost || item.unitPrice || 0) * taxMultiplier;
            const totalPriceIncludingTax = (item.totalCost || item.totalPrice || 0) * taxMultiplier;
            
            history.push({
              type: 'purchase',
              date: invoice.invoiceDate,
              invoiceNumber: invoice.invoiceNumber,
              invoiceId: invoice._id,
              partner: invoice.supplier || { name: '未知供应商', code: '' },
              product: productInfo,
              quantity: item.quantity,
              unitPrice: unitPriceIncludingTax,
              totalPrice: totalPriceIncludingTax,
              vatRate: 'VAT 23%',
              serialNumbers: item.serialNumbers || [],
              status: invoice.status,
              note: item.product ? '' : '⚠️ 原产品已删除'
            });
          }
        }
      });
    });
    
    // === 处理商户系统数据 ===
    if (merchantInventories.length > 0) {
      // 查询仓库订单（采购入库）
      const warehouseOrders = await WarehouseOrder.find({
        $or: [
          { 'items.serialNumber': { $regex: search, $options: 'i' } },
          { 'items.productName': { $regex: search, $options: 'i' } }
        ]
      }).sort({ orderDate: -1 }).lean();
      
      warehouseOrders.forEach(order => {
        order.items.forEach(item => {
          if (item.serialNumber && item.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
              item.productName && item.productName.toLowerCase().includes(search.toLowerCase())) {
            history.push({
              type: 'purchase',
              date: order.orderDate,
              invoiceNumber: order.orderNumber,
              invoiceId: order._id,
              partner: { name: '仓库', code: 'WAREHOUSE' },
              product: {
                name: item.productName,
                sku: item.serialNumber || '',
                barcode: item.barcode || ''
              },
              quantity: item.quantity,
              unitPrice: item.wholesalePrice || item.costPrice,
              totalPrice: (item.wholesalePrice || item.costPrice) * item.quantity,
              vatRate: item.taxClassification || 'VAT_23',
              serialNumbers: item.serialNumber ? [item.serialNumber] : [],
              status: order.status,
              merchant: order.merchantId
            });
          }
        });
      });
      
      // 查询调货记录
      const transfers = await InventoryTransfer.find({
        $or: [
          { 'items.serialNumber': { $regex: search, $options: 'i' } },
          { 'items.productName': { $regex: search, $options: 'i' } }
        ]
      }).sort({ createdAt: -1 }).lean();
      
      transfers.forEach(transfer => {
        transfer.items.forEach(item => {
          if (item.serialNumber && item.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
              item.productName && item.productName.toLowerCase().includes(search.toLowerCase())) {
            history.push({
              type: 'transfer',
              date: transfer.createdAt,
              invoiceNumber: transfer.transferNumber,
              invoiceId: transfer._id,
              partner: { 
                name: `${transfer.fromMerchant} → ${transfer.toMerchant}`, 
                code: 'TRANSFER' 
              },
              product: {
                name: item.productName,
                sku: item.serialNumber || '',
                barcode: item.barcode || ''
              },
              quantity: item.quantity,
              unitPrice: item.transferPrice || 0,
              totalPrice: (item.transferPrice || 0) * item.quantity,
              vatRate: item.taxClassification || 'VAT_23',
              serialNumbers: item.serialNumber ? [item.serialNumber] : [],
              status: transfer.status,
              transferType: transfer.transferType,
              fromMerchant: transfer.fromMerchant,
              toMerchant: transfer.toMerchant
            });
          }
        });
      });
      
      // 查询销售记录
      const merchantSales = await MerchantSale.find({
        $or: [
          { 'items.serialNumber': { $regex: search, $options: 'i' } },
          { 'items.productName': { $regex: search, $options: 'i' } }
        ]
      }).sort({ saleDate: -1 }).lean();
      
      merchantSales.forEach(sale => {
        sale.items.forEach(item => {
          if (item.serialNumber && item.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
              item.productName && item.productName.toLowerCase().includes(search.toLowerCase())) {
            history.push({
              type: 'sales',
              date: sale.saleDate,
              invoiceNumber: sale.invoiceNumber || `SALE-${sale._id.toString().slice(-8)}`,
              invoiceId: sale._id,
              partner: { 
                name: sale.customerPhone || '零售客户', 
                code: 'RETAIL' 
              },
              product: {
                name: item.productName,
                sku: item.serialNumber || '',
                barcode: ''
              },
              quantity: item.quantity,
              unitPrice: item.price,
              totalPrice: item.price * item.quantity,
              vatRate: item.taxClassification || 'VAT_23',
              serialNumbers: item.serialNumber ? [item.serialNumber] : [],
              status: sale.status || 'completed',
              merchant: sale.merchantId,
              costPrice: item.costPrice,
              profit: (item.price - item.costPrice) * item.quantity - (item.taxAmount || 0)
            });
          }
        });
      });
    }
    
    // 按日期排序
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 合并产品列表
    const allProducts = [
      ...products.map(p => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        stockQuantity: p.stockQuantity || 0,
        source: 'old_system'
      })),
      ...merchantInventories.map(inv => ({
        id: inv._id,
        name: inv.productName,
        sku: inv.serialNumber || '',
        barcode: inv.barcode || '',
        stockQuantity: inv.quantity || 0,
        source: 'merchant_system',
        merchant: inv.merchantId,
        status: inv.status
      }))
    ];
    
    res.json({
      success: true,
      data: {
        products: allProducts,
        history
      }
    });
  } catch (error) {
    console.error('产品追溯查询失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取特定产品的采购发票（必须在 products/:id 路由之前）
app.get('/api/admin/products/:productId/purchase-invoices', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // 查找包含该产品的所有采购发票
    const invoices = await PurchaseInvoice.find({
      'items.product': productId
    })
    .populate('supplier', 'name contact.email contact.phone contact.address')
    .populate('items.product', 'name barcode serialNumbers')
    .sort({ createdAt: -1 });
    
    const formattedInvoices = invoices.map(invoice => {
      // 找到该产品在发票中的条目
      const productItems = invoice.items.filter(item => 
        item.product && item.product._id.toString() === productId
      );
      
      return {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        supplier: invoice.supplier ? {
          name: invoice.supplier.name,
          email: invoice.supplier.contact?.email || '',
          phone: invoice.supplier.contact?.phone || '',
          address: invoice.supplier.contact?.address || ''
        } : { name: '未知供应商', email: '', phone: '', address: '' },
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        notes: invoice.notes,
        productItems: productItems.map(item => {
          // 计算含税价格
          const vatRate = item.vatRate || 'VAT 23%';
          let taxMultiplier = 1.0;
          
          if (vatRate === 'VAT 23%') {
            taxMultiplier = 1.23;
          } else if (vatRate === 'VAT 13.5%') {
            taxMultiplier = 1.135;
          } else if (vatRate === 'VAT 0%') {
            taxMultiplier = 1.0;
          }
          
          const unitPriceIncludingTax = (item.unitCost || 0) * taxMultiplier;
          const totalPriceIncludingTax = (item.totalCost || 0) * taxMultiplier;
          
          return {
            name: item.description || (item.product ? item.product.name : '未知产品'),
            quantity: item.quantity,
            unitPrice: unitPriceIncludingTax, // 含税单价
            totalPrice: totalPriceIncludingTax, // 含税总价
            unitCostExcludingTax: item.unitCost, // 不含税单价（备用）
            totalCostExcludingTax: item.totalCost, // 不含税总价（备用）
            vatRate: vatRate,
            taxAmount: item.taxAmount || 0,
            serialNumbers: item.serialNumbers || [],
            barcode: item.product ? item.product.barcode : '',
            condition: 'Brand New'
          };
        }),
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt
      };
    });
    
    res.json({
      success: true,
      data: formattedInvoices,
      count: formattedInvoices.length
    });
  } catch (error) {
    console.error('获取产品采购发票失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取单个采购发票详情
app.get('/api/admin/purchase-invoices/:invoiceId', checkDbConnection, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const invoice = await PurchaseInvoice.findById(invoiceId)
      .populate('supplier', 'name code contact')
      .populate('items.product', 'condition taxClassification')
      .lean();
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        error: '采购发票不存在' 
      });
    }
    
    res.json({ 
      success: true, 
      data: invoice 
    });
  } catch (error) {
    console.error('获取采购发票详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取单个销售发票详情
app.get('/api/admin/sales-invoices/:invoiceId', checkDbConnection, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const invoice = await SalesInvoice.findById(invoiceId)
      .populate('customer', 'name code contact')
      .populate('items.product', 'condition taxClassification')
      .lean();
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        error: '销售发票不存在' 
      });
    }
    
    res.json({ 
      success: true, 
      data: invoice 
    });
  } catch (error) {
    console.error('获取销售发票详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新产品信息
app.put('/api/admin/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const product = await ProductNew.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: '产品不存在'
      });
    }
    
    // 处理序列号更新
    if (updateData.serialNumberUpdate) {
      const { oldSerialNumber, newSerialNumber } = updateData.serialNumberUpdate;
      const serialIndex = product.serialNumbers.findIndex(sn => sn.serialNumber === oldSerialNumber);
      if (serialIndex !== -1 && newSerialNumber) {
        product.serialNumbers[serialIndex].serialNumber = newSerialNumber;
      }
      delete updateData.serialNumberUpdate;
    }
    
    // 更新其他字段
    Object.keys(updateData).forEach(key => {
      if (key !== 'serialNumberUpdate' && updateData[key] !== undefined) {
        product[key] = updateData[key];
      }
    });
    
    await product.save();
    
    res.json({
      success: true,
      data: product,
      message: '产品信息更新成功'
    });
  } catch (error) {
    console.error('更新产品失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取单个产品详情
app.get('/api/admin/products/:id', async (req, res) => {
  try {
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    // 先尝试在 ProductNew 中查找
    let product = await ProductNew.findById(req.params.id)
      .populate('category', 'name type')
      .lean();
    
    let isAdminInventory = false;
    
    // 如果在 ProductNew 中找不到，尝试在 AdminInventory 中查找
    if (!product) {
      product = await AdminInventory.findById(req.params.id).lean();
      isAdminInventory = true;
    }
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: '产品不存在'
      });
    }
    
    if (isAdminInventory) {
      // AdminInventory 产品：转换格式
      const taxClassification = product.taxClassification || 'VAT_23';
      let taxMultiplier = 1.0;
      
      if (taxClassification === 'VAT_23') {
        taxMultiplier = 1.23;
      } else if (taxClassification === 'SERVICE_VAT_13_5') {
        taxMultiplier = 1.135;
      }
      
      const costPriceIncludingTax = (product.costPrice || 0) * taxMultiplier;
      
      const productData = {
        _id: product._id,
        name: product.productName,
        brand: product.brand,
        model: product.model,
        color: product.color,
        productType: product.category,
        category: { type: product.category, name: product.category },
        stockQuantity: product.quantity,
        quantity: product.quantity,
        costPrice: costPriceIncludingTax,
        costPriceIncludingTax: costPriceIncludingTax,
        costPriceExcludingTax: product.costPrice,
        wholesalePrice: product.wholesalePrice,
        retailPrice: product.retailPrice,
        vatRate: taxClassification === 'VAT_23' ? 'VAT 23%' : 
                 taxClassification === 'SERVICE_VAT_13_5' ? 'VAT 13.5%' : 'VAT 0%',
        taxClassification: product.taxClassification,
        condition: product.condition,
        notes: product.notes,
        source: 'AdminInventory'
      };
      
      res.json({
        success: true,
        data: productData
      });
    } else {
      // ProductNew 产品：原有逻辑
      const vatRate = product.vatRate || 'VAT 23%';
      let taxMultiplier = 1.0;
      
      if (vatRate === 'VAT 23%') {
        taxMultiplier = 1.23;
      } else if (vatRate === 'VAT 13.5%') {
        taxMultiplier = 1.135;
      } else if (vatRate === 'VAT 0%') {
        taxMultiplier = 1.0;
      }
      
      const costPriceIncludingTax = (product.costPrice || 0) * taxMultiplier;
      
      const productWithTaxInclusivePrice = {
        ...product,
        costPriceIncludingTax,
        costPriceExcludingTax: product.costPrice,
        costPrice: costPriceIncludingTax,
        source: 'ProductNew'
      };
      
      res.json({
        success: true,
        data: productWithTaxInclusivePrice
      });
    }
  } catch (error) {
    console.error('获取产品详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新产品价格
app.put('/api/admin/products/:id/price', async (req, res) => {
  try {
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const { costPrice, wholesalePrice, retailPrice } = req.body;
    
    // 先尝试在 ProductNew 中查找
    let product = await ProductNew.findById(req.params.id);
    let isAdminInventory = false;
    
    // 如果在 ProductNew 中找不到，尝试在 AdminInventory 中查找
    if (!product) {
      product = await AdminInventory.findById(req.params.id);
      isAdminInventory = true;
    }
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: '产品不存在'
      });
    }
    
    // 验证价格逻辑：进货价 < 批发价 < 零售价
    if (costPrice && wholesalePrice && costPrice >= wholesalePrice) {
      return res.status(400).json({
        success: false,
        error: '批发价必须高于进货价'
      });
    }
    
    if (wholesalePrice && retailPrice && wholesalePrice >= retailPrice) {
      return res.status(400).json({
        success: false,
        error: '零售价必须高于批发价'
      });
    }
    
    // 更新价格
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (wholesalePrice !== undefined) product.wholesalePrice = wholesalePrice;
    if (retailPrice !== undefined) product.retailPrice = retailPrice;
    
    await product.save();
    
    console.log(`✅ 价格更新成功 (${isAdminInventory ? 'AdminInventory' : 'ProductNew'}): ${product.name || product.productName}`);
    
    res.json({
      success: true,
      message: '价格更新成功',
      data: {
        costPrice: product.costPrice,
        wholesalePrice: product.wholesalePrice,
        retailPrice: product.retailPrice,
        source: isAdminInventory ? 'AdminInventory' : 'ProductNew'
      }
    });
  } catch (error) {
    console.error('更新产品价格失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新产品数量
app.put('/api/admin/products/:id/quantity', async (req, res) => {
  try {
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const { type, quantity, note } = req.body;
    
    // 先尝试在 ProductNew 中查找
    let product = await ProductNew.findById(req.params.id);
    let isAdminInventory = false;
    let quantityField = 'stockQuantity';
    
    // 如果在 ProductNew 中找不到，尝试在 AdminInventory 中查找
    if (!product) {
      product = await AdminInventory.findById(req.params.id);
      isAdminInventory = true;
      quantityField = 'quantity';
    }
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: '产品不存在'
      });
    }
    
    // 检查产品是否有序列号（有序列号的产品不能调整数量）
    if (!isAdminInventory && product.serialNumbers && product.serialNumbers.length > 0) {
      return res.status(400).json({
        success: false,
        error: '有序列号的产品不能调整数量'
      });
    }
    
    const oldQuantity = product[quantityField];
    let newQuantity = oldQuantity;
    
    switch (type) {
      case 'add':
        newQuantity = oldQuantity + parseInt(quantity);
        break;
      case 'subtract':
        newQuantity = Math.max(0, oldQuantity - parseInt(quantity));
        break;
      case 'set':
        newQuantity = parseInt(quantity);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: '无效的调整类型'
        });
    }
    
    product[quantityField] = newQuantity;
    await product.save();
    
    console.log(`✅ 数量更新成功 (${isAdminInventory ? 'AdminInventory' : 'ProductNew'}): ${product.name || product.productName}, ${oldQuantity} → ${newQuantity}`);
    
    res.json({
      success: true,
      message: '数量更新成功',
      data: {
        oldQuantity,
        newQuantity,
        type,
        note,
        source: isAdminInventory ? 'AdminInventory' : 'ProductNew'
      }
    });
  } catch (error) {
    console.error('更新产品数量失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新产品位置
app.put('/api/admin/products/:id/location', async (req, res) => {
  try {
    const ProductNew = require('./models/ProductNew');
    const { area, shelf, position } = req.body;
    
    const product = await ProductNew.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: '产品不存在'
      });
    }
    
    // 构建完整位置字符串
    const fullLocation = [area, shelf, position].filter(Boolean).join('-');
    
    product.location = {
      area: area || '',
      shelf: shelf || '',
      position: position || '',
      fullLocation: fullLocation
    };
    
    await product.save();
    
    res.json({
      success: true,
      message: '位置更新成功',
      data: product.location
    });
  } catch (error) {
    console.error('更新产品位置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新产品状态
app.put('/api/admin/products/:id/status', async (req, res) => {
  try {
    const ProductNew = require('./models/ProductNew');
    const { status, condition, note } = req.body;
    
    const product = await ProductNew.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: '产品不存在'
      });
    }
    
    // 更新状态和成色
    if (status) product.status = status;
    if (condition) product.condition = condition;
    
    await product.save();
    
    res.json({
      success: true,
      message: '状态更新成功',
      data: {
        status: product.status,
        condition: product.condition,
        note
      }
    });
  } catch (error) {
    console.error('更新产品状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取存储位置目录
app.get('/api/admin/storage-locations', async (req, res) => {
  try {
    const ProductNew = require('./models/ProductNew');
    
    // 获取所有已使用的位置
    const products = await ProductNew.find({ 
      isActive: true,
      'location.fullLocation': { $ne: '' }
    }, 'location').lean();
    
    const locations = new Set();
    products.forEach(product => {
      if (product.location && product.location.fullLocation) {
        locations.add(product.location.fullLocation);
      }
    });
    
    // 预定义的存储区域
    const predefinedAreas = [
      { area: 'A区', description: '手机配件' },
      { area: 'B区', description: '电脑配件' },
      { area: 'C区', description: '车载配件' },
      { area: 'D区', description: '全新设备' },
      { area: 'E区', description: '二手设备' },
      { area: 'F区', description: 'Audio设备' },
      { area: 'G区', description: '数据线' },
      { area: 'H区', description: '电源适配器' }
    ];
    
    res.json({
      success: true,
      data: {
        predefinedAreas,
        usedLocations: Array.from(locations).sort()
      }
    });
  } catch (error) {
    console.error('获取存储位置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 供货商管理 API ====================

// 获取所有供货商（支持搜索）
app.get('/api/admin/suppliers', checkDbConnection, async (req, res) => {
  try {
    const { search } = req.query;
    const SupplierNew = require('./models/SupplierNew');
    
    let query = { isActive: true };
    
    // 如果有搜索条件
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'contact.person': { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    const suppliers = await SupplierNew.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    console.error('获取供货商列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取供货商的所有采购发票
app.get('/api/admin/suppliers/:supplierId/invoices', checkDbConnection, async (req, res) => {
  try {
    console.log('\n🔥🔥🔥 NEW API CODE IS RUNNING 🔥🔥🔥\n');
    const { supplierId } = req.params;
    console.log(`\n[API] Get supplier invoices: ${supplierId}`);
    
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    const AdminInventory = require('./models/AdminInventory');
    const SupplierNew = require('./models/SupplierNew');
    
    // 获取供货商信息
    const supplier = await SupplierNew.findById(supplierId);
    if (!supplier) {
      console.log(`[API] Supplier not found: ${supplierId}`);
      return res.status(404).json({
        success: false,
        error: '供货商不存在'
      });
    }
    
    console.log(`[API] Found supplier: ${supplier.name}`);
    
    // 查询PurchaseInvoice表中的发票
    const invoices = await PurchaseInvoice.find({ supplier: supplierId })
      .populate('supplier', 'name code')
      .populate('items.product', 'name sku barcode')
      .sort({ invoiceDate: -1 })
      .lean();
    
    // 查询AdminInventory表中关联到该供货商的产品（按订单号分组）
    const adminInventoryProducts = await AdminInventory.find({ 
      supplier: supplier.name 
    }).lean();
    
    // 按订单号分组AdminInventory产品
    const inventoryByInvoice = {};
    adminInventoryProducts.forEach(product => {
      const invoiceNum = product.invoiceNumber || 'N/A';
      if (!inventoryByInvoice[invoiceNum]) {
        inventoryByInvoice[invoiceNum] = [];
      }
      inventoryByInvoice[invoiceNum].push(product);
    });
    
    // 合并PurchaseInvoice和AdminInventory数据
    const invoicesWithTaxIncluded = invoices.map(invoice => {
      console.log(`[API] Processing invoice ${invoice.invoiceNumber}:`);
      console.log(`  supplier type: ${typeof invoice.supplier}`);
      console.log(`  supplier._id: ${invoice.supplier?._id}`);
      console.log(`  supplier.name: ${invoice.supplier?.name}`);
      
      // 处理PurchaseInvoice中的items
      const itemsWithTaxIncluded = invoice.items.map(item => {
        const taxMultiplier = item.vatRate === 'VAT 23%' ? 1.23 : 
                             item.vatRate === 'VAT 13.5%' ? 1.135 : 1.0;
        return {
          ...item,
          unitCostIncludingTax: item.unitCost * taxMultiplier,
          totalCostIncludingTax: item.totalCost * taxMultiplier,
          source: 'PurchaseInvoice'
        };
      });
      
      // 添加AdminInventory中的产品
      const adminItems = inventoryByInvoice[invoice.invoiceNumber] || [];
      const adminItemsFormatted = adminItems.map(product => {
        // 计算税额
        let taxMultiplier = 1.0;
        if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
          taxMultiplier = 1.23;
        } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
          taxMultiplier = 1.135;
        }
        
        const totalCostIncludingTax = product.costPrice * product.quantity;
        const totalCostExcludingTax = totalCostIncludingTax / taxMultiplier;
        const taxAmount = totalCostIncludingTax - totalCostExcludingTax;
        
        return {
          _id: product._id,
          productName: `${product.productName} - ${product.model} - ${product.color}`,
          product: {
            name: product.productName,
            sku: product.model,
            barcode: product.barcode || ''
          },
          quantity: product.quantity,
          unitCost: product.costPrice,
          totalCost: totalCostIncludingTax,
          totalCostExcludingTax: totalCostExcludingTax,
          taxAmount: taxAmount,
          vatRate: product.taxClassification === 'VAT_23' ? 'VAT 23%' : 
                   product.taxClassification === 'VAT_13_5' ? 'VAT 13.5%' : 'VAT 0%',
          unitCostIncludingTax: product.costPrice,
          totalCostIncludingTax: totalCostIncludingTax,
          location: product.location,
          condition: product.condition,
          source: 'AdminInventory'
        };
      });
      
      // 合并所有items
      const allItems = [...itemsWithTaxIncluded, ...adminItemsFormatted];
      
      // 重新计算总金额、小计和税额
      const totalAmount = allItems.reduce((sum, item) => sum + (item.totalCostIncludingTax || item.totalCost), 0);
      const subtotal = allItems.reduce((sum, item) => sum + (item.totalCostExcludingTax || item.totalCost / 1.23), 0);
      const taxAmount = totalAmount - subtotal;
      
      return {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        supplier: invoice.supplier, // 明确保留supplier对象
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
        paymentStatus: invoice.paymentStatus,
        paidAmount: invoice.paidAmount,
        status: invoice.status,
        receivingStatus: invoice.receivingStatus,
        notes: invoice.notes,
        payments: invoice.payments || [],
        attachments: invoice.attachments || [],
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        items: allItems,
        totalAmount: totalAmount,
        subtotal: subtotal,
        taxAmount: taxAmount,
        adminInventoryCount: adminItems.length,
        purchaseInvoiceCount: itemsWithTaxIncluded.length
      };
    });
    
    // 添加只在AdminInventory中存在的订单（没有对应的PurchaseInvoice）
    const existingInvoiceNumbers = new Set(invoices.map(inv => inv.invoiceNumber));
    const additionalInvoices = [];
    
    Object.keys(inventoryByInvoice).forEach(invoiceNum => {
      if (invoiceNum !== 'N/A' && !existingInvoiceNumbers.has(invoiceNum)) {
        const products = inventoryByInvoice[invoiceNum];
        
        // 计算每个产品的税额
        const formattedProducts = products.map(product => {
          let taxMultiplier = 1.0;
          if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
            taxMultiplier = 1.23;
          } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
            taxMultiplier = 1.135;
          }
          
          const totalCostIncludingTax = product.costPrice * product.quantity;
          const totalCostExcludingTax = totalCostIncludingTax / taxMultiplier;
          const taxAmount = totalCostIncludingTax - totalCostExcludingTax;
          
          return {
            _id: product._id,
            productName: `${product.productName} - ${product.model} - ${product.color}`,
            product: {
              name: product.productName,
              sku: product.model,
              barcode: product.barcode || ''
            },
            quantity: product.quantity,
            unitCost: product.costPrice,
            totalCost: totalCostIncludingTax,
            totalCostExcludingTax: totalCostExcludingTax,
            taxAmount: taxAmount,
            vatRate: product.taxClassification === 'VAT_23' ? 'VAT 23%' : 
                     product.taxClassification === 'VAT_13_5' ? 'VAT 13.5%' : 'VAT 0%',
            unitCostIncludingTax: product.costPrice,
            totalCostIncludingTax: totalCostIncludingTax,
            location: product.location,
            condition: product.condition,
            source: 'AdminInventory'
          };
        });
        
        // 计算总金额、小计和税额
        const totalAmount = formattedProducts.reduce((sum, p) => sum + p.totalCostIncludingTax, 0);
        const subtotal = formattedProducts.reduce((sum, p) => sum + p.totalCostExcludingTax, 0);
        const taxAmount = totalAmount - subtotal;
        
        additionalInvoices.push({
          _id: `admin-${invoiceNum}`,
          invoiceNumber: invoiceNum,
          supplier: {
            _id: supplierId,
            name: supplier.name,
            code: supplier.code
          },
          invoiceDate: products[0].createdAt,
          status: 'received',
          paymentStatus: 'pending',
          totalAmount: totalAmount,
          subtotal: subtotal,
          taxAmount: taxAmount,
          paidAmount: 0,
          items: formattedProducts,
          adminInventoryCount: products.length,
          purchaseInvoiceCount: 0,
          sourceType: 'AdminInventory-Only'
        });
      }
    });
    
    res.json({
      success: true,
      data: [...invoicesWithTaxIncluded, ...additionalInvoices].sort((a, b) => 
        new Date(b.invoiceDate) - new Date(a.invoiceDate)
      )
    });
  } catch (error) {
    console.error('获取供货商发票失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取单个供货商
app.get('/api/admin/suppliers/:id', checkDbConnection, async (req, res) => {
  try {
    console.log(`\n⚠️ GET /api/admin/suppliers/:id called with id=${req.params.id}, path=${req.path}\n`);
    const SupplierNew = require('./models/SupplierNew');
    
    const supplier = await SupplierNew.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: '供货商不存在'
      });
    }
    
    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('获取供货商失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 添加供货商
app.post('/api/admin/suppliers', checkDbConnection, async (req, res) => {
  try {
    const SupplierNew = require('./models/SupplierNew');
    const UserNew = require('./models/UserNew');
    
    // 获取默认用户（临时方案）
    let defaultUser = await UserNew.findOne({ role: 'admin' });
    if (!defaultUser) {
      defaultUser = await UserNew.findOne();
    }
    
    const supplierData = {
      ...req.body,
      createdBy: defaultUser._id
    };
    
    const supplier = new SupplierNew(supplierData);
    await supplier.save();
    
    res.json({
      success: true,
      message: '供货商添加成功',
      data: supplier
    });
  } catch (error) {
    console.error('添加供货商失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新供货商
app.put('/api/admin/suppliers/:id', checkDbConnection, async (req, res) => {
  try {
    const SupplierNew = require('./models/SupplierNew');
    const UserNew = require('./models/UserNew');
    
    // 获取默认用户
    let defaultUser = await UserNew.findOne({ role: 'admin' });
    if (!defaultUser) {
      defaultUser = await UserNew.findOne();
    }
    
    const supplier = await SupplierNew.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: defaultUser._id },
      { new: true, runValidators: true }
    );
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: '供货商不存在'
      });
    }
    
    res.json({
      success: true,
      message: '供货商更新成功',
      data: supplier
    });
  } catch (error) {
    console.error('更新供货商失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 删除供货商（软删除）
app.delete('/api/admin/suppliers/:id', checkDbConnection, async (req, res) => {
  try {
    const SupplierNew = require('./models/SupplierNew');
    
    const supplier = await SupplierNew.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: '供货商不存在'
      });
    }
    
    res.json({
      success: true,
      message: '供货商删除成功'
    });
  } catch (error) {
    console.error('删除供货商失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 客户管理 API ====================

// 获取所有客户（支持搜索）
app.get('/api/admin/customers', checkDbConnection, async (req, res) => {
  try {
    const { search } = req.query;
    const Customer = require('./models/Customer');
    
    let query = { isActive: true };
    
    // 如果有搜索条件
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'contact.person': { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    console.error('获取客户列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取单个客户
app.get('/api/admin/customers/:id', checkDbConnection, async (req, res) => {
  try {
    const Customer = require('./models/Customer');
    
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: '客户不存在'
      });
    }
    
    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('获取客户失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取客户的所有销售发票（包含新旧两套系统）
app.get('/api/admin/customers/:customerId/invoices', checkDbConnection, async (req, res) => {
  try {
    const { customerId } = req.params;
    const SalesInvoice = require('./models/SalesInvoice');
    const MerchantSale = require('./models/MerchantSale');
    const Customer = require('./models/Customer');
    
    // 获取旧系统的销售发票
    const salesInvoices = await SalesInvoice.find({ customer: customerId })
      .populate('customer', 'name code')
      .populate('items.product', 'name sku barcode')
      .sort({ invoiceDate: -1 })
      .lean();
    
    // 获取客户信息，用于匹配商户销售记录
    const customer = await Customer.findById(customerId);
    
    // 获取新系统的商户销售记录（通过客户电话匹配）
    let merchantSales = [];
    if (customer && customer.contact && customer.contact.phone) {
      merchantSales = await MerchantSale.find({ 
        customerPhone: customer.contact.phone 
      })
        .sort({ saleDate: -1 })
        .lean();
    }
    
    // 合并两种数据，标记来源
    const allInvoices = [
      ...salesInvoices.map(inv => ({ 
        ...inv, 
        source: 'SalesInvoice',
        displayDate: inv.invoiceDate,
        displayNumber: inv.invoiceNumber
      })),
      ...merchantSales.map(sale => ({ 
        ...sale, 
        source: 'MerchantSale',
        displayDate: sale.saleDate,
        displayNumber: sale._id.toString()
      }))
    ].sort((a, b) => {
      return new Date(b.displayDate) - new Date(a.displayDate);
    });
    
    res.json({
      success: true,
      data: allInvoices
    });
  } catch (error) {
    console.error('获取客户发票失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 添加客户
app.post('/api/admin/customers', checkDbConnection, async (req, res) => {
  try {
    const Customer = require('./models/Customer');
    const UserNew = require('./models/UserNew');
    
    // 获取默认用户（临时方案）
    let defaultUser = await UserNew.findOne({ role: 'admin' });
    if (!defaultUser) {
      defaultUser = await UserNew.findOne();
    }
    
    const customerData = {
      ...req.body,
      createdBy: defaultUser._id
    };
    
    const customer = new Customer(customerData);
    await customer.save();
    
    res.json({
      success: true,
      message: '客户添加成功',
      data: customer
    });
  } catch (error) {
    console.error('添加客户失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新客户
app.put('/api/admin/customers/:id', checkDbConnection, async (req, res) => {
  try {
    const Customer = require('./models/Customer');
    const UserNew = require('./models/UserNew');
    
    // 获取默认用户
    let defaultUser = await UserNew.findOne({ role: 'admin' });
    if (!defaultUser) {
      defaultUser = await UserNew.findOne();
    }
    
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: defaultUser._id },
      { new: true, runValidators: true }
    );
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: '客户不存在'
      });
    }
    
    res.json({
      success: true,
      message: '客户更新成功',
      data: customer
    });
  } catch (error) {
    console.error('更新客户失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 删除客户（软删除）
app.delete('/api/admin/customers/:id', checkDbConnection, async (req, res) => {
  try {
    const Customer = require('./models/Customer');
    
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: '客户不存在'
      });
    }
    
    res.json({
      success: true,
      message: '客户删除成功'
    });
  } catch (error) {
    console.error('删除客户失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 公司信息管理 API ====================

// 获取公司信息
app.get('/api/admin/company-info', checkDbConnection, async (req, res) => {
  try {
    const CompanyInfo = require('./models/CompanyInfo');
    
    // 获取默认公司信息
    let companyInfo = await CompanyInfo.findOne({ isDefault: true });
    
    // 如果没有，获取第一个
    if (!companyInfo) {
      companyInfo = await CompanyInfo.findOne();
    }
    
    res.json({
      success: true,
      data: companyInfo
    });
  } catch (error) {
    console.error('获取公司信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 保存/更新公司信息
app.post('/api/admin/company-info', checkDbConnection, async (req, res) => {
  try {
    const CompanyInfo = require('./models/CompanyInfo');
    const UserNew = require('./models/UserNew');
    
    // 获取默认用户
    let defaultUser = await UserNew.findOne({ role: 'admin' });
    if (!defaultUser) {
      defaultUser = await UserNew.findOne();
    }
    
    // 查找现有的默认公司信息
    let companyInfo = await CompanyInfo.findOne({ isDefault: true });
    
    if (companyInfo) {
      // 更新现有信息
      Object.assign(companyInfo, req.body);
      companyInfo.updatedBy = defaultUser._id;
      await companyInfo.save();
    } else {
      // 创建新信息
      companyInfo = new CompanyInfo({
        ...req.body,
        isDefault: true,
        createdBy: defaultUser._id
      });
      await companyInfo.save();
    }
    
    res.json({
      success: true,
      message: '公司信息保存成功',
      data: companyInfo
    });
  } catch (error) {
    console.error('保存公司信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 销售发票管理 API ====================

// 创建销售发票
app.post('/api/admin/sales-invoices', checkDbConnection, async (req, res) => {
  try {
    const SalesInvoice = require('./models/SalesInvoice');
    const ProductNew = require('./models/ProductNew');
    const UserNew = require('./models/UserNew');
    
    const { customerId, items, notes } = req.body;
    
    // 获取默认用户
    let defaultUser = await UserNew.findOne({ role: 'admin' });
    if (!defaultUser) {
      defaultUser = await UserNew.findOne();
    }
    
    // 生成发票编号
    const invoiceCount = await SalesInvoice.countDocuments();
    const invoiceNumber = `SI-${Date.now()}-${String(invoiceCount + 1).padStart(4, '0')}`;
    
    // 计算每个产品项目的金额和税额
    let subtotal = 0;
    let totalTaxAmount = 0;
    
    const processedItems = await Promise.all(items.map(async (item) => {
      const product = await ProductNew.findById(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      
      // 使用批发价作为销售价格
      const unitPrice = product.wholesalePrice || 0;
      const totalPrice = unitPrice * item.quantity;
      
      // 计算税率系数
      const vatRate = product.vatRate || 'VAT 23%';
      const taxMultiplier = vatRate === 'VAT 23%' ? 0.23 : 
                           vatRate === 'VAT 13.5%' ? 0.135 : 0;
      
      // 计算不含税价格和税额
      const unitPriceExcludingTax = unitPrice / (1 + taxMultiplier);
      const totalPriceExcludingTax = totalPrice / (1 + taxMultiplier);
      const taxAmount = totalPrice - totalPriceExcludingTax;
      
      subtotal += totalPriceExcludingTax;
      totalTaxAmount += taxAmount;
      
      // 确定Code字段：优先使用序列号，否则使用barcode
      const code = item.serialNumbers && item.serialNumbers.length > 0 
        ? item.serialNumbers.join(', ') 
        : (product.barcode || '');
      
      return {
        product: product._id,
        description: product.name,
        quantity: item.quantity,
        unitPrice: unitPriceExcludingTax, // 存储不含税价格
        totalPrice: totalPriceExcludingTax, // 存储不含税价格
        vatRate: vatRate,
        taxAmount: taxAmount,
        serialNumbers: item.serialNumbers || [],
        barcode: product.barcode,
        code: code, // 新增code字段
        condition: product.condition || '' // 添加产品成色
      };
    }));
    
    const totalAmount = subtotal + totalTaxAmount;
    
    // 创建销售发票
    const salesInvoice = new SalesInvoice({
      invoiceNumber,
      customer: customerId,
      invoiceDate: new Date(),
      items: processedItems,
      subtotal,
      taxAmount: totalTaxAmount,
      totalAmount,
      currency: 'EUR',
      status: 'confirmed',
      paymentStatus: 'pending',
      notes,
      createdBy: defaultUser._id
    });
    
    await salesInvoice.save();
    
    // 更新产品库存和序列号状态
    for (const item of items) {
      const product = await ProductNew.findById(item.productId);
      
      if (item.serialNumbers && item.serialNumbers.length > 0) {
        // 设备：更新序列号状态为已售
        for (const serialNumber of item.serialNumbers) {
          const serialIndex = product.serialNumbers.findIndex(
            sn => sn.serialNumber === serialNumber
          );
          if (serialIndex !== -1) {
            product.serialNumbers[serialIndex].status = 'sold';
            product.serialNumbers[serialIndex].salesInvoice = salesInvoice._id;
            product.serialNumbers[serialIndex].soldDate = new Date();
          }
        }
        // 减少库存数量（每个序列号对应1个库存）
        product.stockQuantity = Math.max(0, product.stockQuantity - item.serialNumbers.length);
        await product.save();
      } else {
        // 配件：减少库存数量
        await ProductNew.findByIdAndUpdate(
          item.productId,
          { $inc: { stockQuantity: -item.quantity } }
        );
      }
    }
    
    // 返回完整的发票信息（包含关联数据）
    const populatedInvoice = await SalesInvoice.findById(salesInvoice._id)
      .populate('customer', 'name code contact')
      .populate('items.product', 'name sku barcode vatRate');
    
    res.json({
      success: true,
      message: '销售发票创建成功',
      data: populatedInvoice
    });
  } catch (error) {
    console.error('创建销售发票失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取销售发票详情
app.get('/api/admin/sales-invoices/:invoiceId', checkDbConnection, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const SalesInvoice = require('./models/SalesInvoice');
    const CompanyInfo = require('./models/CompanyInfo');
    
    const invoice = await SalesInvoice.findById(invoiceId)
      .populate('customer', 'name code contact taxNumber')
      .populate('items.product', 'name sku barcode vatRate');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: '发票不存在'
      });
    }
    
    // 获取公司信息
    const companyInfo = await CompanyInfo.findOne({ isDefault: true });
    
    // 格式化发票数据（计算含税价格）
    const formattedInvoice = {
      ...invoice.toObject(),
      items: invoice.items.map(item => {
        const product = item.product;
        const vatRate = product?.vatRate || item.vatRate || 'VAT 23%';
        const taxMultiplier = vatRate === 'VAT 23%' ? 1.23 : 
                             vatRate === 'VAT 13.5%' ? 1.135 : 1.0;
        
        // 确保价格字段存在
        const unitPrice = item.unitPrice || 0;
        const totalPrice = item.totalPrice || 0;
        
        return {
          ...item.toObject ? item.toObject() : item,
          unitPriceIncludingTax: unitPrice * taxMultiplier,
          totalPriceIncludingTax: totalPrice * taxMultiplier,
          vatRate: vatRate
        };
      }),
      companyInfo: companyInfo
    };
    
    res.json({
      success: true,
      data: formattedInvoice
    });
  } catch (error) {
    console.error('获取销售发票详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 别名路径（兼容旧代码）
app.get('/api/sales-invoices/:invoiceId', checkDbConnection, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const SalesInvoice = require('./models/SalesInvoice');
    const CompanyInfo = require('./models/CompanyInfo');
    
    const invoice = await SalesInvoice.findById(invoiceId)
      .populate('customer', 'name code contact taxNumber')
      .populate('items.product', 'name sku barcode vatRate');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: '发票不存在'
      });
    }
    
    // 获取公司信息
    const companyInfo = await CompanyInfo.findOne({ isDefault: true });
    
    // 格式化发票数据（计算含税价格）
    const formattedInvoice = {
      ...invoice.toObject(),
      items: invoice.items.map(item => {
        const product = item.product;
        const vatRate = product?.vatRate || item.vatRate || 'VAT 23%';
        const taxMultiplier = vatRate === 'VAT 23%' ? 1.23 : 
                             vatRate === 'VAT 13.5%' ? 1.135 : 1.0;
        
        // 确保价格字段存在
        const unitPrice = item.unitPrice || 0;
        const totalPrice = item.totalPrice || 0;
        
        return {
          ...item.toObject ? item.toObject() : item,
          unitPriceIncludingTax: unitPrice * taxMultiplier,
          totalPriceIncludingTax: totalPrice * taxMultiplier,
          vatRate: vatRate
        };
      }),
      companyInfo: companyInfo
    };
    
    res.json({
      success: true,
      data: formattedInvoice
    });
  } catch (error) {
    console.error('获取销售发票详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 确认销售发票付款
app.post('/api/admin/sales-invoices/:invoiceId/payment', checkDbConnection, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { payments } = req.body; // payments: [{ method: 'cash', amount: 100 }, { method: 'transfer', amount: 200 }]
    
    const SalesInvoice = require('./models/SalesInvoice');
    
    const invoice = await SalesInvoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    // 添加新的付款记录
    payments.forEach(payment => {
      if (payment.amount > 0) {
        invoice.payments.push({
          amount: payment.amount,
          paymentDate: new Date(),
          paymentMethod: payment.method, // 'cash', 'bank_transfer', 'credit_card', 'check'
          reference: payment.reference || '',
          notes: payment.notes || ''
        });
      }
    });
    
    // 计算已付总额
    const totalPaidAmount = invoice.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    invoice.paidAmount = totalPaidAmount;
    
    // 更新付款状态
    if (totalPaidAmount >= invoice.totalAmount) {
      invoice.paymentStatus = 'paid';
    } else if (totalPaidAmount > 0) {
      invoice.paymentStatus = 'partial';
    }
    
    await invoice.save();
    
    // 返回更新后的发票
    const updatedInvoice = await SalesInvoice.findById(invoiceId)
      .populate('customer', 'name code contact taxNumber')
      .populate('items.product', 'name sku barcode vatRate');
    
    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: updatedInvoice
    });
  } catch (error) {
    console.error('确认付款失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取财务报表数据
app.get('/api/admin/reports/financial', checkDbConnection, async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query; // type: 'sales', 'purchase', 'all'
    
    const SalesInvoice = require('./models/SalesInvoice');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // 包含结束日期的全天
    
    const results = [];
    
    // 获取销售发票
    if (type === 'sales' || type === 'all') {
      const salesInvoices = await SalesInvoice.find({
        invoiceDate: { $gte: start, $lte: end }
      })
      .populate('customer', 'name')
      .populate('items.product')
      .sort({ invoiceDate: -1 });
      
      salesInvoices.forEach(invoice => {
        // 重新计算税额（基于产品的 vatRate 和 costPrice）
        let recalculatedTax = 0;
        
        invoice.items.forEach(item => {
          const product = item.product;
          if (!product) {
            // 如果产品不存在，使用发票中的税额
            recalculatedTax += item.taxAmount || 0;
            return;
          }
          
          // 对于 Margin VAT 产品，需要重新计算税额
          if (product.vatRate === 'VAT 0%') {
            // Margin VAT: 税额 = (含税卖价 - 成本价) × 23/123
            const totalPriceWithTax = item.totalPrice + item.taxAmount; // 含税价格
            const costPrice = product.costPrice * item.quantity;
            
            if (costPrice > 0) {
              recalculatedTax += (totalPriceWithTax - costPrice) * (23 / 123);
            }
          } else {
            // 对于 VAT 23% 和 VAT 13.5%，使用发票中已计算的税额
            recalculatedTax += item.taxAmount || 0;
          }
        });
        
        results.push({
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          type: 'sales',
          subType: 'retail', // 零售
          partner: invoice.customer?.name || 'Unknown',
          date: invoice.invoiceDate,
          totalAmount: invoice.totalAmount, // 含税金额
          taxAmount: recalculatedTax, // 重新计算的税额（正数）
          subtotal: invoice.subtotal // 不含税金额
        });
      });
      
      // 获取已完成的仓库订单（批发销售）
      const warehouseOrders = await WarehouseOrder.find({
        status: 'completed',
        completedAt: { $gte: start, $lte: end }
      })
      .sort({ completedAt: -1 });
      
      const ProductNew = require('./models/ProductNew');
      const AdminInventory = require('./models/AdminInventory');
      
      for (const order of warehouseOrders) {
        // 重新计算税额（卖方视角）
        let recalculatedTaxAmount = 0;
        
        for (const item of order.items) {
          if (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'MARGIN_VAT') {
            // Margin VAT: 卖方需要对差价征税
            // 查询产品获取进货价
            let product = await ProductNew.findById(item.productId).lean();
            
            if (!product) {
              // 如果ProductNew中没有，尝试从AdminInventory查找
              product = await AdminInventory.findById(item.productId).lean();
            }
            
            if (product && product.costPrice) {
              const costPrice = product.costPrice;
              const wholesalePrice = item.wholesalePrice;
              const margin = (wholesalePrice - costPrice) * item.quantity;
              
              if (margin > 0) {
                // 对差价征税：税额 = 差价 × 23/123
                const marginTax = margin * (23 / 123);
                recalculatedTaxAmount += marginTax;
              }
            }
          } else {
            // 其他税率使用订单中存储的税额
            recalculatedTaxAmount += (item.taxAmount || 0);
          }
        }
        
        results.push({
          _id: order._id,
          invoiceNumber: order.orderNumber,
          type: 'sales',
          subType: 'wholesale', // 批发
          partner: order.merchantId || order.merchantName,
          date: order.completedAt,
          totalAmount: order.totalAmount, // 批发价（含税）
          taxAmount: recalculatedTaxAmount, // 重新计算的税额（卖方视角）
          subtotal: order.totalAmount - recalculatedTaxAmount // 不含税金额
        });
      }
    }
    
    // 获取采购发票
    if (type === 'purchase' || type === 'all') {
      const purchaseInvoices = await PurchaseInvoice.find({
        invoiceDate: { $gte: start, $lte: end }
      })
      .populate('supplier', 'name')
      .sort({ invoiceDate: -1 });
      
      purchaseInvoices.forEach(invoice => {
        results.push({
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          type: 'purchase',
          subType: 'external', // 外部采购
          partner: invoice.supplier?.name || 'Unknown',
          date: invoice.invoiceDate,
          totalAmount: invoice.totalAmount, // 含税金额
          taxAmount: -invoice.taxAmount, // 税额（负数，可抵扣）
          subtotal: invoice.subtotal // 不含税金额
        });
      });
      
      // 获取AdminInventory中的采购发票（按invoiceNumber分组）
      const AdminInventory = require('./models/AdminInventory');
      const adminInventory = await AdminInventory.find({
        createdAt: { $gte: start, $lte: end },
        invoiceNumber: { $exists: true, $ne: null }
      }).lean();
      
      // 按发票号分组
      const invoiceGroups = {};
      adminInventory.forEach(item => {
        const invoiceNum = item.invoiceNumber;
        if (!invoiceGroups[invoiceNum]) {
          invoiceGroups[invoiceNum] = {
            items: [],
            supplier: item.supplier || '未知供货商',
            date: item.createdAt
          };
        }
        invoiceGroups[invoiceNum].items.push(item);
      });
      
      // 将分组的发票添加到结果列表
      Object.keys(invoiceGroups).forEach(invoiceNum => {
        const group = invoiceGroups[invoiceNum];
        
        // 检查是否已经在PurchaseInvoice中
        const exists = results.some(r => r.invoiceNumber === invoiceNum);
        if (exists) return;
        
        let subtotalExcludingTax = 0;  // 不含税小计
        let taxAmount = 0;              // 税额
        
        group.items.forEach(item => {
          // AdminInventory的costPrice是税前价格
          const itemSubtotal = (item.costPrice || 0) * item.quantity;
          subtotalExcludingTax += itemSubtotal;
          
          // 只有VAT_23和VAT_13_5才计算税额，Margin VAT不计算
          if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
            taxAmount += itemSubtotal * 0.23;  // 税前价格 × 23%
          } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
            taxAmount += itemSubtotal * 0.135;  // 税前价格 × 13.5%
          }
          // MARGIN_VAT_0 和 VAT_0 不计算税额（税额为0）
        });
        
        const totalAmount = subtotalExcludingTax + taxAmount;  // 含税总额
        
        results.push({
          _id: `admin-${invoiceNum}`, // 使用admin-前缀格式，以便Invoice Details API可以识别
          invoiceNumber: invoiceNum,
          type: 'purchase',
          subType: 'external',
          partner: group.supplier,
          date: group.date,
          totalAmount: totalAmount,           // 含税总额
          taxAmount: -taxAmount,              // 负数表示可抵扣
          subtotal: subtotalExcludingTax      // 不含税小计
        });
      });
    }
    
    // 按日期排序
    results.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 计算汇总
    const summary = {
      totalSalesAmount: 0,      // 总计税后销售金额
      totalSalesTax: 0,          // 总计销售税额
      totalPurchaseAmount: 0,    // 总计税后采购金额
      totalPurchaseTax: 0,       // 总计采购税额（负数）
      totalTaxPayable: 0,        // 总计应缴税额
      totalWholesaleAmount: 0    // 总计批发金额（新增）
    };
    
    results.forEach(item => {
      if (item.type === 'sales') {
        summary.totalSalesAmount += item.totalAmount;
        summary.totalSalesTax += item.taxAmount;
        if (item.subType === 'wholesale') {
          summary.totalWholesaleAmount += item.totalAmount;
        }
      } else if (item.type === 'purchase') {
        summary.totalPurchaseAmount += item.totalAmount;
        summary.totalPurchaseTax += item.taxAmount; // 已经是负数
      }
    });
    
    // 计算应缴税额
    // Net VAT Payable = 销售税额 - 采购税额（可抵扣）
    summary.totalTaxPayable = summary.totalSalesTax - Math.abs(summary.totalPurchaseTax);
    
    // 获取库存资产数据（可销售的产品）
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const ProductCategory = require('./models/ProductCategory');
    
    // 并行查询 ProductNew 和 AdminInventory
    const [productNewItems, adminInventoryItems] = await Promise.all([
      ProductNew.find({
        isActive: true,
        stockQuantity: { $gt: 0 }
      }).populate('category', 'name type'),
      AdminInventory.find({
        isActive: true,
        status: 'AVAILABLE',
        quantity: { $gt: 0 }
      })
    ]);
    
    // 按分类分组资产
    const assetsByCategory = {};
    let totalAssetValue = 0;
    
    // 处理 ProductNew 产品
    productNewItems.forEach(product => {
      const categoryName = product.category?.type || 'Uncategorized';
      
      if (!assetsByCategory[categoryName]) {
        assetsByCategory[categoryName] = {
          category: categoryName,
          products: [],
          totalQuantity: 0,
          totalValue: 0
        };
      }
      
      // 计算产品的资产价值（按进货价计算）
      const productValue = product.costPrice * product.stockQuantity;
      
      assetsByCategory[categoryName].products.push({
        _id: product._id,
        name: product.name,
        brand: product.brand,
        model: product.model,
        condition: product.condition,
        quantity: product.stockQuantity,
        costPrice: product.costPrice, // 进货价（含税）
        totalValue: productValue
      });
      
      assetsByCategory[categoryName].totalQuantity += product.stockQuantity;
      assetsByCategory[categoryName].totalValue += productValue;
      totalAssetValue += productValue;
    });
    
    // 处理 AdminInventory 产品
    adminInventoryItems.forEach(product => {
      const categoryName = product.category || 'Uncategorized';
      
      if (!assetsByCategory[categoryName]) {
        assetsByCategory[categoryName] = {
          category: categoryName,
          products: [],
          totalQuantity: 0,
          totalValue: 0
        };
      }
      
      // 计算产品的资产价值（按进货价计算）
      const productValue = product.costPrice * product.quantity;
      
      assetsByCategory[categoryName].products.push({
        _id: product._id,
        name: product.productName,
        brand: product.brand,
        model: product.model,
        condition: product.condition,
        quantity: product.quantity,
        costPrice: product.costPrice, // 进货价（不含税）
        totalValue: productValue
      });
      
      assetsByCategory[categoryName].totalQuantity += product.quantity;
      assetsByCategory[categoryName].totalValue += productValue;
      totalAssetValue += productValue;
    });
    
    // 转换为数组并排序
    const assets = Object.values(assetsByCategory).sort((a, b) => b.totalValue - a.totalValue);
    
    const totalProducts = productNewItems.length + adminInventoryItems.length;
    
    res.json({
      success: true,
      data: {
        invoices: results,
        summary: summary,
        assets: {
          categories: assets,
          totalAssetValue: totalAssetValue,
          totalProducts: totalProducts
        }
      }
    });
  } catch (error) {
    console.error('获取财务报表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 别名路径（兼容旧代码）- 财务报表
app.get('/api/reports/financial', checkDbConnection, async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    const SalesInvoice = require('./models/SalesInvoice');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    
    const results = [];
    
    // 获取销售发票
    if (type === 'sales' || type === 'all') {
      const salesInvoices = await SalesInvoice.find({
        invoiceDate: { $gte: start, $lte: end }
      })
      .populate('customer', 'name')
      .populate('items.product')
      .sort({ invoiceDate: -1 });
      
      salesInvoices.forEach(invoice => {
        // 重新计算税额（基于产品的 vatRate 和 costPrice）
        let recalculatedTax = 0;
        
        invoice.items.forEach(item => {
          const product = item.product;
          if (!product) {
            // 如果产品不存在，使用发票中的税额
            recalculatedTax += item.taxAmount || 0;
            return;
          }
          
          // 对于 Margin VAT 产品，需要重新计算税额
          if (product.vatRate === 'VAT 0%') {
            // Margin VAT: 税额 = (含税卖价 - 成本价) × 23/123
            const totalPriceWithTax = item.totalPrice + item.taxAmount; // 含税价格
            const costPrice = product.costPrice * item.quantity;
            
            if (costPrice > 0) {
              recalculatedTax += (totalPriceWithTax - costPrice) * (23 / 123);
            }
          } else {
            // 对于 VAT 23% 和 VAT 13.5%，使用发票中已计算的税额
            recalculatedTax += item.taxAmount || 0;
          }
        });
        
        results.push({
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          type: 'sales',
          subType: 'retail',
          partner: invoice.customer?.name || 'Unknown',
          date: invoice.invoiceDate,
          totalAmount: invoice.totalAmount,
          taxAmount: recalculatedTax, // 重新计算的税额
          subtotal: invoice.subtotal
        });
      });
      
      // 获取已完成的仓库订单（批发销售）
      const warehouseOrders = await WarehouseOrder.find({
        status: 'completed',
        completedAt: { $gte: start, $lte: end }
      })
      .sort({ completedAt: -1 });
      
      warehouseOrders.forEach(order => {
        results.push({
          _id: order._id,
          invoiceNumber: order.orderNumber,
          type: 'sales',
          subType: 'wholesale',
          partner: order.merchantId || order.merchantName, // 显示登录名（merchantId）
          date: order.completedAt,
          totalAmount: order.totalAmount,
          taxAmount: order.taxAmount || 0,
          subtotal: order.subtotal || order.totalAmount
        });
      });
    }
    
    // 获取采购发票
    if (type === 'purchase' || type === 'all') {
      const purchaseInvoices = await PurchaseInvoice.find({
        invoiceDate: { $gte: start, $lte: end }
      })
      .populate('supplier', 'name')
      .sort({ invoiceDate: -1 });
      
      purchaseInvoices.forEach(invoice => {
        results.push({
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          type: 'purchase',
          subType: 'external',
          partner: invoice.supplier?.name || 'Unknown',
          date: invoice.invoiceDate,
          totalAmount: invoice.totalAmount,
          taxAmount: -invoice.taxAmount,
          subtotal: invoice.subtotal
        });
      });
    }
    
    results.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const summary = {
      totalSalesAmount: 0,
      totalSalesTax: 0,
      totalPurchaseAmount: 0,
      totalPurchaseTax: 0,
      totalTaxPayable: 0,
      totalWholesaleAmount: 0
    };
    
    results.forEach(item => {
      if (item.type === 'sales') {
        summary.totalSalesAmount += item.totalAmount;
        summary.totalSalesTax += item.taxAmount;
        if (item.subType === 'wholesale') {
          summary.totalWholesaleAmount += item.totalAmount;
        }
      } else if (item.type === 'purchase') {
        summary.totalPurchaseAmount += item.totalAmount;
        summary.totalPurchaseTax += item.taxAmount;
      }
    });
    
    // 计算应缴税额
    // Net VAT Payable = 销售税额 - 采购税额（可抵扣）
    summary.totalTaxPayable = summary.totalSalesTax - Math.abs(summary.totalPurchaseTax);
    
    // 获取库存资产数据
    const ProductNew = require('./models/ProductNew');
    
    const availableProducts = await ProductNew.find({
      isActive: true,
      stockQuantity: { $gt: 0 }
    }).populate('category', 'name type');
    
    const assetsByCategory = {};
    let totalAssetValue = 0;
    
    availableProducts.forEach(product => {
      const categoryName = product.category?.type || 'Uncategorized';
      
      if (!assetsByCategory[categoryName]) {
        assetsByCategory[categoryName] = {
          category: categoryName,
          products: [],
          totalQuantity: 0,
          totalValue: 0
        };
      }
      
      const productValue = product.costPrice * product.stockQuantity;
      
      assetsByCategory[categoryName].products.push({
        _id: product._id,
        name: product.name,
        brand: product.brand,
        model: product.model,
        condition: product.condition,
        quantity: product.stockQuantity,
        costPrice: product.costPrice,
        totalValue: productValue
      });
      
      assetsByCategory[categoryName].totalQuantity += product.stockQuantity;
      assetsByCategory[categoryName].totalValue += productValue;
      totalAssetValue += productValue;
    });
    
    const assets = Object.values(assetsByCategory).sort((a, b) => b.totalValue - a.totalValue);
    
    res.json({
      success: true,
      data: {
        invoices: results,
        summary: summary,
        assets: {
          categories: assets,
          totalAssetValue: totalAssetValue,
          totalProducts: availableProducts.length
        }
      }
    });
  } catch (error) {
    console.error('获取财务报表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 清除数据库数据（保留客户、供货商、公司信息）
app.post('/api/admin/clear-data', checkDbConnection, async (req, res) => {
  try {
    const ProductNew = require('./models/ProductNew');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    const SalesInvoice = require('./models/SalesInvoice');
    
    // 删除所有产品
    const productsDeleted = await ProductNew.deleteMany({});
    
    // 删除所有采购发票
    const purchaseInvoicesDeleted = await PurchaseInvoice.deleteMany({});
    
    // 删除所有销售发票
    const salesInvoicesDeleted = await SalesInvoice.deleteMany({});
    
    console.log('数据清除完成:');
    console.log(`- 产品: ${productsDeleted.deletedCount} 条`);
    console.log(`- 采购发票: ${purchaseInvoicesDeleted.deletedCount} 条`);
    console.log(`- 销售发票: ${salesInvoicesDeleted.deletedCount} 条`);
    
    res.json({
      success: true,
      message: 'Data cleared successfully',
      deleted: {
        products: productsDeleted.deletedCount,
        purchaseInvoices: purchaseInvoicesDeleted.deletedCount,
        salesInvoices: salesInvoicesDeleted.deletedCount
      }
    });
  } catch (error) {
    console.error('清除数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 用户管理API ====================

// 获取所有用户（包括群组信息）
app.get('/api/admin/users', async (req, res) => {
  try {
    const UserNew = require('./models/UserNew');
    const users = await UserNew.find()
      .populate('retailInfo.storeGroup', 'name code')
      .populate('retailInfo.store', 'name code')
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建新用户
app.post('/api/admin/users', async (req, res) => {
  try {
    const UserNew = require('./models/UserNew');
    const { username, email, password, role, profile, retailInfo } = req.body;
    
    // 检查用户名是否已存在
    const existingUser = await UserNew.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: '用户名或邮箱已存在' 
      });
    }
    
    // 创建新用户
    const user = new UserNew({
      username,
      email,
      password,
      role,
      profile: profile || {},
      retailInfo: retailInfo || {},
      isActive: true
    });
    
    // 设置默认权限
    user.setDefaultPermissions();
    
    await user.save();
    
    // 返回用户信息（不包含密码）
    const userObj = user.toObject();
    delete userObj.password;
    
    res.json({ 
      success: true, 
      data: userObj,
      message: '用户创建成功' 
    });
  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新用户信息
app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const UserNew = require('./models/UserNew');
    const MerchantInventory = require('./models/MerchantInventory');
    const { id } = req.params;
    const { username, email, role, profile, retailInfo, companyInfo, isActive, password } = req.body;
    
    console.log('更新用户请求:', {
      id,
      username,
      email,
      role,
      retailInfo,
      companyInfo,
      isActive
    });
    
    const user = await UserNew.findById(id);
    if (!user) {
      console.log('用户不存在:', id);
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    
    console.log('更新前的用户数据:', {
      username: user.username,
      role: user.role,
      retailInfo: user.retailInfo,
      companyInfo: user.companyInfo
    });
    
    // 记录旧的群组ID（用于判断是否需要更新库存）
    const oldStoreGroup = user.retailInfo?.storeGroup;
    const oldUsername = user.username;
    
    // 更新基本信息
    if (username) user.username = username;
    if (email) user.email = email;
    if (role) {
      user.role = role;
      user.setDefaultPermissions(); // 重新设置权限
    }
    if (profile) user.profile = { ...user.profile, ...profile };
    if (retailInfo) {
      console.log('更新retailInfo:', retailInfo);
      user.retailInfo = { ...user.retailInfo, ...retailInfo };
    }
    if (companyInfo) {
      console.log('更新companyInfo:', companyInfo);
      user.companyInfo = { ...user.companyInfo, ...companyInfo };
    }
    if (typeof isActive !== 'undefined') user.isActive = isActive;
    
    // 如果提供了新密码，更新密码
    if (password && password.trim()) {
      user.password = password;
    }
    
    console.log('更新后的用户数据:', {
      username: user.username,
      role: user.role,
      retailInfo: user.retailInfo,
      companyInfo: user.companyInfo
    });
    
    await user.save();
    
    console.log('用户保存成功');
    
    // 检查群组是否发生变化
    const newStoreGroup = user.retailInfo?.storeGroup;
    const storeGroupChanged = String(oldStoreGroup) !== String(newStoreGroup);
    
    if (storeGroupChanged) {
      console.log('群组发生变化，更新库存记录的 storeGroup');
      console.log('旧群组:', oldStoreGroup);
      console.log('新群组:', newStoreGroup);
      
      // 更新该用户的所有库存记录的 storeGroup
      const updateResult = await MerchantInventory.updateMany(
        { merchantId: oldUsername }, // 使用旧用户名查找（以防用户名也被修改）
        { $set: { storeGroup: newStoreGroup || null } }
      );
      
      console.log(`✅ 更新了 ${updateResult.modifiedCount} 条库存记录的 storeGroup`);
    }
    
    // 返回更新后的用户信息（不包含密码）
    const userObj = user.toObject();
    delete userObj.password;
    
    res.json({ 
      success: true, 
      data: userObj,
      message: '用户更新成功' 
    });
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除用户（软删除）
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const UserNew = require('./models/UserNew');
    const { id } = req.params;
    
    const user = await UserNew.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    
    // 软删除：设置为不活跃
    user.isActive = false;
    await user.save();
    
    res.json({ 
      success: true, 
      message: '用户已停用' 
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 登录认证API ====================

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const UserNew = require('./models/UserNew');
    const { username, password } = req.body;
    
    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: '用户名和密码不能为空' 
      });
    }
    
    // 查找用户（支持用户名或邮箱登录）
    const user = await UserNew.findOne({
      $or: [
        { username: username },
        { email: username }
      ]
    }).populate('retailInfo.storeGroup', 'name code');
    
    // 用户不存在
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: '用户名或密码错误' 
      });
    }
    
    // 检查账户是否激活
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        error: '账户已被停用，请联系管理员' 
      });
    }
    
    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: '用户名或密码错误' 
      });
    }
    
    // 更新登录信息
    user.lastLoginAt = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();
    
    // 返回用户信息（不包含密码）
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.passwordResetToken;
    delete userObj.passwordResetExpires;
    delete userObj.emailVerificationToken;
    
    res.json({ 
      success: true, 
      data: {
        user: userObj,
        message: '登录成功'
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, error: '登录失败，请稍后重试' });
  }
});

// ==================== 群组管理API ====================

// 测试端点 - 验证代码是否加载
app.get('/api/test-version', (req, res) => {
  res.json({ version: '2.0.9-usercount-fix', timestamp: new Date().toISOString() });
});

// 获取所有群组
app.get('/api/admin/store-groups', async (req, res) => {
  console.log('🔥 [DEBUG] /api/admin/store-groups 路由被调用');
  try {
    const StoreGroup = require('./models/StoreGroup');
    const groups = await StoreGroup.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });
    
    console.log('📊 [API] 查询到群组数量:', groups.length);
    
    // 统计每个群组的用户数量
    const UserNew = require('./models/UserNew');
    const groupsWithStats = await Promise.all(groups.map(async (group) => {
      console.log(`📊 [API] 处理群组: ${group.name} (${group._id})`);
      
      const userCount = await UserNew.countDocuments({ 
        'retailInfo.storeGroup': group._id,
        isActive: true 
      });
      
      console.log(`📊 [API] 群组 ${group.name} 的用户数量: ${userCount}`);
      
      const groupObj = group.toObject();
      groupObj.userCount = userCount;
      
      console.log(`📊 [API] 返回对象包含userCount: ${groupObj.userCount}`);
      
      return groupObj;
    }));
    
    console.log('📊 [API] 最终返回数据:', JSON.stringify(groupsWithStats, null, 2));
    
    res.json({ success: true, data: groupsWithStats });
  } catch (error) {
    console.error('❌ [API] 获取群组列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建新群组
app.post('/api/admin/store-groups', async (req, res) => {
  try {
    const StoreGroup = require('./models/StoreGroup');
    const { name, code, description, headquarters, settings } = req.body;
    
    // 检查群组代码是否已存在
    const existingGroup = await StoreGroup.findOne({ 
      $or: [{ code }, { name }] 
    });
    
    if (existingGroup) {
      return res.status(400).json({ 
        success: false, 
        error: '群组代码或名称已存在' 
      });
    }
    
    // 创建新群组
    const group = new StoreGroup({
      name,
      code: code.toUpperCase(),
      description,
      headquarters: headquarters || {},
      settings: settings || {},
      isActive: true,
      createdBy: req.user?._id || null // 如果有认证系统，使用当前用户ID
    });
    
    await group.save();
    
    res.json({ 
      success: true, 
      data: group,
      message: '群组创建成功' 
    });
  } catch (error) {
    console.error('创建群组失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新群组信息
app.put('/api/admin/store-groups/:id', async (req, res) => {
  try {
    const StoreGroup = require('./models/StoreGroup');
    const { id } = req.params;
    const { name, code, description, headquarters, settings, isActive } = req.body;
    
    console.log('更新群组请求:', {
      id,
      name,
      code,
      description,
      settings,
      isActive
    });
    
    const group = await StoreGroup.findById(id);
    if (!group) {
      console.log('群组不存在:', id);
      return res.status(404).json({ success: false, error: '群组不存在' });
    }
    
    console.log('更新前的群组数据:', {
      name: group.name,
      settings: group.settings
    });
    
    // 更新信息
    if (name) group.name = name;
    if (code) group.code = code.toUpperCase();
    if (description !== undefined) group.description = description;
    if (headquarters) group.headquarters = { ...group.headquarters, ...headquarters };
    if (settings) group.settings = { ...group.settings, ...settings };
    if (typeof isActive !== 'undefined') group.isActive = isActive;
    
    console.log('更新后的群组数据:', {
      name: group.name,
      settings: group.settings
    });
    
    await group.save();
    
    console.log('群组保存成功');
    
    res.json({ 
      success: true, 
      data: group,
      message: '群组更新成功' 
    });
  } catch (error) {
    console.error('更新群组失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除群组（软删除）
app.delete('/api/admin/store-groups/:id', async (req, res) => {
  try {
    const StoreGroup = require('./models/StoreGroup');
    const UserNew = require('./models/UserNew');
    const { id } = req.params;
    
    const group = await StoreGroup.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, error: '群组不存在' });
    }
    
    // 检查是否有用户属于该群组
    const userCount = await UserNew.countDocuments({ 
      'retailInfo.storeGroup': id,
      isActive: true 
    });
    
    if (userCount > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `该群组还有 ${userCount} 个活跃用户，无法删除` 
      });
    }
    
    // 软删除：设置为不活跃
    group.isActive = false;
    await group.save();
    
    res.json({ 
      success: true, 
      message: '群组已停用' 
    });
  } catch (error) {
    console.error('删除群组失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取群组的用户列表
app.get('/api/admin/store-groups/:id/users', async (req, res) => {
  try {
    const UserNew = require('./models/UserNew');
    const { id } = req.params;
    
    const users = await UserNew.find({ 
      'retailInfo.storeGroup': id 
    })
    .select('-password')
    .sort({ createdAt: -1 });
    
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('获取群组用户失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 批发商户API (Merchant APIs) ====================
// 批发商户统计数据
app.get('/api/merchant/stats', applyDataIsolation, async (req, res) => {
  try {
    const MerchantInventory = require('./models/MerchantInventory');
    const MerchantSale = require('./models/MerchantSale');
    const RepairOrder = require('./models/RepairOrder');
    
    // 基础过滤条件（来自中间件）
    const baseFilter = req.dataFilter;
    
    // 获取今天的日期范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 获取本月的日期范围
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // 1. 我的库存总数
    const inventoryCount = await MerchantInventory.countDocuments({
      ...baseFilter,
      status: 'active',
      isActive: true,
      quantity: { $gt: 0 }
    });
    
    // 2. 本日销售额
    const dailySales = await MerchantSale.aggregate([
      {
        $match: {
          ...baseFilter,
          saleDate: { $gte: today, $lt: tomorrow },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    // 3. 本日维修收入（已销售的维修订单）
    const dailyRepairs = await RepairOrder.aggregate([
      {
        $match: {
          ...baseFilter,
          soldDate: { $gte: today, $lt: tomorrow },
          status: 'sold'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$salePrice' }
        }
      }
    ]);
    
    // 4. 本月应缴税额
    const monthlyTax = await MerchantSale.aggregate([
      {
        $match: {
          ...baseFilter,
          saleDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalTax' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        myInventory: inventoryCount,
        dailySales: dailySales.length > 0 ? dailySales[0].total : 0,
        dailyRepairs: dailyRepairs.length > 0 ? dailyRepairs[0].total : 0,
        taxDue: monthlyTax.length > 0 ? monthlyTax[0].total : 0
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取批发商库存列表
app.get('/api/merchant/inventory', applyDataIsolation, async (req, res) => {
  try {
    const MerchantInventory = require('./models/MerchantInventory');
    const { category, search } = req.query;
    
    // 基础过滤条件（来自中间件）
    // 移除 status: 'active' 限制，显示所有状态的库存
    let query = { 
      ...req.dataFilter,
      isActive: true 
    };
    
    // 添加分类过滤
    if (category) {
      query.category = category;
    }
    
    // 添加搜索过滤
    if (search) {
      query.$or = [
        { serialNumber: new RegExp(search, 'i') },
        { barcode: new RegExp(search, 'i') },
        { productName: new RegExp(search, 'i') },
        { notes: new RegExp(search, 'i') }
      ];
    }
    
    // 查询商户的库存（category 是字符串，不需要 populate）
    const inventory = await MerchantInventory.find(query)
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    console.error('获取库存失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取产品成色列表
app.get('/api/merchant/conditions', async (req, res) => {
  try {
    const ProductCondition = require('./models/ProductCondition');
    
    // 查询所有激活的成色，按sortOrder排序
    const conditions = await ProductCondition.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    
    res.json({
      success: true,
      data: conditions
    });
  } catch (error) {
    console.error('获取成色列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新商户库存产品信息
app.put('/api/merchant/inventory/:id', applyDataIsolation, async (req, res) => {
  try {
    const MerchantInventory = require('./models/MerchantInventory');
    const inventoryId = req.params.id;
    
    console.log('📝 [更新库存] ID:', inventoryId);
    console.log('📝 [更新库存] 用户:', req.currentUsername);
    console.log('📝 [更新库存] 更新数据:', JSON.stringify(req.body, null, 2));
    
    // 查找库存记录
    const inventory = await MerchantInventory.findOne({
      _id: inventoryId,
      ...req.dataFilter // 确保只能修改自己的库存
    });
    
    if (!inventory) {
      console.log('❌ [更新库存] 库存记录不存在或无权访问');
      return res.status(404).json({
        success: false,
        error: '库存记录不存在或无权访问'
      });
    }
    
    console.log('📦 [更新库存] 找到库存记录:', inventory.productName);
    console.log('📦 [更新库存] 当前位置:', inventory.location);
    
    // 允许更新的字段
    const allowedFields = [
      'productName',
      'brand',
      'model',
      'color',
      'costPrice',
      'wholesalePrice',
      'retailPrice',
      'taxClassification',
      'condition',
      'status',
      'location',
      'notes'
    ];
    
    // 更新字段
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        console.log(`  更新 ${field}: ${inventory[field]} → ${req.body[field]}`);
        inventory[field] = req.body[field];
      }
    });
    
    // 保存更新
    await inventory.save();
    
    console.log('✅ [更新库存] 保存成功，新位置:', inventory.location);
    
    res.json({
      success: true,
      data: inventory,
      message: '产品信息已更新'
    });
  } catch (error) {
    console.error('❌ [更新库存] 失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取群组内的用户列表
app.get('/api/merchant/group-users', applyDataIsolation, async (req, res) => {
  try {
    const UserNew = require('./models/UserNew');
    const user = await UserNew.findOne({ username: req.currentUsername });
    
    console.log('🔍 [group-users] 当前用户:', req.currentUsername);
    console.log('🔍 [group-users] 用户群组:', user?.retailInfo?.storeGroup);
    
    if (!user || !user.retailInfo?.storeGroup) {
      console.log('⚠️  [group-users] 用户没有群组，返回空列表');
      return res.json({
        success: true,
        data: []
      });
    }
    
    // 查询同一群组的所有用户
    const groupUsers = await UserNew.find({
      'retailInfo.storeGroup': user.retailInfo.storeGroup,
      role: 'retail_user',
      isActive: true
    }).select('username profile').lean();
    
    console.log('🔍 [group-users] 找到群组用户:', groupUsers.length);
    
    res.json({
      success: true,
      data: groupUsers
    });
  } catch (error) {
    console.error('❌ [group-users] 获取群组用户失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取群组库存列表（群组页面专用）
app.get('/api/merchant/group-inventory', applyGroupDataFilter, async (req, res) => {
  try {
    const MerchantInventory = require('./models/MerchantInventory');
    const { category, search, targetMerchant } = req.query;
    
    console.log('群组库存请求 - 用户:', req.currentUsername);
    console.log('群组库存请求 - 数据过滤:', req.dataFilter);
    
    // 检查用户是否有群组权限
    // 如果 dataFilter 包含 merchantId（而不是 storeGroup），说明用户没有群组或无权限
    if (req.dataFilter.merchantId && !req.dataFilter.storeGroup) {
      console.log('⚠️  用户没有群组或无权限，返回空结果');
      return res.json({
        success: true,
        data: []
      });
    }
    
    // 基础过滤条件（来自中间件，查询群组数据）
    let query = { 
      ...req.dataFilter, 
      status: 'active',
      isActive: true,
      quantity: { $gt: 0 } // 只显示有库存的产品
    };
    
    // 如果指定了目标商户，只查询该商户的库存
    if (targetMerchant) {
      query.merchantId = targetMerchant;
    } else {
      // 否则排除当前用户自己的库存（只显示群组内其他商户的库存）
      if (req.currentUsername) {
        query.merchantId = { $ne: req.currentUsername };
      }
    }
    
    // 添加分类过滤
    if (category) {
      query.category = category;
    }
    
    // 添加搜索过滤
    if (search) {
      query.$or = [
        { serialNumber: new RegExp(search, 'i') },
        { barcode: new RegExp(search, 'i') },
        { productName: new RegExp(search, 'i') },
        { notes: new RegExp(search, 'i') }
      ];
    }
    
    console.log('群组库存查询条件:', JSON.stringify(query, null, 2));
    
    // 查询群组的库存
    const inventory = await MerchantInventory.find(query)
      .sort({ createdAt: -1 });
    
    console.log('群组库存查询结果数量:', inventory.length);
    if (inventory.length > 0) {
      console.log('第一条记录示例:', {
        merchantId: inventory[0].merchantId,
        storeGroup: inventory[0].storeGroup,
        productName: inventory[0].productName
      });
    }
    
    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    console.error('获取群组库存失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取产品时间线
app.get('/api/merchant/inventory/:id/timeline', async (req, res) => {
  try {
    const MerchantInventory = require('./models/MerchantInventory');
    const MerchantSale = require('./models/MerchantSale');
    const InventoryTransfer = require('./models/InventoryTransfer');
    
    const inventoryId = req.params.id;
    
    // 获取库存记录
    const inventory = await MerchantInventory.findById(inventoryId);
    
    if (!inventory) {
      return res.status(404).json({ success: false, error: '库存记录不存在' });
    }
    
    const timeline = [];
    
    // 1. 入库记录（创建时间）
    timeline.push({
      type: 'created',
      icon: '📥',
      title: '产品入库',
      date: inventory.createdAt,
      description: `产品入库到商户库存`,
      details: `来源: ${inventory.source === 'warehouse' ? '仓库调货' : inventory.source === 'transfer' ? '商户调货' : '手动入库'}<br>
                成本价: €${inventory.costPrice.toFixed(2)}<br>
                零售价: €${inventory.retailPrice.toFixed(2)}<br>
                数量: ${inventory.quantity}`
    });
    
    // 2. 查找销售记录（包括已完成和已退款的）
    const sales = await MerchantSale.find({
      'items.inventoryId': inventoryId,
      status: { $in: ['completed', 'refunded'] }
    }).sort({ saleDate: 1 });
    
    sales.forEach(sale => {
      const saleItem = sale.items.find(item => item.inventoryId && item.inventoryId.toString() === inventoryId);
      if (saleItem) {
        // 销售记录
        if (sale.status === 'completed' || sale.status === 'refunded') {
          timeline.push({
            type: 'sold',
            icon: '💰',
            title: '产品销售',
            date: sale.saleDate,
            description: `产品已售出`,
            details: `销售价格: €${saleItem.price.toFixed(2)}<br>
                      数量: ${saleItem.quantity}<br>
                      支付方式: ${sale.paymentMethod === 'CASH' ? '现金' : sale.paymentMethod === 'CARD' ? '刷卡' : '混合支付'}<br>
                      ${sale.customerPhone ? `客户电话: ${sale.customerPhone}` : ''}`
          });
        }
        
        // 退款记录
        if (sale.status === 'refunded' && sale.refundDate) {
          timeline.push({
            type: 'refunded',
            icon: '↩️',
            title: '产品退款',
            date: sale.refundDate,
            description: `产品已退款并退回库存`,
            details: `退款金额: €${sale.totalAmount.toFixed(2)}<br>
                      退款原因: ${sale.refundReason || '未填写'}<br>
                      退回成色: ${saleItem.refundCondition || saleItem.condition || saleItem.originalCondition || '未知'}<br>
                      ${sale.customerPhone ? `客户电话: ${sale.customerPhone}` : ''}`
          });
        }
      }
    });
    
    // 3. 查找调货记录（调出）
    const transfersOut = await InventoryTransfer.find({
      'items.inventoryId': inventoryId,
      fromMerchant: inventory.merchantId,
      status: { $in: ['completed', 'shipped'] }
    }).sort({ completedAt: 1 });
    
    transfersOut.forEach(transfer => {
      const transferItem = transfer.items.find(item => item.inventoryId && item.inventoryId.toString() === inventoryId);
      if (transferItem) {
        timeline.push({
          type: 'transferred_out',
          icon: '📤',
          title: '调货出库',
          date: transfer.completedAt || transfer.shippedAt,
          description: `产品调出到其他商户`,
          details: `调货单号: ${transfer.transferNumber}<br>
                    调入商户: ${transfer.toMerchantName}<br>
                    数量: ${transferItem.quantity}<br>
                    调货价格: €${transferItem.transferPrice.toFixed(2)}`,
          transferId: transfer._id.toString(), // 添加 transferId
          transferNumber: transfer.transferNumber
        });
      }
    });
    
    // 4. 查找调货记录（调入）
    if (inventory.source === 'transfer' && inventory.sourceTransferId) {
      const transferIn = await InventoryTransfer.findById(inventory.sourceTransferId);
      if (transferIn) {
        // 查找对应的调货项目以获取批发价
        const transferItem = transferIn.items.find(item => 
          item.serialNumber === inventory.serialNumber || 
          item.productName === inventory.productName
        );
        const transferPrice = transferItem ? transferItem.transferPrice : inventory.wholesalePrice;
        
        timeline.push({
          type: 'transferred_in',
          icon: '📥',
          title: '调货入库',
          date: transferIn.completedAt,
          description: `从其他商户调入`,
          details: `调货单号: ${transferIn.transferNumber}<br>
                    调出商户: ${transferIn.fromMerchant}<br>
                    调货价格: €${transferPrice.toFixed(2)}`,
          transferId: transferIn._id.toString(), // 添加 transferId
          transferNumber: transferIn.transferNumber
        });
      }
    }
    
    // 按时间倒序排序
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    console.error('获取产品时间线失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取销售记录
app.get('/api/merchant/sales', applyDataIsolation, async (req, res) => {
  try {
    const MerchantSale = require('./models/MerchantSale');
    const { startDate, endDate } = req.query;
    
    // 基础过滤条件（来自中间件）
    const query = { ...req.dataFilter };
    
    // 如果提供了日期范围，添加日期过滤
    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) {
        query.saleDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // 包含结束日期的全天
        query.saleDate.$lte = endDateTime;
      }
    }
    
    // 查询销售记录
    const sales = await MerchantSale.find(query)
      .sort({ saleDate: -1 })
      .limit(100)
      .lean();
    
    // 格式化返回数据
    const formattedSales = sales.map(sale => ({
      _id: sale._id,
      date: sale.saleDate,
      customerPhone: sale.customerPhone,
      paymentMethod: sale.paymentMethod,
      cashAmount: sale.cashAmount,
      cardAmount: sale.cardAmount,
      subtotal: sale.subtotal,  // 添加原始小计
      discount: sale.discount,  // 添加折扣金额
      totalAmount: sale.totalAmount,
      totalTax: sale.totalTax,
      items: sale.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        costPrice: item.costPrice,
        taxClassification: item.taxClassification,
        taxAmount: item.taxAmount,
        serialNumber: item.serialNumber,
        repairLocation: item.repairLocation,  // 添加维修地点
        productId: item.productId,  // 添加产品ID
        originalCondition: item.originalCondition,  // 原始成色
        originalCategory: item.originalCategory  // 原始分类
      })),
      status: sale.status,
      refundItems: sale.refundItems || [],  // 添加退款商品列表
      refundDate: sale.refundDate,  // 添加退款日期
      refundAmount: sale.refundAmount  // 添加退款金额
    }));
    
    res.json({ 
      success: true, 
      data: formattedSales 
    });
  } catch (error) {
    console.error('获取销售记录失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 处理退款
app.post('/api/merchant/sales/:saleId/refund', applyDataIsolation, async (req, res) => {
  try {
    const MerchantSale = require('./models/MerchantSale');
    const MerchantInventory = require('./models/MerchantInventory');
    const RepairOrder = require('./models/RepairOrder');
    
    const { saleId } = req.params;
    const { merchantId, refundItems, refundTotal } = req.body;
    
    console.log(`\n[退款] 处理退款请求: ${saleId}`);
    console.log(`  商户: ${merchantId}`);
    console.log(`  退款项目数: ${refundItems.length}`);
    console.log(`  退款总额: €${refundTotal}`);
    
    // 查找销售记录
    const sale = await MerchantSale.findById(saleId);
    
    if (!sale) {
      return res.status(404).json({ success: false, error: '销售记录不存在' });
    }
    
    if (sale.merchantId !== merchantId) {
      return res.status(403).json({ success: false, error: '无权操作此订单' });
    }
    
    // 处理每个退款项目
    for (const refundItem of refundItems) {
      console.log(`\n  处理退款项目: ${refundItem.productName}`);
      console.log(`    类型: ${refundItem.type}`);
      
      if (refundItem.type === 'device') {
        // 设备产品退款
        console.log(`    设备状态: ${refundItem.deviceStatus}`);
        console.log(`    设备成色: ${refundItem.deviceCondition}`);
        console.log(`    原始成色: ${refundItem.originalCondition}`);
        console.log(`    原始分类: ${refundItem.originalCategory}`);
        console.log(`    补回库存: ${refundItem.restock}`);
        
        if (refundItem.restock && refundItem.serialNumber) {
          // 查找库存记录（通过序列号，不依赖status）
          const inventory = await MerchantInventory.findOne({
            merchantId: merchantId,
            serialNumber: refundItem.serialNumber
          });
          
          if (inventory) {
            // 更新库存状态
            inventory.status = refundItem.deviceStatus === 'available' ? 'active' : 
                              refundItem.deviceStatus === 'damaged' ? 'damaged' : 'repairing';
            inventory.condition = refundItem.deviceCondition;
            inventory.quantity = 1;
            
            // 检查是否需要变更分类（全新变二手）
            const wasNew = refundItem.originalCondition === 'Brand New' || 
                          refundItem.originalCondition === '全新' || 
                          refundItem.originalCondition === 'BRAND NEW';
            const isNowUsed = refundItem.deviceCondition !== 'Brand New' && 
                            refundItem.deviceCondition !== '全新';
            
            if (wasNew && isNowUsed) {
              // 从全新变为二手，需要更新分类
              const oldCategory = inventory.category;
              
              // 将"全新"相关分类改为"二手"相关分类
              if (oldCategory && oldCategory.includes('全新')) {
                inventory.category = oldCategory.replace('全新', '二手');
              } else if (oldCategory && oldCategory.toLowerCase().includes('brand new')) {
                inventory.category = oldCategory.replace(/brand new/gi, 'Pre-Owned');
              } else if (oldCategory && oldCategory.toLowerCase().includes('new')) {
                inventory.category = oldCategory.replace(/new/gi, 'Pre-Owned');
              } else {
                // 默认改为 Pre-Owned Devices
                inventory.category = 'Pre-Owned Devices';
              }
              
              console.log(`    📝 分类变更: ${oldCategory} → ${inventory.category}`);
            }
            
            await inventory.save();
            console.log(`    ✅ 设备已补回库存，状态: ${inventory.status}, 成色: ${inventory.condition}, 数量: ${inventory.quantity}`);
          } else {
            console.log(`    ⚠️  未找到库存记录: ${refundItem.serialNumber}`);
          }
        }
        
      } else if (refundItem.type === 'repair') {
        // 维修服务退款
        console.log(`    维修地点: ${refundItem.repairLocation}`);
        console.log(`    已确认: ${refundItem.confirmed}`);
        
        // 可以在这里添加维修订单状态更新逻辑
        // 例如：标记维修订单为已退款
        
      } else if (refundItem.type === 'product') {
        // 普通产品退款
        console.log(`    补回库存: ${refundItem.restock}`);
        
        if (refundItem.restock && refundItem.productId) {
          // 查找库存记录
          const inventory = await MerchantInventory.findOne({
            merchantId: merchantId,
            _id: refundItem.productId
          });
          
          if (inventory) {
            // 增加库存数量
            inventory.quantity += refundItem.quantity;
            inventory.salesStatus = 'UNSOLD';
            
            await inventory.save();
            console.log(`    ✅ 产品已补回库存，数量: +${refundItem.quantity}`);
          } else {
            console.log(`    ⚠️  未找到库存记录: ${refundItem.productId}`);
          }
        }
      }
    }
    
    // 更新销售记录状态
    sale.status = 'refunded';
    sale.refundDate = new Date();
    sale.refundAmount = refundTotal;
    sale.refundItems = refundItems;
    
    // 更新销售记录中每个商品的退回成色
    refundItems.forEach(refundItem => {
      if (refundItem.type === 'device' && refundItem.serialNumber) {
        // 查找销售记录中对应的商品
        const saleItem = sale.items.find(item => item.serialNumber === refundItem.serialNumber);
        if (saleItem) {
          // 保存退回成色
          saleItem.refundCondition = refundItem.deviceCondition;
          console.log(`    📝 保存退回成色: ${refundItem.productName} → ${refundItem.deviceCondition}`);
        }
      }
    });
    
    await sale.save();
    
    console.log(`\n✅ 退款处理完成`);
    
    res.json({
      success: true,
      message: '退款处理成功',
      data: {
        refundAmount: refundTotal,
        refundDate: sale.refundDate
      }
    });
    
  } catch (error) {
    console.error('退款处理失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取维修记录
// ==================== 维修业务 API ====================

// 创建维修订单
app.post('/api/merchant/repairs', async (req, res) => {
  try {
    const RepairOrder = require('./models/RepairOrder');
    
    const {
      merchantId,
      customerPhone,
      customerName,
      deviceName,
      deviceIMEI,
      deviceSN,
      problemDescription,
      notes,
      repairLocation,
      estimatedCompletionDate,
      repairCost,
      salePrice
    } = req.body;
    
    // 验证必填字段
    if (!merchantId || !customerPhone || !deviceName || !problemDescription) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    // 验证销售价格
    if (!salePrice || salePrice <= 0) {
      return res.status(400).json({
        success: false,
        error: '销售价格必须大于0'
      });
    }
    
    // 确定初始状态
    const isOutsourced = repairLocation && repairLocation.trim() !== '';
    const initialStatus = isOutsourced ? 'sent_out' : 'pending';
    
    // 创建维修订单
    const repairOrder = new RepairOrder({
      merchantId,
      customerPhone,
      customerName: customerName || '',
      deviceName,
      deviceIMEI: deviceIMEI || '',
      deviceSN: deviceSN || '',
      problemDescription,
      notes: notes || '',
      repairLocation: repairLocation || '',
      estimatedCompletionDate: estimatedCompletionDate || null,
      repairCost: repairCost || 0,
      salePrice: salePrice,
      status: initialStatus,
      sentOutDate: isOutsourced ? new Date() : null
    });
    
    await repairOrder.save();
    
    res.json({
      success: true,
      data: {
        repairOrderId: repairOrder._id,
        status: repairOrder.status,
        isOutsourced: isOutsourced,
        message: '维修订单创建成功'
      }
    });
  } catch (error) {
    console.error('创建维修订单失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取维修记录列表
app.get('/api/merchant/repairs', applyDataIsolation, async (req, res) => {
  try {
    const RepairOrder = require('./models/RepairOrder');
    const { status, startDate, endDate } = req.query;
    
    // 基础过滤条件（来自中间件）
    const query = { ...req.dataFilter };
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.receivedDate = {};
      if (startDate) {
        query.receivedDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.receivedDate.$lte = endDateTime;
      }
    }
    
    // 查询维修记录
    const repairs = await RepairOrder.find(query)
      .sort({ receivedDate: -1 })
      .limit(100)
      .lean();
    
    res.json({ 
      success: true, 
      data: repairs 
    });
  } catch (error) {
    console.error('获取维修记录失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取等待销售的维修订单
app.get('/api/merchant/repairs/ready-for-sale', applyDataIsolation, async (req, res) => {
  try {
    const RepairOrder = require('./models/RepairOrder');
    
    // 基础过滤条件（来自中间件）
    const query = {
      ...req.dataFilter,
      status: { $in: ['completed', 'retrieved', 'ready_for_sale'] }
    };
    
    // 查询已完成或已取回的维修订单
    const repairs = await RepairOrder.find(query)
      .sort({ completedDate: -1, retrievedDate: -1 })
      .lean();
    
    res.json({
      success: true,
      data: repairs
    });
  } catch (error) {
    console.error('获取待销售维修订单失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新维修订单状态
app.put('/api/merchant/repairs/:id/status', async (req, res) => {
  try {
    const RepairOrder = require('./models/RepairOrder');
    const { id } = req.params;
    const { status, repairCost } = req.body;
    
    const repairOrder = await RepairOrder.findById(id);
    
    if (!repairOrder) {
      return res.status(404).json({
        success: false,
        error: '维修订单不存在'
      });
    }
    
    // 更新状态
    repairOrder.status = status;
    
    // 根据状态更新时间戳
    switch (status) {
      case 'sent_out':
        repairOrder.sentOutDate = new Date();
        break;
      case 'retrieved':
        repairOrder.retrievedDate = new Date();
        break;
      case 'completed':
        repairOrder.completedDate = new Date();
        break;
      case 'ready_for_sale':
        if (!repairOrder.completedDate) {
          repairOrder.completedDate = new Date();
        }
        break;
    }
    
    // 更新维修费用
    if (repairCost !== undefined) {
      repairOrder.repairCost = repairCost;
    }
    
    await repairOrder.save();
    
    res.json({
      success: true,
      data: repairOrder
    });
  } catch (error) {
    console.error('更新维修订单状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 删除维修订单
app.delete('/api/merchant/repairs/:id', async (req, res) => {
  try {
    const RepairOrder = require('./models/RepairOrder');
    const MerchantSale = require('./models/MerchantSale');
    const { id } = req.params;
    
    // 查找维修订单
    const repairOrder = await RepairOrder.findById(id);
    
    if (!repairOrder) {
      return res.status(404).json({
        success: false,
        error: '维修订单不存在'
      });
    }
    
    // 删除维修订单
    await RepairOrder.findByIdAndDelete(id);
    
    // 查找并删除包含此维修订单的销售记录
    // 如果销售记录只包含这一个维修订单，删除整个销售记录
    // 如果销售记录包含多个产品，只删除维修订单相关的项目
    const salesWithRepair = await MerchantSale.find({
      'items.repairOrderId': id
    });
    
    for (const sale of salesWithRepair) {
      // 过滤掉维修订单相关的项目
      const remainingItems = sale.items.filter(item => 
        !item.repairOrderId || item.repairOrderId.toString() !== id
      );
      
      if (remainingItems.length === 0) {
        // 如果没有剩余项目，删除整个销售记录
        await MerchantSale.findByIdAndDelete(sale._id);
        console.log(`删除销售记录 ${sale._id}，因为只包含已删除的维修订单`);
      } else {
        // 如果还有其他项目，更新销售记录
        // 重新计算总金额
        const newSubtotal = remainingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const newTotalTax = remainingItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
        const newTotalAmount = newSubtotal + newTotalTax;
        
        await MerchantSale.findByIdAndUpdate(sale._id, {
          items: remainingItems,
          subtotal: newSubtotal,
          totalTax: newTotalTax,
          totalAmount: newTotalAmount
        });
        console.log(`更新销售记录 ${sale._id}，移除已删除的维修订单`);
      }
    }
    
    res.json({
      success: true,
      message: '维修订单及相关销售记录已删除'
    });
  } catch (error) {
    console.error('删除维修订单失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取单个维修订单详情
app.get('/api/merchant/repairs/:id', async (req, res) => {
  try {
    const RepairOrder = require('./models/RepairOrder');
    const { id } = req.params;
    
    const repairOrder = await RepairOrder.findById(id);
    
    if (!repairOrder) {
      return res.status(404).json({
        success: false,
        error: '维修订单不存在'
      });
    }
    
    res.json({
      success: true,
      data: repairOrder
    });
  } catch (error) {
    console.error('获取维修订单详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新维修订单信息
app.put('/api/merchant/repairs/:id', async (req, res) => {
  try {
    const RepairOrder = require('./models/RepairOrder');
    const { id } = req.params;
    const {
      customerPhone,
      customerName,
      deviceName,
      deviceIMEI,
      deviceSN,
      problemDescription,
      notes,
      repairLocation,
      estimatedCompletionDate,
      repairCost,
      salePrice
    } = req.body;
    
    const repairOrder = await RepairOrder.findById(id);
    
    if (!repairOrder) {
      return res.status(404).json({
        success: false,
        error: '维修订单不存在'
      });
    }
    
    // 更新字段
    if (customerPhone) repairOrder.customerPhone = customerPhone;
    if (customerName !== undefined) repairOrder.customerName = customerName;
    if (deviceName) repairOrder.deviceName = deviceName;
    if (deviceIMEI !== undefined) repairOrder.deviceIMEI = deviceIMEI;
    if (deviceSN !== undefined) repairOrder.deviceSN = deviceSN;
    if (problemDescription) repairOrder.problemDescription = problemDescription;
    if (notes !== undefined) repairOrder.notes = notes;
    if (repairLocation !== undefined) repairOrder.repairLocation = repairLocation;
    if (estimatedCompletionDate !== undefined) repairOrder.estimatedCompletionDate = estimatedCompletionDate;
    if (repairCost !== undefined) repairOrder.repairCost = repairCost;
    if (salePrice !== undefined) repairOrder.salePrice = salePrice;
    
    await repairOrder.save();
    
    res.json({
      success: true,
      data: repairOrder
    });
  } catch (error) {
    console.error('更新维修订单失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 原有API ====================

app.get('/api/merchant/repairs-old', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || 'merchant_001';
    const { startDate, endDate } = req.query;
    
    // 返回空维修记录
    res.json({ 
      success: true, 
      data: [] 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取库存报表 - Top 20热销产品
app.get('/api/merchant/inventory-report', async (req, res) => {
  try {
    const MerchantInventory = require('./models/MerchantInventory');
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = req.query.merchantId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    if (!merchantId) {
      return res.status(400).json({ 
        success: false, 
        error: '需要提供merchantId' 
      });
    }
    
    console.log(`\n📊 生成库存报表: ${merchantId}`);
    
    // 确定日期范围
    let startOfMonth, endOfMonth;
    
    if (startDate && endDate) {
      // 使用前端传递的日期范围
      startOfMonth = new Date(startDate);
      endOfMonth = new Date(endDate);
      endOfMonth.setHours(23, 59, 59, 999); // 设置为当天结束
      console.log(`   使用指定日期范围: ${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()}`);
    } else {
      // 默认使用本月
      const now = new Date();
      startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      console.log(`   使用默认本月范围: ${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()}`);
    }
    
    // 查询本月的销售记录（排除维修业务和已退款订单）
    const sales = await MerchantSale.find({
      merchantId: merchantId,
      saleDate: {
        $gte: startOfMonth,
        $lte: endOfMonth
      },
      status: { $ne: 'refunded' }, // 排除退款订单（注意：小写）
      saleType: { $ne: 'REPAIR' } // 排除维修业务
    }).lean();
    
    console.log(`   本月销售记录: ${sales.length} 条（已排除维修）`);
    
    // 统计每个产品的销售数据
    const productSalesMap = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        // 跳过维修项目（通过产品名称识别）
        if (item.productName && item.productName.includes('🔧')) {
          console.log(`   跳过维修项目: ${item.productName}`);
          return;
        }
        if (item.productName && item.productName.includes('Repair Service')) {
          console.log(`   跳过维修项目: ${item.productName}`);
          return;
        }
        if (item.isRepairItem) {
          console.log(`   跳过维修项目: ${item.productName}`);
          return;
        }
        
        const key = `${item.productName}_${item.model || ''}_${item.color || ''}`;
        
        if (!productSalesMap[key]) {
          productSalesMap[key] = {
            productName: item.productName,
            model: item.model || '',
            color: item.color || '',
            totalQuantity: 0,
            totalRevenue: 0,
            avgPrice: 0,
            salesCount: 0
          };
        }
        
        productSalesMap[key].totalQuantity += item.quantity;
        productSalesMap[key].totalRevenue += item.price * item.quantity;
        productSalesMap[key].salesCount += 1;
      });
    });
    
    // 计算平均价格
    Object.keys(productSalesMap).forEach(key => {
      const data = productSalesMap[key];
      data.avgPrice = data.totalRevenue / data.totalQuantity;
    });
    
    console.log(`   统计产品数: ${Object.keys(productSalesMap).length}`);
    
    // 查询当前库存
    const inventory = await MerchantInventory.find({
      merchantId: merchantId,
      status: 'active', // 修改为active状态
      quantity: { $gt: 0 } // 只查询有库存的
    }).lean();
    
    console.log(`   当前库存记录: ${inventory.length} 条`);
    
    // 合并销售数据和库存数据
    const reportData = [];
    
    Object.keys(productSalesMap).forEach(key => {
      const salesData = productSalesMap[key];
      
      // 查找对应的库存
      // 需要处理产品名称格式不一致的问题
      // 销售记录: "iPhone Clear Case (iPhone 14 - Black)"
      // 库存记录: productName="iPhone Clear Case", model="iPhone 14", color="Black"
      
      let inventoryItems = [];
      
      // 尝试精确匹配
      inventoryItems = inventory.filter(item => 
        item.productName === salesData.productName &&
        item.model === salesData.model &&
        (item.color || '') === salesData.color
      );
      
      // 如果精确匹配失败，尝试模糊匹配
      if (inventoryItems.length === 0) {
        // 从销售产品名称中提取基础产品名称
        let baseProductName = salesData.productName;
        const parenIndex = baseProductName.indexOf('(');
        if (parenIndex > 0) {
          baseProductName = baseProductName.substring(0, parenIndex).trim();
        }
        
        // 从销售产品名称中提取型号和颜色
        let extractedModel = '';
        let extractedColor = '';
        const match = salesData.productName.match(/\(([^-]+)\s*-\s*([^)]+)\)/);
        if (match) {
          extractedModel = match[1].trim();
          extractedColor = match[2].trim();
        }
        
        inventoryItems = inventory.filter(item => {
          const nameMatch = item.productName === baseProductName;
          const modelMatch = !extractedModel || item.model === extractedModel;
          const colorMatch = !extractedColor || (item.color && item.color.toLowerCase() === extractedColor.toLowerCase());
          return nameMatch && modelMatch && colorMatch;
        });
        
        if (inventoryItems.length > 0) {
          console.log(`   模糊匹配成功: "${salesData.productName}" -> "${baseProductName}" (${extractedModel} - ${extractedColor})`);
        }
      }
      
      const currentStock = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
      
      console.log(`   产品: ${salesData.productName} - 销量: ${salesData.totalQuantity}, 库存: ${currentStock}`);
      
      // 计算月销售量（本月实际销售量）
      const monthlySales = salesData.totalQuantity;
      
      // 计算预计销售时间（天数）
      let estimatedDays = 0;
      if (monthlySales > 0 && currentStock > 0) {
        // 当前库存 / (月销售量 / 30天) = 预计销售天数
        estimatedDays = Math.round((currentStock / monthlySales) * 30);
      } else if (currentStock === 0) {
        estimatedDays = 0; // 已缺货
      } else {
        estimatedDays = 999; // 有库存但本月无销售
      }
      
      // 建议订货量 = 1个月的销售量
      const suggestedOrderQty = monthlySales;
      
      reportData.push({
        productName: salesData.productName,
        model: salesData.model,
        color: salesData.color,
        salesQuantity: monthlySales,
        avgSalePrice: Math.round(salesData.avgPrice * 100) / 100,
        currentStock: currentStock,
        estimatedDays: estimatedDays,
        suggestedOrderQty: suggestedOrderQty,
        totalRevenue: Math.round(salesData.totalRevenue * 100) / 100
      });
    });
    
    // 按销售量排序，取Top 20
    reportData.sort((a, b) => b.salesQuantity - a.salesQuantity);
    const top20 = reportData.slice(0, 20);
    
    console.log(`   Top 20 产品:`);
    top20.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.productName} ${item.model} - 销量: ${item.salesQuantity}, 库存: ${item.currentStock}, 预计: ${item.estimatedDays}天`);
    });
    
    res.json({
      success: true,
      data: {
        reportDate: new Date().toISOString(),
        monthStart: startOfMonth.toISOString(),
        monthEnd: endOfMonth.toISOString(),
        totalProducts: reportData.length,
        top20: top20,
        summary: {
          totalSalesRecords: sales.length,
          totalInventoryItems: inventory.length,
          totalProductTypes: reportData.length
        }
      }
    });
    
  } catch (error) {
    console.error('生成库存报表失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 获取采购报表
app.get('/api/merchant/purchase-report', async (req, res) => {
  try {
    const MerchantInventory = require('./models/MerchantInventory');
    const InventoryTransfer = require('./models/InventoryTransfer');
    const WarehouseOrder = require('./models/WarehouseOrder');
    const AdminInventory = require('./models/AdminInventory');
    
    const merchantId = req.query.merchantId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    if (!merchantId) {
      return res.status(400).json({ 
        success: false, 
        error: '需要提供merchantId' 
      });
    }
    
    console.log(`\n📦 生成采购报表: ${merchantId}`);
    
    // 确定日期范围
    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = {
        $gte: start,
        $lte: end
      };
      console.log(`   使用指定日期范围: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
    } else {
      console.log(`   查询所有日期的数据`);
    }
    
    const orders = [];
    
    // 1. 查询调货记录（作为接收方）
    const transferQuery = {
      toMerchant: merchantId,
      status: 'COMPLETED'
    };
    
    // 添加日期过滤
    if (startDate && endDate) {
      transferQuery.transferDate = dateFilter;
    }
    
    const transfers = await InventoryTransfer.find(transferQuery).sort({ transferDate: -1 }).lean();
    
    console.log(`   调货记录: ${transfers.length} 条`);
    
    transfers.forEach(transfer => {
      // 计算订单总金额和税额
      let totalAmount = 0;
      let taxAmount = 0;
      
      transfer.items.forEach(item => {
        const itemTotal = (item.transferPrice || item.costPrice || 0) * item.quantity;
        totalAmount += itemTotal;
        
        // 只有VAT_23和VAT_13_5才计算税额，Margin VAT不计算
        if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
          taxAmount += itemTotal - (itemTotal / 1.23);
        } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
          taxAmount += itemTotal - (itemTotal / 1.135);
        }
        // MARGIN_VAT_0 和 VAT_0 不计算税额（税额为0）
      });
      
      orders.push({
        orderNumber: transfer.transferNumber,
        date: transfer.transferDate,
        totalAmount: totalAmount,
        taxAmount: taxAmount,
        supplier: transfer.fromMerchant || '内部调货',
        type: 'transfer',
        itemCount: transfer.items.length,
        _id: transfer._id
      });
    });
    
    // 2. 查询仓库订单
    const warehouseQuery = {
      merchantId: merchantId,
      status: { $in: ['completed', 'COMPLETED', 'received', 'RECEIVED'] }
    };
    
    // 添加日期过滤
    if (startDate && endDate) {
      warehouseQuery.$or = [
        { orderDate: dateFilter },
        { createdAt: dateFilter }
      ];
    }
    
    const warehouseOrders = await WarehouseOrder.find(warehouseQuery).sort({ createdAt: -1 }).lean();
    
    console.log(`   仓库订单: ${warehouseOrders.length} 条`);
    
    // 获取仓库公司信息
    const CompanyInfo = require('./models/CompanyInfo');
    const warehouseCompany = await CompanyInfo.findOne({ isDefault: true }).lean();
    const warehouseSupplierName = warehouseCompany ? warehouseCompany.companyName : '仓库';
    
    warehouseOrders.forEach(order => {
      // 使用订单中已经计算好的总金额和税额
      const totalAmount = order.totalAmount || 0;
      const taxAmount = order.taxAmount || 0;
      
      orders.push({
        orderNumber: order.orderNumber,
        date: order.orderDate || order.createdAt,
        totalAmount: totalAmount,
        taxAmount: taxAmount,
        supplier: warehouseSupplierName,
        type: 'warehouse',
        itemCount: order.items.length,
        _id: order._id
      });
    });
    
    // 3. 查询AdminInventory中的采购发票（按invoiceNumber分组）
    const inventoryQuery = {
      merchantId: merchantId,
      invoiceNumber: { $exists: true, $ne: null }
    };
    
    // 添加日期过滤
    if (startDate && endDate) {
      inventoryQuery.createdAt = dateFilter;
    }
    
    const adminInventory = await AdminInventory.find(inventoryQuery).lean();
    
    console.log(`   AdminInventory库存记录: ${adminInventory.length} 条`);
    
    // 4. 查询MerchantInventory中的采购记录（从notes字段提取发票号）
    const merchantInventoryQuery = {
      merchantId: merchantId,
      notes: { $regex: /发票号:/, $options: 'i' }
    };
    
    // 添加日期过滤
    if (startDate && endDate) {
      merchantInventoryQuery.createdAt = dateFilter;
    }
    
    const merchantInventory = await MerchantInventory.find(merchantInventoryQuery).lean();
    
    console.log(`   MerchantInventory库存记录: ${merchantInventory.length} 条`);
    
    // 获取所有供货商信息（用于显示名称）
    const Supplier = require('./models/Supplier');
    const suppliers = await Supplier.find({ merchantId: merchantId }).lean();
    const supplierMap = {};
    suppliers.forEach(s => {
      supplierMap[s._id.toString()] = s.name;
    });
    
    // 按发票号分组（合并AdminInventory和MerchantInventory）
    const invoiceGroups = {};
    
    // 处理AdminInventory
    adminInventory.forEach(item => {
      const invoiceNum = item.invoiceNumber;
      if (!invoiceGroups[invoiceNum]) {
        invoiceGroups[invoiceNum] = {
          items: [],
          supplier: item.supplier || '未知供货商',
          date: item.createdAt
        };
      }
      invoiceGroups[invoiceNum].items.push(item);
    });
    
    // 处理MerchantInventory（从notes提取发票号）
    merchantInventory.forEach(item => {
      // 从notes中提取发票号: "发票号: INV-123 | 供货商ID: xxx"
      const match = item.notes.match(/发票号:\s*([^\s|]+)/i);
      if (match) {
        const invoiceNum = match[1];
        
        // 提取供货商信息
        let supplier = '未知供货商';
        const supplierMatch = item.notes.match(/供货商ID:\s*([^\s|]+)/i);
        if (supplierMatch) {
          const supplierId = supplierMatch[1];
          // 从supplierMap查找供货商名称
          supplier = supplierMap[supplierId] || supplierId;
        }
        
        if (!invoiceGroups[invoiceNum]) {
          invoiceGroups[invoiceNum] = {
            items: [],
            supplier: supplier,
            date: item.createdAt
          };
        }
        invoiceGroups[invoiceNum].items.push(item);
      }
    });
    
    // 将分组的发票添加到订单列表
    Object.keys(invoiceGroups).forEach(invoiceNum => {
      const group = invoiceGroups[invoiceNum];
      
      // 检查是否已经在调货或仓库订单中
      const exists = orders.some(o => o.orderNumber === invoiceNum);
      if (exists) return;
      
      let totalAmount = 0;
      let taxAmount = 0;
      
      group.items.forEach(item => {
        const itemTotal = (item.costPrice || 0) * (item.quantity || 1);
        totalAmount += itemTotal;
        
        // 只有VAT_23和VAT_13_5才计算税额，Margin VAT不计算
        if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
          taxAmount += itemTotal - (itemTotal / 1.23);
        } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
          taxAmount += itemTotal - (itemTotal / 1.135);
        }
        // MARGIN_VAT_0 和 VAT_0 不计算税额（税额为0）
      });
      
      orders.push({
        orderNumber: invoiceNum,
        date: group.date,
        totalAmount: totalAmount,
        taxAmount: taxAmount,
        supplier: group.supplier,
        type: 'invoice',
        itemCount: group.items.length,
        _id: null
      });
    });
    
    // 按日期排序（最新的在前）
    orders.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 计算汇总数据
    const summary = {
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      totalTax: orders.reduce((sum, o) => sum + o.taxAmount, 0)
    };
    
    console.log(`   采购订单总数: ${orders.length}`);
    console.log(`   总金额: €${summary.totalAmount.toFixed(2)}`);
    console.log(`   总税额: €${summary.totalTax.toFixed(2)}`);
    
    res.json({
      success: true,
      data: {
        orders: orders,
        summary: summary
      }
    });
    
  } catch (error) {
    console.error('生成采购报表失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 获取调货订单详情（通过订单号）
app.get('/api/transfers/:transferNumber', async (req, res) => {
  try {
    const InventoryTransfer = require('./models/InventoryTransfer');
    const transferNumber = req.params.transferNumber;
    
    console.log(`\n📦 查询调货订单详情: ${transferNumber}`);
    
    const transfer = await InventoryTransfer.findOne({ transferNumber: transferNumber }).lean();
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: '调货订单不存在'
      });
    }
    
    res.json({
      success: true,
      data: transfer
    });
    
  } catch (error) {
    console.error('获取调货订单详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取仓库订单详情（通过订单号）
app.get('/api/warehouse-orders/number/:orderNumber', async (req, res) => {
  try {
    const WarehouseOrder = require('./models/WarehouseOrder');
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const UserNew = require('./models/UserNew');
    const CompanyInfo = require('./models/CompanyInfo');
    
    const orderNumber = req.params.orderNumber;
    const currentUserId = req.query.userId; // 当前用户ID
    
    console.log(`\n🏢 查询仓库订单详情: ${orderNumber} (用户: ${currentUserId})`);
    
    const order = await WarehouseOrder.findOne({ orderNumber: orderNumber }).lean();
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '仓库订单不存在'
      });
    }
    
    // 获取当前登录用户信息
    const currentUser = await UserNew.findOne({ username: currentUserId });
    
    // 获取商户信息
    const merchant = await UserNew.findOne({ username: order.merchantId });
    
    // 获取默认公司信息（仓库公司）
    const companyInfo = await CompanyInfo.findOne({ isDefault: true });
    
    // 判断当前用户是卖方还是买方
    let isSellerView = false;
    
    if (currentUser && currentUser.companyInfo && currentUser.companyInfo.companyName) {
      // 当前用户有公司信息
      const currentUserCompany = currentUser.companyInfo.companyName;
      
      // 卖方公司 = 仓库的公司（默认公司信息）
      const sellerCompany = companyInfo ? companyInfo.companyName : null;
      
      // 买方公司 = 商户的公司信息
      const buyerCompany = merchant && merchant.companyInfo ? merchant.companyInfo.companyName : null;
      
      // 如果当前用户的公司 = 卖方公司 → 卖方视角
      if (sellerCompany && currentUserCompany === sellerCompany) {
        isSellerView = true;
      }
      // 如果当前用户的公司 = 买方公司 → 买方视角
      else if (buyerCompany && currentUserCompany === buyerCompany) {
        isSellerView = false;
      }
      // 默认：如果是仓库管理员角色 → 卖方视角
      else if (currentUser.role && (currentUser.role.includes('warehouse') || currentUser.role.includes('admin'))) {
        isSellerView = true;
      }
    } else {
      // 没有公司信息，根据角色判断
      // 仓库相关角色（warehouse, warehouse_manager, admin）→ 卖方视角
      if (currentUser && currentUser.role && (currentUser.role.includes('warehouse') || currentUser.role.includes('admin'))) {
        isSellerView = true;
      }
    }
    
    console.log(`   当前用户角色: ${currentUser?.role || '无'}`);
    console.log(`   当前用户公司: ${currentUser?.companyInfo?.companyName || '无'}`);
    console.log(`   卖方公司: ${companyInfo?.companyName || '无'}`);
    console.log(`   买方公司: ${merchant?.companyInfo?.companyName || '无'}`);
    console.log(`   视角: ${isSellerView ? '卖方（显示差价税）' : '买方（Margin VAT税额=0）'}`);
    
    // 根据用户角色重新计算税额
    if (isSellerView) {
      // 卖方视角：重新计算Margin VAT产品的税额
      let recalculatedTotalTax = 0;
      
      for (const item of order.items) {
        if (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'MARGIN_VAT') {
          // Margin VAT: 卖方需要对差价征税
          let product = await ProductNew.findById(item.productId).lean();
          
          if (!product) {
            product = await AdminInventory.findById(item.productId).lean();
          }
          
          if (product && product.costPrice) {
            const costPrice = product.costPrice;
            const wholesalePrice = item.wholesalePrice;
            const margin = (wholesalePrice - costPrice) * item.quantity;
            
            if (margin > 0) {
              // 对差价征税：税额 = 差价 × 23/123
              const marginTax = margin * (23 / 123);
              item.taxAmount = marginTax; // 更新item的税额
              recalculatedTotalTax += marginTax;
              console.log(`   重新计算 ${item.productName}: €${marginTax.toFixed(2)}`);
            }
          }
        } else {
          // 其他税率使用订单中存储的税额
          recalculatedTotalTax += (item.taxAmount || 0);
        }
      }
      
      // 更新订单的总税额和小计
      order.taxAmount = recalculatedTotalTax;
      order.subtotal = order.totalAmount - recalculatedTotalTax;
    }
    // 买方视角：使用订单中存储的税额（不需要修改）
    
    // 添加商户的完整信息到返回数据
    if (merchant) {
      // 如果商户有公司信息，添加公司信息
      if (merchant.companyInfo) {
        order.merchantCompanyInfo = merchant.companyInfo;
        console.log(`   ✅ 添加商户公司信息: ${merchant.companyInfo.companyName}`);
      } else {
        // 如果没有公司信息，创建一个基本的公司信息对象
        order.merchantCompanyInfo = {
          companyName: merchant.profile?.companyName || order.merchantName || merchant.username,
          contactPerson: merchant.profile?.firstName || '',
          phone: merchant.profile?.phone || '',
          email: merchant.email || ''
        };
        console.log(`   ⚠️ 商户没有完整公司信息，使用基本信息: ${order.merchantCompanyInfo.companyName}`);
      }
    } else {
      console.log(`   ❌ 找不到商户用户`);
    }
    
    res.json({
      success: true,
      data: order
    });
    
  } catch (error) {
    console.error('获取仓库订单详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 生成调货订单PDF
app.get('/api/transfers/:transferNumber/pdf', async (req, res) => {
  try {
    const InventoryTransfer = require('./models/InventoryTransfer');
    const CompanyInfo = require('./models/CompanyInfo');
    const PDFDocument = require('pdfkit');
    
    const transferNumber = req.params.transferNumber;
    
    console.log(`\n📄 生成调货订单PDF: ${transferNumber}`);
    
    const [transfer, companyInfo] = await Promise.all([
      InventoryTransfer.findOne({ transferNumber: transferNumber }).lean(),
      CompanyInfo.findOne({ isDefault: true }).lean()
    ]);
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: '调货订单不存在'
      });
    }
    
    // 创建PDF文档
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=transfer-${transferNumber}.pdf`);
    
    doc.pipe(res);
    
    // 标题
    doc.fontSize(22).font('Helvetica-Bold').text('TRANSFER ORDER', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text(transferNumber, { align: 'center' });
    doc.moveDown(1.5);
    
    // 基本信息
    doc.fontSize(10).font('Helvetica');
    doc.text(`Date: ${new Date(transfer.transferDate).toLocaleDateString('en-US')}`, 50, doc.y);
    doc.text(`From: ${transfer.fromMerchant || 'N/A'}`, 50, doc.y);
    doc.text(`To: ${transfer.toMerchant || 'N/A'}`, 50, doc.y);
    doc.text(`Status: ${transfer.status}`, 50, doc.y);
    doc.moveDown(1);
    
    // 产品表格
    const tableTop = doc.y;
    const itemX = 50;
    const qtyX = 300;
    const priceX = 370;
    const totalX = 470;
    
    // 表头
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Product', itemX, tableTop);
    doc.text('Qty', qtyX, tableTop);
    doc.text('Price', priceX, tableTop);
    doc.text('Total', totalX, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    // 产品行
    let y = tableTop + 25;
    doc.font('Helvetica').fontSize(9);
    
    let totalAmount = 0;
    let taxAmount = 0;
    
    transfer.items.forEach(item => {
      const unitPrice = item.transferPrice || item.costPrice || 0;
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;
      
      // 只有VAT_23和VAT_13_5才计算税额，Margin VAT不计算
      if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
        taxAmount += itemTotal - (itemTotal / 1.23);
      } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
        taxAmount += itemTotal - (itemTotal / 1.135);
      }
      // MARGIN_VAT_0 和 VAT_0 不计算税额（税额为0）
      
      doc.text(item.productName || 'N/A', itemX, y, { width: 240 });
      doc.text(item.quantity.toString(), qtyX, y);
      doc.text(`€${unitPrice.toFixed(2)}`, priceX, y);
      doc.text(`€${itemTotal.toFixed(2)}`, totalX, y);
      
      y += 20;
      
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });
    
    // 总计
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;
    
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Subtotal:', 400, y);
    doc.text(`€${totalAmount.toFixed(2)}`, totalX, y);
    y += 15;
    
    doc.text('Tax:', 400, y);
    doc.text(`€${taxAmount.toFixed(2)}`, totalX, y);
    y += 15;
    
    doc.fontSize(12);
    doc.text('Total:', 400, y);
    doc.text(`€${totalAmount.toFixed(2)}`, totalX, y);
    
    doc.end();
    
  } catch (error) {
    console.error('生成调货订单PDF失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 生成仓库订单PDF（通过订单号）
app.get('/api/warehouse-orders/number/:orderNumber/pdf', async (req, res) => {
  try {
    const WarehouseOrder = require('./models/WarehouseOrder');
    const orderNumber = req.params.orderNumber;
    
    console.log(`\n📄 生成仓库订单PDF: ${orderNumber}`);
    
    const order = await WarehouseOrder.findOne({ orderNumber: orderNumber }).lean();
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '仓库订单不存在'
      });
    }
    
    // 重定向到现有的PDF API（使用订单ID）
    res.redirect(`/api/warehouse/orders/${order._id}/pdf`);
    
  } catch (error) {
    console.error('生成仓库订单PDF失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 生成采购发票PDF（admin格式）
app.get('/api/admin/purchase-orders/:invoiceId/pdf', async (req, res) => {
  try {
    const AdminInventory = require('./models/AdminInventory');
    const MerchantInventory = require('./models/MerchantInventory');
    const CompanyInfo = require('./models/CompanyInfo');
    const Supplier = require('./models/Supplier');
    const PDFDocument = require('pdfkit');
    
    const invoiceId = req.params.invoiceId;
    let invoiceNumber = invoiceId;
    
    // 移除"admin-"前缀
    if (invoiceId.startsWith('admin-')) {
      invoiceNumber = invoiceId.replace('admin-', '');
    }
    
    console.log(`\n📄 生成采购发票PDF: ${invoiceNumber}`);
    
    // 查询AdminInventory和MerchantInventory
    const [adminProducts, merchantProducts, companyInfo] = await Promise.all([
      AdminInventory.find({ invoiceNumber: invoiceNumber }).lean(),
      MerchantInventory.find({
        notes: { $regex: new RegExp(`发票号:\\s*${invoiceNumber}`, 'i') }
      }).lean(),
      CompanyInfo.findOne({ isDefault: true }).lean()
    ]);
    
    // 合并产品列表
    const allProducts = [...adminProducts, ...merchantProducts];
    
    console.log(`   AdminInventory: ${adminProducts.length} 个产品`);
    console.log(`   MerchantInventory: ${merchantProducts.length} 个产品`);
    console.log(`   合并后: ${allProducts.length} 个产品`);
    
    if (allProducts.length === 0) {
      return res.status(404).json({
        success: false,
        error: '发票不存在'
      });
    }
    
    // 获取供货商信息
    let supplierInfo = {
      name: 'Unknown Supplier',
      vatNumber: '',
      phone: '',
      email: '',
      address: ''
    };
    
    // 优先从AdminInventory获取供货商名称
    let supplierName = null;
    let supplierId = null;
    
    if (adminProducts.length > 0 && adminProducts[0].supplier) {
      supplierName = adminProducts[0].supplier;
      console.log(`   从AdminInventory获取供货商: ${supplierName}`);
    } 
    // 如果AdminInventory没有，从MerchantInventory的notes提取
    else if (merchantProducts.length > 0) {
      // 遍历所有产品，找到第一个包含供货商ID的notes
      for (const product of merchantProducts) {
        if (product.notes) {
          const supplierMatch = product.notes.match(/供货商ID:\s*([^\s|]+)/i);
          if (supplierMatch) {
            supplierId = supplierMatch[1].trim();
            console.log(`   从MerchantInventory获取供货商ID: ${supplierId}`);
            break; // 找到就退出循环
          }
        }
      }
      
      if (!supplierId) {
        console.log(`   ⚠️ 所有产品的notes中都未找到供货商ID`);
      }
    }
    
    // 根据供货商名称或ID查询完整信息
    if (supplierId) {
      // 按ID查询
      try {
        const supplier = await Supplier.findById(supplierId).lean();
        if (supplier) {
          supplierInfo.name = supplier.name;
          supplierInfo.vatNumber = supplier.vatNumber || '';
          supplierInfo.phone = supplier.contact?.phone || '';
          supplierInfo.email = supplier.contact?.email || '';
          supplierInfo.address = supplier.contact?.address || '';
          console.log(`   ✅ 找到供货商: ${supplier.name}`);
        } else {
          console.log(`   ⚠️ 未找到供货商ID: ${supplierId}`);
          // 尝试按名称查询
          const supplierByName = await Supplier.findOne({ name: supplierId }).lean();
          if (supplierByName) {
            supplierInfo.name = supplierByName.name;
            supplierInfo.vatNumber = supplierByName.vatNumber || '';
            supplierInfo.phone = supplierByName.contact?.phone || '';
            supplierInfo.email = supplierByName.contact?.email || '';
            supplierInfo.address = supplierByName.contact?.address || '';
            console.log(`   ✅ 按名称找到供货商: ${supplierByName.name}`);
          }
        }
      } catch (err) {
        console.log(`   ❌ 查询供货商失败: ${err.message}`);
      }
    } else if (supplierName) {
      // 按名称查询
      const supplier = await Supplier.findOne({ name: supplierName }).lean();
      if (supplier) {
        supplierInfo.name = supplier.name;
        supplierInfo.vatNumber = supplier.vatNumber || '';
        supplierInfo.phone = supplier.contact?.phone || '';
        supplierInfo.email = supplier.contact?.email || '';
        supplierInfo.address = supplier.contact?.address || '';
        console.log(`   ✅ 找到供货商: ${supplier.name}`);
      } else {
        // 如果找不到，至少显示名称
        supplierInfo.name = supplierName;
        console.log(`   ⚠️ 未找到供货商，使用名称: ${supplierName}`);
      }
    }
    
    console.log(`   最终供货商: ${supplierInfo.name}`);
    
    // 创建PDF文档
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceNumber}.pdf`);
    
    doc.pipe(res);
    
    // 标题
    doc.fontSize(22).font('Helvetica-Bold').text('PURCHASE INVOICE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text(invoiceNumber, { align: 'center' });
    doc.moveDown(1.5);
    
    // 发票信息和供货商信息并排显示
    const leftColumn = 50;
    const rightColumn = 320;
    let currentY = doc.y;
    
    // 左侧：发票信息
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Invoice Information', leftColumn, currentY);
    doc.font('Helvetica').fontSize(9);
    doc.text(`Date: ${new Date(allProducts[0].createdAt).toLocaleDateString('en-US')}`, leftColumn, currentY + 15);
    doc.text(`Invoice #: ${invoiceNumber}`, leftColumn, currentY + 30);
    
    // 右侧：供货商信息
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Supplier Information', rightColumn, currentY);
    doc.font('Helvetica').fontSize(9);
    
    let supplierY = currentY + 15;
    doc.text(`Name: ${supplierInfo.name}`, rightColumn, supplierY);
    
    if (supplierInfo.vatNumber) {
      supplierY += 15;
      doc.text(`VAT #: ${supplierInfo.vatNumber}`, rightColumn, supplierY);
    }
    
    if (supplierInfo.phone) {
      supplierY += 15;
      doc.text(`Phone: ${supplierInfo.phone}`, rightColumn, supplierY);
    }
    
    if (supplierInfo.email) {
      supplierY += 15;
      doc.text(`Email: ${supplierInfo.email}`, rightColumn, supplierY);
    }
    
    if (supplierInfo.address) {
      supplierY += 15;
      doc.text(`Address: ${supplierInfo.address}`, rightColumn, supplierY, { width: 230 });
    }
    
    // 移动到供货商信息下方
    doc.y = Math.max(currentY + 60, supplierY + 20);
    doc.moveDown(1);
    
    // 产品表格 - 优化列宽
    const tableTop = doc.y;
    const itemX = 50;
    const qtyX = 200;
    const condX = 240;
    const priceX = 300;
    const totalX = 370;
    const taxClassX = 440;
    const taxAmtX = 510;
    
    // 表头
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Product', itemX, tableTop);
    doc.text('Qty', qtyX, tableTop, { width: 35, align: 'center' });
    doc.text('Cond', condX, tableTop, { width: 55, align: 'center' });
    doc.text('Price', priceX, tableTop, { width: 65, align: 'right' });
    doc.text('Total', totalX, tableTop, { width: 65, align: 'right' });
    doc.text('Tax Class', taxClassX, tableTop, { width: 65, align: 'center' });
    doc.text('Tax Amt', taxAmtX, tableTop, { width: 65, align: 'right' });
    
    doc.moveTo(50, tableTop + 15).lineTo(580, tableTop + 15).stroke();
    
    // 产品行
    let y = tableTop + 25;
    doc.font('Helvetica').fontSize(8);
    
    let totalAmount = 0;
    let taxAmount = 0;
    
    allProducts.forEach(item => {
      const unitPrice = item.costPrice || 0;
      const quantity = item.quantity || 1;
      const itemTotal = unitPrice * quantity;
      
      // 计算单个产品的税额
      let itemTax = 0;
      if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
        // costPrice是税前价格，税额 = 税前价格 × 23%
        itemTax = itemTotal * 0.23;
      } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
        // costPrice是税前价格，税额 = 税前价格 × 13.5%
        itemTax = itemTotal * 0.135;
      }
      // MARGIN_VAT_0 and VAT_0 have no tax
      
      totalAmount += itemTotal;
      taxAmount += itemTax;
      
      // 构建产品名称 - 更紧凑
      let productName = item.productName || 'N/A';
      if (item.model) productName += ` ${item.model}`;
      if (item.color) productName += ` ${item.color}`;
      
      const condition = item.condition || '-';
      const taxClass = item.taxClassification || 'N/A';
      
      // 产品名称 - 缩短列宽
      doc.text(productName, itemX, y, { width: 145, lineBreak: false, ellipsis: true });
      // 数量 - 居中
      doc.text(quantity.toString(), qtyX, y, { width: 35, align: 'center' });
      // 成色 - 居中
      doc.text(condition, condX, y, { width: 55, align: 'center' });
      // 单价 - 右对齐（税前）
      doc.text(`€${unitPrice.toFixed(2)}`, priceX, y, { width: 65, align: 'right' });
      // 总价 - 右对齐（税前）
      doc.text(`€${itemTotal.toFixed(2)}`, totalX, y, { width: 65, align: 'right' });
      // 税分类 - 居中
      doc.text(taxClass, taxClassX, y, { width: 65, align: 'center' });
      // 税额 - 右对齐
      doc.text(`€${itemTax.toFixed(2)}`, taxAmtX, y, { width: 65, align: 'right' });
      
      y += 20;
      
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });
    
    // 总计
    doc.moveTo(50, y).lineTo(580, y).stroke();
    y += 10;
    
    doc.font('Helvetica-Bold').fontSize(10);
    
    // Subtotal (税前总价)
    doc.text('Subtotal:', 305, y);
    doc.text(`€${totalAmount.toFixed(2)}`, totalX, y, { width: 65, align: 'right' });
    y += 15;
    
    // Tax (税额)
    doc.text('Tax:', 305, y);
    doc.text(`€${taxAmount.toFixed(2)}`, taxAmtX, y, { width: 65, align: 'right' });
    y += 15;
    
    // Total (含税总价 = Subtotal + Tax)
    const grandTotal = totalAmount + taxAmount;
    doc.fontSize(12);
    doc.text('Total:', 305, y);
    doc.text(`€${grandTotal.toFixed(2)}`, totalX, y, { width: 65, align: 'right' });
    
    doc.end();
    
  } catch (error) {
    console.error('生成采购发票PDF失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 生成税务报表
app.get('/api/merchant/tax-report', async (req, res) => {
  try {
    const MerchantSale = require('./models/MerchantSale');
    const RepairOrder = require('./models/RepairOrder');
    
    const merchantId = req.query.merchantId;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: '需要提供开始日期和结束日期' 
      });
    }
    
    // 构建日期范围查询
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // 查询销售记录（排除已退款的订单，不区分大小写）
    const sales = await MerchantSale.find({
      merchantId: merchantId,
      saleDate: { $gte: start, $lte: end },
      status: { $nin: ['REFUNDED', 'refunded'] } // 排除已退款的订单（大小写都排除）
    }).sort({ saleDate: 1 });
    
    // 查询维修订单
    const repairs = await RepairOrder.find({
      merchantId: merchantId,
      createdAt: { $gte: start, $lte: end },
      status: { $in: ['COMPLETED', 'DELIVERED'] }
    }).sort({ createdAt: 1 });
    
    // 初始化税务分类统计
    const taxByClassification = {
      VAT_23: { sales: 0, cost: 0, outputTax: 0, inputTax: 0, due: 0 },
      MARGIN_VAT_0: { sales: 0, cost: 0, margin: 0, due: 0 },
      SERVICE_VAT_13_5: { sales: 0, due: 0 },
      VAT_0: { sales: 0, due: 0 }
    };
    
    // 按日期分组的销售数据
    const dailySalesMap = {};
    
    // 处理销售记录
    sales.forEach(sale => {
      const dateKey = sale.saleDate.toISOString().split('T')[0];
      
      if (!dailySalesMap[dateKey]) {
        dailySalesMap[dateKey] = {
          date: dateKey,
          totalSales: 0,
          cashIncome: 0,
          cardIncome: 0
        };
      }
      
      const saleTotal = sale.totalAmount || 0;
      dailySalesMap[dateKey].totalSales += saleTotal;
      
      // 统计支付方式
      if (sale.paymentMethod === 'CASH') {
        dailySalesMap[dateKey].cashIncome += saleTotal;
      } else if (sale.paymentMethod === 'CARD') {
        dailySalesMap[dateKey].cardIncome += saleTotal;
      } else if (sale.paymentMethod === 'MIXED') {
        dailySalesMap[dateKey].cashIncome += (sale.cashAmount || 0);
        dailySalesMap[dateKey].cardIncome += (sale.cardAmount || 0);
      }
      
      // 处理每个销售项目的税务
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          const taxClass = item.taxClassification || 'VAT_23';
          const itemPrice = item.price || 0;
          const itemCost = item.costPrice || 0;
          const quantity = item.quantity || 1;
          
          const totalPrice = itemPrice * quantity;
          const totalCost = itemCost * quantity;
          
          if (taxClass === 'VAT_23') {
            // VAT 23%: 价格含税
            taxByClassification.VAT_23.sales += totalPrice;
            taxByClassification.VAT_23.cost += totalCost;
            // 销项税 = 销售额 × 23/123
            taxByClassification.VAT_23.outputTax += totalPrice * 23 / 123;
            // 进项税 = 成本 × 23/123
            taxByClassification.VAT_23.inputTax += totalCost * 23 / 123;
          } else if (taxClass === 'MARGIN_VAT_0') {
            // Margin VAT: 对利润征税
            taxByClassification.MARGIN_VAT_0.sales += totalPrice;
            taxByClassification.MARGIN_VAT_0.cost += totalCost;
            const margin = totalPrice - totalCost;
            taxByClassification.MARGIN_VAT_0.margin += margin;
            // 应缴税 = 利润 × 23/123
            taxByClassification.MARGIN_VAT_0.due += margin * 23 / 123;
          } else if (taxClass === 'SERVICE_VAT_13_5') {
            // Service VAT 13.5%
            taxByClassification.SERVICE_VAT_13_5.sales += totalPrice;
            // 应缴税 = 金额 × 13.5/113.5
            taxByClassification.SERVICE_VAT_13_5.due += totalPrice * 13.5 / 113.5;
          } else if (taxClass === 'VAT_0') {
            // VAT 0%
            taxByClassification.VAT_0.sales += totalPrice;
          }
        });
      }
    });
    
    // 处理维修订单（Service VAT 13.5%）
    repairs.forEach(repair => {
      const dateKey = repair.createdAt.toISOString().split('T')[0];
      
      if (!dailySalesMap[dateKey]) {
        dailySalesMap[dateKey] = {
          date: dateKey,
          totalSales: 0,
          cashIncome: 0,
          cardIncome: 0
        };
      }
      
      const repairTotal = repair.totalAmount || 0;
      dailySalesMap[dateKey].totalSales += repairTotal;
      
      // 维修订单支付方式
      if (repair.paymentMethod === 'CASH') {
        dailySalesMap[dateKey].cashIncome += repairTotal;
      } else if (repair.paymentMethod === 'CARD') {
        dailySalesMap[dateKey].cardIncome += repairTotal;
      }
      
      // 维修服务使用 Service VAT 13.5%
      taxByClassification.SERVICE_VAT_13_5.sales += repairTotal;
      taxByClassification.SERVICE_VAT_13_5.due += repairTotal * 13.5 / 113.5;
    });
    
    // 计算 VAT 23% 应缴税额
    taxByClassification.VAT_23.due = taxByClassification.VAT_23.outputTax - taxByClassification.VAT_23.inputTax;
    
    // 转换为数组并排序
    const dailySales = Object.values(dailySalesMap).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // 计算汇总数据
    const summary = {
      totalSales: dailySales.reduce((sum, day) => sum + day.totalSales, 0),
      totalCashIncome: dailySales.reduce((sum, day) => sum + day.cashIncome, 0),
      totalCardIncome: dailySales.reduce((sum, day) => sum + day.cardIncome, 0),
      totalTaxDue: taxByClassification.VAT_23.due + 
                   taxByClassification.MARGIN_VAT_0.due + 
                   taxByClassification.SERVICE_VAT_13_5.due
    };
    
    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        dailySales,
        summary,
        taxByClassification
      }
    });
  } catch (error) {
    console.error('生成税务报表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 导出税务报表PDF
app.post('/api/merchant/tax-report/pdf', async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const CompanyInfo = require('./models/CompanyInfo');
    const UserNew = require('./models/UserNew');
    
    const { merchantId, startDate, endDate, data } = req.body;
    
    if (!data) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少报表数据' 
      });
    }
    
    // 获取公司信息和商户信息
    const [companyInfo, merchant] = await Promise.all([
      CompanyInfo.findOne({ isDefault: true }),
      UserNew.findOne({ username: merchantId })
    ]);
    
    const { dailySales, summary, taxByClassification } = data;
    
    // 创建 PDF 文档
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=tax-report-${startDate}-to-${endDate}.pdf`);
    
    // 将 PDF 输出到响应
    doc.pipe(res);
    
    // 标题
    doc.fontSize(20).font('Helvetica-Bold').text('TAX REPORT', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica').text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
    doc.moveDown(1);
    
    // 商户信息
    doc.fontSize(11).font('Helvetica-Bold').text('Merchant Information:', 50, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    
    if (merchant && merchant.companyInfo) {
      doc.text(`Company: ${merchant.companyInfo.companyName || merchantId}`, 50, doc.y);
      if (merchant.companyInfo.taxNumber) {
        doc.text(`VAT Number: ${merchant.companyInfo.taxNumber}`, 50, doc.y);
      }
    } else {
      doc.text(`Merchant ID: ${merchantId}`, 50, doc.y);
    }
    
    doc.moveDown(1);
    
    // 每日销售汇总
    doc.fontSize(12).font('Helvetica-Bold').text('Daily Sales Summary', { underline: true });
    doc.moveDown(0.5);
    
    if (dailySales.length > 0) {
      const tableTop = doc.y;
      const col1X = 50;
      const col2X = 200;
      const col3X = 320;
      const col4X = 440;
      
      // 表头
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Date', col1X, tableTop);
      doc.text('Total Sales', col2X, tableTop);
      doc.text('Cash Income', col3X, tableTop);
      doc.text('Card Income', col4X, tableTop);
      
      doc.moveTo(50, tableTop + 12).lineTo(560, tableTop + 12).stroke();
      
      let currentY = tableTop + 20;
      doc.fontSize(8).font('Helvetica');
      
      dailySales.forEach(day => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
        
        doc.text(new Date(day.date).toLocaleDateString('en-IE'), col1X, currentY);
        doc.text(`EUR ${day.totalSales.toFixed(2)}`, col2X, currentY);
        doc.text(`EUR ${day.cashIncome.toFixed(2)}`, col3X, currentY);
        doc.text(`EUR ${day.cardIncome.toFixed(2)}`, col4X, currentY);
        currentY += 15;
      });
      
      // 合计行
      doc.moveTo(50, currentY).lineTo(560, currentY).stroke();
      currentY += 8;
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('TOTAL', col1X, currentY);
      doc.text(`EUR ${summary.totalSales.toFixed(2)}`, col2X, currentY);
      doc.text(`EUR ${summary.totalCashIncome.toFixed(2)}`, col3X, currentY);
      doc.text(`EUR ${summary.totalCardIncome.toFixed(2)}`, col4X, currentY);
      
      doc.y = currentY + 25;
    } else {
      doc.fontSize(9).font('Helvetica').fillColor('#666666');
      doc.text('No sales data for this period', 50, doc.y);
      doc.fillColor('#000000');
      doc.moveDown(1);
    }
    
    // 税务计算明细
    doc.fontSize(12).font('Helvetica-Bold').text('Tax Calculation Details', { underline: true });
    doc.moveDown(0.5);
    
    const taxTableTop = doc.y;
    const tcol1X = 50;
    const tcol2X = 150;
    const tcol3X = 230;
    const tcol4X = 310;
    const tcol5X = 390;
    const tcol6X = 470;
    
    // 表头
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Tax Type', tcol1X, taxTableTop);
    doc.text('Sales', tcol2X, taxTableTop);
    doc.text('Output Tax', tcol3X, taxTableTop);
    doc.text('Cost', tcol4X, taxTableTop);
    doc.text('Input Tax', tcol5X, taxTableTop);
    doc.text('Tax Due', tcol6X, taxTableTop);
    
    doc.moveTo(50, taxTableTop + 12).lineTo(560, taxTableTop + 12).stroke();
    
    let taxY = taxTableTop + 20;
    doc.fontSize(8).font('Helvetica');
    
    // VAT 23%
    if (taxByClassification.VAT_23.sales > 0) {
      doc.text('VAT 23%', tcol1X, taxY);
      doc.text(`${taxByClassification.VAT_23.sales.toFixed(2)}`, tcol2X, taxY);
      doc.text(`${taxByClassification.VAT_23.outputTax.toFixed(2)}`, tcol3X, taxY);
      doc.text(`${taxByClassification.VAT_23.cost.toFixed(2)}`, tcol4X, taxY);
      doc.text(`${taxByClassification.VAT_23.inputTax.toFixed(2)}`, tcol5X, taxY);
      doc.fillColor('#dc3545').text(`${taxByClassification.VAT_23.due.toFixed(2)}`, tcol6X, taxY);
      doc.fillColor('#000000');
      taxY += 15;
    }
    
    // Service VAT 13.5%
    if (taxByClassification.SERVICE_VAT_13_5.sales > 0) {
      doc.text('Service VAT 13.5%', tcol1X, taxY);
      doc.text(`${taxByClassification.SERVICE_VAT_13_5.sales.toFixed(2)}`, tcol2X, taxY);
      doc.text('-', tcol3X, taxY);
      doc.text('-', tcol4X, taxY);
      doc.text('-', tcol5X, taxY);
      doc.fillColor('#dc3545').text(`${taxByClassification.SERVICE_VAT_13_5.due.toFixed(2)}`, tcol6X, taxY);
      doc.fillColor('#000000');
      taxY += 15;
    }
    
    // Margin VAT
    if (taxByClassification.MARGIN_VAT_0.sales > 0) {
      doc.text('Margin VAT', tcol1X, taxY);
      doc.text(`${taxByClassification.MARGIN_VAT_0.sales.toFixed(2)}`, tcol2X, taxY);
      doc.text('-', tcol3X, taxY);
      doc.text(`${taxByClassification.MARGIN_VAT_0.cost.toFixed(2)}`, tcol4X, taxY);
      doc.text('-', tcol5X, taxY);
      doc.fillColor('#dc3545').text(`${taxByClassification.MARGIN_VAT_0.due.toFixed(2)}`, tcol6X, taxY);
      doc.fillColor('#000000');
      taxY += 15;
    }
    
    // VAT 0%
    if (taxByClassification.VAT_0.sales > 0) {
      doc.text('VAT 0%', tcol1X, taxY);
      doc.text(`${taxByClassification.VAT_0.sales.toFixed(2)}`, tcol2X, taxY);
      doc.text('-', tcol3X, taxY);
      doc.text('-', tcol4X, taxY);
      doc.text('-', tcol5X, taxY);
      doc.fillColor('#10b981').text('0.00', tcol6X, taxY);
      doc.fillColor('#000000');
      taxY += 15;
    }
    
    // 总计行
    doc.moveTo(50, taxY).lineTo(560, taxY).stroke();
    taxY += 8;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('TOTAL TAX DUE:', 390, taxY);
    doc.fillColor('#dc3545').fontSize(12).text(`EUR ${summary.totalTaxDue.toFixed(2)}`, tcol6X, taxY);
    doc.fillColor('#000000');
    
    taxY += 30;
    doc.y = taxY;
    
    // 计算说明
    doc.fontSize(9).font('Helvetica-Bold').text('Calculation Notes:', 50, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica').fillColor('#666666');
    doc.text('• VAT 23%: Output Tax = Sales × 23/123, Input Tax = Cost × 23/123, Due = Output - Input', 50, doc.y);
    doc.text('• Service VAT 13.5%: Tax Due = Amount × 13.5/113.5', 50, doc.y);
    doc.text('• Margin VAT: Tax Due = (Sales - Cost) × 23/123', 50, doc.y);
    doc.text('• VAT 0%: Tax-exempt goods, no VAT payable', 50, doc.y);
    doc.fillColor('#000000');
    
    // 页脚
    const pageHeight = doc.page.height;
    doc.fontSize(8).font('Helvetica').fillColor('#666666').text(
      `Generated on ${new Date().toLocaleString('en-IE')} | Page 1`,
      50,
      pageHeight - 50,
      { align: 'center' }
    );
    
    // 完成 PDF
    doc.end();
    
  } catch (error) {
    console.error('导出税务报表PDF失败:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// 获取仓库可订购产品列表（批发商订货用）
app.get('/api/merchant/warehouse-products', async (req, res) => {
  try {
    const AdminInventory = require('./models/AdminInventory');
    
    // 并行查询 ProductNew 和 AdminInventory
    const [productNewItems, adminInventoryItems] = await Promise.all([
      // 获取仓库中可销售的产品（ProductNew）
      ProductNew.find({ 
        isActive: true,
        stockQuantity: { $gt: 0 }
      })
      .populate('category', 'name type')
      .sort({ createdAt: -1 }),
      
      // 获取管理员库存中的产品（AdminInventory）
      AdminInventory.find({
        isActive: true,
        quantity: { $gt: 0 },
        status: 'AVAILABLE'
      })
      .sort({ createdAt: -1 })
    ]);
    
    // 按产品类型、品牌、型号、颜色分组
    const groupedProducts = {};
    
    // 处理 ProductNew 产品
    productNewItems.forEach(product => {
      // 判断是否是设备类型
      const isDevice = product.category?.type?.toLowerCase().includes('device');
      
      let key;
      if (isDevice) {
        // 设备产品：提取纯产品名称（去掉容量信息）
        // 例如：IPHONE15128GB -> IPHONE15, IPHONE15PROMAX256GB -> IPHONE15PROMAX
        const productName = (product.name || '').replace(/\d+(GB|TB)/gi, '').trim().replace(/\s+/g, '');
        key = `${product.category?.type || 'Unknown'}_${productName}_${product.condition}`;
      } else {
        // 配件产品：按品牌+型号+颜色分组
        key = `${product.category?.type || 'Unknown'}_${product.brand || ''}_${product.model || ''}_${product.color || ''}_${product.condition}`;
      }
      
      if (!groupedProducts[key]) {
        groupedProducts[key] = {
          productType: product.category?.type || 'Unknown',
          category: product.category?.name || product.category?.type || '未分类',
          brand: product.brand || '',
          model: product.model || '',
          color: product.color || '',
          products: [],
          totalAvailable: 0,
          wholesalePrice: product.wholesalePrice || product.costPrice,
          suggestedRetailPrice: product.retailPrice,
          taxClassification: product.vatRate === 'VAT 23%' ? 'VAT_23' : 
                            product.vatRate === 'VAT 13.5%' ? 'SERVICE_VAT_13_5' : 'MARGIN_VAT_0',
          source: 'ProductNew'
        };
      }
      
      groupedProducts[key].products.push(product);
      groupedProducts[key].totalAvailable += product.stockQuantity;
    });
    
    // 处理 AdminInventory 产品（配件变体）
    adminInventoryItems.forEach(item => {
      // 判断是否是设备类型
      const isDevice = item.category?.toLowerCase().includes('device');
      
      let key;
      if (isDevice) {
        // 设备产品：提取纯产品名称（去掉容量信息）
        const productName = (item.productName || '').replace(/\d+(GB|TB)/gi, '').trim().replace(/\s+/g, '');
        key = `${item.category}_${productName}_${item.condition}`;
      } else {
        // 配件产品：按品牌+型号+颜色分组
        key = `${item.category}_${item.brand || ''}_${item.model || ''}_${item.color || ''}_${item.condition}`;
      }
      
      if (!groupedProducts[key]) {
        groupedProducts[key] = {
          productType: item.category,
          category: item.category || '未分类',
          brand: item.brand || '',
          model: item.model || '',
          color: item.color || '',
          products: [],
          totalAvailable: 0,
          wholesalePrice: item.wholesalePrice,
          suggestedRetailPrice: item.retailPrice,
          taxClassification: item.taxClassification || 'VAT_23',
          source: 'AdminInventory'
        };
      }
      
      // 将 AdminInventory 项转换为类似 ProductNew 的格式
      groupedProducts[key].products.push({
        _id: item._id,
        name: item.productName,
        brand: item.brand,
        model: item.model,
        color: item.color,
        stockQuantity: item.quantity,
        wholesalePrice: item.wholesalePrice,
        retailPrice: item.retailPrice,
        costPrice: item.costPrice,
        condition: item.condition,
        source: 'AdminInventory'
      });
      groupedProducts[key].totalAvailable += item.quantity;
    });
    
    res.json({
      success: true,
      data: Object.values(groupedProducts),
      summary: {
        productNew: productNewItems.length,
        adminInventory: adminInventoryItems.length,
        totalGroups: Object.keys(groupedProducts).length
      }
    });
  } catch (error) {
    console.error('获取仓库产品失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批发商下订单（从仓库订货）
app.post('/api/merchant/orders', async (req, res) => {
  try {
    const { merchantId, merchantName, items } = req.body;
    
    if (!merchantId || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数' 
      });
    }
    
    // 简化实现：返回成功但不实际处理
    res.json({
      success: true,
      message: '订货功能开发中，请使用仓库管理员页面进行库存管理',
      data: {
        orderNumber: `MO-${Date.now()}`,
        status: 'PENDING'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取批发商订单列表
app.get('/api/merchant/orders', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || 'merchant_001';
    
    // 返回空订单列表
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批发商销售产品（从自己的库存） - 购物车模式
app.post('/api/merchant/sales/complete', async (req, res) => {
  try {
    const MerchantInventory = require('./models/MerchantInventory');
    const MerchantSale = require('./models/MerchantSale');
    const RepairOrder = require('./models/RepairOrder');
    
    const {
      merchantId,
      customerPhone,
      paymentMethod,
      items,
      totalAmount,
      subtotal,
      discount,
      cashAmount,
      cardAmount
    } = req.body;
    
    if (!merchantId || !paymentMethod || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数' 
      });
    }
    
    // 验证混合支付
    if (paymentMethod === 'MIXED') {
      if (!cashAmount || !cardAmount) {
        return res.status(400).json({ 
          success: false, 
          error: '混合支付需要提供现金和刷卡金额' 
        });
      }
      if (Math.abs((cashAmount + cardAmount) - totalAmount) > 0.01) {
        return res.status(400).json({ 
          success: false, 
          error: '支付金额不匹配' 
        });
      }
    }
    
    // 开始事务处理
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const saleItems = [];
      
      // 处理每个销售项目
      for (const item of items) {
        // 检查是否为维修订单
        if (item.repairId) {
          // 处理维修订单
          const repairOrder = await RepairOrder.findById(item.repairId).session(session);
          
          if (!repairOrder) {
            throw new Error(`维修订单不存在: ${item.productName}`);
          }
          
          if (repairOrder.status === 'sold') {
            throw new Error(`维修订单已销售: ${item.productName}`);
          }
          
          // 计算税额（维修服务使用 Service VAT 13.5%）
          const itemTotal = item.price * item.quantity;
          const taxAmount = itemTotal * 13.5 / 113.5;
          
          // 更新维修订单状态
          repairOrder.status = 'sold';
          repairOrder.soldDate = new Date();
          repairOrder.salePrice = item.price;
          await repairOrder.save({ session });
          
          saleItems.push({
            inventoryId: null,
            repairOrderId: item.repairId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            costPrice: repairOrder.repairCost, // 维修成本
            taxClassification: 'SERVICE_VAT_13_5',
            taxAmount: taxAmount,
            serialNumber: repairOrder.deviceIMEI || repairOrder.deviceSN || null
          });
        } else if (item.isQuickSale) {
          // 处理快速销售产品（无需库存）
          console.log(`⚡ 快速销售: ${item.productName}`);
          
          // 标准化税分类
          let taxClassification = item.taxClassification || 'VAT_23';
          
          if (taxClassification === 'VAT 23%' || taxClassification === 'VAT_23') {
            taxClassification = 'VAT_23';
          } else if (taxClassification === 'VAT 13.5%' || taxClassification === 'Service VAT 13.5%' || taxClassification === 'SERVICE_VAT_13_5') {
            taxClassification = 'SERVICE_VAT_13_5';
          } else if (taxClassification === 'VAT 0%' || taxClassification === 'VAT_0') {
            taxClassification = 'VAT_0';
          } else if (taxClassification === 'Margin VAT' || taxClassification === 'MARGIN_VAT_0') {
            taxClassification = 'MARGIN_VAT_0';
          }
          
          // 计算税额
          let taxAmount = 0;
          const itemTotal = item.price * item.quantity;
          
          switch (taxClassification) {
            case 'VAT_23':
              taxAmount = itemTotal * 23 / 123;
              break;
            case 'SERVICE_VAT_13_5':
              taxAmount = itemTotal * 13.5 / 113.5;
              break;
            case 'MARGIN_VAT_0':
              // 快速销售的Margin VAT，假设成本为0（全额征税）
              taxAmount = itemTotal * 23 / 123;
              break;
            case 'VAT_0':
              taxAmount = 0;
              break;
            default:
              taxAmount = itemTotal * 23 / 123;
          }
          
          saleItems.push({
            inventoryId: null, // 快速销售没有库存ID
            repairOrderId: null,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            costPrice: 0, // 快速销售没有成本价
            taxClassification: taxClassification,
            taxAmount: taxAmount,
            serialNumber: null,
            isQuickSale: true, // 标记为快速销售
            quickSaleCategory: item.quickSaleCategory,
            quickSaleDescription: item.quickSaleDescription
          });
        } else {
          // 处理库存产品
          const inventory = await MerchantInventory.findById(item.inventoryId).session(session);
          
          if (!inventory) {
            throw new Error(`库存不存在: ${item.productName}`);
          }
          
          if (inventory.quantity < item.quantity) {
            throw new Error(`库存不足: ${item.productName} (可用: ${inventory.quantity}, 需要: ${item.quantity})`);
          }
          
          // 减少库存
          inventory.quantity -= item.quantity;
          await inventory.save({ session });
          
          // 标准化税分类
          let taxClassification = item.taxClassification || 'VAT_23';
          
          // 将各种格式的税分类标准化
          if (taxClassification === 'VAT 23%' || taxClassification === 'VAT_23') {
            taxClassification = 'VAT_23';
          } else if (taxClassification === 'VAT 13.5%' || taxClassification === 'Service VAT 13.5%' || taxClassification === 'SERVICE_VAT_13_5') {
            taxClassification = 'SERVICE_VAT_13_5';
          } else if (taxClassification === 'VAT 0%' || taxClassification === 'Margin VAT' || taxClassification === 'MARGIN_VAT_0') {
            taxClassification = 'MARGIN_VAT_0';
          } else {
            // 默认使用 VAT 23%
            taxClassification = 'VAT_23';
          }
          
          // 计算税额
          let taxAmount = 0;
          const itemTotal = item.price * item.quantity;
          
          // 使用真实的采购成本价（costPrice才是真实的采购成本）
          const costPrice = inventory.costPrice || inventory.wholesalePrice;
          
          switch (taxClassification) {
            case 'VAT_23':
              // 销项税 = 销售额 × 23/123
              taxAmount = itemTotal * 23 / 123;
              break;
            case 'SERVICE_VAT_13_5':
              // 服务税 = 金额 × 13.5/113.5
              taxAmount = itemTotal * 13.5 / 113.5;
              break;
            case 'MARGIN_VAT_0':
              // Margin VAT = (销售额 - 成本) × 23/123
              const margin = itemTotal - (costPrice * item.quantity);
              taxAmount = margin * 23 / 123;
              break;
            default:
              taxAmount = itemTotal * 23 / 123;
          }
          
          saleItems.push({
            inventoryId: item.inventoryId,
            repairOrderId: null,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            costPrice: costPrice, // 使用批发价作为成本
            taxClassification: taxClassification, // 使用标准化的税分类
            taxAmount: taxAmount,
            serialNumber: item.serialNumber || null,
            originalCondition: inventory.condition || null, // 保存原始成色
            originalCategory: inventory.category || null    // 保存原始分类
          });
        }
      }
      
      // 创建销售记录
      const sale = new MerchantSale({
        merchantId,
        customerPhone: customerPhone || null,
        paymentMethod,
        cashAmount: paymentMethod === 'MIXED' ? cashAmount : (paymentMethod === 'CASH' ? totalAmount : 0),
        cardAmount: paymentMethod === 'MIXED' ? cardAmount : (paymentMethod === 'CARD' ? totalAmount : 0),
        items: saleItems,
        subtotal: subtotal || null,  // 原始小计
        discount: discount || 0,      // 折扣金额
        totalAmount,                  // 实际收款金额
        totalTax: saleItems.reduce((sum, item) => sum + item.taxAmount, 0),
        saleDate: new Date()
      });
      
      await sale.save({ session });
      
      // 提交事务
      await session.commitTransaction();
      
      res.json({
        success: true,
        data: {
          saleId: sale._id,
          totalAmount: sale.totalAmount,
          totalTax: sale.totalTax
        }
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('销售失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 获取商户销售详情
app.get('/api/merchant/sales/:saleId', checkDbConnection, async (req, res) => {
  try {
    const { saleId } = req.params;
    const MerchantSale = require('./models/MerchantSale');
    
    const sale = await MerchantSale.findById(saleId).lean();
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: '销售记录不存在'
      });
    }
    
    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('获取销售详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 删除销售记录（管理员功能）
app.delete('/api/merchant/sales/:saleId', async (req, res) => {
  try {
    const { saleId } = req.params;
    const MerchantSale = require('./models/MerchantSale');
    const MerchantInventory = require('./models/MerchantInventory');
    const RepairOrder = require('./models/RepairOrder');
    
    console.log(`\n🗑️ 删除销售记录: ${saleId}`);
    
    // 查找销售记录
    const sale = await MerchantSale.findById(saleId);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: '销售记录不存在'
      });
    }
    
    // 检查是否已退款
    if (sale.status && sale.status.toUpperCase() === 'REFUNDED') {
      return res.status(400).json({
        success: false,
        error: '该销售记录已退款，无法删除'
      });
    }
    
    // 开始事务
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // 恢复库存
      for (const item of sale.items) {
        if (item.isQuickSale) {
          // 快速销售产品，无需恢复库存
          console.log(`   ⚡ 快速销售产品，跳过: ${item.productName}`);
          continue;
        }
        
        if (item.repairOrderId) {
          // 删除维修订单记录
          const repairOrder = await RepairOrder.findById(item.repairOrderId).session(session);
          if (repairOrder) {
            await RepairOrder.findByIdAndDelete(item.repairOrderId).session(session);
            console.log(`   ✅ 删除维修订单: ${item.productName} (ID: ${item.repairOrderId})`);
          } else {
            console.log(`   ⚠️ 维修订单不存在: ${item.repairOrderId}`);
          }
        } else if (item.inventoryId) {
          // 恢复库存数量
          const inventory = await MerchantInventory.findById(item.inventoryId).session(session);
          if (inventory) {
            inventory.quantity += item.quantity;
            await inventory.save({ session });
            console.log(`   ✅ 恢复库存: ${item.productName} +${item.quantity}`);
          }
        }
      }
      
      // 删除销售记录
      await MerchantSale.findByIdAndDelete(saleId).session(session);
      console.log(`   ✅ 销售记录已删除`);
      
      // 提交事务
      await session.commitTransaction();
      
      res.json({
        success: true,
        message: '销售记录已删除，库存已恢复'
      });
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (error) {
    console.error('删除销售记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 旧的单个产品销售API（保留兼容性）
app.post('/api/merchant/sell', async (req, res) => {
  try {
    const { merchantId, inventoryId, quantity, paymentMethod } = req.body;
    
    if (!merchantId || !inventoryId || !quantity) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数' 
      });
    }
    
    // 简化实现：返回成功但不实际处理
    res.json({
      success: true,
      message: '请使用新的购物车销售功能',
      data: {
        remainingStock: 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 产品分类 API ====================

// 获取所有产品分类
app.get('/api/categories', async (req, res) => {
  try {
    const ProductCategory = require('./models/ProductCategory');
    
    console.log('\n📋 获取产品分类列表');
    
    // 查询所有激活的分类
    const categories = await ProductCategory.find({ isActive: true }).sort({ name: 1 });
    
    console.log(`   找到 ${categories.length} 个分类`);
    
    res.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取所有税率
app.get('/api/vat-rates', async (req, res) => {
  try {
    const VatRate = require('./models/VatRate');
    
    console.log('\n💰 获取税率列表');
    
    // 查询所有激活的税率，按排序顺序
    const vatRates = await VatRate.find({ isActive: true }).sort({ sortOrder: 1, rate: 1 });
    
    console.log(`   找到 ${vatRates.length} 个税率`);
    
    res.json({
      success: true,
      data: vatRates
    });
    
  } catch (error) {
    console.error('获取税率列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 商户供货商管理 API ====================

// 获取商户的供货商列表
app.get('/api/merchant/suppliers', async (req, res) => {
  try {
    const Supplier = require('./models/Supplier');
    const merchantId = req.query.merchantId;
    const searchTerm = req.query.search || '';
    
    if (!merchantId) {
      return res.status(400).json({
        success: false,
        error: '需要提供merchantId'
      });
    }
    
    console.log(`\n📦 获取商户供货商列表: ${merchantId}`);
    
    // 构建查询条件
    const query = { merchantId: merchantId };
    
    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { code: { $regex: searchTerm, $options: 'i' } },
        { 'contact.person': { $regex: searchTerm, $options: 'i' } },
        { 'contact.phone': { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    const suppliers = await Supplier.find(query).sort({ createdAt: -1 });
    
    console.log(`   找到 ${suppliers.length} 个供货商`);
    
    res.json({
      success: true,
      data: suppliers
    });
    
  } catch (error) {
    console.error('获取供货商列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 添加商户供货商
app.post('/api/merchant/suppliers', async (req, res) => {
  try {
    const Supplier = require('./models/Supplier');
    const {
      merchantId,
      name,
      code,
      vatNumber,
      contactPerson,
      contactPhone,
      contactEmail,
      contactAddress,
      paymentTerms,
      notes
    } = req.body;
    
    if (!merchantId || !name || !code) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    console.log(`\n📦 添加供货商: ${name} (${merchantId})`);
    
    // 检查code是否已存在（同一商户下）
    const existing = await Supplier.findOne({ code: code.toUpperCase(), merchantId });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: '供货商代码已存在'
      });
    }
    
    const supplier = new Supplier({
      merchantId,
      name,
      code: code.toUpperCase(),
      vatNumber: vatNumber || '',
      contact: {
        person: contactPerson,
        phone: contactPhone,
        email: contactEmail,
        address: contactAddress
      },
      paymentTerms: paymentTerms || 'net30',
      notes: notes || '',
      isActive: true
    });
    
    await supplier.save();
    
    console.log(`   ✅ 供货商已添加: ${supplier._id}`);
    
    res.json({
      success: true,
      data: supplier
    });
    
  } catch (error) {
    console.error('添加供货商失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新商户供货商
app.put('/api/merchant/suppliers/:id', async (req, res) => {
  try {
    const Supplier = require('./models/Supplier');
    const supplierId = req.params.id;
    const merchantId = req.body.merchantId;
    
    if (!merchantId) {
      return res.status(400).json({
        success: false,
        error: '需要提供merchantId'
      });
    }
    
    console.log(`\n📦 更新供货商: ${supplierId}`);
    
    // 查找供货商并验证所有权
    const supplier = await Supplier.findOne({ _id: supplierId, merchantId });
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: '供货商不存在或无权访问'
      });
    }
    
    // 更新字段
    const {
      name,
      vatNumber,
      contactPerson,
      contactPhone,
      contactEmail,
      contactAddress,
      paymentTerms,
      notes,
      isActive
    } = req.body;
    
    if (name) supplier.name = name;
    if (vatNumber !== undefined) supplier.vatNumber = vatNumber;
    if (contactPerson !== undefined) supplier.contact.person = contactPerson;
    if (contactPhone !== undefined) supplier.contact.phone = contactPhone;
    if (contactEmail !== undefined) supplier.contact.email = contactEmail;
    if (contactAddress !== undefined) supplier.contact.address = contactAddress;
    if (paymentTerms) supplier.paymentTerms = paymentTerms;
    if (notes !== undefined) supplier.notes = notes;
    if (isActive !== undefined) supplier.isActive = isActive;
    
    await supplier.save();
    
    console.log(`   ✅ 供货商已更新`);
    
    res.json({
      success: true,
      data: supplier
    });
    
  } catch (error) {
    console.error('更新供货商失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 删除商户供货商
app.delete('/api/merchant/suppliers/:id', async (req, res) => {
  try {
    const Supplier = require('./models/Supplier');
    const supplierId = req.params.id;
    const merchantId = req.query.merchantId;
    
    if (!merchantId) {
      return res.status(400).json({
        success: false,
        error: '需要提供merchantId'
      });
    }
    
    console.log(`\n📦 删除供货商: ${supplierId}`);
    
    // 查找供货商并验证所有权
    const supplier = await Supplier.findOne({ _id: supplierId, merchantId });
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: '供货商不存在或无权访问'
      });
    }
    
    await Supplier.findByIdAndDelete(supplierId);
    
    console.log(`   ✅ 供货商已删除`);
    
    res.json({
      success: true,
      message: '供货商已删除'
    });
    
  } catch (error) {
    console.error('删除供货商失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 商户库存管理 API ====================

// 手动入库 - 添加产品到商户库存
app.post('/api/merchant/inventory/add', async (req, res) => {
  try {
    const MerchantInventory = require('./models/MerchantInventory');
    const UserNew = require('./models/UserNew');
    const ProductCategory = require('./models/ProductCategory');
    
    const {
      merchantId,
      productName,
      brand,
      model,
      category,
      quantity,
      costPrice,
      wholesalePrice,
      retailPrice,
      barcode,
      serialNumber,
      color,
      condition,
      notes
    } = req.body;
    
    // 验证必填字段
    if (!merchantId || !productName || !category || !quantity || !costPrice || !wholesalePrice || !retailPrice) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    // 尝试获取商户信息（可选）
    let merchantName = merchantId;
    let storeGroup = null;
    let store = null;
    
    try {
      const user = await UserNew.findOne({ username: merchantId });
      if (user) {
        merchantName = user.fullName || merchantId;
        storeGroup = user.retailInfo?.storeGroup;
        store = user.retailInfo?.store;
      }
    } catch (userError) {
      console.log('获取用户信息失败，使用默认值:', userError.message);
    }
    
    // 从分类获取默认税率
    let taxClassification = 'VAT_23'; // 默认值
    try {
      const categoryDoc = await ProductCategory.findOne({ type: category, isActive: true });
      if (categoryDoc && categoryDoc.defaultVatRate) {
        // 将税率格式转换为税务分类代码
        const vatRate = categoryDoc.defaultVatRate.toLowerCase();
        
        if (vatRate.includes('margin') || vatRate.includes('0%')) {
          // Margin VAT 或 VAT 0% (二手商品差价税制)
          taxClassification = 'MARGIN_VAT_0';
        } else if (vatRate.includes('23')) {
          // VAT 23% (标准税率)
          taxClassification = 'VAT_23';
        } else if (vatRate.includes('13.5')) {
          // Service VAT 13.5% (服务税率)
          taxClassification = 'SERVICE_VAT_13_5';
        } else {
          // 其他情况，根据成色判断
          // 二手或翻新设备使用 Margin VAT
          if (condition === 'PRE_OWNED' || condition === 'REFURBISHED') {
            taxClassification = 'MARGIN_VAT_0';
          }
        }
      } else {
        // 如果没有找到分类配置，根据成色判断
        if (condition === 'PRE_OWNED' || condition === 'REFURBISHED') {
          taxClassification = 'MARGIN_VAT_0';
        }
      }
    } catch (categoryError) {
      console.log('获取分类税率失败，使用默认值:', categoryError.message);
      // 根据成色判断
      if (condition === 'PRE_OWNED' || condition === 'REFURBISHED') {
        taxClassification = 'MARGIN_VAT_0';
      }
    }
    
    // 创建库存记录
    const inventory = new MerchantInventory({
      merchantId,
      merchantName,
      storeGroup,
      store,
      productName,
      brand: brand || '',
      model: model || '',
      category,
      taxClassification,
      quantity: parseInt(quantity),
      costPrice: parseFloat(costPrice),
      wholesalePrice: parseFloat(wholesalePrice),
      retailPrice: parseFloat(retailPrice),
      barcode: barcode || '',
      serialNumber: serialNumber || '',
      color: color || '',
      condition: condition || 'BRAND_NEW',
      source: 'manual',
      notes: notes || '',
      status: 'active'
    });
    
    await inventory.save();
    
    res.json({
      success: true,
      data: {
        inventoryId: inventory._id,
        taxClassification: inventory.taxClassification,
        message: '入库成功'
      }
    });
  } catch (error) {
    console.error('入库失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取群组库存 - 查看群组内所有商户的库存
app.get('/api/merchant/inventory/group', async (req, res) => {
  try {
    const MerchantInventory = require('./models/MerchantInventory');
    const UserNew = require('./models/UserNew');
    
    const { merchantId } = req.query;
    
    if (!merchantId) {
      return res.status(400).json({
        success: false,
        error: '缺少商户ID'
      });
    }
    
    // 获取当前商户信息
    const currentUser = await UserNew.findOne({ username: merchantId });
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: '商户不存在'
      });
    }
    
    // 检查权限
    if (!currentUser.retailInfo?.canViewGroupInventory) {
      return res.status(403).json({
        success: false,
        error: '没有查看群组库存的权限'
      });
    }
    
    const storeGroupId = currentUser.retailInfo?.storeGroup;
    if (!storeGroupId) {
      return res.status(400).json({
        success: false,
        error: '您不属于任何店面组'
      });
    }
    
    // 获取自己的库存
    const myInventory = await MerchantInventory.find({
      merchantId,
      status: 'active',
      isActive: true
    }).sort({ createdAt: -1 });
    
    // 获取群组内其他商户的库存
    const groupUsers = await UserNew.find({
      'retailInfo.storeGroup': storeGroupId,
      username: { $ne: merchantId },
      isActive: true
    });
    
    const groupInventory = [];
    for (const user of groupUsers) {
      const inventory = await MerchantInventory.find({
        merchantId: user.username,
        status: 'active',
        isActive: true
      }).sort({ createdAt: -1 });
      
      if (inventory.length > 0) {
        groupInventory.push({
          merchantId: user.username,
          merchantName: user.fullName || user.username,
          storeName: user.retailInfo?.store?.name || '未知店面',
          products: inventory
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        myInventory,
        groupInventory
      }
    });
  } catch (error) {
    console.error('获取群组库存失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取调货信息（用于前端显示）
app.get('/api/merchant/inventory/transfer/info', async (req, res) => {
  try {
    const UserNew = require('./models/UserNew');
    const { fromMerchantId, toMerchantId } = req.query;
    
    if (!fromMerchantId || !toMerchantId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    // 获取双方商户信息
    const fromUser = await UserNew.findOne({ username: fromMerchantId });
    const toUser = await UserNew.findOne({ username: toMerchantId });
    
    if (!fromUser || !toUser) {
      return res.status(404).json({
        success: false,
        error: '商户不存在'
      });
    }
    
    // 判断交易类型
    const fromCompany = fromUser.companyInfo?.companyName;
    const toCompany = toUser.companyInfo?.companyName;
    
    let transferType;
    if (fromCompany && toCompany && fromCompany === toCompany) {
      transferType = 'INTERNAL_TRANSFER';
    } else {
      transferType = 'INTER_COMPANY_SALE';
    }
    
    res.json({
      success: true,
      data: {
        fromMerchantId,
        fromMerchantName: fromUser.fullName || fromMerchantId,
        fromCompany: fromCompany || null,
        toMerchantId,
        toMerchantName: toUser.fullName || toMerchantId,
        toCompany: toCompany || null,
        transferType: transferType
      }
    });
  } catch (error) {
    console.error('获取调货信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 发起调货请求
app.post('/api/merchant/inventory/transfer/request', async (req, res) => {
  try {
    const InventoryTransfer = require('./models/InventoryTransfer');
    const MerchantInventory = require('./models/MerchantInventory');
    const UserNew = require('./models/UserNew');
    
    const {
      fromMerchantId,
      toMerchantId,
      items,
      notes
    } = req.body;
    
    // 验证参数
    if (!fromMerchantId || !toMerchantId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    // 获取双方商户信息
    const fromUser = await UserNew.findOne({ username: fromMerchantId });
    const toUser = await UserNew.findOne({ username: toMerchantId });
    
    if (!fromUser || !toUser) {
      return res.status(404).json({
        success: false,
        error: '商户不存在'
      });
    }
    
    // 判断交易类型（基于公司信息）
    const fromCompany = fromUser.companyInfo?.companyName;
    const toCompany = toUser.companyInfo?.companyName;
    
    let transferType, priceType;
    if (fromCompany && toCompany && fromCompany === toCompany) {
      transferType = 'INTERNAL_TRANSFER';
      priceType = 'cost';
      console.log(`✅ 内部调拨: ${fromCompany}`);
    } else {
      transferType = 'INTER_COMPANY_SALE';
      priceType = 'wholesale';
      console.log(`💰 公司间销售: ${fromCompany || '未设置'} → ${toCompany || '未设置'}`);
    }
    
    // 检查是否在同一店面组
    if (!fromUser.retailInfo?.storeGroup || !toUser.retailInfo?.storeGroup ||
        fromUser.retailInfo.storeGroup.toString() !== toUser.retailInfo.storeGroup.toString()) {
      return res.status(403).json({
        success: false,
        error: '只能在同一店面组内调货'
      });
    }
    
    // 检查调入方权限
    if (!toUser.retailInfo?.canTransferFromGroup) {
      return res.status(403).json({
        success: false,
        error: '没有调货权限'
      });
    }
    
    // 验证库存并计算总金额
    let totalAmount = 0;
    const transferItems = [];
    
    for (const item of items) {
      // 查找库存记录
      const inventory = await MerchantInventory.findById(item.inventoryId);
      
      if (!inventory) {
        return res.status(404).json({
          success: false,
          error: `库存记录不存在: ${item.inventoryId}`
        });
      }
      
      if (inventory.merchantId !== fromMerchantId) {
        return res.status(403).json({
          success: false,
          error: '无权调货此产品'
        });
      }
      
      // 对于配件，如果单条记录数量不足，查找同产品的其他记录
      let remainingQty = item.quantity;
      const inventoriesToUse = [];
      
      if (inventory.quantity >= item.quantity) {
        // 单条记录足够
        inventoriesToUse.push({
          inventory: inventory,
          quantity: item.quantity
        });
      } else {
        // 需要从多条记录中扣减
        // 查找相同产品的所有可用库存
        const sameProductInventories = await MerchantInventory.find({
          merchantId: fromMerchantId,
          productName: inventory.productName,
          brand: inventory.brand,
          model: inventory.model,
          color: inventory.color,
          status: 'active',
          isActive: true,
          quantity: { $gt: 0 }
        }).sort({ createdAt: 1 }); // 按创建时间排序，先进先出
        
        // 计算总可用数量
        const totalAvailable = sameProductInventories.reduce((sum, inv) => sum + inv.quantity, 0);
        
        if (totalAvailable < item.quantity) {
          return res.status(400).json({
            success: false,
            error: `${inventory.productName} 库存不足。需要: ${item.quantity}, 可用: ${totalAvailable}`
          });
        }
        
        // 从多条记录中分配数量
        for (const inv of sameProductInventories) {
          if (remainingQty <= 0) break;
          
          const qtyToUse = Math.min(inv.quantity, remainingQty);
          inventoriesToUse.push({
            inventory: inv,
            quantity: qtyToUse
          });
          remainingQty -= qtyToUse;
        }
      }
      
      // 根据交易类型选择价格（使用第一条记录的价格）
      let transferPrice;
      if (transferType === 'INTERNAL_TRANSFER') {
        transferPrice = inventory.costPrice; // 内部调拨使用成本价
      } else {
        transferPrice = inventory.wholesalePrice; // 公司间销售使用批发价
      }
      
      // 为每个使用的库存记录创建调货项目
      for (const { inventory: inv, quantity: qty } of inventoriesToUse) {
        transferItems.push({
          inventoryId: inv._id,
          productName: inv.productName,
          brand: inv.brand,
          model: inv.model,
          category: inv.category,
          quantity: qty,
          transferPrice: transferPrice,
          barcode: inv.barcode,
          // ❌ 不要在创建申请时复制序列号，等批准时由用户选择
          // serialNumber: inv.serialNumber,
          color: inv.color,
          condition: inv.condition,
          taxClassification: inv.taxClassification, // 添加税务分类
          retailPrice: inv.retailPrice // 保存原产品的零售价，用于公司间销售时的默认值
        });
        
        totalAmount += qty * transferPrice;
      }
    }
    
    // 生成调货单号
    const transferNumber = await InventoryTransfer.generateTransferNumber();
    
    // 创建调货记录
    const transfer = new InventoryTransfer({
      transferNumber,
      transferType, // 交易类型
      fromMerchant: fromMerchantId,
      fromMerchantName: fromUser.fullName || fromMerchantId,
      fromStore: fromUser.retailInfo?.store,
      fromCompany: fromUser.companyInfo, // 调出方公司信息
      toMerchant: toMerchantId,
      toMerchantName: toUser.fullName || toMerchantId,
      toStore: toUser.retailInfo?.store,
      toCompany: toUser.companyInfo, // 调入方公司信息
      storeGroup: fromUser.retailInfo.storeGroup,
      items: transferItems,
      totalAmount,
      notes: notes || '',
      status: 'pending',
      requestedBy: toUser._id,
      requestedAt: new Date()
    });
    
    await transfer.save();
    
    res.json({
      success: true,
      data: {
        transferId: transfer._id,
        transferNumber: transfer.transferNumber,
        transferType: transferType,
        priceType: priceType,
        fromCompany: fromCompany || '未设置',
        toCompany: toCompany || '未设置',
        status: transfer.status,
        message: transferType === 'INTERNAL_TRANSFER' 
          ? '内部调拨申请已提交，等待对方审批' 
          : '公司间销售订单已创建，等待对方审批'
      }
    });
  } catch (error) {
    console.error('发起调货失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取调货记录列表
app.get('/api/merchant/inventory/transfer/list', async (req, res) => {
  try {
    const InventoryTransfer = require('./models/InventoryTransfer');
    
    const { merchantId, type, status } = req.query;
    
    if (!merchantId) {
      return res.status(400).json({
        success: false,
        error: '缺少商户ID'
      });
    }
    
    let query = { isActive: true };
    
    // 根据类型筛选
    if (type === 'sent') {
      query.fromMerchant = merchantId;
    } else if (type === 'received') {
      query.toMerchant = merchantId;
    } else {
      query.$or = [
        { fromMerchant: merchantId },
        { toMerchant: merchantId }
      ];
    }
    
    // 根据状态筛选
    if (status) {
      query.status = status;
    }
    
    const transfers = await InventoryTransfer.find(query)
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({
      success: true,
      data: transfers
    });
  } catch (error) {
    console.error('获取调货记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取单个调货详情
app.get('/api/merchant/inventory/transfer/:id', async (req, res) => {
  try {
    const InventoryTransfer = require('./models/InventoryTransfer');
    
    const transferId = req.params.id;
    
    const transfer = await InventoryTransfer.findById(transferId);
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: '调货记录不存在'
      });
    }
    
    res.json({
      success: true,
      data: transfer
    });
  } catch (error) {
    console.error('获取调货详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 审批调货请求
app.post('/api/merchant/inventory/transfer/approve', async (req, res) => {
  try {
    const InventoryTransfer = require('./models/InventoryTransfer');
    const MerchantInventory = require('./models/MerchantInventory');
    const UserNew = require('./models/UserNew');
    
    const { transferId, action, notes, merchantId, imeiMapping } = req.body;
    
    if (!transferId || !action || !merchantId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    const transfer = await InventoryTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: '调货记录不存在'
      });
    }
    
    // 验证权限（必须是调出方）
    if (transfer.fromMerchant !== merchantId) {
      return res.status(403).json({
        success: false,
        error: '只有调出方可以审批'
      });
    }
    
    // 验证状态
    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '该调货申请已处理'
      });
    }
    
    const user = await UserNew.findOne({ username: merchantId });
    
    if (action === 'approve') {
      // 如果有IMEI映射，更新订单中的序列号
      if (imeiMapping) {
        console.log('收到IMEI映射:', imeiMapping);
        
        // 更新每个产品的序列号
        for (let i = 0; i < transfer.items.length; i++) {
          const item = transfer.items[i];
          const selectedInventoryIds = imeiMapping[item.inventoryId.toString()];
          
          if (selectedInventoryIds && selectedInventoryIds.length > 0) {
            // 获取选中的库存记录
            const selectedInventory = await MerchantInventory.findById(selectedInventoryIds[0]);
            if (selectedInventory) {
              // 更新订单项的序列号/IMEI
              transfer.items[i].serialNumber = selectedInventory.serialNumber || selectedInventory.imei;
              transfer.items[i].imei = selectedInventory.imei;
              // 更新inventoryId为实际选中的设备
              transfer.items[i].inventoryId = selectedInventory._id;
              
              console.log(`✅ 更新产品 ${item.productName} 的IMEI: ${transfer.items[i].serialNumber}`);
            }
          }
        }
      }
      
      transfer.status = 'approved';
      transfer.approvedBy = user._id;
      transfer.approvedAt = new Date();
      transfer.approvalNotes = notes || '';
      transfer.imeiMapping = imeiMapping; // 保存IMEI映射
    } else if (action === 'reject') {
      transfer.status = 'rejected';
      transfer.approvedBy = user._id;
      transfer.rejectedAt = new Date();
      transfer.rejectionReason = notes || '';
    } else {
      return res.status(400).json({
        success: false,
        error: '无效的操作'
      });
    }
    
    await transfer.save();
    
    res.json({
      success: true,
      data: {
        transferId: transfer._id,
        status: transfer.status,
        message: action === 'approve' ? '已批准调货申请' : '已拒绝调货申请'
      }
    });
  } catch (error) {
    console.error('审批调货失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 完成调货（确认收货）
app.post('/api/merchant/inventory/transfer/complete', async (req, res) => {
  try {
    const InventoryTransfer = require('./models/InventoryTransfer');
    const MerchantInventory = require('./models/MerchantInventory');
    const UserNew = require('./models/UserNew');
    const mongoose = require('mongoose');
    
    const { transferId, merchantId, customPrices } = req.body;
    
    if (!transferId || !merchantId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    const transfer = await InventoryTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: '调货记录不存在'
      });
    }
    
    // 验证权限（必须是调入方）
    if (transfer.toMerchant !== merchantId) {
      return res.status(403).json({
        success: false,
        error: '只有调入方可以确认收货'
      });
    }
    
    // 验证状态
    if (transfer.status !== 'approved' && transfer.status !== 'shipped') {
      return res.status(400).json({
        success: false,
        error: '该调货申请状态不正确'
      });
    }
    
    // 如果是公司间销售，验证自定义价格
    if (transfer.transferType === 'INTER_COMPANY_SALE' && !customPrices) {
      return res.status(400).json({
        success: false,
        error: '公司间销售需要设置批发价和零售价'
      });
    }
    
    // 使用事务处理库存变更
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const user = await UserNew.findOne({ username: merchantId });
      
      // 处理每个产品
      for (let i = 0; i < transfer.items.length; i++) {
        const item = transfer.items[i];
        
        // 减少调出方库存
        const fromInventory = await MerchantInventory.findById(item.inventoryId).session(session);
        if (!fromInventory) {
          throw new Error(`库存记录不存在: ${item.inventoryId}`);
        }
        
        if (fromInventory.quantity < item.quantity) {
          throw new Error(`${fromInventory.productName} 库存不足`);
        }
        
        fromInventory.quantity -= item.quantity;
        await fromInventory.save({ session });
        
        // 根据交易类型决定价格策略
        let costPrice, wholesalePrice, retailPrice;
        
        if (transfer.transferType === 'INTERNAL_TRANSFER') {
          // 内部调拨：完全继承原始产品的所有价格
          costPrice = fromInventory.costPrice;
          wholesalePrice = fromInventory.wholesalePrice;
          retailPrice = fromInventory.retailPrice;
        } else {
          // 公司间销售：使用自定义价格
          const customPrice = customPrices && customPrices[i];
          if (!customPrice) {
            throw new Error(`缺少产品 ${item.productName} 的价格设置`);
          }
          
          // 成本价 = 调货价格（真实的采购成本）
          costPrice = item.transferPrice;
          wholesalePrice = parseFloat(customPrice.wholesalePrice);
          retailPrice = parseFloat(customPrice.retailPrice);
          
          // 验证价格
          if (isNaN(wholesalePrice) || wholesalePrice < 0) {
            throw new Error(`产品 ${item.productName} 的批发价无效`);
          }
          if (isNaN(retailPrice) || retailPrice < 0) {
            throw new Error(`产品 ${item.productName} 的零售价无效`);
          }
        }
        
        // 增加调入方库存
        const toInventory = new MerchantInventory({
          merchantId: transfer.toMerchant,
          merchantName: transfer.toMerchantName,
          storeGroup: transfer.storeGroup,
          store: transfer.toStore,
          productName: item.productName,
          brand: item.brand,
          model: item.model,
          category: item.category,
          quantity: item.quantity,
          costPrice: costPrice,
          wholesalePrice: wholesalePrice,
          retailPrice: retailPrice,
          taxClassification: fromInventory.taxClassification, // 继承税务分类
          barcode: item.barcode,
          serialNumber: item.serialNumber,
          color: item.color,
          condition: item.condition,
          source: 'transfer',
          sourceTransferId: transfer._id,
          status: 'active'
        });
        
        await toInventory.save({ session });
      }
      
      // 更新调货记录状态
      transfer.status = 'completed';
      transfer.completedBy = user._id;
      transfer.completedAt = new Date();
      await transfer.save({ session });
      
      await session.commitTransaction();
      
      // 如果是公司间销售，生成销售发票
      if (transfer.transferType === 'INTER_COMPANY_SALE') {
        const InterCompanySalesInvoice = require('./models/InterCompanySalesInvoice');
        
        // 计算VAT
        const subtotal = transfer.totalAmount;
        const vatRate = 0.23; // 23% VAT
        const vatAmount = subtotal * vatRate;
        const totalAmount = subtotal + vatAmount;
        
        // 生成发票号
        const invoiceNumber = await InterCompanySalesInvoice.generateInvoiceNumber();
        
        // 创建销售发票
        const invoice = new InterCompanySalesInvoice({
          invoiceNumber,
          invoiceType: 'inter_company_sale',
          merchantId: transfer.fromMerchant,
          merchantName: transfer.fromMerchantName,
          
          // 卖方信息（调出方）
          seller: {
            name: transfer.fromCompany?.companyName || transfer.fromMerchantName,
            address: transfer.fromCompany?.address ? 
              `${transfer.fromCompany.address.street || ''}, ${transfer.fromCompany.address.city || ''}, ${transfer.fromCompany.address.postalCode || ''}, ${transfer.fromCompany.address.country || ''}`.trim() : '',
            vatNumber: transfer.fromCompany?.vatNumber || '',
            phone: transfer.fromCompany?.contactPhone || '',
            email: transfer.fromCompany?.contactEmail || ''
          },
          
          // 买方信息（调入方）
          buyer: {
            name: transfer.toCompany?.companyName || transfer.toMerchantName,
            address: transfer.toCompany?.address ? 
              `${transfer.toCompany.address.street || ''}, ${transfer.toCompany.address.city || ''}, ${transfer.toCompany.address.postalCode || ''}, ${transfer.toCompany.address.country || ''}`.trim() : '',
            vatNumber: transfer.toCompany?.vatNumber || '',
            phone: transfer.toCompany?.contactPhone || '',
            email: transfer.toCompany?.contactEmail || ''
          },
          
          // 产品列表
          items: transfer.items.map(item => ({
            productName: item.productName,
            brand: item.brand,
            model: item.model,
            category: item.category,
            serialNumber: item.serialNumber,
            color: item.color,
            condition: item.condition,
            quantity: item.quantity,
            unitPrice: item.transferPrice,
            totalPrice: item.quantity * item.transferPrice,
            taxClassification: item.taxClassification || 'VAT_23' // 使用产品的实际税务分类
          })),
          
          // 金额
          subtotal: subtotal,
          vatRate: vatRate,
          vatAmount: vatAmount,
          totalAmount: totalAmount,
          
          // 付款信息
          paymentStatus: 'pending',
          paymentMethod: 'transfer',
          
          // 关联调货单
          relatedTransferId: transfer._id,
          relatedTransferNumber: transfer.transferNumber,
          
          status: 'completed',
          isActive: true
        });
        
        await invoice.save();
        
        // 更新调货记录，关联发票
        transfer.salesInvoiceId = invoice._id;
        transfer.salesInvoiceNumber = invoice.invoiceNumber;
        transfer.financialInfo = {
          subtotal: subtotal,
          vatRate: vatRate,
          vatAmount: vatAmount,
          totalAmount: totalAmount,
          paymentStatus: 'pending'
        };
        await transfer.save();
        
        console.log(`✅ 已生成销售发票: ${invoice.invoiceNumber}`);
        
        return res.json({
          success: true,
          data: {
            transferId: transfer._id,
            transferType: 'INTER_COMPANY_SALE',
            salesInvoiceId: invoice._id,
            salesInvoiceNumber: invoice.invoiceNumber,
            subtotal: subtotal,
            vatAmount: vatAmount,
            totalAmount: totalAmount,
            message: '调货完成，销售发票已生成'
          }
        });
      }
      
      // 内部调拨
      res.json({
        success: true,
        data: {
          transferId: transfer._id,
          transferType: 'INTERNAL_TRANSFER',
          status: transfer.status,
          message: '内部调拨完成，库存已更新'
        }
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('完成调货失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 管理界面: http://localhost:${PORT}/`);
  console.log(`🔧 数据库状态: http://localhost:${PORT}/api/db-status`);
});

module.exports = app;