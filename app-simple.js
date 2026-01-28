// 简化版应用，用于AWS部署调试
const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080; // AWS EB通常使用8080

// 基础中间件
app.use(express.json());
app.use(express.static('public'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    host: req.get('host')
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '3C库存管理系统 - 简化版',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb_configured: !!process.env.MONGODB_URI,
    jwt_configured: !!process.env.JWT_SECRET
  });
});

// 环境变量检查
app.get('/env-check', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV || 'not set',
    PORT: process.env.PORT || 'not set',
    MONGODB_URI: process.env.MONGODB_URI ? 'configured' : 'not set',
    JWT_SECRET: process.env.JWT_SECRET ? 'configured' : 'not set',
    JWT_EXPIRE: process.env.JWT_EXPIRE || 'not set'
  });
});

// 简单的测试页面
app.get('/test', (req, res) => {
  res.send(`
    <html>
      <head><title>AWS测试页面</title></head>
      <body>
        <h1>AWS Elastic Beanstalk测试</h1>
        <p>应用正在运行！</p>
        <p>时间: ${new Date().toLocaleString()}</p>
        <p>环境: ${process.env.NODE_ENV || 'development'}</p>
        <p>主机: ${req.get('host')}</p>
        <a href="/health">健康检查</a> | 
        <a href="/env-check">环境变量检查</a>
      </body>
    </html>
  `);
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.listen(PORT, () => {
  console.log(`🚀 简化版应用运行在端口 ${PORT}`);
  console.log(`📍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ MongoDB: ${process.env.MONGODB_URI ? '已配置' : '未配置'}`);
});

module.exports = app;