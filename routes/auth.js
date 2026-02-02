const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 用户注册
router.post('/register', async (req, res) => {
  try {
    console.log('收到注册请求:', new Date().toISOString());
    console.log('请求体:', req.body);
    
    const { username, email, password, role } = req.body;
    
    if (!username || !email || !password) {
      console.log('缺少必需字段');
      return res.status(400).json({ error: '缺少必需字段' });
    }
    
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      console.log('用户已存在:', username);
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    const user = new User({ username, email, password, role });
    await user.save();
    console.log('用户创建成功:', username);

    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    console.log('收到登录请求:', new Date().toISOString());
    console.log('请求体:', req.body);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('缺少用户名或密码');
      return res.status(400).json({ error: '缺少用户名或密码' });
    }
    
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }],
      isActive: true 
    });
    
    if (!user || !(await user.comparePassword(password))) {
      console.log('登录失败:', username);
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRE }
    );

    console.log('登录成功:', username);
    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取当前用户信息
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;