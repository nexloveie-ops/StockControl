const express = require('express');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// 获取销售记录
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sales = await Sale.find(query)
      .populate('salesPerson', 'username')
      .populate('items.product', 'name sku brand')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Sale.countDocuments(query);

    res.json({
      sales,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建销售订单
router.post('/', auth, async (req, res) => {
  try {
    const { customer, items, paymentMethod, discount = 0, notes } = req.body;
    
    // 检查库存
    for (const item of items) {
      const inventory = await Inventory.findOne({ product: item.product });
      if (!inventory || inventory.availableStock < item.quantity) {
        return res.status(400).json({ 
          error: `产品 ${item.product} 库存不足` 
        });
      }
    }

    // 计算总价
    let subtotal = 0;
    for (const item of items) {
      item.totalPrice = item.quantity * item.unitPrice;
      subtotal += item.totalPrice;
    }

    const tax = subtotal * 0.1; // 10% 税率
    const total = subtotal + tax - discount;

    const sale = new Sale({
      customer,
      items,
      subtotal,
      tax,
      discount,
      total,
      paymentMethod,
      salesPerson: req.user.userId,
      notes
    });

    await sale.save();

    // 更新库存
    for (const item of items) {
      await Inventory.findOneAndUpdate(
        { product: item.product },
        { $inc: { currentStock: -item.quantity } }
      );
    }

    await sale.populate([
      { path: 'salesPerson', select: 'username' },
      { path: 'items.product', select: 'name sku brand' }
    ]);

    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个销售记录
router.get('/:id', auth, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('salesPerson', 'username')
      .populate('items.product', 'name sku brand');
    
    if (!sale) {
      return res.status(404).json({ error: '销售记录不存在' });
    }

    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新销售状态
router.patch('/:id/status', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { status } = req.body;
    
    const sale = await Sale.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('salesPerson', 'username');

    if (!sale) {
      return res.status(404).json({ error: '销售记录不存在' });
    }

    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 销售统计
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const matchStage = { status: 'completed' };
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const stats = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$total' }
        }
      }
    ]);

    res.json(stats[0] || { totalSales: 0, totalOrders: 0, averageOrderValue: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;