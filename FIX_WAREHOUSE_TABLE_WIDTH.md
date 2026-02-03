# 修复：从仓库订货产品表格宽度问题

## 问题描述
用户反馈："从仓库订货 点击大分类显示产品的表格宽度太窄"

## 问题原因

### 原始布局
```html
<div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
  <!-- 左侧：产品浏览（包括分类列表和产品列表） -->
  <div>
    <!-- 分类列表 -->
    <div id="warehouseCategoryList">...</div>
    <!-- 产品列表 -->
    <div id="warehouseProductList">
      <div id="warehouseProducts" style="display: grid; ...">
        <!-- 表格被限制在这里 -->
      </div>
    </div>
  </div>
  
  <!-- 右侧：购物车 -->
  <div>...</div>
</div>
```

**问题**：
1. 产品列表被限制在左侧的 2fr 列中（占 2/3 宽度）
2. 表格有 8 列，在 2/3 宽度下显示很拥挤
3. `warehouseProducts` 容器使用了 grid 布局，不适合表格

## 解决方案

### 1. 分离两个视图
- **分类列表视图**：使用 2fr + 1fr 布局（左侧分类，右侧购物车）
- **产品列表视图**：使用全宽布局（表格占据整个宽度）

### 2. 新的 HTML 结构
```html
<div id="warehouseOrderSection">
  <!-- 分类列表视图（2fr + 1fr） -->
  <div id="warehouseCategoryListView" style="display: grid; grid-template-columns: 2fr 1fr;">
    <div>分类列表</div>
    <div>购物车</div>
  </div>
  
  <!-- 产品列表视图（全宽） -->
  <div id="warehouseProductList" style="display: none;">
    <div id="warehouseProducts" style="overflow-x: auto;">
      <!-- 表格在这里，占据全宽 -->
    </div>
  </div>
</div>
```

### 3. 表格样式优化
```html
<table style="width: 100%; table-layout: auto;">
  <thead>
    <tr>
      <th style="min-width: 120px;">产品类型</th>
      <th style="min-width: 150px;">品牌/型号</th>
      <th style="min-width: 80px; text-align: center;">可用数量</th>
      <th style="min-width: 100px; text-align: right;">批发价</th>
      <th style="min-width: 100px; text-align: right;">建议零售价</th>
      <th style="min-width: 120px;">税务分类</th>
      <th style="min-width: 100px; text-align: center;">订货数量</th>
      <th style="min-width: 100px; text-align: center;">操作</th>
    </tr>
  </thead>
  ...
</table>
```

**改进**：
- `width: 100%` - 表格占据容器全宽
- `table-layout: auto` - 自动调整列宽
- `min-width` - 每列设置最小宽度，防止过窄
- `text-align` - 数字列右对齐，操作列居中
- `overflow-x: auto` - 容器支持横向滚动（如果需要）

### 4. JavaScript 函数更新
```javascript
// 显示产品列表
function showWarehouseCategory(category) {
  document.getElementById('warehouseCategoryListView').style.display = 'none';
  document.getElementById('warehouseProductList').style.display = 'block';
  // ...
}

// 返回分类列表
function backToWarehouseCategories() {
  document.getElementById('warehouseCategoryListView').style.display = 'grid';
  document.getElementById('warehouseProductList').style.display = 'none';
}
```

## 实施的修改

### 文件：`StockControl-main/public/merchant.html`

#### 1. HTML 结构修改
- ✅ 创建 `warehouseCategoryListView` 容器（分类列表 + 购物车）
- ✅ 将 `warehouseProductList` 移到外层（全宽显示）
- ✅ 修改 `warehouseProducts` 容器样式（移除 grid，添加 overflow-x）

#### 2. JavaScript 函数修改
- ✅ 更新 `showWarehouseCategory()` - 切换到产品列表视图
- ✅ 更新 `backToWarehouseCategories()` - 切换回分类列表视图
- ✅ 更新 `displayWarehouseProducts()` - 添加表格样式和列宽

## 效果对比

### 修改前
- 表格宽度：约 66%（2/3）
- 8 列挤在一起
- 内容显示不完整

### 修改后
- 表格宽度：100%（全宽）
- 每列有合理的最小宽度
- 内容清晰可读
- 数字列右对齐，更专业

## 测试步骤

1. **刷新浏览器页面**（Ctrl + F5）
2. **登录商户账号**
3. **点击"从仓库订货"标签**
4. **点击任意分类**（如 "Pre-Owned"）
5. **查看产品表格**

### 预期结果
- ✅ 表格占据整个页面宽度
- ✅ 所有列都清晰可见
- ✅ 不需要横向滚动（除非屏幕很小）
- ✅ 购物车不再显示（在产品列表视图中）
- ✅ 点击"返回分类"后，购物车重新显示

## 额外优化

### 响应式设计
如果屏幕宽度小于表格最小宽度，容器会自动出现横向滚动条：
```css
overflow-x: auto;
```

### 列宽分配
- 产品类型：120px（较短）
- 品牌/型号：150px（较长，可能有长文本）
- 数量：80px（数字，较短）
- 价格：100px（数字 + 货币符号）
- 税务分类：120px（徽章显示）
- 订货数量：100px（输入框）
- 操作：100px（按钮）

总计最小宽度：约 870px

## 注意事项

1. **购物车位置**
   - 分类列表视图：右侧显示
   - 产品列表视图：不显示（用户可以返回分类查看）

2. **表格滚动**
   - 如果屏幕宽度 < 870px，会出现横向滚动
   - 这是正常的响应式行为

3. **数据对齐**
   - 文本列：左对齐
   - 数字列：右对齐
   - 操作列：居中对齐

---

**状态**：✅ 已修复
**日期**：2026-02-02
**测试**：请刷新浏览器测试
