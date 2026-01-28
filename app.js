const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // 允许内联脚本
      styleSrc: ["'self'", "'unsafe-inline'"],  // 允许内联样式
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors());

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制每个IP 15分钟内最多100个请求
});
app.use(limiter);

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static('public'));

// 数据库连接
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/3c-inventory');
    console.log(`MongoDB连接成功: ${conn.connection.host}`);
    console.log(`数据库名称: ${conn.connection.name}`);
  } catch (error) {
    console.error('MongoDB连接失败:', error.message);
    console.log('提示: 请确保MongoDB正在运行，或者使用MongoDB Atlas云服务');
    console.log('如果使用本地MongoDB，请启动MongoDB服务');
    console.log('如果使用Atlas，请检查.env文件中的MONGODB_URI配置');
    // 不退出进程，让应用继续运行以便调试
  }
};

connectDB();

// 测试路由
app.get('/api/test-db', async (req, res) => {
  try {
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    res.json({ 
      message: '数据库连接测试成功',
      userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/categories', require('./routes/categories'));

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 根路径
app.get('/', (req, res) => {
  // 检查是否在AWS环境中
  const isAWS = req.get('host')?.includes('elasticbeanstalk') || req.get('host')?.includes('amazonaws');
  
  if (isAWS) {
    // AWS环境，重定向到AWS优化版本
    res.redirect('/aws.html');
  } else {
    // 本地环境，显示API信息
    res.json({ 
      message: '3C销售库存管理系统 API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        health: '/health',
        auth: '/api/auth/*',
        products: '/api/products/*',
        inventory: '/api/inventory/*',
        sales: '/api/sales/*'
      },
      webInterface: {
        main: '/form-only.html',
        aws: '/aws.html',
        test: '/working.html'
      }
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = app;