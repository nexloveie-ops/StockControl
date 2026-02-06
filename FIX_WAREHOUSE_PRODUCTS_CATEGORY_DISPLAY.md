# 修复仓库订货分类显示问题

## 问题描述
merchant.html 的"从仓库订货"功能中，产品分类显示错误，按 condition（成色）分组而不是按 category（大分类）分组。

## 问题原因
在 `app.js` 的 `/api/merchant/warehouse-products` API 中（第 5673 行开始），数据分组时错误地将 `category` 字段设置为 `condition` 值：

```javascript
// ❌ 错误代码
groupedProducts[key] = {
  productType: product.category?.type || 'Unknown',
  category: product.condition,  // 这里应该是分类，不是成色
  ...
};
```

## 修复方案
修改 API 返回数据的 `category` 字段，使其正确返回产品分类：

### 1. ProductNew 产品
```javascript
// ✅ 修复后
groupedProducts[key] = {
  productType: product.category?.type || 'Unknown',
  category: product.category?.name || product.category?.type || '未分类',
  ...
};
```

### 2. AdminInventory 产品（配件变体）
```javascript
// ✅ 修复后
groupedProducts[key] = {
  productType: item.category,
  category: item.category || '未分类',
  ...
};
```

## 修改文件
- `StockControl-main/app.js` (lines 5698-5708, 5724-5734)

## 测试步骤
1. 访问 http://localhost:3000/merchant.html
2. 使用批发商账号登录（merchant001 / merchant123）
3. 点击"从仓库订货"
4. 验证产品按正确的大分类显示（如：Screen Saver, Phone Case, Cable 等）
5. 不应该按成色（如：New, Used）分组

## 预期结果
- 产品按大分类分组显示（Screen Saver, Phone Case, Cable 等）
- 每个分类卡片显示该分类下的产品种类和总数量
- 点击分类后，显示该分类下的所有产品（包含不同型号、颜色、成色的变体）

## 完成时间
2026-02-05

## 状态
✅ 已修复并测试
