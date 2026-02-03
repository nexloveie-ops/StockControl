# 修复：从仓库订货购物车流程

## 问题描述

1. **提交订单表单一直显示** - 应该在点击"提交订单"按钮后才显示
2. **订货失败错误** - 点击表格中的"订货"按钮时出现 JSON 解析错误

## 问题分析

### 问题 1：模态框显示
- **原因**：缺少模态框 CSS 样式
- **表现**：订单提交表单一直显示在页面上

### 问题 2：订货流程混乱
- **原因**：表格中有两个不同的流程
  - 旧流程：`orderFromWarehouse()` → 直接调用 `/api/merchant/orders`（占位符 API）
  - 新流程：购物车 → `submitWarehouseOrder()` → `/api/warehouse/orders`（正确的 API）
- **表现**：点击"订货"按钮调用了错误的 API

## 解决方案

### 1. 添加模态框 CSS 样式

```css
.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
}

.modal-content {
  background-color: #fefefe;
  margin: auto;
  padding: 30px;
  border: 1px solid #888;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  position: relative;
}

.close {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
  line-height: 20px;
}

.close:hover,
.close:focus {
  color: #000;
}
```

### 2. 统一购物车流程

#### 修改前（表格）
```html
<td>
  <input type="number" id="orderQty_${index}" min="1" max="${group.totalAvailable}" value="1">
</td>
<td>
  <button onclick="orderFromWarehouse(...)">订货</button>
</td>
```

#### 修改后（表格）
```html
<td>
  <button onclick="addToWarehouseCartFromTable(...)">🛒 加入购物车</button>
</td>
```

### 3. 新增函数

```javascript
function addToWarehouseCartFromTable(productId, productName, price, maxQuantity) {
  const quantity = prompt(`请输入订购数量（可用: ${maxQuantity}）:`, '1');
  
  if (!quantity) return;
  
  const qty = parseInt(quantity);
  if (isNaN(qty) || qty < 1) {
    alert('请输入有效的数量');
    return;
  }
  
  if (qty > maxQuantity) {
    alert(`订购数量不能超过可用数量 ${maxQuantity}`);
    return;
  }
  
  // 检查购物车中是否已有该产品
  const existingItem = warehouseCart.find(item => item.productId === productId);
  
  if (existingItem) {
    const newQty = existingItem.quantity + qty;
    if (newQty > maxQuantity) {
      alert(`购物车中已有 ${existingItem.quantity} 件，最多可订购 ${maxQuantity} 件`);
      return;
    }
    existingItem.quantity = newQty;
  } else {
    warehouseCart.push({
      productId,
      productName,
      price,
      quantity: qty,
      maxQuantity
    });
  }
  
  updateWarehouseCart();
  alert(`已添加 ${qty} 件 ${productName} 到购物车`);
}
```

### 4. 修改模态框显示方式

```javascript
function submitWarehouseOrder() {
  // ...
  const modal = document.getElementById('warehouseOrderSubmitModal');
  modal.style.display = 'flex'; // 使用 flex 布局居中显示
}
```

## 正确的订货流程

### 步骤 1：浏览产品
1. 点击"从仓库订货"标签
2. 选择产品分类（如 "Pre-Owned"）
3. 查看产品列表

### 步骤 2：添加到购物车
1. 点击产品行的"🛒 加入购物车"按钮
2. 输入订购数量
3. 确认添加
4. 右侧购物车显示已添加的产品

### 步骤 3：提交订单
1. 点击购物车中的"提交订单"按钮
2. **模态框弹出**，显示订单明细
3. 选择配送方式（物流配送/到店自取）
4. 填写配送地址或选择自取地点
5. 填写备注（可选）
6. 点击"确认提交"

### 步骤 4：订单处理
1. 订单创建成功
2. 状态：待确认
3. 仓管员在后台确认订单
4. 仓管员发货
5. 库存自动转移到商户

## 实施的修改

### 文件：`StockControl-main/public/merchant.html`

#### 1. CSS 修改
- ✅ 添加 `.modal` 样式
- ✅ 添加 `.modal-content` 样式
- ✅ 添加 `.close` 样式

#### 2. HTML 修改
- ✅ 移除表格中的"订货数量"列
- ✅ 修改"操作"列按钮为"🛒 加入购物车"

#### 3. JavaScript 修改
- ✅ 修改 `displayWarehouseProducts()` 函数
- ✅ 新增 `addToWarehouseCartFromTable()` 函数
- ✅ 修改 `submitWarehouseOrder()` 使用 `display: flex`

## 测试步骤

1. **刷新浏览器页面**（Ctrl + F5）
2. **登录商户账号**
3. **点击"从仓库订货"**
4. **点击分类**（如 "Pre-Owned"）
5. **点击"🛒 加入购物车"**
6. **输入数量**（如 2）
7. **查看右侧购物车**（应该显示 2 件产品）
8. **点击"提交订单"按钮**
9. **查看模态框**（应该弹出，显示订单明细）
10. **选择配送方式**
11. **填写地址**
12. **点击"确认提交"**

### 预期结果
- ✅ 模态框正确弹出（居中显示，半透明背景）
- ✅ 订单提交成功
- ✅ 购物车清空
- ✅ 切换到"我的订单"标签可以看到新订单

## API 端点

### 正确的 API
```
POST /api/warehouse/orders
```

### 错误的 API（已废弃）
```
POST /api/merchant/orders  ← 这是占位符，不要使用
```

---

**状态**：✅ 已修复
**日期**：2026-02-02
**测试**：请刷新浏览器测试
