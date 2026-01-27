# 3C产品销售库存管理系统

一个基于Node.js和MongoDB的3C类产品销售库存管理系统，支持产品管理、库存跟踪、销售记录和供应商管理。

## 功能特性

- **用户管理**: 支持多角色用户系统（管理员、经理、员工）
- **产品管理**: 完整的3C产品信息管理，包括规格、图片等
- **库存管理**: 实时库存跟踪、低库存预警、库存调整
- **销售管理**: 销售订单创建、状态跟踪、销售统计
- **供应商管理**: 供应商信息维护
- **分类管理**: 产品分类层级管理

## 技术栈

- **后端**: Node.js + Express.js
- **数据库**: MongoDB + Mongoose
- **认证**: JWT
- **部署**: AWS Elastic Beanstalk

## 快速开始

### 本地开发

1. 克隆项目
```bash
git clone <repository-url>
cd 3c-inventory-system
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
复制 `.env` 文件并修改相应配置：
```bash
cp .env.example .env
```

4. 启动开发服务器
```bash
npm run dev
```

### AWS部署

1. 安装AWS CLI和EB CLI
2. 配置AWS凭证
3. 初始化Elastic Beanstalk应用
```bash
eb init
```

4. 创建环境并部署
```bash
eb create production
eb deploy
```

## API文档

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

### 产品接口
- `GET /api/products` - 获取产品列表
- `POST /api/products` - 创建产品
- `GET /api/products/:id` - 获取单个产品
- `PUT /api/products/:id` - 更新产品
- `DELETE /api/products/:id` - 删除产品

### 库存接口
- `GET /api/inventory` - 获取库存列表
- `PUT /api/inventory/:productId` - 更新库存
- `POST /api/inventory/:productId/adjust` - 库存调整
- `GET /api/inventory/:productId` - 获取单个产品库存

### 销售接口
- `GET /api/sales` - 获取销售记录
- `POST /api/sales` - 创建销售订单
- `GET /api/sales/:id` - 获取单个销售记录
- `PATCH /api/sales/:id/status` - 更新销售状态
- `GET /api/sales/stats/summary` - 销售统计

### 供应商接口
- `GET /api/suppliers` - 获取供应商列表
- `POST /api/suppliers` - 创建供应商
- `GET /api/suppliers/:id` - 获取单个供应商
- `PUT /api/suppliers/:id` - 更新供应商
- `DELETE /api/suppliers/:id` - 删除供应商

### 分类接口
- `GET /api/categories` - 获取分类列表
- `POST /api/categories` - 创建分类
- `GET /api/categories/:id` - 获取单个分类
- `PUT /api/categories/:id` - 更新分类
- `DELETE /api/categories/:id` - 删除分类

## 环境变量

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/3c-inventory
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
```

## 数据模型

### 用户 (User)
- username: 用户名
- email: 邮箱
- password: 密码（加密）
- role: 角色（admin/manager/staff）

### 产品 (Product)
- name: 产品名称
- sku: 产品编码
- brand: 品牌
- model: 型号
- category: 分类
- specifications: 规格参数
- purchasePrice: 采购价
- sellingPrice: 销售价

### 库存 (Inventory)
- product: 产品引用
- currentStock: 当前库存
- reservedStock: 预留库存
- availableStock: 可用库存
- location: 存储位置

### 销售 (Sale)
- saleNumber: 销售单号
- customer: 客户信息
- items: 销售商品列表
- total: 总金额
- paymentMethod: 支付方式
- status: 订单状态

## 许可证

MIT License