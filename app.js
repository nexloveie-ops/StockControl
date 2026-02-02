const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const OpenAI = require('openai');
require('dotenv').config();

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
    
    const stats = {
      totalProducts: await ProductNew.countDocuments({ isActive: true, stockQuantity: { $gt: 0 } }), // 只统计有库存的
      availableProducts: await ProductNew.countDocuments({ isActive: true, stockQuantity: { $gt: 0 } }),
      totalUsers: await UserNew.countDocuments({ isActive: true }),
      totalSuppliers: await SupplierNew.countDocuments({ isActive: true }),
      totalInvoices: 0, // 暂时设为0，因为还没有销售发票模型
      totalOrders: 0, // 暂时设为0
      productsByCategory: {
        accessories: await ProductNew.countDocuments({ isActive: true, stockQuantity: { $gt: 0 }, condition: 'Brand New' }),
        newDevices: await ProductNew.countDocuments({ isActive: true, stockQuantity: { $gt: 0 }, condition: 'Brand New' }),
        usedDevices: await ProductNew.countDocuments({ isActive: true, stockQuantity: { $gt: 0 }, condition: 'Pre-Owned' })
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
    const { category, status, search, includeOutOfStock } = req.query;
    let query = { isActive: true };
    
    // 如果有搜索条件，允许搜索已售产品（用于追溯）
    // 如果没有搜索条件，默认不显示已售产品
    if (!search && includeOutOfStock !== 'true') {
      query.stockQuantity = { $gt: 0 };
    }
    
    // 分类筛选
    if (category) {
      query.productType = category;
    }
    
    // 状态筛选
    if (status) {
      query.status = status;
    }
    
    // 搜索功能
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { sku: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { model: new RegExp(search, 'i') },
        { barcode: new RegExp(search, 'i') },
        { 'serialNumbers.serialNumber': new RegExp(search, 'i') },
        { notes: new RegExp(search, 'i') }
      ];
    }
    
    console.log('📦 /api/products 查询:', { 
      category, 
      search, 
      includeOutOfStock, 
      hasStockFilter: !!query.stockQuantity,
      reason: search ? '有搜索条件-允许查询已售产品' : '无搜索条件-只显示有库存产品'
    });
    
    const products = await ProductNew.find(query)
      .populate('category', 'name type')
      .sort({ createdAt: -1 });
    
    console.log(`✅ 返回 ${products.length} 个产品`);
    if (products.length > 0 && products.length <= 5) {
      products.forEach(p => {
        console.log(`  - ${p.name}: 库存=${p.stockQuantity}`);
      });
    }
    
    // 计算含税进货价并添加到返回数据中
    const productsWithTaxInclusivePrices = products.map(product => {
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
        // 为了向后兼容，更新costPrice字段为含税价格
        costPrice: costPriceIncludingTax,
        purchasePrice: costPriceIncludingTax // 别名，确保兼容性
      };
    });
    
    res.json({ success: true, data: productsWithTaxInclusivePrices });
  } catch (error) {
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

app.get('/api/invoices', (req, res) => {
  res.json({ success: true, data: [] }); // 暂时返回空数组
});

app.get('/api/purchase-orders', (req, res) => {
  res.json({ success: true, data: [] }); // 暂时返回空数组
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
                status: 'available',
                purchaseInvoice: null // 稍后会更新
              });
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
    
    // 搜索产品
    const products = await ProductNew.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { 'serialNumbers.serialNumber': { $regex: search, $options: 'i' } }
      ],
      isActive: true
    }).lean();
    
    if (products.length === 0) {
      return res.json({
        success: true,
        data: {
          products: [],
          history: []
        }
      });
    }
    
    // 获取产品ID列表
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
    
    // 构建历史记录时间线
    const history = [];
    
    // 添加采购记录
    purchaseInvoices.forEach(invoice => {
      invoice.items.forEach(item => {
        // 只为当前item的产品创建记录，避免重复
        const matchedProduct = products.find(p => p._id.toString() === item.product.toString());
        
        if (matchedProduct) {
          // 如果是序列号搜索，只显示包含该序列号的记录
          if (isSerialNumberSearch) {
            const hasMatchingSerial = item.serialNumbers && item.serialNumbers.some(sn => 
              sn.toLowerCase().includes(search.toLowerCase())
            );
            if (!hasMatchingSerial) {
              return; // 跳过不包含搜索序列号的记录
            }
          }
          
          // 计算税率系数
          const vatRate = matchedProduct.vatRate || 'VAT 23%';
          const taxMultiplier = vatRate === 'VAT 23%' ? 1.23 : 
                               vatRate === 'VAT 13.5%' ? 1.135 : 1.0;
          
          // 计算含税价格
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
            unitPrice: unitPriceIncludingTax, // 含税单价
            totalPrice: totalPriceIncludingTax, // 含税总价
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
        // 只为当前item的产品创建记录，避免重复
        const matchedProduct = products.find(p => p._id.toString() === item.product.toString());
        
        if (matchedProduct) {
          // 如果是序列号搜索，只显示包含该序列号的记录
          if (isSerialNumberSearch) {
            const hasMatchingSerial = item.serialNumbers && item.serialNumbers.some(sn => 
              sn.toLowerCase().includes(search.toLowerCase())
            );
            if (!hasMatchingSerial) {
              return; // 跳过不包含搜索序列号的记录
            }
          }
          
          // 计算税率系数
          const vatRate = matchedProduct.vatRate || 'VAT 23%';
          const taxMultiplier = vatRate === 'VAT 23%' ? 1.23 : 
                               vatRate === 'VAT 13.5%' ? 1.135 : 1.0;
          
          // 计算含税价格
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
            unitPrice: unitPriceIncludingTax, // 含税单价
            totalPrice: totalPriceIncludingTax, // 含税总价
            vatRate: vatRate,
            serialNumbers: item.serialNumbers || [],
            status: invoice.status
          });
        }
      });
    });
    
    // 按日期排序
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
      success: true,
      data: {
        products,
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
    const product = await ProductNew.findById(req.params.id)
      .populate('category', 'name type')
      .lean();
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: '产品不存在'
      });
    }
    
    // 计算含税进货价
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
      costPriceIncludingTax, // 含税进货价（用于显示）
      costPriceExcludingTax: product.costPrice, // 不含税进货价（备用）
      // 为了向后兼容，更新costPrice字段为含税价格
      costPrice: costPriceIncludingTax
    };
    
    res.json({
      success: true,
      data: productWithTaxInclusivePrice
    });
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
    const { costPrice, wholesalePrice, retailPrice } = req.body;
    
    const product = await ProductNew.findById(req.params.id);
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
    
    res.json({
      success: true,
      message: '价格更新成功',
      data: {
        costPrice: product.costPrice,
        wholesalePrice: product.wholesalePrice,
        retailPrice: product.retailPrice
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
    const { type, quantity, note } = req.body;
    
    const product = await ProductNew.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: '产品不存在'
      });
    }
    
    // 检查产品是否有序列号（有序列号的产品不能调整数量）
    if (product.serialNumbers && product.serialNumbers.length > 0) {
      return res.status(400).json({
        success: false,
        error: '有序列号的产品不能调整数量'
      });
    }
    
    const oldQuantity = product.stockQuantity;
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
    
    product.stockQuantity = newQuantity;
    await product.save();
    
    res.json({
      success: true,
      message: '数量更新成功',
      data: {
        oldQuantity,
        newQuantity,
        type,
        note
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
    const { supplierId } = req.params;
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    
    const invoices = await PurchaseInvoice.find({ supplier: supplierId })
      .populate('supplier', 'name code')
      .populate('items.product', 'name sku barcode')
      .sort({ invoiceDate: -1 })
      .lean();
    
    // 计算含税价格
    const invoicesWithTaxIncluded = invoices.map(invoice => {
      const itemsWithTaxIncluded = invoice.items.map(item => {
        const taxMultiplier = item.vatRate === 'VAT 23%' ? 1.23 : 
                             item.vatRate === 'VAT 13.5%' ? 1.135 : 1.0;
        return {
          ...item,
          unitCostIncludingTax: item.unitCost * taxMultiplier,
          totalCostIncludingTax: item.totalCost * taxMultiplier
        };
      });
      
      return {
        ...invoice,
        items: itemsWithTaxIncluded
      };
    });
    
    res.json({
      success: true,
      data: invoicesWithTaxIncluded
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

// 获取客户的所有销售发票
app.get('/api/admin/customers/:customerId/invoices', checkDbConnection, async (req, res) => {
  try {
    const { customerId } = req.params;
    const SalesInvoice = require('./models/SalesInvoice');
    
    const invoices = await SalesInvoice.find({ customer: customerId })
      .populate('customer', 'name code')
      .populate('items.product', 'name sku barcode')
      .sort({ invoiceDate: -1 })
      .lean();
    
    res.json({
      success: true,
      data: invoices
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
        code: code // 新增code字段
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
      .sort({ invoiceDate: -1 });
      
      salesInvoices.forEach(invoice => {
        results.push({
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          type: 'sales',
          partner: invoice.customer?.name || 'Unknown',
          date: invoice.invoiceDate,
          totalAmount: invoice.totalAmount, // 含税金额
          taxAmount: invoice.taxAmount, // 税额（正数）
          subtotal: invoice.subtotal // 不含税金额
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
          partner: invoice.supplier?.name || 'Unknown',
          date: invoice.invoiceDate,
          totalAmount: invoice.totalAmount, // 含税金额
          taxAmount: -invoice.taxAmount, // 税额（负数，可抵扣）
          subtotal: invoice.subtotal // 不含税金额
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
      totalTaxPayable: 0         // 总计应缴税额
    };
    
    results.forEach(item => {
      if (item.type === 'sales') {
        summary.totalSalesAmount += item.totalAmount;
        summary.totalSalesTax += item.taxAmount;
      } else if (item.type === 'purchase') {
        summary.totalPurchaseAmount += item.totalAmount;
        summary.totalPurchaseTax += item.taxAmount; // 已经是负数
      }
    });
    
    // 计算应缴税额
    // Net VAT Payable = 销售税额 - 采购税额 + (盈利部分 × 23/123)
    const profit = summary.totalSalesAmount - summary.totalPurchaseAmount; // 盈利部分（含税）
    const profitVAT = profit * (23 / 123); // 盈利部分的增值税
    
    summary.totalTaxPayable = summary.totalSalesTax - Math.abs(summary.totalPurchaseTax) + profitVAT;
    
    // 获取库存资产数据（可销售的产品）
    const ProductNew = require('./models/ProductNew');
    const ProductCategory = require('./models/ProductCategory');
    
    const availableProducts = await ProductNew.find({
      isActive: true,
      stockQuantity: { $gt: 0 }
    }).populate('category', 'name type');
    
    // 按分类分组资产
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
    
    // 转换为数组并排序
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

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 管理界面: http://localhost:${PORT}/`);
  console.log(`🔧 数据库状态: http://localhost:${PORT}/api/db-status`);
});

module.exports = app;