const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 数据库连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/3c-product-system';

let isDbConnected = false;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB 连接成功');
    isDbConnected = true;
  })
  .catch(err => {
    console.error('❌ MongoDB 连接失败:', err.message);
    console.log('📝 应用将在无数据库模式下运行');
    console.log('💡 要连接数据库，请：');
    console.log('   1. 安装本地MongoDB，或');
    console.log('   2. 设置MongoDB Atlas云数据库');
    console.log('   3. 更新.env文件中的MONGODB_URI');
    isDbConnected = false;
  });

// 数据库状态检查中间件
const checkDbConnection = (req, res, next) => {
  if (!isDbConnected) {
    return res.status(503).json({
      success: false,
      error: '数据库未连接',
      message: '请配置MongoDB连接后重试',
      setup_guide: {
        local: '安装MongoDB Community Server',
        cloud: '使用MongoDB Atlas (https://www.mongodb.com/atlas)',
        config: '更新.env文件中的MONGODB_URI'
      }
    });
  }
  next();
};

// 导入模型
const Product3C = require('./models/Product3C');
const User3C = require('./models/User3C');
const Supplier3C = require('./models/Supplier3C');
const SalesInvoice = require('./models/SalesInvoice');
const PurchaseOrder = require('./models/PurchaseOrder');

// ============ API 路由 ============

// ============ 产品分组统计 ============

// 获取产品分组列表
app.get('/api/products/groups', checkDbConnection, async (req, res) => {
  try {
    const products = await Product3C.find();
    
    // 按productType分组
    const groups = {};
    
    products.forEach(product => {
      const key = `${product.productType}_${product.category}`;
      
      if (!groups[key]) {
        groups[key] = {
          productType: product.productType,
          category: product.category,
          products: [],
          productIds: [],
          totalStock: 0,
          availableStock: 0,
          totalValue: 0
        };
      }
      
      groups[key].products.push(product);
      groups[key].productIds.push(product._id);
      
      if (product.category === 'ACCESSORY') {
        groups[key].totalStock += product.quantity;
        if (product.status === 'AVAILABLE') {
          groups[key].availableStock += product.quantity;
        }
        groups[key].totalValue += product.purchasePrice * product.quantity;
      } else {
        groups[key].totalStock += 1;
        if (product.status === 'AVAILABLE') {
          groups[key].availableStock += 1;
        }
        groups[key].totalValue += product.purchasePrice;
      }
    });
    
    // 计算销量数据
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentInvoices = await SalesInvoice.find({
      status: 'FINALIZED',
      finalizedAt: { $gte: thirtyDaysAgo }
    });
    
    // 转换为数组并添加统计信息
    const groupArray = await Promise.all(Object.values(groups).map(async group => {
      // 计算最近进货（最新的采购日期）
      const latestProcurement = group.products.reduce((latest, p) => {
        return !latest || new Date(p.procurementDate) > new Date(latest) 
          ? p.procurementDate 
          : latest;
      }, null);
      
      // 计算平均价格
      const avgPurchasePrice = group.products.reduce((sum, p) => sum + p.purchasePrice, 0) / group.products.length;
      const avgRetailPrice = group.products.reduce((sum, p) => sum + p.suggestedRetailPrice, 0) / group.products.length;
      
      // 计算该分组的30天销量
      let last30DaysSales = 0;
      recentInvoices.forEach(invoice => {
        invoice.lineItems.forEach(item => {
          if (group.productIds.some(id => id.equals(item.productId))) {
            last30DaysSales += item.quantity;
          }
        });
      });
      
      // 预计销售时间（月）
      const estimatedMonths = group.availableStock > 0 && last30DaysSales > 0
        ? (group.availableStock / last30DaysSales).toFixed(1)
        : 'N/A';
      
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
        last30DaysSales,
        estimatedMonths
      };
    }));
    
    res.json({ success: true, data: groupArray });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取产品分组详情
app.get('/api/products/group-details', async (req, res) => {
  try {
    const { productType, category } = req.query;
    
    if (!productType || !category) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少productType或category参数' 
      });
    }
    
    const products = await Product3C.find({ 
      productType, 
      category 
    }).populate('supplier', 'name');
    
    if (products.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '未找到产品' 
      });
    }
    
    // 计算统计信息
    let totalStock = 0;
    let availableStock = 0;
    let totalValue = 0;
    
    products.forEach(product => {
      if (category === 'ACCESSORY') {
        totalStock += product.quantity;
        if (product.status === 'AVAILABLE') {
          availableStock += product.quantity;
        }
        totalValue += product.purchasePrice * product.quantity;
      } else {
        totalStock += 1;
        if (product.status === 'AVAILABLE') {
          availableStock += 1;
        }
        totalValue += product.purchasePrice;
      }
    });
    
    // 最近进货日期
    const latestProcurement = products.reduce((latest, p) => {
      return !latest || new Date(p.procurementDate) > new Date(latest) 
        ? p.procurementDate 
        : latest;
    }, null);
    
    // 计算当月实际销量（从销售发票中统计）
    const productIds = products.map(p => p._id);
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyInvoices = await SalesInvoice.find({
      status: 'FINALIZED',
      finalizedAt: { $gte: firstDayOfMonth }
    });
    
    let monthlySales = 0;
    monthlyInvoices.forEach(invoice => {
      invoice.lineItems.forEach(item => {
        if (productIds.some(id => id.equals(item.productId))) {
          monthlySales += item.quantity;
        }
      });
    });
    
    // 计算过去30天的销量（用于更准确的预测）
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentInvoices = await SalesInvoice.find({
      status: 'FINALIZED',
      finalizedAt: { $gte: thirtyDaysAgo }
    });
    
    let last30DaysSales = 0;
    recentInvoices.forEach(invoice => {
      invoice.lineItems.forEach(item => {
        if (productIds.some(id => id.equals(item.productId))) {
          last30DaysSales += item.quantity;
        }
      });
    });
    
    // 预计销售时间（月）- 使用过去30天的平均销量
    const avgMonthlySales = last30DaysSales > 0 ? last30DaysSales : 1;
    const estimatedMonths = availableStock > 0 && avgMonthlySales > 0
      ? (availableStock / avgMonthlySales).toFixed(1)
      : 'N/A';
    
    res.json({ 
      success: true, 
      data: {
        productType,
        category,
        products,
        statistics: {
          totalStock,
          availableStock,
          totalValue,
          latestProcurement,
          monthlySales,
          last30DaysSales,
          estimatedMonths,
          productCount: products.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 产品相关
app.get('/api/products', async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let query = {};
    
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { barcode: new RegExp(search, 'i') },
        { serialNumber: new RegExp(search, 'i') }
      ];
    }
    
    const products = await Product3C.find(query)
      .populate('supplier', 'name')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product3C.findById(req.params.id)
      .populate('supplier');
    
    if (!product) {
      return res.status(404).json({ success: false, error: '产品未找到' });
    }
    
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = new Product3C(req.body);
    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 更新产品信息
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product3C.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ success: false, error: '产品未找到' });
    }
    
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 更新产品价格
app.put('/api/products/:id/pricing', async (req, res) => {
  try {
    const { suggestedRetailPrice, wholesalePrice, tierPricing } = req.body;
    
    const product = await Product3C.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: '产品未找到' });
    }
    
    // 记录价格历史（简化版）
    const updates = {};
    if (suggestedRetailPrice !== undefined) updates.suggestedRetailPrice = suggestedRetailPrice;
    if (wholesalePrice !== undefined) updates.wholesalePrice = wholesalePrice;
    if (tierPricing !== undefined) updates.tierPricing = tierPricing;
    
    Object.assign(product, updates);
    await product.save();
    
    res.json({ success: true, data: product, message: '价格更新成功' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 更新产品状态
app.put('/api/products/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const product = await Product3C.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: '产品未找到' });
    }
    
    // 验证状态转换
    if (product.status === 'SOLD' && status !== 'SOLD') {
      return res.status(400).json({ 
        success: false, 
        error: '已售产品不能更改状态' 
      });
    }
    
    product.status = status;
    await product.save();
    
    res.json({ success: true, data: product, message: '状态更新成功' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 更新产品位置
app.put('/api/products/:id/location', async (req, res) => {
  try {
    const { warehouseLocation } = req.body;
    
    const product = await Product3C.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: '产品未找到' });
    }
    
    product.warehouseLocation = warehouseLocation;
    await product.save();
    
    res.json({ success: true, data: product, message: '位置更新成功' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 调整配件库存数量
app.put('/api/products/:id/quantity', async (req, res) => {
  try {
    const { quantity } = req.body;
    
    const product = await Product3C.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: '产品未找到' });
    }
    
    if (product.category !== 'ACCESSORY') {
      return res.status(400).json({ 
        success: false, 
        error: '只能调整配件类产品的数量' 
      });
    }
    
    if (quantity < 0) {
      return res.status(400).json({ 
        success: false, 
        error: '数量不能为负数' 
      });
    }
    
    product.quantity = quantity;
    if (quantity === 0) {
      product.status = 'SOLD';
    } else if (product.status === 'SOLD') {
      product.status = 'AVAILABLE';
    }
    await product.save();
    
    res.json({ success: true, data: product, message: '库存数量更新成功' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 用户相关
app.get('/api/users', async (req, res) => {
  try {
    const users = await User3C.find().select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 供应商相关
app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier3C.find({ active: true });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 销售发票相关
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await SalesInvoice.find()
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const invoice = new SalesInvoice(req.body);
    await invoice.save();
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 采购订单相关
app.get('/api/purchase-orders', async (req, res) => {
  try {
    const orders = await PurchaseOrder.find()
      .populate('supplier', 'name')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/purchase-orders', async (req, res) => {
  try {
    const order = new PurchaseOrder(req.body);
    await order.save();
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 统计数据
app.get('/api/stats', async (req, res) => {
  try {
    const stats = {
      totalProducts: await Product3C.countDocuments(),
      availableProducts: await Product3C.countDocuments({ status: 'AVAILABLE' }),
      totalUsers: await User3C.countDocuments(),
      totalSuppliers: await Supplier3C.countDocuments({ active: true }),
      totalInvoices: await SalesInvoice.countDocuments(),
      totalOrders: await PurchaseOrder.countDocuments(),
      productsByCategory: {
        accessories: await Product3C.countDocuments({ category: 'ACCESSORY' }),
        newDevices: await Product3C.countDocuments({ category: 'NEW_DEVICE' }),
        usedDevices: await Product3C.countDocuments({ category: 'USED_DEVICE' })
      }
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 销售功能 ============

// 创建销售发票（完整流程）
app.post('/api/sales/create-invoice', async (req, res) => {
  try {
    const { customer, lineItems, discountPercent = 0, createdBy } = req.body;
    
    // 验证产品库存
    for (const item of lineItems) {
      const product = await Product3C.findById(item.productId);
      if (!product) {
        return res.status(404).json({ 
          success: false, 
          error: `产品未找到: ${item.productId}` 
        });
      }
      
      if (product.status !== 'AVAILABLE') {
        return res.status(400).json({ 
          success: false, 
          error: `产品不可销售: ${product.name}` 
        });
      }
      
      // 检查配件库存
      if (product.category === 'ACCESSORY' && product.quantity < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `库存不足: ${product.name} (可用: ${product.quantity}, 需要: ${item.quantity})` 
        });
      }
    }
    
    // 生成发票号
    const invoiceCount = await SalesInvoice.countDocuments();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;
    
    // 计算发票金额
    let subtotal = 0;
    const processedLineItems = [];
    
    for (const item of lineItems) {
      const product = await Product3C.findById(item.productId);
      
      // 根据客户类型获取价格
      let unitPrice = product.suggestedRetailPrice;
      if (customer.customerType === 'WHOLESALE') {
        if (customer.merchantTier) {
          const tierPrice = product.tierPricing.find(
            t => t.tierLevel === customer.merchantTier.tierLevel
          );
          unitPrice = tierPrice ? tierPrice.price : product.wholesalePrice;
        } else {
          unitPrice = product.wholesalePrice;
        }
      }
      
      const quantity = item.quantity || 1;
      const lineTotal = unitPrice * quantity;
      
      // 计算税额
      let taxRate = 0;
      if (product.taxClassification === 'VAT_23') taxRate = 0.23;
      else if (product.taxClassification === 'SERVICE_VAT_13_5') taxRate = 0.135;
      
      const taxAmount = lineTotal * taxRate;
      
      processedLineItems.push({
        productId: product._id,
        productName: product.name,
        quantity: quantity,
        unitPrice: unitPrice,
        taxClassification: product.taxClassification,
        taxAmount: taxAmount,
        lineTotal: lineTotal,
        warehouseLocation: product.warehouseLocation
      });
      
      subtotal += lineTotal;
    }
    
    // 计算折扣和总额
    const discountAmount = subtotal * (discountPercent / 100);
    const totalTax = processedLineItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal - discountAmount + totalTax;
    
    // 创建发票
    const invoice = new SalesInvoice({
      invoiceNumber,
      customer,
      lineItems: processedLineItems,
      subtotal,
      discountPercent,
      discountAmount,
      taxAmount: totalTax,
      totalAmount,
      status: 'DRAFT',
      createdBy: createdBy || '000000000000000000000000' // 临时用户ID
    });
    
    await invoice.save();
    
    res.status(201).json({ 
      success: true, 
      data: invoice,
      message: '发票创建成功'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 确定发票（更新库存）
app.post('/api/sales/finalize-invoice/:id', async (req, res) => {
  try {
    const invoice = await SalesInvoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: '发票未找到' });
    }
    
    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({ success: false, error: '只能确定草稿状态的发票' });
    }
    
    // 更新产品库存和状态
    for (const item of invoice.lineItems) {
      const product = await Product3C.findById(item.productId);
      
      if (product.category === 'ACCESSORY') {
        // 配件：减少数量
        product.quantity -= item.quantity;
        if (product.quantity === 0) {
          product.status = 'SOLD';
        }
      } else {
        // 设备：标记为已售
        product.status = 'SOLD';
      }
      
      product.salesStatus = 'SOLD';
      await product.save();
    }
    
    // 更新发票状态
    invoice.status = 'FINALIZED';
    invoice.finalizedAt = new Date();
    await invoice.save();
    
    res.json({ 
      success: true, 
      data: invoice,
      message: '发票已确定，库存已更新'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 生成PDF发票
app.get('/api/sales/invoice-pdf/:id', async (req, res) => {
  try {
    const invoice = await SalesInvoice.findById(req.params.id)
      .populate('createdBy', 'username');
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: '发票未找到' });
    }
    
    // 创建PDF文档
    const doc = new PDFDocument({ margin: 50 });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    
    // 将PDF流式传输到响应
    doc.pipe(res);
    
    // 添加中文字体支持（使用内置字体）
    const fontSize = {
      title: 24,
      heading: 16,
      normal: 12,
      small: 10
    };
    
    // 标题
    doc.fontSize(fontSize.title)
       .text('销售发票 / SALES INVOICE', { align: 'center' })
       .moveDown();
    
    // 发票信息
    doc.fontSize(fontSize.normal)
       .text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 120)
       .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('zh-CN')}`, 50, 140)
       .text(`Status: ${invoice.status}`, 50, 160);
    
    // 客户信息
    doc.fontSize(fontSize.heading)
       .text('Customer Information', 50, 200)
       .fontSize(fontSize.normal)
       .text(`Name: ${invoice.customer.name}`, 50, 225)
       .text(`Type: ${invoice.customer.customerType === 'RETAIL' ? 'Retail' : 'Wholesale'}`, 50, 245);
    
    if (invoice.customer.email) {
      doc.text(`Email: ${invoice.customer.email}`, 50, 265);
    }
    if (invoice.customer.phone) {
      doc.text(`Phone: ${invoice.customer.phone}`, 50, 285);
    }
    
    // 产品列表表头
    const tableTop = 330;
    doc.fontSize(fontSize.heading)
       .text('Items', 50, tableTop);
    
    // 表格列
    const col1 = 50;  // Product
    const col2 = 250; // Qty
    const col3 = 300; // Unit Price
    const col4 = 380; // Tax
    const col5 = 460; // Total
    
    doc.fontSize(fontSize.small)
       .text('Product', col1, tableTop + 25)
       .text('Qty', col2, tableTop + 25)
       .text('Unit Price', col3, tableTop + 25)
       .text('Tax', col4, tableTop + 25)
       .text('Total', col5, tableTop + 25);
    
    // 画线
    doc.moveTo(50, tableTop + 40)
       .lineTo(550, tableTop + 40)
       .stroke();
    
    // 产品行
    let yPosition = tableTop + 50;
    invoice.lineItems.forEach((item, index) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.fontSize(fontSize.small)
         .text(item.productName, col1, yPosition, { width: 180 })
         .text(item.quantity.toString(), col2, yPosition)
         .text(`EUR ${item.unitPrice.toFixed(2)}`, col3, yPosition)
         .text(`EUR ${item.taxAmount.toFixed(2)}`, col4, yPosition)
         .text(`EUR ${item.lineTotal.toFixed(2)}`, col5, yPosition);
      
      yPosition += 25;
    });
    
    // 总计部分
    yPosition += 20;
    doc.moveTo(50, yPosition)
       .lineTo(550, yPosition)
       .stroke();
    
    yPosition += 15;
    
    doc.fontSize(fontSize.normal)
       .text('Subtotal:', 380, yPosition)
       .text(`EUR ${invoice.subtotal.toFixed(2)}`, 460, yPosition);
    
    yPosition += 20;
    
    if (invoice.discountPercent > 0) {
      doc.text(`Discount (${invoice.discountPercent}%):`, 380, yPosition)
         .text(`-EUR ${invoice.discountAmount.toFixed(2)}`, 460, yPosition);
      yPosition += 20;
    }
    
    doc.text('Tax:', 380, yPosition)
       .text(`EUR ${invoice.taxAmount.toFixed(2)}`, 460, yPosition);
    
    yPosition += 20;
    
    doc.fontSize(fontSize.heading)
       .text('Total:', 380, yPosition)
       .text(`EUR ${invoice.totalAmount.toFixed(2)}`, 460, yPosition);
    
    // 页脚
    doc.fontSize(fontSize.small)
       .text('Thank you for your business!', 50, 750, { align: 'center' })
       .text('3C Product Management System', 50, 765, { align: 'center' });
    
    // 完成PDF
    doc.end();
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取可用产品（用于销售）
app.get('/api/sales/available-products', async (req, res) => {
  try {
    const products = await Product3C.find({ 
      status: 'AVAILABLE',
      $or: [
        { category: 'ACCESSORY', quantity: { $gt: 0 } },
        { category: { $in: ['NEW_DEVICE', 'USED_DEVICE'] } }
      ]
    }).populate('supplier', 'name');
    
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取客户列表（从用户中筛选）
app.get('/api/sales/customers', async (req, res) => {
  try {
    const customers = await User3C.find({
      role: { $in: ['RETAIL_CUSTOMER', 'WHOLESALE_MERCHANT'] },
      isActive: true
    }).select('username email role merchantTier');
    
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '3C产品管理系统原型运行中',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// 数据库状态检查
app.get('/api/db-status', (req, res) => {
  res.json({
    success: true,
    connected: isDbConnected,
    message: isDbConnected ? 'MongoDB连接正常' : 'MongoDB未连接',
    setup_guide: !isDbConnected ? {
      step1: '选择数据库方案：',
      option1: {
        title: 'MongoDB Atlas (推荐)',
        description: '免费云数据库',
        url: 'https://www.mongodb.com/atlas',
        steps: [
          '1. 访问 https://www.mongodb.com/atlas',
          '2. 创建免费账户',
          '3. 创建新集群',
          '4. 获取连接字符串',
          '5. 更新.env文件中的MONGODB_URI'
        ]
      },
      option2: {
        title: '本地MongoDB',
        description: '在本地安装MongoDB',
        steps: [
          '1. 下载MongoDB Community Server',
          '2. 安装并启动MongoDB服务',
          '3. 保持当前.env配置'
        ]
      }
    } : null
  });
});

// ============ 管理员 API ============

// 管理员统计数据
app.get('/api/admin/stats', async (req, res) => {
  try {
    // 待处理采购订单（非CONFIRMED和CANCELLED状态）
    const pendingOrders = await PurchaseOrder.countDocuments({
      status: { $nin: ['CONFIRMED', 'CANCELLED'] }
    });
    
    // 本月采购总额
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyPurchaseOrders = await PurchaseOrder.find({
      status: 'CONFIRMED',
      createdAt: { $gte: firstDayOfMonth }
    });
    const monthlyPurchase = monthlyPurchaseOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // 本月销售总额
    const monthlySalesInvoices = await SalesInvoice.find({
      status: 'FINALIZED',
      finalizedAt: { $gte: firstDayOfMonth }
    });
    const monthlySales = monthlySalesInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    
    // 活跃供应商
    const activeSuppliers = await Supplier3C.countDocuments({ active: true });
    
    res.json({
      success: true,
      data: {
        pendingOrders,
        monthlyPurchase,
        monthlySales,
        activeSuppliers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 库存报表
app.get('/api/reports/inventory', async (req, res) => {
  try {
    const products = await Product3C.find();
    
    const report = {
      accessories: { total: 0, available: 0, value: 0 },
      newDevices: { total: 0, available: 0, value: 0 },
      usedDevices: { total: 0, available: 0, value: 0 }
    };
    
    products.forEach(product => {
      const qty = product.category === 'ACCESSORY' ? product.quantity : 1;
      const value = product.purchasePrice * qty;
      
      if (product.category === 'ACCESSORY') {
        report.accessories.total += qty;
        if (product.status === 'AVAILABLE') report.accessories.available += qty;
        report.accessories.value += value;
      } else if (product.category === 'NEW_DEVICE') {
        report.newDevices.total += 1;
        if (product.status === 'AVAILABLE') report.newDevices.available += 1;
        report.newDevices.value += value;
      } else if (product.category === 'USED_DEVICE') {
        report.usedDevices.total += 1;
        if (product.status === 'AVAILABLE') report.usedDevices.available += 1;
        report.usedDevices.value += value;
      }
    });
    
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 批发商户 API ============

// 定义批发商户Schema
const merchantSaleSchema = new mongoose.Schema({
  merchantId: String,
  date: Date,
  productName: String,
  productType: String,
  category: String,
  quantity: Number,
  costPrice: Number,
  salePrice: Number,
  taxClassification: String,
  taxAmount: Number,
  paymentMethod: String,
  createdAt: { type: Date, default: Date.now }
});

const merchantRepairSchema = new mongoose.Schema({
  merchantId: String,
  date: Date,
  customerName: String,
  repairItem: String,
  description: String,
  amount: Number,
  taxAmount: Number,
  paymentMethod: String,
  createdAt: { type: Date, default: Date.now }
});

const MerchantSale = mongoose.model('MerchantSale', merchantSaleSchema);
const MerchantRepair = mongoose.model('MerchantRepair', merchantRepairSchema);

// 批发商户统计数据
app.get('/api/merchant/stats', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || 'merchant_001';
    
    // 我的库存（模拟数据）
    const myInventory = 156;
    
    // 本月销售
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlySales = await MerchantSale.find({
      merchantId,
      date: { $gte: firstDayOfMonth }
    });
    
    const monthlySalesAmount = monthlySales.reduce((sum, sale) => 
      sum + (sale.salePrice * sale.quantity), 0
    );
    
    // 本月维修
    const monthlyRepairs = await MerchantRepair.find({
      merchantId,
      date: { $gte: firstDayOfMonth }
    });
    
    const monthlyRepairsAmount = monthlyRepairs.reduce((sum, repair) => 
      sum + repair.amount, 0
    );
    
    // 应缴税额（本月）
    const salesTax = monthlySales.reduce((sum, sale) => sum + sale.taxAmount, 0);
    const repairsTax = monthlyRepairs.reduce((sum, repair) => sum + repair.taxAmount, 0);
    const taxDue = salesTax + repairsTax;
    
    res.json({
      success: true,
      data: {
        myInventory,
        monthlySales: monthlySalesAmount,
        monthlyRepairs: monthlyRepairsAmount,
        taxDue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取销售记录
app.get('/api/merchant/sales', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || 'merchant_001';
    const { startDate, endDate } = req.query;
    
    let query = { merchantId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const sales = await MerchantSale.find(query).sort({ date: -1 });
    
    res.json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取维修记录
app.get('/api/merchant/repairs', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || 'merchant_001';
    const { startDate, endDate } = req.query;
    
    let query = { merchantId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const repairs = await MerchantRepair.find(query).sort({ date: -1 });
    
    res.json({ success: true, data: repairs });
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
    
    const query = {
      merchantId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    const sales = await MerchantSale.find(query);
    const repairs = await MerchantRepair.find(query);
    
    // 按日期分组销售数据
    const dailySales = {};
    sales.forEach(sale => {
      const dateKey = sale.date.toISOString().split('T')[0];
      if (!dailySales[dateKey]) {
        dailySales[dateKey] = {
          date: dateKey,
          totalSales: 0,
          cashIncome: 0,
          cardIncome: 0
        };
      }
      
      const amount = sale.salePrice * sale.quantity;
      dailySales[dateKey].totalSales += amount;
      
      if (sale.paymentMethod === 'CASH') {
        dailySales[dateKey].cashIncome += amount;
      } else {
        dailySales[dateKey].cardIncome += amount;
      }
    });
    
    repairs.forEach(repair => {
      const dateKey = repair.date.toISOString().split('T')[0];
      if (!dailySales[dateKey]) {
        dailySales[dateKey] = {
          date: dateKey,
          totalSales: 0,
          cashIncome: 0,
          cardIncome: 0
        };
      }
      
      dailySales[dateKey].totalSales += repair.amount;
      
      if (repair.paymentMethod === 'CASH') {
        dailySales[dateKey].cashIncome += repair.amount;
      } else {
        dailySales[dateKey].cardIncome += repair.amount;
      }
    });
    
    // 按税务分类计算
    const taxByClassification = {
      VAT_23: { sales: 0, cost: 0, outputTax: 0, inputTax: 0, due: 0 },
      MARGIN_VAT_0: { sales: 0, cost: 0, due: 0 },
      SERVICE_VAT_13_5: { sales: 0, due: 0 }
    };
    
    sales.forEach(sale => {
      const saleAmount = sale.salePrice * sale.quantity;
      const costAmount = sale.costPrice * sale.quantity;
      
      if (sale.taxClassification === 'VAT_23') {
        taxByClassification.VAT_23.sales += saleAmount;
        taxByClassification.VAT_23.cost += costAmount;
        taxByClassification.VAT_23.outputTax += saleAmount * 23 / 123;
        taxByClassification.VAT_23.inputTax += costAmount * 23 / 123;
        taxByClassification.VAT_23.due += sale.taxAmount;
      } else if (sale.taxClassification === 'MARGIN_VAT_0') {
        taxByClassification.MARGIN_VAT_0.sales += saleAmount;
        taxByClassification.MARGIN_VAT_0.cost += costAmount;
        taxByClassification.MARGIN_VAT_0.due += sale.taxAmount;
      }
    });
    
    repairs.forEach(repair => {
      taxByClassification.SERVICE_VAT_13_5.sales += repair.amount;
      taxByClassification.SERVICE_VAT_13_5.due += repair.taxAmount;
    });
    
    // 计算总额
    const totalCashIncome = Object.values(dailySales).reduce((sum, day) => sum + day.cashIncome, 0);
    const totalCardIncome = Object.values(dailySales).reduce((sum, day) => sum + day.cardIncome, 0);
    const totalSales = totalCashIncome + totalCardIncome;
    const totalTaxDue = taxByClassification.VAT_23.due + 
                        taxByClassification.MARGIN_VAT_0.due + 
                        taxByClassification.SERVICE_VAT_13_5.due;
    
    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        dailySales: Object.values(dailySales).sort((a, b) => a.date.localeCompare(b.date)),
        summary: {
          totalSales,
          totalCashIncome,
          totalCardIncome,
          totalTaxDue
        },
        taxByClassification
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 批发商库存管理 API ============

const MerchantInventory = require('./models/MerchantInventory');
const MerchantOrder = require('./models/MerchantOrder');

// 获取批发商库存列表
app.get('/api/merchant/inventory', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || 'merchant_001';
    
    const inventory = await MerchantInventory.find({ merchantId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取仓库可订购产品列表（批发商订货用）
app.get('/api/merchant/warehouse-products', async (req, res) => {
  try {
    // 获取仓库中可销售的产品
    const products = await Product3C.find({ 
      status: 'AVAILABLE'
    }).sort({ createdAt: -1 });
    
    // 按产品类型分组
    const groupedProducts = {};
    
    products.forEach(product => {
      const key = `${product.productType}_${product.category}`;
      
      if (!groupedProducts[key]) {
        groupedProducts[key] = {
          productType: product.productType,
          category: product.category,
          brand: product.brand,
          model: product.model,
          products: [],
          totalAvailable: 0,
          wholesalePrice: product.wholesalePrice,
          suggestedRetailPrice: product.suggestedRetailPrice,
          taxClassification: product.taxClassification
        };
      }
      
      groupedProducts[key].products.push(product);
      
      if (product.category === 'ACCESSORY') {
        groupedProducts[key].totalAvailable += product.quantity;
      } else {
        groupedProducts[key].totalAvailable += 1;
      }
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
    
    // 生成订单号
    const orderNumber = MerchantOrder.generateOrderNumber();
    
    // 计算订单总额并验证库存
    let totalAmount = 0;
    const orderItems = [];
    
    for (const item of items) {
      const product = await Product3C.findById(item.productId);
      
      if (!product) {
        return res.status(404).json({ 
          success: false, 
          error: `产品不存在: ${item.productId}` 
        });
      }
      
      if (product.status !== 'AVAILABLE') {
        return res.status(400).json({ 
          success: false, 
          error: `产品不可用: ${product.name}` 
        });
      }
      
      // 检查库存
      if (product.category === 'ACCESSORY') {
        if (product.quantity < item.quantity) {
          return res.status(400).json({ 
            success: false, 
            error: `库存不足: ${product.name}，可用: ${product.quantity}` 
          });
        }
      } else {
        if (item.quantity > 1) {
          return res.status(400).json({ 
            success: false, 
            error: `非配件类产品每次只能订购1件: ${product.name}` 
          });
        }
      }
      
      const subtotal = product.wholesalePrice * item.quantity;
      totalAmount += subtotal;
      
      orderItems.push({
        warehouseProductId: product._id,
        productName: product.name,
        category: product.category,
        productType: product.productType,
        quantity: item.quantity,
        unitPrice: product.wholesalePrice,
        subtotal
      });
    }
    
    // 创建订单
    const order = new MerchantOrder({
      orderNumber,
      merchantId,
      merchantName,
      items: orderItems,
      totalAmount,
      status: 'PENDING'
    });
    
    await order.save();
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 确认订单并转移库存
app.post('/api/merchant/orders/:orderId/confirm', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await MerchantOrder.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: '订单不存在' 
      });
    }
    
    if (order.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        error: '订单状态不正确' 
      });
    }
    
    // 开始事务处理
    for (const item of order.items) {
      const product = await Product3C.findById(item.warehouseProductId);
      
      if (!product) {
        return res.status(404).json({ 
          success: false, 
          error: `产品不存在: ${item.productName}` 
        });
      }
      
      // 减少仓库库存
      if (product.category === 'ACCESSORY') {
        product.quantity -= item.quantity;
        if (product.quantity === 0) {
          product.status = 'SOLD';
        }
      } else {
        product.status = 'SOLD';
      }
      
      await product.save();
      
      // 添加到批发商库存
      let merchantInventory = await MerchantInventory.findOne({
        merchantId: order.merchantId,
        productName: item.productName,
        category: item.category
      });
      
      if (merchantInventory) {
        // 更新现有库存
        merchantInventory.quantity += item.quantity;
        merchantInventory.costPrice = item.unitPrice; // 更新成本价
      } else {
        // 创建新库存记录
        merchantInventory = new MerchantInventory({
          merchantId: order.merchantId,
          merchantName: order.merchantName,
          productName: item.productName,
          category: item.category,
          productType: item.productType,
          brand: product.brand,
          model: product.model,
          quantity: item.quantity,
          costPrice: item.unitPrice,
          retailPrice: product.suggestedRetailPrice,
          taxClassification: product.taxClassification,
          warehouseProductId: product._id
        });
      }
      
      await merchantInventory.save();
    }
    
    // 更新订单状态
    order.status = 'CONFIRMED';
    order.confirmedDate = new Date();
    await order.save();
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取批发商订单列表
app.get('/api/merchant/orders', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || 'merchant_001';
    
    const orders = await MerchantOrder.find({ merchantId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批发商销售产品（从自己的库存）
app.post('/api/merchant/sell', async (req, res) => {
  try {
    const { merchantId, inventoryId, quantity, paymentMethod } = req.body;
    
    if (!merchantId || !inventoryId || !quantity) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数' 
      });
    }
    
    // 查找批发商库存
    const inventory = await MerchantInventory.findById(inventoryId);
    
    if (!inventory) {
      return res.status(404).json({ 
        success: false, 
        error: '库存不存在' 
      });
    }
    
    if (inventory.merchantId !== merchantId) {
      return res.status(403).json({ 
        success: false, 
        error: '无权操作此库存' 
      });
    }
    
    if (inventory.quantity < quantity) {
      return res.status(400).json({ 
        success: false, 
        error: `库存不足，可用: ${inventory.quantity}` 
      });
    }
    
    // 减少库存
    inventory.quantity -= quantity;
    await inventory.save();
    
    // 计算税额
    const saleAmount = inventory.retailPrice * quantity;
    const costAmount = inventory.costPrice * quantity;
    let taxAmount = 0;
    
    if (inventory.taxClassification === 'VAT_23') {
      const outputTax = saleAmount * 23 / 123;
      const inputTax = costAmount * 23 / 123;
      taxAmount = outputTax - inputTax;
    } else if (inventory.taxClassification === 'SERVICE_VAT_13_5') {
      taxAmount = saleAmount * 13.5 / 113.5;
    } else if (inventory.taxClassification === 'MARGIN_VAT_0') {
      taxAmount = (saleAmount - costAmount) * 23 / 123;
    }
    
    // 记录销售（这里简化处理，实际应该创建销售记录表）
    const saleRecord = {
      merchantId,
      inventoryId,
      productName: inventory.productName,
      category: inventory.category,
      quantity,
      salePrice: inventory.retailPrice,
      costPrice: inventory.costPrice,
      taxAmount,
      paymentMethod: paymentMethod || 'CASH',
      date: new Date()
    };
    
    res.json({
      success: true,
      data: {
        sale: saleRecord,
        remainingStock: inventory.quantity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 根路径 - 重定向到登录页面
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 API文档: http://localhost:${PORT}/api/stats`);
});

module.exports = app;
