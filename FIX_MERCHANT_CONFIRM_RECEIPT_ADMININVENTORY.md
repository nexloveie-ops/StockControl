# 修复商户确认收货 API 支持 AdminInventory

## 问题描述
商户在 merchant.html 确认收货时报错：
```
确认收货失败: 产品不存在: Data Cable
```

## 根本原因
`/api/warehouse/orders/:id/complete` API 在处理库存转移时，只从 ProductNew 集合查找产品，不支持 AdminInventory 集合的产品（配件变体）。

具体问题位置：
1. **Line 2540**: 处理设备产品时使用 `ProductNew.findById(orderItem.productId)`
2. **Line 2630**: 处理配件产品时使用 `ProductNew.findById(orderItem.productId)`

## 修复方案

### 1. 使用 findProduct 辅助函数
API 开头已经定义了 `findProduct` 辅助函数，可以同时支持 ProductNew 和 AdminInventory：

```javascript
const findProduct = async (productId) => {
  let product = await ProductNew.findById(productId).populate('category', 'name type');
  let isAdminInventory = false;
  
  if (!product) {
    product = await AdminInventory.findById(productId);
    isAdminInventory = true;
  }
  
  return { product, isAdminInventory };
};
```

### 2. 修复设备产品处理逻辑（Line 2540）
```javascript
// 修改前
const product = await ProductNew.findById(orderItem.productId).populate('category', 'name type');

// 修改后
const { product, isAdminInventory } = await findProduct(orderItem.productId);

// 添加验证：AdminInventory 产品不应该有序列号
if (isAdminInventory) {
  return res.status(400).json({ 
    success: false, 
    error: `配件产品不应该有序列号: ${orderItem.productName}` 
  });
}
```

### 3. 修复配件产品处理逻辑（Line 2630）
```javascript
// 修改前
const product = await ProductNew.findById(orderItem.productId).populate('category', 'name type');

// 修改后
const { product, isAdminInventory } = await findProduct(orderItem.productId);
```

### 4. 处理字段差异

#### 分类名称和税务分类
```javascript
let categoryName, taxClassification;

if (isAdminInventory) {
  // AdminInventory 产品
  categoryName = product.category || '未分类';
  
  // AdminInventory 的 taxClassification 格式：'VAT 23%', 'Margin VAT' 等
  if (product.taxClassification === 'VAT 23%') {
    taxClassification = 'VAT_23';
  } else if (product.taxClassification === 'VAT 13.5%') {
    taxClassification = 'SERVICE_VAT_13_5';
  } else if (product.taxClassification === 'Margin VAT') {
    taxClassification = 'MARGIN_VAT_0';
  } else {
    taxClassification = 'VAT_23'; // 默认
  }
} else {
  // ProductNew 产品
  categoryName = product.category?.type || product.category?.name || '未分类';
  
  // 转换 vatRate 为 taxClassification
  if (product.vatRate === 'VAT 23%') {
    taxClassification = 'VAT_23';
  } else if (product.vatRate === 'VAT 13.5%') {
    taxClassification = 'SERVICE_VAT_13_5';
  } else if (product.vatRate === 'VAT 0%') {
    taxClassification = 'MARGIN_VAT_0';
  } else {
    taxClassification = 'VAT_23'; // 默认
  }
}
```

#### 产品名称
```javascript
productName: isAdminInventory ? product.productName : product.name
```

#### 库存扣减
```javascript
if (isAdminInventory) {
  // AdminInventory 使用 quantity 字段
  product.quantity -= quantity;
  
  if (product.quantity <= 0) {
    product.quantity = 0;
    product.isActive = false;
  }
} else {
  // ProductNew 使用 stockQuantity 字段
  product.stockQuantity -= quantity;
  
  if (product.stockQuantity <= 0) {
    product.stockQuantity = 0;
    product.isActive = false;
  }
}
```

## 数据模型对比

| 字段 | ProductNew | AdminInventory |
|------|-----------|----------------|
| 产品名称 | `name` | `productName` |
| 库存数量 | `stockQuantity` | `quantity` |
| 税务分类 | `vatRate` (e.g., 'VAT 23%') | `taxClassification` (e.g., 'VAT 23%') |
| 分类 | `category` (ObjectId, populated) | `category` (String) |
| 序列号 | `serialNumbers` (Array) | 无（配件不需要） |

## 测试步骤

### 1. 创建仓库订单
1. 登录商户账号：merchant001 / merchant123
2. 进入"从仓库订货"
3. 选择配件产品（如 Data Cable, iPhone Clear Case）
4. 提交订单

### 2. 仓库确认和发货
1. 登录管理员账号：admin / admin123
2. 进入"订单管理" > "仓库订单管理"
3. 找到新订单，点击"查看详情"
4. 点击"确认订单"
5. 点击"标记发货"

### 3. 商户确认收货
1. 切换回商户账号：merchant001 / merchant123
2. 进入"从仓库订货"
3. 找到已发货的订单
4. 点击"确认收货"
5. ✅ 应该成功，不再报错"产品不存在"

### 4. 验证库存转移
1. 商户进入"库存管理"
2. 应该能看到新入库的配件产品
3. 产品信息应该包含：
   - 产品名称、品牌、型号
   - 颜色、成色（如果有）
   - 正确的税务分类
   - 来源：从仓库订货

## 修改文件
- `StockControl-main/app.js` (lines 2540-2700)

## 状态
✅ 已完成 - 2026-02-06

## 相关文档
- `FIX_WAREHOUSE_ORDER_TAX_CALCULATION.md` - 仓库订单税务计算修复
- `ADMIN_INVENTORY_BATCH_VARIANTS_COMPLETE.md` - 批量创建变体功能
