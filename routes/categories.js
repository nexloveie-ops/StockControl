const express = require('express');
const Category = require('../models/Category');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// 获取所有分类
router.get('/', auth, async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('parentCategory', 'name')
      .sort({ name: 1 });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建分类
router.post('/', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    await category.populate('parentCategory', 'name');
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个分类
router.get('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parentCategory', 'name');
    
    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新分类
router.put('/:id', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('parentCategory', 'name');

    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除分类
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    res.json({ message: '分类已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;