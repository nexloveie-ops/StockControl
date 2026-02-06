# 修复 AdminInventory 产品调价调量功能

## 问题描述
在管理员库存页面点击 AdminInventory 产品的"调价"或"调量"按钮时，出现404错误：
```
Failed to load resource: the server responded with a status of 404 (Not Found)
获取产品信息失败: 产品不存在
```

## 根本原因
调价和调量功能使用的API端点（`/api/admin/products/:id`）只查询 `ProductNew` 模型，无法找到 `AdminInventory` 模型中的产品。

## 解决方案

### 1. 更新获取产品详情API
**端点**: `GET /api/admin/products/:id`
**文件**: `app.js` (行 2808-2857)

修改逻辑：
1. 先在 `ProductNew` 中查找产品
2. 如果找不到，再在 `AdminInventory` 中查找
3. 根据来源返回相应格式的数据

```javascript
// 先尝试在 ProductNew 中查找
let product = await ProductNew.findById(req.params.id)
  .populate('category', 'name type')
  .lean();

// 如果找不到，尝试在 AdminInventory 中查找
if (!product) {
  product = await AdminInventory.findById(req.params.id).lean();
  isAdminInventory = true;
}
```

### 2. 更新调价API
**端点**: `PUT /api/admin/products/:id/price`
**文件**: `app.js` (行 2858-2910)

修改逻辑：
1. 先在 `ProductNew` 中查找
2. 如果找不到，在 `AdminInventory` 中查找
3. 更新相应模型的价格字段

```javascript
// 先尝试在 ProductNew 中查找
let product = await ProductNew.findById(req.params.id);

// 如果找不到，尝试在 AdminInventory 中查找
if (!product) {
  product = await AdminInventory.findById(req.params.id);
  isAdminInventory = true;
}

// 更新价格
if (costPrice !== undefined) product.costPrice = costPrice;
if (wholesalePrice !== undefined) product.wholesalePrice = wholesalePrice;
if (retailPrice !== undefined) product.retailPrice = retailPrice;

await product.save();
```

### 3. 更新调量API
**端点**: `PUT /api/admin/products/:id/quantity`
**文件**: `app.js` (行 2912-2975)

修改逻辑：
1. 先在 `ProductNew` 中查找
2. 如果找不到，在 `AdminInventory` 中查找
3. 根据模型类型使用不同的数量字段：
   - `ProductNew`: `stockQuantity`
   - `AdminInventory`: `quantity`

```javascript
// 先尝试在 ProductNew 中查找
let product = await ProductNew.findById(req.params.id);
let quantityField = 'stockQuantity';

// 如果找不到，尝试在 AdminInventory 中查找
if (!product) {
  product = await AdminInventory.findById(req.params.id);
  isAdminInventory = true;
  quantityField = 'quantity';
}

// 更新数量
product[quantityField] = newQuantity;
await product.save();
```

## API响应格式

### 获取产品详情

#### ProductNew 产品
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "iPhone 14 128GB",
    "stockQuantity": 3,
    "costPrice": 615.00,
    "wholesalePrice": 650.00,
    "retailPrice": 700.00,
    "source": "ProductNew"
  }
}
```

#### AdminInventory 产品
```json
{
  "success": true,
  "data": {
    "_id": "69851f0108c47fdea66181bf",
    "name": "iPhone Clear Case",
    "model": "iPhone 17 Air",
    "color": "Pink",
    "quantity": 50,
    "costPrice": 2.46,
    "wholesalePrice": 2.75,
    "retailPrice": 15.00,
    "source": "AdminInventory"
  }
}
```

### 调价响应
```json
{
  "success": true,
  "message": "价格更新成功",
  "data": {
    "costPrice": 2.50,
    "wholesalePrice": 3.00,
    "retailPrice": 16.00,
    "source": "AdminInventory"
  }
}
```

### 调量响应
```json
{
  "success": true,
  "message": "数量更新成功",
  "data": {
    "oldQuantity": 50,
    "newQuantity": 60,
    "type": "add",
    "note": "补货",
    "source": "AdminInventory"
  }
}
```

## 测试步骤

### 1. 重启服务器
```bash
# 服务器已自动重启
# 进程ID: 24
```

### 2. 测试调价功能
1. 登录管理员账号（admin / admin123）
2. 打开 prototype-working.html
3. 点击"库存管理"标签
4. 点击 Phone Case 分类
5. 展开 iPhone Clear Case
6. 点击任意变体的"💰 调价"按钮
7. 修改价格（如：成本€2.50, 批发€3.00, 零售€16.00）
8. 点击"保存"

**预期结果**:
- ✅ 成功保存价格
- ✅ 显示"价格更新成功"
- ✅ 列表中的价格立即更新

### 3. 测试调量功能
1. 在同一个变体上点击"📊 调量"按钮
2. 选择调整类型（增加/减少/设置）
3. 输入数量（如：增加 10）
4. 点击"保存"

**预期结果**:
- ✅ 成功保存数量
- ✅ 显示"数量更新成功"
- ✅ 列表中的数量立即更新（50 → 60）

### 4. 测试普通产品
1. 点击 Pre-Owned Devices 分类
2. 点击 iPhone 14 的"💰 调价"按钮
3. 修改价格
4. 点击"保存"

**预期结果**:
- ✅ 普通产品（ProductNew）的调价功能仍然正常工作

## 服务器日志

成功更新时的日志：
```
✅ 价格更新成功 (AdminInventory): iPhone Clear Case
✅ 数量更新成功 (AdminInventory): iPhone Clear Case, 50 → 60
```

## 数据字段映射

| 字段 | ProductNew | AdminInventory |
|------|-----------|----------------|
| 产品名称 | name | productName |
| 数量 | stockQuantity | quantity |
| 进货价 | costPrice | costPrice |
| 批发价 | wholesalePrice | wholesalePrice |
| 零售价 | retailPrice | retailPrice |
| 分类 | productType | category |
| 型号 | model | model |
| 颜色 | color | color |

## 兼容性

### 前端无需修改
- ✅ 调价对话框继续使用相同的API
- ✅ 调量对话框继续使用相同的API
- ✅ 数据格式保持兼容

### 后端智能识别
- ✅ 自动识别产品来源（ProductNew 或 AdminInventory）
- ✅ 使用正确的字段名
- ✅ 返回统一格式的响应

## 相关API

以下API也已更新以支持 AdminInventory：

### 查询API
- ✅ `GET /api/products` - 产品列表
- ✅ `GET /api/warehouse/products` - 仓库产品
- ✅ `GET /api/merchant/warehouse-products` - 商户订货
- ✅ `GET /api/admin/products/:id` - 产品详情

### 更新API
- ✅ `PUT /api/admin/products/:id/price` - 调价
- ✅ `PUT /api/admin/products/:id/quantity` - 调量

### 待更新API（如需要）
- `PUT /api/admin/products/:id/location` - 设置位置
- `PUT /api/admin/products/:id/status` - 更改状态

## 相关文件

### 修改文件
- ✅ `app.js` - 更新3个API端点

### 相关文档
- `ADMIN_INVENTORY_VARIANT_GROUPING.md` - 变体分组显示
- `FIX_PROTOTYPE_WORKING_ADMIN_INVENTORY.md` - API集成
- `ADMIN_INVENTORY_MODEL_COMPLETE.md` - AdminInventory模型

## 总结

✅ **问题已解决**: AdminInventory 产品现在可以正常调价和调量
✅ **API已更新**: 3个端点支持双模型查询
✅ **服务器已重启**: 新代码已生效
✅ **向后兼容**: ProductNew 产品功能不受影响
✅ **智能识别**: 自动判断产品来源并使用正确的字段

---
**完成时间**: 2026-02-05
**状态**: ✅ 完成
**服务器**: 已重启（进程ID: 24）
