const express = require('express');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// 获取所有产品
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, brand, search } = req.query;
    const query = { isActive: true };
    
    if (category) query.category = category;
    if (brand) query.brand = new RegExp(brand, 'i');
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { sku: new RegExp(search, 'i') },
        { model: new RegExp(search, 'i') }
      ];
    }

    const products = await Product.find(query)
      .populate('category', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建产品
router.post('/', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    
    // 创建对应的库存记录
    const inventory = new Inventory({
      product: product._id,
      currentStock: 0
    });
    await inventory.save();

    await product.populate('category', 'name');
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个产品
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name');
    
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新产品
router.put('/:id', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('category', 'name');

    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除产品
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    res.json({ message: '产品已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;