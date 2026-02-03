# 维修业务更新 - 编辑功能和销售修复

## 更新日期
2026-02-02

## 备份信息
- **备份位置**：`StockControl-main-backup-20260202-182946`
- **备份时间**：2026-02-02 18:29:46

---

## 更新内容

### 1. 修复维修订单销售错误 ✅

#### 问题
销售维修订单时显示错误：
```
销售失败: 库存不存在: 🔧 iphone 15 (维修)
```

#### 原因
前端在提交销售数据时，没有传递 `repairId` 字段，导致后端无法识别这是维修订单。

#### 修复
**文件**：`StockControl-main/public/merchant.html`

在 `completeSale()` 函数中，更新销售数据的构建：

```javascript
// 修复前
items: cart.map(item => ({
  inventoryId: item.inventoryId,
  productName: item.productName,
  // ...
}))

// 修复后
items: cart.map(item => ({
  inventoryId: item.inventoryId || null,
  repairId: item.repairId || null,  // ✅ 添加 repairId
  productName: item.productName,
  // ...
}))
```

---

### 2. 添加维修记录编辑功能 ✅

#### 功能描述
- 点击维修记录行可以编辑订单信息
- 已销售的订单不可编辑
- 支持修改所有订单字段

#### 前端实现

##### 新增编辑模态框
**文件**：`StockControl-main/public/merchant.html`

添加了完整的编辑表单模态框，包含：
- 客户信息（电话、姓名）
- 设备信息（名称、IMEI、SN）
- 维修信息（问题描述、备注、地点、预计完成时间、费用、售价）

##### 更新维修记录表格
使整行可点击（除已销售订单）：

```html
<tr style="${repair.status !== 'sold' ? 'cursor: pointer;' : ''}" 
    ${repair.status !== 'sold' ? `onclick="showEditRepairModal('${repair._id}')"` : ''}
    ${repair.status !== 'sold' ? `onmouseover="this.style.background='#f0f9ff'"` : ''}
    ${repair.status !== 'sold' ? `onmouseout="this.style.background=''"` : ''}>
```

##### 新增 JavaScript 函数
1. `showEditRepairModal(repairId)` - 显示编辑模态框
2. `closeEditRepairModal()` - 关闭编辑模态框
3. `submitEditRepair(event)` - 提交编辑

#### 后端实现

##### 新增 API 端点
**文件**：`StockControl-main/app.js`

1. **GET /api/merchant/repairs/:id** - 获取单个维修订单详情
```javascript
app.get('/api/merchant/repairs/:id', async (req, res) => {
  // 返回维修订单详情
});
```

2. **PUT /api/merchant/repairs/:id** - 更新维修订单信息
```javascript
app.put('/api/merchant/repairs/:id', async (req, res) => {
  // 更新所有可编辑字段
  // 包括：客户信息、设备信息、维修信息、费用、售价
});
```

---

## 使用指南

### 编辑维修记录

#### 方式 1：点击表格行
1. 进入"维修业务"标签页
2. 找到要编辑的维修记录
3. 点击记录行（整行可点击）
4. 在弹出的编辑窗口中修改信息
5. 点击"✅ 保存修改"

#### 方式 2：使用操作按钮
1. 在维修记录表格中
2. 点击操作列的按钮（如果有）
3. 编辑信息并保存

#### 注意事项
- ✅ 未销售的订单可以编辑
- ❌ 已销售的订单不可编辑
- 🖱️ 鼠标悬停时，可编辑的行会高亮显示

### 销售维修订单

#### 正常流程
1. 创建维修订单并设置销售价格
2. 将订单状态更新为"等待销售"
3. 在"销售业务"中点击"🔧 维修订单"
4. 点击"+ 加入购物车"
5. 选择支付方式
6. 完成支付

#### 现在应该正常工作
- ✅ 不再显示"库存不存在"错误
- ✅ 维修订单正确识别为维修服务
- ✅ 使用 Service VAT 13.5% 税率
- ✅ 销售后订单状态更新为"已销售"

---

## 技术细节

### 数据流程

#### 销售维修订单
```
前端购物车
  ↓
cart.push({
  repairId: repairId,        // ✅ 关键字段
  productName: deviceName,
  price: salePrice,
  taxClassification: 'SERVICE_VAT_13_5'
})
  ↓
completeSale() 函数
  ↓
POST /api/merchant/sales/complete
{
  items: [{
    repairId: "xxx",         // ✅ 传递给后端
    inventoryId: null,
    // ...
  }]
}
  ↓
后端检查 item.repairId
  ↓
if (item.repairId) {
  // 处理维修订单
  // 更新状态为 sold
}
```

#### 编辑维修订单
```
点击表格行
  ↓
showEditRepairModal(repairId)
  ↓
GET /api/merchant/repairs/:id
  ↓
填充表单数据
  ↓
用户修改
  ↓
submitEditRepair()
  ↓
PUT /api/merchant/repairs/:id
{
  customerPhone: "...",
  deviceName: "...",
  salePrice: 195.00,
  // ...
}
  ↓
更新数据库
  ↓
刷新列表
```

---

## 测试场景

### 测试 1：编辑维修记录
1. 登录商户账号
2. 进入"维修业务"
3. 创建一个新的维修订单
4. 点击刚创建的记录行
5. 确认编辑窗口弹出
6. 修改设备名称和售价
7. 点击"保存修改"
8. 确认记录已更新

### 测试 2：已销售订单不可编辑
1. 找到一个已销售的维修订单
2. 尝试点击记录行
3. 确认没有反应（不可点击）
4. 确认鼠标悬停时没有高亮

### 测试 3：销售维修订单
1. 创建维修订单
   - 设备：iPhone 15
   - 维修费用：€100
   - 销售价格：€150
2. 标记为"等待销售"
3. 进入"销售业务"
4. 点击"🔧 维修订单"
5. 点击"+ 加入购物车"
6. 确认购物车显示：
   - 商品：🔧 iPhone 15 (维修)
   - 价格：€150.00
   - 税率：Service VAT 13.5%
7. 选择支付方式：现金
8. 点击"完成支付"
9. 确认销售成功（不再显示"库存不存在"错误）
10. 返回"维修业务"
11. 确认订单状态为"已销售"

---

## 修复的问题

### 问题 1：销售维修订单失败 ✅
- **错误信息**：库存不存在: 🔧 iphone 15 (维修)
- **原因**：前端没有传递 repairId
- **修复**：在 completeSale() 中添加 repairId 字段

### 问题 2：无法编辑维修记录 ✅
- **需求**：点击维修记录可以修改信息
- **实现**：
  - 添加编辑模态框
  - 使表格行可点击
  - 添加后端 API 支持

---

## API 更新

### 新增端点

#### GET /api/merchant/repairs/:id
获取单个维修订单详情

**请求**：
```
GET /api/merchant/repairs/65xyz...
```

**响应**：
```json
{
  "success": true,
  "data": {
    "_id": "65xyz...",
    "customerPhone": "0851234567",
    "deviceName": "iPhone 15",
    "repairCost": 100,
    "salePrice": 150,
    // ...
  }
}
```

#### PUT /api/merchant/repairs/:id
更新维修订单信息

**请求**：
```
PUT /api/merchant/repairs/65xyz...
Content-Type: application/json

{
  "customerPhone": "0851234567",
  "customerName": "张三",
  "deviceName": "iPhone 15 Pro",
  "deviceIMEI": "123456789012345",
  "deviceSN": "ABC123",
  "problemDescription": "屏幕破裂",
  "notes": "客户要求尽快",
  "repairLocation": "",
  "estimatedCompletionDate": "2026-02-05",
  "repairCost": 100,
  "salePrice": 150
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    // 更新后的维修订单
  }
}
```

---

## 相关文件

### 前端
- `StockControl-main/public/merchant.html`
  - 编辑模态框（约 540-630 行）
  - completeSale() 函数（约 1219-1290 行）
  - 维修记录表格（约 2370-2430 行）
  - 编辑相关函数（约 2600-2700 行）

### 后端
- `StockControl-main/app.js`
  - GET /api/merchant/repairs/:id（约 3610-3635 行）
  - PUT /api/merchant/repairs/:id（约 3637-3690 行）
  - POST /api/merchant/sales/complete（约 3739-3900 行）

---

## 服务器信息

- **状态**：✅ 运行中
- **进程 ID**：19
- **地址**：http://localhost:3000
- **测试账号**：merchant_001 / merchant123

---

## 浏览器缓存清理

如果遇到 JavaScript 错误，请清理浏览器缓存：

### Chrome/Edge
1. 按 `Ctrl + Shift + Delete`
2. 选择"缓存的图片和文件"
3. 点击"清除数据"
4. 或者按 `Ctrl + F5` 强制刷新

### Firefox
1. 按 `Ctrl + Shift + Delete`
2. 选择"缓存"
3. 点击"立即清除"
4. 或者按 `Ctrl + F5` 强制刷新

---

## 立即测试

1. **清理浏览器缓存**（重要！）
2. 访问：http://localhost:3000
3. 登录：merchant_001 / merchant123
4. 测试编辑功能
5. 测试销售维修订单

---

**更新完成！维修业务功能更加完善！** 🎉
