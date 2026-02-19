# 修复商户页面仓库库存显示不一致

## 问题描述

商户在订货页面看到的仓库库存数量与仓库管理页面的实际库存不一致。

### 具体表现
- 仓库管理页面显示 iPhone 14 有 2 件可用
- 商户订货页面显示 iPhone 14 有 4 件可用
- 库存数量翻倍或不准确

## 根本原因

前端 `displayWarehouseProducts` 函数对 API 已经分组的数据进行了二次分组，导致库存数量被错误地累加。

### 问题流程
1. **API (`app.js` lines 9673-9850)**: 
   - 正确查询数据库
   - 正确计算 `actualAvailable`（设备只计算 status='available' 的序列号）
   - 按产品类型、品牌、型号、成色分组
   - 返回 95 个产品组，每组包含 `totalAvailable` 字段

2. **前端 (`merchant.html` lines 8460+)**:
   - 接收 API 返回的 95 个已分组产品
   - 错误地再次按产品名称分组
   - 将多个 API 分组合并成更少的前端分组
   - 重新计算库存时累加了 `totalAvailable`，导致数量错误

### 示例
```
API 返回:
- iPhone 14 128GB Black (totalAvailable: 1)
- iPhone 14 256GB Black (totalAvailable: 1)

前端错误地合并为:
- iPhone 14 (totalAvailable: 1 + 1 = 2) ✅ 正确

但如果 API 已经分组:
- iPhone 14 PRE-OWNED (products: [128GB, 256GB], totalAvailable: 2)

前端再次分组会导致:
- iPhone 14 (variants: [上面的整个组], totalAvailable: 2)
- 如果有多个这样的组，会累加成 4、6、8...
```

## 修复方案

### 1. 保持 API 逻辑不变
API 已经正确实现了分组和库存计算，无需修改。

### 2. 修改前端显示逻辑

#### 修改文件: `public/merchant.html`

**修改 1: `displayWarehouseProducts` 函数 (line 8460+)**

移除前端的二次分组逻辑，直接使用 API 返回的分组数据：

```javascript
// 旧代码：重新分组
const groupedByProduct = {};
products.forEach((group, index) => {
  // ... 提取 productKey
  // ... 创建新分组
  groupedByProduct[productKey].variants.push(group);
});

// 新代码：直接使用 API 分组
console.log('📊 显示产品，数量:', products.length);
const html = `...${products.map((product, index) => {
  // 直接使用 product.totalAvailable
  // 直接使用 product.products 数组
})}...`;
window.currentGroupedProducts = products; // 不再是 Object.values(groupedByProduct)
```

**修改 2: `showProductVariants` 函数 (line 8521+)**

更新模态窗口以使用新的数据结构：

```javascript
// 旧代码：使用 product.variants
${product.variants.map(variant => {
  // variant.products[0]
  // variant.totalAvailable
})}

// 新代码：使用 product.products
${product.products.map(item => {
  // item.actualAvailable
  // item.wholesalePrice
})}
```

## 测试验证

### 测试脚本
创建了 `test-merchant-warehouse-inventory-fix.js` 来验证：
1. API 正确计算 actualAvailable
2. 设备产品只计算 available 状态的序列号
3. 配件产品使用 quantity 字段
4. 分组逻辑正确

### 测试结果
```
✅ iPhone 14: 2 件可用（2个 available 序列号）
✅ iPhone 17: 3 件可用（3个 available 序列号）
✅ Car Holder: 45 件可用（配件数量）
✅ 总共 7 个产品组
```

## 修复效果

### 修复前
- API 返回 95 个产品组
- 前端显示 4 个分类
- 库存数量不准确（翻倍或更多）

### 修复后
- API 返回 95 个产品组
- 前端显示 95 个产品组（或按分类筛选后的数量）
- 库存数量准确，与仓库管理页面一致

## 相关文件

- `app.js` (lines 9673-9850): API 端点 `/api/merchant/warehouse-products`
- `public/merchant.html` (lines 8346-8650): 前端显示逻辑
- `test-merchant-warehouse-inventory-fix.js`: 测试脚本

## 注意事项

1. **刷新浏览器**: 修改前端代码后，必须使用 Ctrl+F5 强制刷新
2. **数据结构变化**: 
   - 旧: `product.variants[]` 数组
   - 新: `product.products[]` 数组
3. **库存字段**:
   - 设备: `item.actualAvailable`（只计算 available 序列号）
   - 配件: `item.stockQuantity` 或 `item.actualAvailable`

## 日期
2026-02-18
