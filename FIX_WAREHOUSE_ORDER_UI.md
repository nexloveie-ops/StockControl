# 修复：从仓库订货 UI 问题

## 问题分析

发现了代码中存在两套不同的实现：

### 实现 A（旧的，不完整）
- 函数：`loadWarehouseCategories()`, `loadWarehouseProductsByCategory()`
- API：`/api/warehouse/products`（使用了 applyDataIsolation 中间件，会过滤 merchantId）
- HTML 容器：`warehouseCategories`

### 实现 B（新的，完整）
- 函数：`loadWarehouseProducts()`, `showWarehouseCategory()`, `displayWarehouseProducts()`
- API：`/api/merchant/warehouse-products`（正确的 API）
- HTML 容器：`warehouseCategoryList`

## 问题根源

`switchWarehouseTab('order')` 调用了 `loadWarehouseCategories()`（实现 A），但应该调用 `loadWarehouseProducts()`（实现 B）。

## 已实施的修复

1. ✅ 修改 `switchWarehouseTab()` 函数，调用 `loadWarehouseProducts()`
2. ✅ 将 `loadWarehouseCategories()` 改为调用 `loadWarehouseProducts()`
3. ✅ 在 `loadWarehouseProducts()` 中添加详细的调试日志

## 测试步骤

1. **刷新浏览器页面**（Ctrl + F5 强制刷新）
2. **打开开发者工具**（F12）
3. **切换到 Console 标签**
4. **点击"从仓库订货"标签**
5. **查看控制台输出**

### 预期输出
```
🔍 开始加载仓库产品...
📡 请求 URL: /api/merchant/warehouse-products
📥 响应状态: 200 OK
📦 API 返回数据: {success: true, data: Array(1)}
📊 产品数量: 1
✅ 可订购产品数量: 1
📂 分类: ['Pre-Owned']
✅ 仓库产品加载完成
```

### 预期页面显示
- 蓝色提示框："🏭 从仓库订货"
- 一个分类卡片："Pre-Owned"
- 显示："1 种产品 · 5 件可订"

## 如果仍然有问题

### 检查 1：确认 API 工作
```bash
curl "http://localhost:3000/api/merchant/warehouse-products"
```

应该返回产品数据。

### 检查 2：查看网络请求
1. 打开开发者工具
2. 切换到 Network 标签
3. 点击"从仓库订货"
4. 查看是否有请求到 `/api/merchant/warehouse-products`
5. 查看响应内容

### 检查 3：查看 HTML 元素
在控制台输入：
```javascript
document.getElementById('warehouseCategoryList')
```

应该返回一个 div 元素，不是 null。

## 文件修改

- ✅ `StockControl-main/public/merchant.html`
  - 修改 `switchWarehouseTab()` 函数
  - 修改 `loadWarehouseCategories()` 函数
  - 添加调试日志到 `loadWarehouseProducts()`

---

**状态**：✅ 已修复
**日期**：2026-02-02
**下一步**：刷新浏览器测试
