# 修复供货商发票查询问题

## 完成时间
2026-02-09

## 问题描述
在 prototype-working.html 的"供货商/客户管理"中，点击供货商的"📋 查看发票"按钮时，无法显示通过批量创建变体功能创建的采购订单。

## 问题原因

### 数据不匹配
1. **API查询方式**：`/api/admin/suppliers/:supplierId/invoices`
   - 查询条件：`PurchaseInvoice.find({ supplier: supplierId })`
   - 期望 `supplier` 字段是供货商的 **ObjectId**

2. **批量创建变体时创建的订单**：
   - 使用的是：`supplier: supplier`（供货商名称字符串）
   - 实际存储的是供货商名称，而不是ID

3. **结果**：
   - 查询时使用供货商ID查找
   - 但订单中存储的是供货商名称
   - 导致查询不到任何结果

## 解决方案

### 修改批量创建变体API
在创建PurchaseInvoice之前，先根据供货商名称查找供货商ID。

#### 修改前
```javascript
if (!purchaseInvoice) {
  // 创建新的采购订单
  purchaseInvoice = new PurchaseInvoice({
    invoiceNumber: invoiceNumber.trim(),
    supplier: supplier,  // ❌ 使用名称（字符串）
    receivedDate: new Date(),
    items: [],
    totalAmount: 0,
    status: 'RECEIVED',
    notes: `批量创建变体: ${productName}`
  });
}
```

#### 修改后
```javascript
if (!purchaseInvoice) {
  // 根据供货商名称查找供货商ID
  const SupplierNew = require('./models/SupplierNew');
  const supplierDoc = await SupplierNew.findOne({ name: supplier });
  
  if (!supplierDoc) {
    return res.status(400).json({
      success: false,
      error: `供货商 "${supplier}" 不存在`
    });
  }
  
  // 创建新的采购订单
  purchaseInvoice = new PurchaseInvoice({
    invoiceNumber: invoiceNumber.trim(),
    supplier: supplierDoc._id,  // ✅ 使用供货商ID（ObjectId）
    receivedDate: new Date(),
    items: [],
    totalAmount: 0,
    status: 'RECEIVED',
    notes: `批量创建变体: ${productName}`
  });
}
```

## 技术细节

### PurchaseInvoice模型的supplier字段
```javascript
{
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupplierNew',
    required: true
  }
}
```
- 字段类型：`ObjectId`
- 引用模型：`SupplierNew`
- 必须使用供货商的 `_id`，不能使用名称

### 查询逻辑
```javascript
// API查询
const invoices = await PurchaseInvoice.find({ supplier: supplierId })
  .populate('supplier', 'name code')
  .sort({ invoiceDate: -1 });
```
- 查询条件：`supplier` 字段等于供货商ID
- 使用 `populate` 填充供货商详细信息
- 按发票日期降序排列

### 供货商查找
```javascript
const supplierDoc = await SupplierNew.findOne({ name: supplier });
```
- 根据供货商名称查找
- 返回完整的供货商文档
- 使用 `supplierDoc._id` 作为外键

## 数据一致性

### 正确的数据结构
```javascript
// PurchaseInvoice
{
  _id: ObjectId("..."),
  invoiceNumber: "INV-2024-001",
  supplier: ObjectId("67890..."),  // ✅ 供货商ID
  items: [...],
  totalAmount: 500.00,
  status: "RECEIVED"
}

// SupplierNew
{
  _id: ObjectId("67890..."),
  name: "Mobigo Limited",
  code: "SUP001",
  // ... 其他字段
}
```

### 查询结果
```javascript
// 查询：PurchaseInvoice.find({ supplier: ObjectId("67890...") })
// 结果：找到所有 supplier 字段等于该ID的订单
[
  {
    _id: ObjectId("..."),
    invoiceNumber: "INV-2024-001",
    supplier: {
      _id: ObjectId("67890..."),
      name: "Mobigo Limited",
      code: "SUP001"
    },
    items: [...],
    totalAmount: 500.00
  }
]
```

## 影响范围

### 修复后的功能
1. ✅ 批量创建变体时创建的订单使用正确的供货商ID
2. ✅ 供货商发票查询能够找到所有相关订单
3. ✅ 数据关系正确，支持populate查询
4. ✅ 供货商不存在时返回明确的错误信息

### 不受影响的功能
- 手动录入产品（如果也创建订单，需要检查）
- 发票识别功能
- 其他供货商管理功能

## 测试步骤

### 测试1：批量创建变体并查看发票
1. **重启服务器**：`node app.js`（后端有修改）
2. 登录 warehouse1 账号
3. 进入"入库管理" → "手动录入入库"
4. 点击"📦 批量创建变体"
5. 填写信息：
   - 产品名称：Test Product
   - 订单号：TEST-INV-001
   - 供货商：Mobigo Limited
   - 位置：A1-01
   - 填写维度和价格信息
6. 创建变体
7. 进入"供货商/客户管理"
8. 找到 Mobigo Limited
9. 点击"📋 查看发票"
10. **应该能看到订单 TEST-INV-001**

### 测试2：添加到现有订单
1. 再次批量创建变体
2. 使用相同订单号：TEST-INV-001
3. 使用相同供货商：Mobigo Limited
4. 创建不同的变体
5. 查看发票
6. **订单 TEST-INV-001 应该包含新旧变体**

### 测试3：供货商不存在
1. 批量创建变体
2. 填写订单号
3. 选择一个不存在的供货商（如果可能）
4. **应该返回错误：供货商不存在**

### 测试4：查看发票详情
1. 在发票列表中点击订单号
2. **应该能看到订单的详细信息**
3. **items列表应该包含所有变体**

## 数据库检查

### 检查PurchaseInvoice
```javascript
db.purchaseinvoices.find({ invoiceNumber: "TEST-INV-001" })
```
应该看到：
```javascript
{
  _id: ObjectId("..."),
  invoiceNumber: "TEST-INV-001",
  supplier: ObjectId("..."),  // ✅ 应该是ObjectId，不是字符串
  items: [...],
  totalAmount: 500.00
}
```

### 检查AdminInventory
```javascript
db.admininventories.find({ invoiceNumber: "TEST-INV-001" })
```
应该看到所有变体都有：
```javascript
{
  productName: "Test Product",
  model: "...",
  color: "...",
  supplier: "Mobigo Limited",  // 这里可以是名称
  invoiceNumber: "TEST-INV-001",
  // ... 其他字段
}
```

## 注意事项
- 供货商名称必须与数据库中的名称完全匹配（区分大小写）
- 如果供货商不存在，会返回400错误
- 服务器需要重启才能应用修改
- 已存在的错误数据需要手动修复或重新创建

## 文件修改
- `StockControl-main/app.js`
  - 修改 `/api/admin/inventory/batch-create-variants` API
  - 添加供货商查找逻辑
  - 使用供货商ID创建PurchaseInvoice

## 状态
✅ 已修复，需要重启服务器测试
