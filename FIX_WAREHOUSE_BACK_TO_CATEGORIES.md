# 修复：返回分类后页面空白问题

## 问题描述
点击"← 返回分类"按钮后，分类列表区域显示空白，没有数据。

## 问题原因
代码中存在**两个同名的 `backToWarehouseCategories()` 函数**：

1. **正确的函数**（第 2675 行）：
```javascript
function backToWarehouseCategories() {
  // 只切换左侧内容，购物车保持显示
  document.getElementById('warehouseCategoryListView').style.display = 'block';
  document.getElementById('warehouseProductList').style.display = 'none';
}
```

2. **旧的函数**（第 3658 行，已删除）：
```javascript
function backToWarehouseCategories() {
  document.getElementById('warehouseCategoryList').style.display = 'block';
  document.getElementById('warehouseProductList').style.display = 'none';
}
```

### 为什么会导致空白？
- 正确的容器层级：`warehouseCategoryListView` > `warehouseCategoryList`
- 旧函数操作的是 `warehouseCategoryList`（子容器），而不是 `warehouseCategoryListView`（父容器）
- JavaScript 会使用最后定义的函数，所以旧函数覆盖了正确的函数
- 旧函数显示了错误的容器，导致页面空白

## 解决方案
删除了旧的、冲突的函数实现：

### 删除的函数（第 3621-3685 行）：
1. `loadWarehouseProductsByCategory()` - 旧的产品加载函数（未被使用）
2. `backToWarehouseCategories()` - 重复的返回函数（操作错误的容器）
3. `addToWarehouseCart()` - 旧的购物车添加函数（已被 `addToWarehouseCartFromTable()` 替代）

### 保留的正确实现：
- `loadWarehouseProducts()` - 加载分类和产品数据
- `showWarehouseCategory()` - 显示某个分类的产品
- `backToWarehouseCategories()` - 返回分类列表（正确版本）
- `addToWarehouseCartFromTable()` - 从表格添加到购物车
- `updateWarehouseCart()` - 更新购物车显示
- 其他购物车管理函数

## HTML 结构
```
warehouseOrderSection
└── grid (3fr + 1fr)
    ├── 左侧：产品区域
    │   ├── warehouseCategoryListView (分类列表视图)
    │   │   └── warehouseCategoryList (分类卡片容器)
    │   └── warehouseProductList (产品列表视图)
    │       ├── 返回按钮
    │       ├── currentWarehouseCategoryName
    │       └── warehouseProducts (产品表格容器)
    └── 右侧：购物车（固定显示）
        └── warehouseCartItems
```

## 工作流程
1. 用户点击"从仓库订货"标签
   - 调用 `switchWarehouseTab('order')`
   - 调用 `loadWarehouseProducts()`
   - 填充 `warehouseCategoryList` 容器（分类卡片）

2. 用户点击某个分类
   - 调用 `showWarehouseCategory(category)`
   - 隐藏 `warehouseCategoryListView`
   - 显示 `warehouseProductList`
   - 调用 `displayWarehouseProducts()`

3. 用户点击"← 返回分类"
   - 调用 `backToWarehouseCategories()`
   - 显示 `warehouseCategoryListView`（包含之前加载的分类卡片）
   - 隐藏 `warehouseProductList`

## 测试步骤
1. 登录商户账号（MurrayRanelagh / 123456）
2. 点击"从仓库订货"标签
3. 确认显示分类卡片
4. 点击任意分类
5. 确认显示产品列表
6. 点击"← 返回分类"按钮
7. ✅ 确认分类列表正常显示（不再空白）

## 修复时间
2026-02-02

## 相关文件
- `StockControl-main/public/merchant.html` - 删除了重复的函数定义
