const express = require('express');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// 获取库存列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, lowStock } = req.query;
    let query = {};
    
    if (lowStock === 'true') {
      // 查找低库存产品
      const products = await Product.find({ isActive: true });
      const lowStockProducts = [];
      
      for (const product of products) {
        const inventory = await Inventory.findOne({ product: product._id });
        if (inventory && inventory.currentStock <= product.minStockLevel) {
          lowStockProducts.push(product._id);
        }
      }
      query.product = { $in: lowStockProducts };
    }

    const inventories = await Inventory.find(query)
      .populate({
        path: 'product',
        select: 'name sku brand model minStockLevel sellingPrice',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ updatedAt: -1 });

    const total = await Inventory.countDocuments(query);

    res.json({
      inventories,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新库存
router.put('/:productId', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { currentStock, location } = req.body;
    
    const inventory = await Inventory.findOneAndUpdate(
      { product: req.params.productId },
      { 
        currentStock,
        location,
        lastRestockDate: new Date()
      },
      { new: true, upsert: true }
    ).populate('product', 'name sku minStockLevel');

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 库存调整
router.post('/:productId/adjust', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { adjustment, reason } = req.body;
    
    const inventory = await Inventory.findOne({ product: req.params.productId });
    if (!inventory) {
      return res.status(404).json({ error: '库存记录不存在' });
    }

    inventory.currentStock += adjustment;
    if (inventory.currentStock < 0) {
      return res.status(400).json({ error: '库存不能为负数' });
    }

    await inventory.save();
    await inventory.populate('product', 'name sku');

    res.json({
      message: '库存调整成功',
      inventory,
      adjustment,
      reason
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个产品库存
router.get('/:productId', auth, async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ product: req.params.productId })
      .populate('product', 'name sku brand model minStockLevel');
    
    if (!inventory) {
      return res.status(404).json({ error: '库存记录不存在' });
    }

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;