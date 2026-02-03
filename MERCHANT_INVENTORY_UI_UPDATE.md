# 商户库存和仓库订货界面更新

## 更新日期
2026-02-02

## 更新内容

### 1. 我的库存 - 新功能

#### 🔍 搜索功能
- **位置**：我的库存标签页顶部
- **搜索范围**：
  - 产品名称
  - IMEI
  - 序列号(SN)
  - 备注
- **使用方法**：
  - 在搜索框输入关键词
  - 实时搜索，自动显示结果
  - 清空搜索框返回分类视图

#### 📦 分类显示格式
- **新界面**：大分类卡片视图
- **显示内容**：
  - 分类名称
  - 产品种类数量
  - 总库存数量
- **交互**：点击分类卡片查看该分类下的所有产品

#### 🚫 自动隐藏零库存
- **规则**：数量为 0 的产品自动隐藏
- **好处**：
  - 界面更清晰
  - 只显示可用库存
  - 提高查找效率

#### 📊 产品详情表格
点击分类后显示：
- 产品名称
- 品牌/型号
- 库存数量（绿色高亮）
- 成本价
- 零售价
- 税务分类
- IMEI/SN
- 备注

---

### 2. 仓库订货 - 统一显示格式

#### 📦 分类显示格式
- **新界面**：与"我的库存"统一的大分类卡片视图
- **显示内容**：
  - 分类名称
  - 产品种类数量
  - 可订购总数量
- **交互**：点击分类卡片查看该分类下的所有产品

#### ✅ 只显示可销售产品
- **规则**：只显示 `totalAvailable > 0` 的产品
- **好处**：
  - 避免显示无库存产品
  - 提高订货效率
  - 减少无效操作

#### 📊 产品详情表格
点击分类后显示：
- 产品类型
- 品牌/型号
- 可用数量（绿色高亮）
- 批发价
- 建议零售价
- 税务分类
- 订货数量输入框
- 订货按钮

---

## 界面对比

### 旧界面
```
我的库存：
- 直接显示所有产品的表格
- 包含数量为0的产品
- 没有搜索功能
- 难以快速定位产品

仓库订货：
- 直接显示所有产品的表格
- 可能包含无库存产品
- 没有分类组织
```

### 新界面
```
我的库存：
1. 搜索框（顶部）
2. 分类卡片视图
   ├─ 手机配件 (5种产品 · 120件库存)
   ├─ 电脑配件 (3种产品 · 45件库存)
   └─ 数据线 (8种产品 · 200件库存)
3. 点击分类 → 显示产品表格
4. 自动隐藏零库存产品

仓库订货：
1. 分类卡片视图
   ├─ 手机配件 (10种产品 · 500件可订)
   ├─ 电脑配件 (7种产品 · 300件可订)
   └─ 数据线 (15种产品 · 800件可订)
2. 点击分类 → 显示产品表格
3. 只显示有库存的产品
```

---

## 使用指南

### 我的库存

#### 方式 1：按分类浏览
1. 进入"我的库存"标签页
2. 查看分类卡片
3. 点击感兴趣的分类
4. 浏览该分类下的所有产品
5. 点击"← 返回分类"返回

#### 方式 2：搜索产品
1. 在搜索框输入关键词
   - 产品名称：`iPhone`
   - IMEI：`123456789012345`
   - SN：`ABC123`
   - 备注：`客户预订`
2. 查看搜索结果
3. 清空搜索框返回分类视图

### 仓库订货

#### 订货流程
1. 进入"仓库订货"标签页
2. 查看分类卡片
3. 点击需要订货的分类
4. 浏览该分类下的可用产品
5. 输入订货数量
6. 点击"订货"按钮
7. 确认订单
8. 产品自动转入"我的库存"

---

## 技术实现

### 前端更新

#### HTML 结构
```html
<!-- 我的库存 -->
<div id="my-inventory" class="tab-content">
  <!-- 搜索框 -->
  <input type="text" id="inventorySearchInput" 
    placeholder="🔍 搜索产品名称、IMEI、SN或备注..." 
    oninput="searchInventory()">
  
  <!-- 分类列表 -->
  <div id="inventoryCategoryList">
    <!-- 分类卡片 -->
  </div>
  
  <!-- 产品列表 -->
  <div id="inventoryProductList" style="display: none;">
    <button onclick="backToInventoryCategories()">← 返回分类</button>
    <h3 id="currentInventoryCategoryName"></h3>
    <div id="inventoryProducts"></div>
  </div>
</div>

<!-- 仓库订货 -->
<div id="warehouse-order" class="tab-content">
  <!-- 分类列表 -->
  <div id="warehouseCategoryList">
    <!-- 分类卡片 -->
  </div>
  
  <!-- 产品列表 -->
  <div id="warehouseProductList" style="display: none;">
    <button onclick="backToWarehouseCategories()">← 返回分类</button>
    <h3 id="currentWarehouseCategoryName"></h3>
    <div id="warehouseProducts"></div>
  </div>
</div>
```

#### JavaScript 函数

**我的库存**：
- `loadMyInventory()` - 加载分类视图
- `showInventoryCategory(category)` - 显示分类产品
- `backToInventoryCategories()` - 返回分类列表
- `displayInventoryProducts(products)` - 显示产品表格
- `searchInventory()` - 搜索功能

**仓库订货**：
- `loadWarehouseProducts()` - 加载分类视图
- `showWarehouseCategory(category)` - 显示分类产品
- `backToWarehouseCategories()` - 返回分类列表
- `displayWarehouseProducts(products)` - 显示产品表格

### 数据过滤

#### 我的库存
```javascript
// 过滤掉数量为0的产品
allInventoryData = result.data.filter(item => item.quantity > 0);
```

#### 仓库订货
```javascript
// 只保留可销售的产品
allWarehouseData = result.data.filter(group => group.totalAvailable > 0);
```

#### 搜索功能
```javascript
const filteredProducts = allInventoryData.filter(item => {
  return (
    (item.productName && item.productName.toLowerCase().includes(searchTerm)) ||
    (item.imei && item.imei.toLowerCase().includes(searchTerm)) ||
    (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm)) ||
    (item.notes && item.notes.toLowerCase().includes(searchTerm))
  );
});
```

---

## 测试场景

### 测试 1：我的库存 - 分类浏览
1. 登录商户账号
2. 点击"我的库存"
3. 确认看到分类卡片
4. 点击任意分类
5. 确认显示该分类的产品
6. 确认没有数量为0的产品
7. 点击"← 返回分类"
8. 确认返回分类视图

### 测试 2：我的库存 - 搜索功能
1. 在"我的库存"页面
2. 在搜索框输入产品名称
3. 确认显示搜索结果
4. 输入 IMEI 号码
5. 确认显示对应产品
6. 输入 SN 号码
7. 确认显示对应产品
8. 清空搜索框
9. 确认返回分类视图

### 测试 3：仓库订货 - 分类浏览
1. 点击"仓库订货"
2. 确认看到分类卡片
3. 点击任意分类
4. 确认只显示有库存的产品
5. 确认可用数量 > 0
6. 输入订货数量
7. 点击"订货"按钮
8. 确认订货成功

### 测试 4：零库存隐藏
1. 在"我的库存"中
2. 查看所有产品
3. 确认没有数量为0的产品
4. 手动将某个产品销售完
5. 刷新页面
6. 确认该产品不再显示

---

## 优势总结

### 用户体验
✅ **更清晰**：分类组织，一目了然  
✅ **更快速**：搜索功能，快速定位  
✅ **更高效**：隐藏零库存，减少干扰  
✅ **更统一**：两个页面使用相同的交互模式  

### 功能改进
✅ **搜索多字段**：名称、IMEI、SN、备注  
✅ **自动过滤**：零库存自动隐藏  
✅ **分类导航**：大分类 → 产品详情  
✅ **只显示可用**：仓库订货只显示有库存产品  

### 性能优化
✅ **按需加载**：点击分类才加载产品  
✅ **客户端过滤**：搜索不需要请求服务器  
✅ **数据缓存**：分类数据缓存在前端  

---

## 相关文件

- `StockControl-main/public/merchant.html` - 前端界面和 JavaScript
- `StockControl-main/app.js` - 后端 API（无需修改）

---

## 服务器信息

- **状态**：✅ 运行中
- **进程 ID**：18
- **地址**：http://localhost:3000
- **测试账号**：merchant_001 / merchant123

---

## 立即测试

1. 访问：http://localhost:3000
2. 登录：merchant_001 / merchant123
3. 测试"我的库存"：
   - 查看分类卡片
   - 点击分类查看产品
   - 使用搜索功能
   - 确认零库存已隐藏
4. 测试"仓库订货"：
   - 查看分类卡片
   - 点击分类查看产品
   - 确认只显示有库存产品
   - 尝试订货

---

**更新完成！界面更清晰、更高效！** 🎉
