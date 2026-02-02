# 3C产品管理系统 - 原型测试指南

## 快速启动步骤

### 1. 确保 MongoDB 正在运行

检查 MongoDB 是否已启动：
```bash
# Windows
net start MongoDB

# 或者检查服务状态
sc query MongoDB
```

如果没有安装 MongoDB，请先安装：
- 下载地址: https://www.mongodb.com/try/download/community
- 或使用 MongoDB Atlas 云服务（免费）

### 2. 填充测试数据

运行数据填充脚本：
```bash
npm run seed
```

这将创建：
- ✅ 3个供应商
- ✅ 5个测试用户（不同角色）
- ✅ 3个配件产品
- ✅ 3个全新设备
- ✅ 3个二手设备
- ✅ 1个示例销售发票
- ✅ 1个示例采购订单

### 3. 启动原型服务器

```bash
npm run prototype
```

服务器将在 http://localhost:3000 启动

### 4. 访问原型界面

在浏览器中打开：
```
http://localhost:3000/prototype.html
```

## 测试账号

系统已创建以下测试账号（暂未实现登录功能，仅用于数据展示）：

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | 管理员 | 完整权限 |
| warehouse1 | warehouse123 | 仓管员 | 折扣范围: 0-10% |
| merchant_vip | merchant123 | VIP批发商户 | 等级1，最优价格 |
| merchant_gold | merchant123 | Gold批发商户 | 等级2 |
| customer1 | customer123 | 零售客户 | 零售价格 |

## 功能测试清单

### ✅ 产品管理
- [x] 查看所有产品列表
- [x] 按类别筛选（配件/全新设备/二手设备）
- [x] 按状态筛选（可销售/坏损/报废/已售）
- [x] 搜索产品（名称/条码/序列号）
- [x] 查看产品详情（价格、税务、库存位置）
- [x] 查看分级定价（VIP/Gold等级价格）

### ✅ 销售发票
- [x] 查看销售发票列表
- [x] 查看发票详情（客户、产品、折扣、税额）
- [x] 查看发票状态（草稿/已确定/已取消）

### ✅ 采购订单
- [x] 查看采购订单列表
- [x] 查看订单状态（草稿/已发送/已下单/已发货/已收货/已确认）
- [x] 查看跟踪号和日期信息

### ✅ 供应商管理
- [x] 查看供应商列表
- [x] 查看供应商详细信息
- [x] 查看供应商状态（活跃/停用）

### ✅ 用户管理
- [x] 查看用户列表
- [x] 查看用户角色
- [x] 查看商户等级
- [x] 查看折扣权限范围

### ✅ 统计数据
- [x] 总产品数
- [x] 可销售产品数
- [x] 按类别统计（配件/全新/二手）
- [x] 供应商数量

## API 端点测试

你也可以直接测试 API 端点：

### 获取统计数据
```bash
curl http://localhost:3000/api/stats
```

### 获取所有产品
```bash
curl http://localhost:3000/api/products
```

### 按类别筛选产品
```bash
curl http://localhost:3000/api/products?category=ACCESSORY
```

### 搜索产品
```bash
curl http://localhost:3000/api/products?search=iPhone
```

### 获取销售发票
```bash
curl http://localhost:3000/api/invoices
```

### 获取采购订单
```bash
curl http://localhost:3000/api/purchase-orders
```

### 获取供应商
```bash
curl http://localhost:3000/api/suppliers
```

### 获取用户
```bash
curl http://localhost:3000/api/users
```

## 数据示例

### 配件类产品示例
- iPhone 15 Pro 保护壳 (条码: 8901234567890, 数量: 150)
- USB-C 数据线 2米 (条码: 8901234567891, 数量: 300)
- 无线充电器 15W (条码: 8901234567892, 数量: 80)

### 全新设备示例
- iPhone 15 Pro 256GB (SN: SN1234567890001)
- Samsung Galaxy S24 Ultra 512GB (SN: SN1234567890002)
- MacBook Pro 14" M3 (SN: SN1234567890003)

### 二手设备示例
- iPhone 13 Pro 128GB (IMEI: IMEI123456789001, 成色: A+, 税务: Margin VAT 0%)
- Samsung Galaxy S22 256GB (IMEI: IMEI123456789002, 成色: A, 税务: VAT 23%)
- iPad Air 64GB (IMEI: IMEI123456789003, 成色: B, 税务: Margin VAT 0%)

## 价格体系示例

以 iPhone 15 Pro 保护壳为例：
- 进货价: €15.00
- 进货税 (VAT 23%): €3.45
- 建议零售价: €39.99
- 批发价: €25.00
- VIP等级价格: €22.00
- Gold等级价格: €24.00

## 下一步开发计划

原型验证通过后，可以继续开发：

1. **用户认证系统**
   - 登录/登出功能
   - JWT token 管理
   - 基于角色的权限控制

2. **产品管理功能**
   - 添加新产品
   - 编辑产品信息
   - 更新价格
   - 调整库存

3. **销售发票功能**
   - 创建新发票
   - 添加产品到发票
   - 应用折扣
   - 确定发票（更新库存）

4. **采购订单功能**
   - 创建采购订单
   - 修改订单
   - 更新订单状态
   - 确认收货（自动更新库存）

5. **报表功能**
   - 库存报表
   - 销售报表
   - 采购报表
   - 利润率分析

## 故障排除

### MongoDB 连接失败
- 确保 MongoDB 服务正在运行
- 检查 .env 文件中的 MONGODB_URI 配置
- 默认连接: mongodb://localhost:27017/3c-product-system

### 端口被占用
- 修改 .env 文件中的 PORT 配置
- 或者停止占用 3000 端口的其他服务

### 数据填充失败
- 确保 MongoDB 连接正常
- 删除现有数据库重新填充：
  ```bash
  # 在 MongoDB shell 中
  use 3c-product-system
  db.dropDatabase()
  ```
  然后重新运行 `npm run seed`

## 技术栈

- **后端**: Node.js + Express
- **数据库**: MongoDB + Mongoose
- **前端**: 原生 HTML/CSS/JavaScript
- **认证**: bcryptjs (密码加密)

## 文件结构

```
├── models/                 # 数据模型
│   ├── Product3C.js       # 产品模型
│   ├── User3C.js          # 用户模型
│   ├── Supplier3C.js      # 供应商模型
│   ├── SalesInvoice.js    # 销售发票模型
│   └── PurchaseOrder.js   # 采购订单模型
├── scripts/
│   └── seed-data.js       # 测试数据填充脚本
├── public/
│   └── prototype.html     # 原型界面
├── app-prototype.js       # 原型服务器
└── PROTOTYPE_GUIDE.md     # 本文档
```

## 反馈和建议

测试过程中如有任何问题或建议，请记录下来，我们会在正式开发时改进。
