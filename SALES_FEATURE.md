# 销售功能和公司信息管理

## 修改日期
2026-02-02 00:39

## 备份信息
- 备份文件夹：`StockControl-main-backup-20260202-003932`
- 备份内容：完整项目文件

## 功能概述

实现了完整的销售功能和公司信息管理：
1. **销售功能**：在客户管理页面直接销售产品给客户
2. **公司信息管理**：配置卖方（Seller）公司信息
3. **发票生成**：自动生成销售发票并支持打印/下载

## 新增功能

### 1. 公司信息管理 (🏢 公司信息设置)

#### 功能位置
- 在"供货商/客户管理"页面右上角
- 点击"🏢 公司信息设置"按钮

#### 可配置信息
- **基本信息**：
  - 公司名称 *（必填）
  - 街道地址
  - 城市
  - 邮编
  - 国家（默认：Ireland）
  
- **联系信息**：
  - 电话
  - 邮箱
  
- **税务信息**：
  - 税号（VAT Number）
  
- **银行信息**：
  - IBAN（国际银行账号）
  - BIC/SWIFT代码
  - 银行名称
  - 账户名称

#### 数据存储
- 模型：`CompanyInfo`
- 只保存一个默认公司信息（`isDefault: true`）
- 支持更新现有信息

---

### 2. 销售功能 (💰 销售)

#### 功能位置
- 在"客户管理"页面
- 每个客户行都有"💰 销售"按钮

#### 销售流程

##### 步骤 1: 点击销售按钮
- 点击客户的"💰 销售"按钮
- 系统记录当前客户信息

##### 步骤 2: 选择产品
- 弹出产品选择模态框
- 产品按类别分组显示
- 只显示有库存的产品
- 每个产品显示：
  - 产品名称
  - SKU和库存数量
  - 零售价（含税）
  - 数量输入框

##### 步骤 3: 输入数量
- 在每个产品的数量框输入销售数量
- 数量范围：0 到 库存数量
- 实时更新已选择产品数量

##### 步骤 4: 确认销售
- 点击"✅ 确认销售"按钮
- 系统创建销售发票
- 自动扣减库存
- 显示成功消息

##### 步骤 5: 下载发票
- 询问是否下载发票PDF
- 点击"是"打开发票打印页面
- 可以打印或保存为PDF

---

### 3. 销售发票

#### 发票内容

**发票头部：**
- 公司信息（左侧）
  - 公司名称
  - 地址
  - 电话、邮箱
  - 税号
- 发票信息（右侧）
  - 发票编号
  - 发票日期
  - 状态

**客户信息：**
- 客户名称
- 联系人
- 电话、邮箱
- 税号

**产品明细表：**
| 产品名称 | SKU | 数量 | 单价（含税） | 总价（含税） | 税率 |
|---------|-----|------|-------------|-------------|------|
| ...     | ... | ... | ...         | ...         | ...  |

**金额汇总：**
- 小计（不含税）
- 税额
- **总金额（含税）**

**付款信息：**
- IBAN
- BIC/SWIFT
- 银行名称

#### 发票编号规则
```
SI-{时间戳}-{序号}
例如：SI-1738454372000-0001
```

---

## 数据模型

### CompanyInfo 模型
```javascript
{
  companyName: String,        // 公司名称
  address: {
    street: String,
    city: String,
    postalCode: String,
    country: String
  },
  contact: {
    phone: String,
    email: String
  },
  taxNumber: String,          // 税号
  bankDetails: {
    iban: String,             // IBAN
    bic: String,              // BIC/SWIFT
    bankName: String,         // 银行名称
    accountName: String       // 账户名称
  },
  isDefault: Boolean,         // 是否为默认
  createdBy: ObjectId,
  updatedBy: ObjectId
}
```

### SalesInvoice 模型（已存在，已更新）
```javascript
{
  invoiceNumber: String,      // 发票编号
  customer: ObjectId,         // 客户引用
  invoiceDate: Date,          // 发票日期
  items: [{
    product: ObjectId,        // 产品引用
    description: String,      // 产品描述
    quantity: Number,         // 数量
    unitPrice: Number,        // 单价（不含税）
    totalPrice: Number,       // 总价（不含税）
    vatRate: String,          // 税率
    taxAmount: Number,        // 税额
    serialNumbers: [String],  // 序列号
    barcode: String          // 条码
  }],
  subtotal: Number,           // 小计（不含税）
  taxAmount: Number,          // 税额合计
  totalAmount: Number,        // 总金额（含税）
  currency: String,           // 货币
  status: String,             // 状态
  paymentStatus: String,      // 付款状态
  notes: String,              // 备注
  createdBy: ObjectId
}
```

---

## API 端点

### 公司信息管理

#### 获取公司信息
```
GET /api/admin/company-info
```

**响应：**
```json
{
  "success": true,
  "data": {
    "companyName": "...",
    "address": {...},
    "contact": {...},
    "taxNumber": "...",
    "bankDetails": {...}
  }
}
```

#### 保存/更新公司信息
```
POST /api/admin/company-info
```

**请求体：**
```json
{
  "companyName": "My Company Ltd",
  "address": {
    "street": "123 Main St",
    "city": "Dublin",
    "postalCode": "D01 ABC1",
    "country": "Ireland"
  },
  "contact": {
    "phone": "+353 1 234 5678",
    "email": "info@mycompany.ie"
  },
  "taxNumber": "IE1234567X",
  "bankDetails": {
    "iban": "IE12BOFI90000112345678",
    "bic": "BOFIIE2D",
    "bankName": "Bank of Ireland",
    "accountName": "My Company Ltd"
  }
}
```

---

### 销售发票管理

#### 创建销售发票
```
POST /api/admin/sales-invoices
```

**请求体：**
```json
{
  "customerId": "customer_id",
  "items": [
    {
      "productId": "product_id",
      "quantity": 2,
      "serialNumbers": ["SN001", "SN002"]
    }
  ],
  "notes": "备注信息"
}
```

**响应：**
```json
{
  "success": true,
  "message": "销售发票创建成功",
  "data": {
    "_id": "...",
    "invoiceNumber": "SI-1738454372000-0001",
    "customer": {...},
    "items": [...],
    "subtotal": 100.00,
    "taxAmount": 23.00,
    "totalAmount": 123.00,
    ...
  }
}
```

#### 获取销售发票详情
```
GET /api/admin/sales-invoices/:invoiceId
```

**响应：**
```json
{
  "success": true,
  "data": {
    "invoiceNumber": "SI-...",
    "customer": {...},
    "items": [
      {
        "product": {...},
        "quantity": 2,
        "unitPrice": 100.00,
        "unitPriceIncludingTax": 123.00,
        "totalPrice": 200.00,
        "totalPriceIncludingTax": 246.00,
        "vatRate": "VAT 23%",
        "taxAmount": 46.00
      }
    ],
    "subtotal": 200.00,
    "taxAmount": 46.00,
    "totalAmount": 246.00,
    "companyInfo": {...}
  }
}
```

---

## 价格计算逻辑

### 销售价格
- 使用产品的**零售价（retailPrice）**
- 零售价已经是含税价格

### 税额计算
```javascript
// 从含税价格反推不含税价格和税额
const vatRate = product.vatRate; // 例如 "VAT 23%"
const taxMultiplier = vatRate === 'VAT 23%' ? 0.23 : 
                     vatRate === 'VAT 13.5%' ? 0.135 : 0;

// 含税价格
const priceIncludingTax = product.retailPrice * quantity;

// 不含税价格
const priceExcludingTax = priceIncludingTax / (1 + taxMultiplier);

// 税额
const taxAmount = priceIncludingTax - priceExcludingTax;
```

### 示例计算
```
产品零售价（含税）: €123.00
税率: VAT 23%

计算过程：
1. 不含税价格 = €123.00 / 1.23 = €100.00
2. 税额 = €123.00 - €100.00 = €23.00

发票显示：
- 单价（含税）: €123.00
- 小计（不含税）: €100.00
- 税额: €23.00
- 总金额（含税）: €123.00
```

---

## 库存管理

### 自动扣减库存
创建销售发票时，系统自动扣减产品库存：

```javascript
await ProductNew.findByIdAndUpdate(
  productId,
  { $inc: { stockQuantity: -quantity } }
);
```

### 库存检查
- 产品选择时只显示有库存的产品（`stockQuantity > 0`）
- 数量输入框限制最大值为当前库存

---

## 前端功能

### 全局变量
```javascript
let currentSaleCustomer = null;  // 当前销售的客户
let selectedProducts = [];       // 已选择的产品列表
```

### 主要函数

#### startSale(customerId, customerName)
- 开始销售流程
- 获取所有产品
- 显示产品选择模态框

#### showProductSelectionModal(products)
- 显示产品选择界面
- 按类别分组显示产品
- 提供数量输入框

#### updateProductSelection(productId, productName, price, maxQty)
- 更新已选择的产品列表
- 实时更新选择数量显示

#### confirmSale()
- 验证至少选择一个产品
- 调用API创建销售发票
- 更新库存
- 询问是否下载发票

#### downloadSalesInvoice(invoiceId)
- 获取发票详情
- 生成发票PDF

#### generateInvoicePDF(invoice)
- 创建打印窗口
- 生成HTML格式的发票
- 支持打印和保存为PDF

#### showCompanyInfoModal()
- 显示公司信息设置表单
- 加载现有公司信息

#### saveCompanyInfo(event)
- 保存公司信息
- 支持创建和更新

---

## 使用流程

### 设置公司信息（首次使用）

1. 进入"供货商/客户管理"页面
2. 点击右上角"🏢 公司信息设置"
3. 填写公司信息：
   - 公司名称（必填）
   - 地址信息
   - 联系方式
   - 税号
   - 银行信息（IBAN等）
4. 点击"💾 保存"

### 销售产品给客户

1. 进入"供货商/客户管理"页面
2. 点击"🛒 客户管理"子标签
3. 找到目标客户
4. 点击"💰 销售"按钮
5. 在产品选择界面：
   - 浏览产品（按类别分组）
   - 输入销售数量
   - 查看已选择数量
6. 点击"✅ 确认销售"
7. 系统创建发票并扣减库存
8. 选择是否下载发票PDF
9. 在打印页面：
   - 点击"🖨️ 打印发票"打印
   - 或使用浏览器"另存为PDF"功能

### 查看销售发票

1. 在客户管理页面
2. 点击客户的"📋 查看发票"
3. 在发票列表中查看所有销售发票

---

## 发票打印页面

### 特点
- 专业的发票格式
- 包含完整的公司和客户信息
- 清晰的产品明细表
- 税额分解
- 付款信息
- 支持浏览器打印功能
- 可保存为PDF

### 打印提示
- 使用浏览器的打印功能（Ctrl+P 或 Cmd+P）
- 选择"另存为PDF"保存电子版
- 或直接打印到打印机

---

## 技术要点

### 1. 价格一致性
- 数据库存储：不含税价格
- 用户界面显示：含税价格
- 发票显示：含税价格
- 计算逻辑：从含税反推不含税

### 2. 税额计算
- 每个产品独立计算税额
- 发票总税额 = Σ(每个产品的税额)
- 支持一张发票多种税率

### 3. 库存管理
- 创建发票时自动扣减库存
- 使用MongoDB的原子操作（$inc）
- 确保库存准确性

### 4. 发票编号
- 使用时间戳确保唯一性
- 包含序号便于追踪
- 格式：SI-{timestamp}-{序号}

### 5. 打印功能
- 使用window.open创建新窗口
- 纯HTML/CSS实现打印样式
- 使用@media print优化打印效果
- 支持浏览器原生打印功能

---

## 注意事项

### 1. 公司信息
- 首次使用前必须设置公司信息
- 公司信息会显示在所有销售发票上
- 建议填写完整的银行信息

### 2. 库存检查
- 只能销售有库存的产品
- 销售数量不能超过库存
- 销售后库存自动扣减

### 3. 价格使用
- 销售使用零售价（retailPrice）
- 零售价必须大于批发价和进货价
- 价格已包含税额

### 4. 发票状态
- 创建时状态为"confirmed"（已确认）
- 付款状态为"pending"（待付款）
- 后续可以更新付款状态

### 5. 打印兼容性
- 支持所有现代浏览器
- 建议使用Chrome或Edge浏览器
- 打印前预览确认格式正确

---

## 测试建议

### 测试场景 1: 设置公司信息
1. 点击"🏢 公司信息设置"
2. 填写所有字段
3. 保存并验证成功
4. 重新打开验证信息已保存

### 测试场景 2: 销售单个产品
1. 选择一个客户
2. 点击"💰 销售"
3. 选择一个产品，输入数量1
4. 确认销售
5. 验证发票创建成功
6. 验证库存已扣减

### 测试场景 3: 销售多个产品
1. 选择一个客户
2. 点击"💰 销售"
3. 选择多个产品，输入不同数量
4. 确认销售
5. 验证发票包含所有产品
6. 验证所有产品库存已扣减

### 测试场景 4: 多税率产品
1. 选择包含不同税率的产品
2. 创建销售发票
3. 验证每个产品的税额计算正确
4. 验证总税额 = 各产品税额之和

### 测试场景 5: 发票打印
1. 创建销售发票
2. 选择下载发票
3. 验证发票内容完整
4. 验证公司信息显示正确
5. 验证客户信息显示正确
6. 测试打印功能

### 测试场景 6: 库存不足
1. 选择库存为0的产品
2. 验证产品不显示在选择列表中
3. 选择库存为1的产品
4. 尝试输入数量2
5. 验证数量被限制为最大库存

---

## 下一步优化

### 1. 发票管理
- 编辑发票
- 取消发票
- 发票历史记录
- 发票搜索和筛选

### 2. 付款管理
- 记录付款
- 部分付款
- 付款历史
- 逾期提醒

### 3. 报表功能
- 销售统计
- 客户销售排行
- 产品销售排行
- 收入分析

### 4. 高级功能
- 折扣管理
- 批量销售
- 销售退货
- 信用额度管理

### 5. PDF增强
- 使用PDF库生成真正的PDF
- 添加公司Logo
- 自定义发票模板
- 电子签名

---

## 文件修改清单

### 新增文件
1. **StockControl-main/models/CompanyInfo.js**
   - 公司信息数据模型

### 修改文件

2. **StockControl-main/app-new.js**
   - 导入CompanyInfo模型
   - 添加公司信息管理API（2个端点）
   - 添加销售发票管理API（2个端点）

3. **StockControl-main/public/prototype-working.html**
   - 添加"🏢 公司信息设置"按钮
   - 客户列表添加"💰 销售"按钮
   - 添加销售相关JavaScript函数（10+个）
   - 添加公司信息管理函数（2个）

---

## 总结

✅ **功能完成：**
- 公司信息管理（设置卖方信息）
- 销售功能（选择产品、创建发票）
- 发票生成（自动计算税额）
- 发票打印/下载（PDF格式）
- 库存自动扣减

✅ **数据完整：**
- 公司信息（名称、地址、税号、银行）
- 客户信息
- 产品信息
- 销售发票
- 税额计算

✅ **用户体验：**
- 直观的销售流程
- 产品按类别分组
- 实时数量更新
- 专业的发票格式
- 便捷的打印功能

✅ **备份完成：**
- `StockControl-main-backup-20260202-003932`

系统现在支持完整的销售流程，从选择客户、选择产品、创建发票到打印下载，一气呵成！
