const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// 信任代理（AWS Load Balancer）
app.set('trust proxy', true);

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

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.method === 'POST') {
    console.log('POST请求体:', req.body);
  }
  next();
});

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
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    aws: !!process.env.AWS_REGION
  });
});

// 简单API测试端点（不需要数据库）
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API工作正常',
    timestamp: new Date().toISOString(),
    headers: {
      host: req.get('host'),
      userAgent: req.get('user-agent'),
      xForwardedFor: req.get('x-forwarded-for')
    }
  });
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
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`数据库: ${process.env.MONGODB_URI ? 'MongoDB Atlas' : '本地MongoDB'}`);
  console.log(`AWS环境: ${process.env.AWS_REGION ? '是' : '否'}`);
  console.log(`时间: ${new Date().toISOString()}`);
});

module.exports = app;