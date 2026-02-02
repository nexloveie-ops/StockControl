const express = require('express');
const router = express.Router();

// 导入控制器
const categoryController = require('../controllers/admin/categoryController');
const productController = require('../controllers/admin/productController');
const supplierController = require('../controllers/admin/supplierController');
const userController = require('../controllers/admin/userController');
const storeController = require('../controllers/admin/storeController');
const inventoryController = require('../controllers/admin/inventoryController');

// 临时中间件（简化版，生产环境需要真正的认证）
const tempAuth = (req, res, next) => {
  req.user = { id: '000000000000000000000000', role: 'admin' };
  next();
};

// ==================== 兼容旧版前端的API ====================
router.get('/stats', async (req, res) => {
  try {
    const ProductNew = require('../models/ProductNew');
    const UserNew = require('../models/UserNew');
    const SupplierNew = require('../models/SupplierNew');
    const PurchaseInvoice = require('../models/PurchaseInvoice');
    
    const stats = {
      totalProducts: await ProductNew.countDocuments({ isActive: true }),
      availableProducts: await ProductNew.countDocuments({ isActive: true, stockQuantity: { $gt: 0 } }),
      totalUsers: await UserNew.countDocuments({ isActive: true }),
      totalSuppliers: await SupplierNew.countDocuments({ isActive: true }),
      totalInvoices: await PurchaseInvoice.countDocuments(),
      totalOrders: 0, // 暂时设为0
      productsByCategory: {
        accessories: await ProductNew.countDocuments({ isActive: true, condition: 'Brand New' }),
        newDevices: await ProductNew.countDocuments({ isActive: true, condition: 'Brand New' }),
        usedDevices: await ProductNew.countDocuments({ isActive: true, condition: 'Pre-Owned' })
      }
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 产品列表 - 兼容前端格式
router.get('/products', async (req, res) => {
  try {
    const ProductNew = require('../models/ProductNew');
    const { category, status, search } = req.query;
    
    let query = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { sku: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { model: new RegExp(search, 'i') },
        { barcode: new RegExp(search, 'i') }
      ];
    }
    
    const products = await ProductNew.find(query)
      .populate('category', 'name type')
      .sort({ createdAt: -1 });
    
    // 转换为前端期望的格式
    const transformedProducts = products.map(product => {
      // 计算税额
      let taxRate = 0;
      if (product.vatRate === 'VAT 23%') taxRate = 0.23;
      else if (product.vatRate === 'VAT 13.5%') taxRate = 0.135;
      
      const purchaseTax = product.costPrice * taxRate / (1 + taxRate);
      const purchasePriceExTax = product.costPrice - purchaseTax;
      
      return {
        _id: product._id,
        name: product.name,
        category: product.category?.type === '手机配件' ? 'ACCESSORY' : 
                 product.category?.type === '全新设备' ? 'NEW_DEVICE' : 
                 product.condition === 'Pre-Owned' ? 'USED_DEVICE' : 'NEW_DEVICE',
        barcode: product.barcode || '',
        serialNumber: product.serialNumbers?.[0]?.serialNumber || '',
        quantity: product.stockQuantity,
        purchasePrice: purchasePriceExTax || 0,
        suggestedRetailPrice: product.retailPrice || 0,
        wholesalePrice: product.costPrice || 0,
        taxClassification: product.vatRate === 'VAT 23%' ? 'VAT_23' : 
                          product.vatRate === 'VAT 13.5%' ? 'SERVICE_VAT_13_5' : 'MARGIN_VAT_0',
        status: product.stockQuantity > 0 ? 'AVAILABLE' : 'SOLD',
        warehouseLocation: product.specifications?.get('location') || 'A1-01',
        conditionGrade: product.condition === 'Pre-Owned' ? 'B' : 'A'
      };
    });
    
    res.json({ success: true, data: transformedProducts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 销售发票 - 创建模拟数据
router.get('/invoices', async (req, res) => {
  try {
    // 创建模拟销售发票数据
    const mockInvoices = [
      {
        invoiceNumber: 'SI-2026-001',
        customer: {
          name: '张三',
          customerType: 'RETAIL'
        },
        subtotal: 199.99,
        discountPercent: 5,
        discountAmount: 10.00,
        taxAmount: 43.80,
        totalAmount: 233.79,
        status: 'PAID',
        createdAt: new Date('2026-01-28')
      },
      {
        invoiceNumber: 'SI-2026-002',
        customer: {
          name: '李四电子商店',
          customerType: 'WHOLESALE'
        },
        subtotal: 1299.99,
        discountPercent: 10,
        discountAmount: 130.00,
        taxAmount: 268.80,
        totalAmount: 1438.79,
        status: 'PENDING',
        createdAt: new Date('2026-01-30')
      },
      {
        invoiceNumber: 'SI-2026-003',
        customer: {
          name: '王五',
          customerType: 'RETAIL'
        },
        subtotal: 25.99,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount: 5.98,
        totalAmount: 31.97,
        status: 'PAID',
        createdAt: new Date('2026-02-01')
      }
    ];
    
    res.json({ success: true, data: mockInvoices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 采购订单 - 创建模拟数据
router.get('/purchase-orders', async (req, res) => {
  try {
    const SupplierNew = require('../models/SupplierNew');
    const suppliers = await SupplierNew.find({ isActive: true }).limit(2);
    
    const mockOrders = [
      {
        orderNumber: 'PO-2026-001',
        supplier: suppliers[0]?.name || 'TechSource Ltd',
        totalAmount: 2500.00,
        status: 'CONFIRMED',
        orderDate: new Date('2026-01-25'),
        trackingNumber: 'TRK123456789',
        createdAt: new Date('2026-01-25')
      },
      {
        orderNumber: 'PO-2026-002',
        supplier: suppliers[1]?.name || 'Mobile Parts Pro',
        totalAmount: 1800.00,
        status: 'PENDING',
        orderDate: new Date('2026-01-28'),
        trackingNumber: 'TRK987654321',
        createdAt: new Date('2026-01-28')
      },
      {
        orderNumber: 'PO-2026-003',
        supplier: suppliers[0]?.name || 'TechSource Ltd',
        totalAmount: 5200.00,
        status: 'DELIVERED',
        orderDate: new Date('2026-01-20'),
        trackingNumber: 'TRK456789123',
        createdAt: new Date('2026-01-20')
      }
    ];
    
    res.json({ success: true, data: mockOrders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 销售管理API ====================
// 获取可销售产品
router.get('/sales/available-products', async (req, res) => {
  try {
    const ProductNew = require('../models/ProductNew');
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
router.get('/sales/customers', async (req, res) => {
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
router.post('/sales/create-invoice', async (req, res) => {
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
router.post('/sales/finalize-invoice/:invoiceId', async (req, res) => {
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

// ==================== 产品分类管理 ====================
router.get('/categories', categoryController.getCategories);
router.post('/categories', categoryController.createCategory);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

// ==================== 产品管理 ====================
router.get('/products-admin', productController.getProducts);
router.get('/products-admin/:id', productController.getProduct);
router.post('/products-admin', productController.createProduct);
router.put('/products-admin/:id', productController.updateProduct);
router.delete('/products-admin/:id', productController.deleteProduct);

// ==================== 供应商管理 ====================
router.get('/suppliers', supplierController.getSuppliers);
router.get('/suppliers/:id', supplierController.getSupplier);
router.post('/suppliers', supplierController.createSupplier);
router.put('/suppliers/:id', supplierController.updateSupplier);
router.delete('/suppliers/:id', supplierController.deleteSupplier);
router.get('/suppliers/:id/invoices', supplierController.getSupplierInvoices);

// ==================== 用户管理 ====================
router.get('/users', userController.getUsers);
router.get('/users/:id', userController.getUser);
router.post('/users', userController.createUser);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);
router.put('/users/:id/permissions', userController.updateUserPermissions);
router.put('/users/:id/status', userController.updateUserStatus);

// ==================== 店面管理 ====================
router.get('/store-groups', storeController.getStoreGroups);
router.post('/store-groups', storeController.createStoreGroup);
router.put('/store-groups/:id', storeController.updateStoreGroup);
router.delete('/store-groups/:id', storeController.deleteStoreGroup);

router.get('/stores', storeController.getStores);
router.get('/stores/:id', storeController.getStore);
router.post('/stores', storeController.createStore);
router.put('/stores/:id', storeController.updateStore);
router.delete('/stores/:id', storeController.deleteStore);

// ==================== 库存管理 ====================
router.get('/inventory', inventoryController.getInventoryOverview);
router.get('/inventory/low-stock', inventoryController.getLowStockItems);
router.get('/inventory/store/:storeId', inventoryController.getStoreInventory);
router.post('/inventory/adjust', inventoryController.adjustInventory);
router.post('/inventory/transfer', inventoryController.transferInventory);

// ==================== 统计报表 ====================
router.get('/stats/dashboard', require('../controllers/admin/statsController').getDashboardStats);
router.get('/stats/products', require('../controllers/admin/statsController').getProductStats);
router.get('/stats/inventory', require('../controllers/admin/statsController').getInventoryStats);
router.get('/stats/suppliers', require('../controllers/admin/statsController').getSupplierStats);

module.exports = router;