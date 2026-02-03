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
    const { category, search } = req.query;
    
    let query = { 
      isActive: true,
      quantity: { $gt: 0 }  // 只显示有库存的产品
    };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { sku: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { model: new RegExp(search, 'i') }
      ];
    }
    
    const products = await ProductNew.find(query)
      .select('name sku brand model category quantity costPrice wholesalePrice retailPrice')
      .sort({ category: 1, name: 1 });
    
    res.json({
      success: true,
      data: products
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
    const { productId } = req.params;
    
    // 获取该产品
    const baseProduct = await ProductNew.findById(productId);
    
    if (!baseProduct) {
      return res.status(404).json({ success: false, error: '产品不存在' });
    }
    
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
          quantity: 1
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
          quantity: availableQuantity
        }]
      });
    }
    
    // 没有可用库存
    res.json({
      success: true,
      data: []
    });
    
  } catch (error) {
    console.error('获取可用产品失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 商户端：创建仓库订单
app.post('/api/warehouse/orders', applyDataIsolation, async (req, res) => {
  try {
    const WarehouseOrder = require('./models/WarehouseOrder');
    const ProductNew = require('./models/ProductNew');
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
      const product = await ProductNew.findById(item.productId);
      
      if (!product) {
        return res.status(400).json({ 
          success: false, 
          error: `产品不存在: ${item.productId}` 
        });
      }
      
      if (product.quantity < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `${product.name} 库存不足，当前库存: ${product.quantity}` 
        });
      }
      
      // 批发价是含税价格
      const itemTotal = product.wholesalePrice * item.quantity;
      
      // 从 vatRate 获取税务分类
      let taxClassification = 'VAT_23';
      if (product.vatRate === 'VAT 23%') {
        taxClassification = 'VAT_23';
      } else if (product.vatRate === 'VAT 13.5%' || product.vatRate === 'Service VAT 13.5%') {
        taxClassification = 'SERVICE_VAT_13_5';
      } else if (product.vatRate === 'VAT 0%' || product.vatRate === 'Margin VAT') {
        taxClassification = 'MARGIN_VAT_0';
      }
      
      // 计算税额
      let itemTaxAmount = 0;
      let itemSubtotal = 0;
      
      if (taxClassification === 'VAT_23') {
        // VAT 23%: 税额 = 总价 × 23/123
        itemTaxAmount = itemTotal * (23 / 123);
        itemSubtotal = itemTotal - itemTaxAmount;
      } else if (taxClassification === 'SERVICE_VAT_13_5') {
        // Service VAT 13.5%: 税额 = 总价 × 13.5/113.5
        itemTaxAmount = itemTotal * (13.5 / 113.5);
        itemSubtotal = itemTotal - itemTaxAmount;
      } else if (taxClassification === 'MARGIN_VAT_0') {
        // Margin VAT: 税额 = (卖价 - 成本价) × 23/123
        const costPrice = product.costPrice || 0;
        const margin = itemTotal - (costPrice * item.quantity);
        itemTaxAmount = margin * (23 / 123);
        itemSubtotal = itemTotal - itemTaxAmount;
      } else {
        // VAT_0 或其他
        itemTaxAmount = 0;
        itemSubtotal = itemTotal;
      }
      
      totalAmount += itemTotal;
      subtotalAmount += itemSubtotal;
      totalTaxAmount += itemTaxAmount;
      
      orderItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        brand: product.brand,
        model: product.model,
        quantity: item.quantity,
        wholesalePrice: product.wholesalePrice,
        subtotal: itemTotal,
        taxClassification: taxClassification,
        taxAmount: itemTaxAmount
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
    
    // 预留库存：扣减仓库产品数量
    for (const item of items) {
      const product = await ProductNew.findById(item.productId);
      if (product) {
        product.quantity -= item.quantity;
        await product.save();
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
    
    const order = await WarehouseOrder.findById(req.params.id)
      .populate('items.productId');
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: '订单不存在' 
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({ success: false, error: error.message });
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
    
    const order = await WarehouseOrder.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, error: '订单不存在' });
    }
    
    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, error: '订单状态不正确' });
    }
    
    // 检查库存
    for (const item of order.items) {
      const product = await ProductNew.findById(item.productId);
      if (!product || product.quantity < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `${item.productName} 库存不足` 
        });
      }
    }
    
    // 更新订单状态
    order.status = 'confirmed';
    order.confirmedAt = new Date();
    order.confirmedBy = req.body.confirmedBy || 'warehouse';
    
    await order.save();
    
    res.json({
      success: true,
      data: order,
      message: '订单已确认'
    });
  } catch (error) {
    console.error('确认订单失败:', error);
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
    const WarehouseOrder = require('./models/WarehouseOrder');
    const ProductNew = require('./models/ProductNew');
    const MerchantInventory = require('./models/MerchantInventory');
    
    const order = await WarehouseOrder.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, error: '订单不存在' });
    }
    
    if (order.status !== 'shipped') {
      return res.status(400).json({ success: false, error: '订单必须先发货' });
    }
    
    // 验证是否是订单的商户
    if (order.merchantId !== req.currentUsername) {
      return res.status(403).json({ success: false, error: '无权操作此订单' });
    }
    
    let shipmentItems = order.shipmentDetails || [];
    
    // 兼容性处理：如果是旧订单（没有 shipmentDetails），生成默认的发货信息
    if (shipmentItems.length === 0) {
      console.log(`⚠️  旧订单 ${order.orderNumber} 没有 shipmentDetails，生成默认发货信息`);
      
      // 为每个订单项目生成默认的发货信息
      for (const item of order.items) {
        const product = await ProductNew.findById(item.productId).populate('category', 'name type');
        
        if (!product) {
          return res.status(400).json({ 
            success: false, 
            error: `产品不存在: ${item.productName}` 
          });
        }
        
        // 判断是设备还是配件
        const isDevice = product.serialNumbers && product.serialNumbers.length > 0;
        
        if (isDevice) {
          // 设备：选择可用的序列号
          const availableSerialNumbers = product.serialNumbers
            .filter(sn => sn.status === 'available')
            .slice(0, item.quantity);
          
          if (availableSerialNumbers.length < item.quantity) {
            return res.status(400).json({ 
              success: false, 
              error: `${item.productName} 可用库存不足，需要 ${item.quantity} 台，只有 ${availableSerialNumbers.length} 台可用` 
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
              error: `${item.productName} 库存不足，需要 ${item.quantity} 件，只有 ${product.stockQuantity} 件可用` 
            });
          }
          
          shipmentItems.push({
            isDevice: false,
            quantity: item.quantity
          });
        }
      }
      
      console.log(`✅ 为旧订单生成了 ${shipmentItems.length} 个发货项目`);
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
        
        const product = await ProductNew.findById(orderItem.productId).populate('category', 'name type');
        
        if (!product) {
          return res.status(400).json({ 
            success: false, 
            error: `产品不存在: ${orderItem.productName}` 
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
          const merchantInventory = new MerchantInventory({
            merchantId: order.merchantId,
            merchantName: order.merchantName,
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
            costPrice: product.costPrice,
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
        
        const product = await ProductNew.findById(orderItem.productId).populate('category', 'name type');
        
        if (!product) {
          return res.status(400).json({ 
            success: false, 
            error: `产品不存在: ${orderItem.productName}` 
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
        
        // 创建商户库存记录
        for (let j = 0; j < quantity; j++) {
          const merchantInventory = new MerchantInventory({
            merchantId: order.merchantId,
            merchantName: order.merchantName,
            productId: product._id,
            productName: product.name,
            brand: product.brand,
            model: product.model,
            category: categoryName,
            quantity: 1,
            costPrice: product.costPrice,
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
        }
        
        // 扣减配件库存
        product.stockQuantity -= quantity;
        
        // 如果库存为 0，标记为不活跃
        if (product.stockQuantity <= 0) {
          product.stockQuantity = 0;
          product.isActive = false;
        }
        
        await product.save();
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
    for (const item of order.items) {
      const product = await ProductNew.findById(item.productId);
      if (product) {
        product.quantity += item.quantity;
        await product.save();
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
      
      warehouseOrders.forEach(order => {
        results.push({
          _id: order._id,
          invoiceNumber: order.orderNumber,
          type: 'sales',
          subType: 'wholesale', // 批发
          partner: order.merchantName || order.merchantId,
          date: order.completedAt,
          totalAmount: order.totalAmount, // 批发价（含税）
          taxAmount: order.taxAmount || 0, // 税额
          subtotal: order.subtotal || order.totalAmount // 不含税金额
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
          subType: 'external', // 外部采购
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
          partner: order.merchantName || order.merchantId,
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
    const { id } = req.params;
    const { username, email, role, profile, retailInfo, isActive, password } = req.body;
    
    const user = await UserNew.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    
    // 更新基本信息
    if (username) user.username = username;
    if (email) user.email = email;
    if (role) {
      user.role = role;
      user.setDefaultPermissions(); // 重新设置权限
    }
    if (profile) user.profile = { ...user.profile, ...profile };
    if (retailInfo) user.retailInfo = { ...user.retailInfo, ...retailInfo };
    if (typeof isActive !== 'undefined') user.isActive = isActive;
    
    // 如果提供了新密码，更新密码
    if (password && password.trim()) {
      user.password = password;
    }
    
    await user.save();
    
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

// 获取所有群组
app.get('/api/admin/store-groups', async (req, res) => {
  try {
    const StoreGroup = require('./models/StoreGroup');
    const groups = await StoreGroup.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });
    
    // 统计每个群组的用户数量
    const UserNew = require('./models/UserNew');
    const groupsWithStats = await Promise.all(groups.map(async (group) => {
      const userCount = await UserNew.countDocuments({ 
        'retailInfo.storeGroup': group._id,
        isActive: true 
      });
      
      return {
        ...group.toObject(),
        userCount
      };
    }));
    
    res.json({ success: true, data: groupsWithStats });
  } catch (error) {
    console.error('获取群组列表失败:', error);
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
    
    const group = await StoreGroup.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, error: '群组不存在' });
    }
    
    // 更新信息
    if (name) group.name = name;
    if (code) group.code = code.toUpperCase();
    if (description !== undefined) group.description = description;
    if (headquarters) group.headquarters = { ...group.headquarters, ...headquarters };
    if (settings) group.settings = { ...group.settings, ...settings };
    if (typeof isActive !== 'undefined') group.isActive = isActive;
    
    await group.save();
    
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
    let query = { 
      ...req.dataFilter, 
      status: 'active',
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

// 获取群组库存列表（群组页面专用）
app.get('/api/merchant/group-inventory', applyGroupDataFilter, async (req, res) => {
  try {
    const MerchantInventory = require('./models/MerchantInventory');
    const { category, search } = req.query;
    
    // 基础过滤条件（来自中间件，查询群组数据）
    let query = { 
      ...req.dataFilter, 
      status: 'active',
      isActive: true,
      quantity: { $gt: 0 } // 只显示有库存的产品
    };
    
    // 排除当前用户自己的库存（只显示群组内其他商户的库存）
    if (req.currentUsername) {
      query.merchantId = { $ne: req.currentUsername };
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
    
    // 查询群组的库存
    const inventory = await MerchantInventory.find(query)
      .sort({ createdAt: -1 });
    
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
    
    // 2. 查找销售记录
    const sales = await MerchantSale.find({
      'items.inventoryId': inventoryId,
      status: 'completed'
    }).sort({ saleDate: 1 });
    
    sales.forEach(sale => {
      const saleItem = sale.items.find(item => item.inventoryId && item.inventoryId.toString() === inventoryId);
      if (saleItem) {
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
                    调货价格: €${transferItem.transferPrice.toFixed(2)}`
        });
      }
    });
    
    // 4. 查找调货记录（调入）
    if (inventory.source === 'transfer' && inventory.sourceTransferId) {
      const transferIn = await InventoryTransfer.findById(inventory.sourceTransferId);
      if (transferIn) {
        timeline.push({
          type: 'transferred_in',
          icon: '📥',
          title: '调货入库',
          date: transferIn.completedAt,
          description: `从其他商户调入`,
          details: `调货单号: ${transferIn.transferNumber}<br>
                    调出商户: ${transferIn.fromMerchantName}<br>
                    调货价格: €${inventory.costPrice.toFixed(2)}`
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
      totalAmount: sale.totalAmount,
      totalTax: sale.totalTax,
      items: sale.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        costPrice: item.costPrice,
        taxClassification: item.taxClassification,
        taxAmount: item.taxAmount,
        serialNumber: item.serialNumber
      })),
      status: sale.status
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
    const { id } = req.params;
    
    const result = await RepairOrder.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '维修订单不存在'
      });
    }
    
    res.json({
      success: true,
      message: '维修订单已删除'
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

// 生成税务报表
app.get('/api/merchant/tax-report', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || 'merchant_001';
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: '需要提供开始日期和结束日期' 
      });
    }
    
    // 返回空报表数据
    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        dailySales: [],
        summary: {
          totalSales: 0,
          totalCashIncome: 0,
          totalCardIncome: 0,
          totalTaxDue: 0
        },
        taxByClassification: {
          VAT_23: { sales: 0, cost: 0, outputTax: 0, inputTax: 0, due: 0 },
          MARGIN_VAT_0: { sales: 0, cost: 0, due: 0 },
          SERVICE_VAT_13_5: { sales: 0, due: 0 }
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取仓库可订购产品列表（批发商订货用）
app.get('/api/merchant/warehouse-products', async (req, res) => {
  try {
    // 获取仓库中可销售的产品
    const products = await ProductNew.find({ 
      isActive: true,
      stockQuantity: { $gt: 0 }
    })
    .populate('category', 'name type')
    .sort({ createdAt: -1 });
    
    // 按产品类型、品牌、型号、颜色分组
    const groupedProducts = {};
    
    products.forEach(product => {
      // 创建更详细的分组 key，包含品牌、型号和颜色
      const key = `${product.category?.type || 'Unknown'}_${product.brand || ''}_${product.model || ''}_${product.color || ''}_${product.condition}`;
      
      if (!groupedProducts[key]) {
        groupedProducts[key] = {
          productType: product.category?.type || 'Unknown',
          category: product.condition,
          brand: product.brand || '',
          model: product.model || '',
          color: product.color || '',
          products: [],
          totalAvailable: 0,
          wholesalePrice: product.wholesalePrice || product.costPrice,
          suggestedRetailPrice: product.retailPrice,
          taxClassification: product.vatRate === 'VAT 23%' ? 'VAT_23' : 
                            product.vatRate === 'VAT 13.5%' ? 'SERVICE_VAT_13_5' : 'MARGIN_VAT_0'
        };
      }
      
      groupedProducts[key].products.push(product);
      groupedProducts[key].totalAvailable += product.stockQuantity;
    });
    
    res.json({
      success: true,
      data: Object.values(groupedProducts)
    });
  } catch (error) {
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
          
          // 使用批发价作为成本价（批发价就是商户的采购成本）
          const costPrice = inventory.wholesalePrice || inventory.costPrice;
          
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
            serialNumber: item.serialNumber || null
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
        totalAmount,
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
      
      if (inventory.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `${inventory.productName} 库存不足`
        });
      }
      
      transferItems.push({
        inventoryId: inventory._id,
        productName: inventory.productName,
        brand: inventory.brand,
        model: inventory.model,
        category: inventory.category,
        quantity: item.quantity,
        transferPrice: item.transferPrice || inventory.wholesalePrice,
        barcode: inventory.barcode,
        serialNumber: inventory.serialNumber,
        color: inventory.color,
        condition: inventory.condition
      });
      
      totalAmount += item.quantity * (item.transferPrice || inventory.wholesalePrice);
    }
    
    // 生成调货单号
    const transferNumber = await InventoryTransfer.generateTransferNumber();
    
    // 创建调货记录
    const transfer = new InventoryTransfer({
      transferNumber,
      fromMerchant: fromMerchantId,
      fromMerchantName: fromUser.fullName || fromMerchantId,
      fromStore: fromUser.retailInfo?.store,
      toMerchant: toMerchantId,
      toMerchantName: toUser.fullName || toMerchantId,
      toStore: toUser.retailInfo?.store,
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
        status: transfer.status,
        message: '调货申请已提交，等待对方审批'
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

// 审批调货请求
app.post('/api/merchant/inventory/transfer/approve', async (req, res) => {
  try {
    const InventoryTransfer = require('./models/InventoryTransfer');
    const UserNew = require('./models/UserNew');
    
    const { transferId, action, notes, merchantId } = req.body;
    
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
      transfer.status = 'approved';
      transfer.approvedBy = user._id;
      transfer.approvedAt = new Date();
      transfer.approvalNotes = notes || '';
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
    
    const { transferId, merchantId } = req.body;
    
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
    
    // 使用事务处理库存变更
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const user = await UserNew.findOne({ username: merchantId });
      
      // 处理每个产品
      for (const item of transfer.items) {
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
          costPrice: item.transferPrice,
          wholesalePrice: item.transferPrice * 1.1,
          retailPrice: item.transferPrice * 1.3,
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
      
      res.json({
        success: true,
        data: {
          transferId: transfer._id,
          status: transfer.status,
          message: '调货完成，库存已更新'
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