# 修复：产品列表中购物车可见性

## 问题描述
用户反馈："点击进入产品列表之后，购物车没了"

## 问题原因

### 原始设计
```
warehouseOrderSection
  └─ warehouseCategoryListView (grid: 2fr + 1fr)
      ├─ 分类列表
      └─ 购物车
  └─ warehouseProductList (全宽)
      └─ 产品表格
```

**问题**：
- 点击分类后，隐藏整个 `warehouseCategoryListView`（包括购物车）
- 显示 `warehouseProductList`（全宽，无购物车）
- 用户无法在浏览产品时看到购物车

## 解决方案

### 新的布局结构
```
warehouseOrderSection
  └─ 外层容器 (grid: 3fr + 1fr)
      ├─ 左侧：产品区域
      │   ├─ warehouseCategoryListView (分类列表)
      │   └─ warehouseProductList (产品表格)
      └─ 右侧：购物车（固定显示）
```

### 关键改进
1. **购物车独立**：购物车不再嵌套在分类列表视图中
2. **固定显示**：购物车始终显示在右侧
3. **左侧切换**：只切换左侧内容（分类列表 ↔ 产品列表）

## 实施的修改

### 1. HTML 结构重组

#### 修改前
```html
<div id="warehouseOrderSection">
  <!-- 分类列表视图 -->
  <div id="warehouseCategoryListView" style="display: grid; grid-template-columns: 2fr 1fr;">
    <div>分类列表</div>
    <div>购物车</div>
  </div>
  
  <!-- 产品列表视图（全宽） -->
  <div id="warehouseProductList" style="display: none;">
    产品表格
  </div>
</div>
```

#### 修改后
```html
<div id="warehouseOrderSection">
  <div style="display: grid; grid-template-columns: 3fr 1fr; gap: 20px;">
    <!-- 左侧：产品区域 -->
    <div>
      <!-- 分类列表视图 -->
      <div id="warehouseCategoryListView" style="display: block;">
        分类列表
      </div>
      
      <!-- 产品列表视图 -->
      <div id="warehouseProductList" style="display: none;">
        产品表格
      </div>
    </div>
    
    <!-- 右侧：购物车（固定显示） -->
    <div style="position: sticky; top: 20px;">
      购物车
    </div>
  </div>
</div>
```

### 2. JavaScript 函数更新

#### showWarehouseCategory()
```javascript
// 修改前
function showWarehouseCategory(category) {
  document.getElementById('warehouseCategoryListView').style.display = 'none';
  document.getElementById('warehouseProductList').style.display = 'block';
  // ...
}

// 修改后
function showWarehouseCategory(category) {
  // 只切换左侧内容，购物车保持显示
  document.getElementById('warehouseCategoryListView').style.display = 'none';
  document.getElementById('warehouseProductList').style.display = 'block';
  // ...
}
```

#### backToWarehouseCategories()
```javascript
// 修改前
function backToWarehouseCategories() {
  document.getElementById('warehouseCategoryListView').style.display = 'grid';
  document.getElementById('warehouseProductList').style.display = 'none';
}

// 修改后
function backToWarehouseCategories() {
  // 只切换左侧内容，购物车保持显示
  document.getElementById('warehouseCategoryListView').style.display = 'block';
  document.getElementById('warehouseProductList').style.display = 'none';
}
```

## 用户体验改进

### 修改前
1. 查看分类列表 → 购物车可见 ✅
2. 点击分类 → 购物车消失 ❌
3. 添加产品到购物车 → 看不到购物车更新 ❌
4. 返回分类 → 购物车重新出现 ✅

### 修改后
1. 查看分类列表 → 购物车可见 ✅
2. 点击分类 → 购物车仍然可见 ✅
3. 添加产品到购物车 → 实时看到购物车更新 ✅
4. 返回分类 → 购物车保持可见 ✅

## 布局说明

### 分类列表视图
```
┌─────────────────────────────────┬──────────────┐
│ 选择产品分类                      │   🛒 购物车   │
│                                 │              │
│ ┌────┐ ┌────┐ ┌────┐           │   (商品列表)  │
│ │分类│ │分类│ │分类│           │              │
│ └────┘ └────┘ └────┘           │   总计: €0   │
│                                 │              │
│                                 │  [提交订单]  │
│                                 │  [清空购物车] │
└─────────────────────────────────┴──────────────┘
```

### 产品列表视图
```
┌─────────────────────────────────┬──────────────┐
│ ← 返回分类                       │   🛒 购物车   │
│ 🏭 Pre-Owned                    │              │
│                                 │   (商品列表)  │
│ ┌─────────────────────────────┐ │              │
│ │ 产品表格                     │ │   总计: €0   │
│ │ - 产品类型                   │ │              │
│ │ - 品牌/型号                  │ │  [提交订单]  │
│ │ - 价格                       │ │  [清空购物车] │
│ │ - [加入购物车]               │ │              │
│ └─────────────────────────────┘ │              │
└─────────────────────────────────┴──────────────┘
```

## 响应式设计

### 列宽比例
- **分类列表视图**：左侧 3fr（75%），右侧 1fr（25%）
- **产品列表视图**：左侧 3fr（75%），右侧 1fr（25%）

### 购物车固定
```css
position: sticky;
top: 20px;
height: fit-content;
```

**效果**：
- 购物车在滚动时保持在视口顶部
- 用户始终可以看到购物车内容
- 方便随时查看和提交订单

## 测试步骤

1. **刷新浏览器页面**（Ctrl + F5）
2. **登录商户账号**
3. **点击"从仓库订货"**
4. **查看购物车**（右侧应该显示空购物车）
5. **点击分类**（如 "Pre-Owned"）
6. **确认购物车仍然可见**（右侧）
7. **点击"加入购物车"**
8. **查看购物车更新**（应该实时显示添加的产品）
9. **点击"返回分类"**
10. **确认购物车仍然可见**（内容保持不变）

### 预期结果
- ✅ 购物车在所有视图中都可见
- ✅ 购物车内容实时更新
- ✅ 切换视图时购物车不消失
- ✅ 购物车位置固定在右侧

## 文件修改

- ✅ `StockControl-main/public/merchant.html`
  - 重组 HTML 结构
  - 更新 `showWarehouseCategory()` 函数
  - 更新 `backToWarehouseCategories()` 函数

---

**状态**：✅ 已修复
**日期**：2026-02-02
**测试**：请刷新浏览器测试
