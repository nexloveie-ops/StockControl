# 本地开发环境搭建指南

## 前置要求

### 1. 安装Node.js
- 访问 [Node.js官网](https://nodejs.org/)
- 下载并安装LTS版本（推荐18.x或更高版本）
- 验证安装：
  ```bash
  node --version
  npm --version
  ```

### 2. 安装MongoDB

#### 选项A：本地安装MongoDB
1. 访问 [MongoDB下载页面](https://www.mongodb.com/try/download/community)
2. 下载Windows版本
3. 安装并启动MongoDB服务
4. 默认连接地址：`mongodb://localhost:27017`

#### 选项B：使用MongoDB Atlas（推荐）
1. 访问 [MongoDB Atlas](https://www.mongodb.com/atlas)
2. 创建免费账户
3. 创建新集群
4. 获取连接字符串
5. 添加IP白名单（0.0.0.0/0 用于开发）

## 快速启动

### 方法1：使用启动脚本（Windows）
```bash
# 双击运行
start-local.bat
```

### 方法2：手动启动
```bash
# 1. 安装依赖
npm install

# 2. 复制环境配置
copy .env.example .env

# 3. 编辑环境配置
notepad .env

# 4. 启动开发服务器
npm run dev
```

## 环境配置

编辑 `.env` 文件：

```env
# 基本配置
NODE_ENV=development
PORT=3000

# 数据库配置（选择其一）
# 本地MongoDB
MONGODB_URI=mongodb://localhost:27017/3c-inventory

# 或MongoDB Atlas
# MONGODB_URI=mongodb+srv://用户名:密码@集群地址/3c-inventory?retryWrites=true&w=majority

# JWT密钥（请修改为复杂密钥）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
```

## 测试API

启动成功后，访问：
- 健康检查：http://localhost:3000/health
- API根路径：http://localhost:3000/

### 创建管理员用户
```bash
# 使用POST请求到 /api/auth/register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com", 
    "password": "123456",
    "role": "admin"
  }'
```

### 登录获取Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "123456"
  }'
```

## 常见问题

### 1. 端口被占用
如果3000端口被占用，修改`.env`文件中的`PORT`值

### 2. 数据库连接失败
- 检查MongoDB是否正在运行
- 验证连接字符串是否正确
- 检查网络连接（Atlas）

### 3. 依赖安装失败
```bash
# 清除缓存重新安装
npm cache clean --force
rm -rf node_modules
npm install
```

## 开发工具推荐

- **API测试**: Postman 或 Insomnia
- **数据库管理**: MongoDB Compass
- **代码编辑器**: VS Code

## 项目结构

```
├── app.js              # 应用入口
├── models/             # 数据模型
├── routes/             # API路由
├── middleware/         # 中间件
├── .env               # 环境配置
└── package.json       # 项目配置
```