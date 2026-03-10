# 商户销售业务 - 产品分类显示代码备份

**备份时间**: 2026-03-10  
**备份原因**: 在实施新的产品分类体系前，保存当前工作正常的产品分类显示代码

---

## 1. HTML 结构

### 产品分类列表容器
```html
<!-- 产品分类列表 -->
<div id="categoryList">
  <div class="loading">加载中...</div>
</div>

<!-- 分类产品列表 -->
<div id="categoryProducts" style="display: none;">
  <button onclick="backToCategories()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 15px;">
    ← 返回分类
  </button>
  <h3 id="currentCategoryName" style="margin-bottom: 15px;"></h3>
  <div id="productList"></div>
</div>
```

---

## 2. JavaScript 核心函数

### 2.1 加载产品分类列表 (loadCategoryList)

```javascript
async function loadCategoryList() {
  const container = document.getElementById('categoryList');
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  try {
    // 获取库存产品
    const inventoryResponse = await fetch(`${API_BASE}/merchant/inventory?merchantId=${merchantId}`);
    const inventoryResult = await inventoryResponse.json();
    
    // 获取待销售的维修订单
    const repairsResponse = await fetch(`${API_BASE}/merchant/repairs/ready-for-sale?merchantId=${merchantId}`);
    const repairsResult = await repairsResponse.json();
    
    const categories = {};
    let repairCount = 0;
    
    // 处理库存产品
    if (inventoryResult.success && inventoryResult.data.length > 0) {
      inventoryResult.data.forEach(item => {
        if (item.quantity > 0 && item.status === 'active') {
          // category 是字符串，直接使用
          const categoryName = item.category || '未分类';
          if (!categories[categoryName]) {
            categories[categoryName] = {
              name: categoryName,
              count: 0,
              totalQty: 0
            };
          }
          categories[categoryName].count++;
          categories[categoryName].totalQty += item.quantity;
        }
      });
    }
    
    // 统计维修订单数量
    if (repairsResult.success && repairsResult.data.length > 0) {
      repairCount = repairsResult.data.length;
    }
    
    const categoryArray = Object.values(categories);
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">';
    
    // 添加维修订单分类（如果有）
    if (repairCount > 0) {
      html += `
        <div onclick="showRepairOrders()" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 12px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" 
          onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 12px rgba(0,0,0,0.2)';"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)';">
          <div style="font-size: 40px; margin-bottom: 10px;">🔧</div>
          <h3 style="font-size: 18px; margin-bottom: 10px;">维修订单</h3>
          <div style="font-size: 14px; opacity: 0.9;">
            ${repairCount} 个待销售订单
          </div>
        </div>
      `;
    }
    
    // 添加库存产品分类
    if (categoryArray.length > 0) {
      html += categoryArray.map(cat => `
        <div onclick="showCategoryProducts('${cat.name}')" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" 
          onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 12px rgba(0,0,0,0.2)';"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)';">
          <div style="font-size: 40px; margin-bottom: 10px;">📦</div>
          <h3 style="font-size: 18px; margin-bottom: 10px;">${cat.name}</h3>
          <div style="font-size: 14px; opacity: 0.9;">
            ${cat.count} 种产品 · ${cat.totalQty} 件库存
          </div>
        </div>
      `).join('');
    }
    
    html += '</div>';
    
    if (categoryArray.length > 0 || repairCount > 0) {
      container.innerHTML = html;
    } else {
      container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">暂无可销售产品</p>';
    }
  } catch (error) {
    console.error('加载分类失败:', error);
    container.innerHTML = `<div class="loading">加载失败: ${error.message}</div>`;
  }
}
```

### 2.2 显示分类产品 (showCategoryProducts)

```javascript
async function showCategoryProducts(category) {
  document.getElementById('categoryList').style.display = 'none';
  document.getElementById('categoryProducts').style.display = 'block';
  document.getElementById('currentCategoryName').textContent = `📦 ${category}`;
  
  const container = document.getElementById('productList');
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  try {
    const response = await fetch(`${API_BASE}/merchant/inventory?merchantId=${merchantId}`);
    const result = await response.json();
    
    if (result.success) {
      const products = result.data.filter(item => 
        item.category === category && 
        item.quantity > 0 && 
        item.status === 'active'
      );
      
      if (products.length > 0) {
        // 渲染产品列表...
      } else {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">该分类下暂无产品</p>';
      }
    }
  } catch (error) {
    console.error('加载产品失败:', error);
    container.innerHTML = `<div class="loading">加载失败: ${error.message}</div>`;
  }
}
```

### 2.3 返回分类列表 (backToCategories)

```javascript
function backToCategories() {
  document.getElementById('globalProductSearchInput').value = '';
  
  document.getElementById('categoryList').style.display = 'block';
  document.getElementById('categoryProducts').style.display = 'none';
  document.getElementById('globalSearchResults').style.display = 'none';
}
```

---

## 3. 相关 API 端点

### 3.1 获取商户库存
- **端点**: `GET /api/merchant/inventory?merchantId={merchantId}`
- **返回**: 商户的所有库存产品列表
- **字段**: `category` (字符串类型，产品分类)

### 3.2 获取待销售维修订单
- **端点**: `GET /api/merchant/repairs/ready-for-sale?merchantId={merchantId}`
- **返回**: 状态为"待销售"的维修订单列表

---

## 4. 数据结构

### 库存产品 (MerchantInventory)
```javascript
{
  _id: ObjectId,
  merchantId: String,
  productName: String,
  category: String,        // 产品分类（字符串）
  quantity: Number,
  status: String,          // 'active' | 'inactive'
  // ... 其他字段
}
```

### 分类统计对象
```javascript
{
  name: String,            // 分类名称
  count: Number,           // 该分类下的产品种类数
  totalQty: Number         // 该分类下的总库存数量
}
```

---

## 5. 使用说明

### 调用时机
- 页面加载时: `loadCategoryList()`
- 切换到销售业务 tab 时: `switchTab('sales')` → `loadCategoryList()`
- 完成销售后返回: `backToCategories()` → `loadCategoryList()`

### 视图切换逻辑
1. **初始状态**: 显示 `categoryList` (分类网格)
2. **点击分类**: 隐藏 `categoryList`，显示 `categoryProducts` (产品列表)
3. **返回分类**: 隐藏 `categoryProducts`，显示 `categoryList`

---

## 6. 样式特点

- 分类卡片使用渐变背景 (`linear-gradient`)
- 悬停效果: 向上移动 5px + 阴影加深
- 响应式网格布局: `minmax(250px, 1fr)`
- 维修订单使用橙色渐变，库存产品使用紫色渐变

---

**备注**: 此代码当前运行正常，在实施新的产品分类体系时，请确保不破坏这些核心功能。
