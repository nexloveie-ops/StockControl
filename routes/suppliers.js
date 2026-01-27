const express = require('express');
const Supplier = require('../models/Supplier');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// 获取所有供应商
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { code: new RegExp(search, 'i') }
      ];
    }

    const suppliers = await Supplier.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ name: 1 });

    const total = await Supplier.countDocuments(query);

    res.json({
      suppliers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建供应商
router.post('/', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个供应商
router.get('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ error: '供应商不存在' });
    }

    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新供应商
router.put('/:id', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({ error: '供应商不存在' });
    }

    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除供应商
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({ error: '供应商不存在' });
    }

    res.json({ message: '供应商已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;