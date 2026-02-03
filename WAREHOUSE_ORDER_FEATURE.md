# 从仓库订货功能

## 功能概述

商户可以从仓库订购产品，仓管员确认订单并安排发货或自取。

## 业务流程

### 1. 商户端（merchant.html）
1. 点击"从仓库订货"标签
2. 浏览产品分类（大分类 → 小分类）
3. 查看产品详情（库存、价格）
4. 添加产品到购物车
5. 查看购物车
6. 提交订单（选择配送方式：物流/自取）
7. 查看订单状态

### 2. 仓管员端（prototype-working.html）
1. 查看待处理订单列表
2. 查看订单详情
3. 确认订单
4. 标记发货状态
5. 完成订单

## 数据模型

### WarehouseOrder（仓库订单）
```javascript
{
  orderNumber: String,           // 订单号 WO-YYYYMMDD-XXXX
  merchantId: String,            // 商户ID
  merchantName: String,          // 商户名称
  
  items: [{
    productId: ObjectId,         // 产品ID
    productName: String,         // 产品名称
    sku: String,                 // SKU
    quantity: Number,            // 数量
    wholesalePrice: Number,      // 批发价
    subtotal: Number             // 小计
  }],
  
  totalAmount: Number,           // 总金额
  
  deliveryMethod: String,        // 配送方式: 'delivery' | 'pickup'
  deliveryAddress: String,       // 配送地址（物流）
  pickupLocation: String,        // 自取地点（自取）
  
  status: String,                // 状态: 'pending' | 'confirmed' | 'shipped' | 'completed' | 'cancelled'
  
  notes: String,                 // 备注
  
  // 时间记录
  orderedAt: Date,               // 下单时间
  confirmedAt: Date,             // 确认时间
  shippedAt: Date,               // 发货时间
  completedAt: Date,             // 完成时间
  
  // 处理人员
  confirmedBy: String,           // 确认人
  shippedBy: String              // 发货人
}
```

## 前端实现

### merchant.html 新增标签页

#### 1. 产品浏览区域
```html
<div id="warehouseOrderTab" class="tab-content">
  <!-- 分类导航 -->
  <div class="category-nav">
    <button class="category-btn" data-category="手机">📱 手机</button>
    <button class="category-btn" data-category="平板">📱 平板</button>
    <button class="category-btn" data-category="笔记本">💻 笔记本</button>
    <!-- ... 更多分类 -->
  </div>
  
  <!-- 产品列表 -->
  <div class="product-grid" id="warehouseProducts">
    <!-- 动态加载产品卡片 -->
  </div>
  
  <!-- 购物车 -->
  <div class="cart-panel">
    <h3>购物车 <span id="cartCount">0</span></h3>
    <div id="cartItems"></div>
    <div class="cart-total">
      总计: €<span id="cartTotal">0.00</span>
    </div>
    <button onclick="submitWarehouseOrder()">提交订单</button>
  </div>
</div>
```

#### 2. 订单提交对话框
```html
<div id="orderSubmitModal" class="modal">
  <div class="modal-content">
    <h2>提交订单</h2>
    
    <!-- 配送方式选择 -->
    <div class="form-group">
      <label>配送方式</label>
      <select id="deliveryMethod">
        <option value="delivery">物流配送</option>
        <option value="pickup">到店自取</option>
      </select>
    </div>
    
    <!-- 配送地址（物流） -->
    <div id="deliveryAddressSection">
      <label>配送地址</label>
      <textarea id="deliveryAddress"></textarea>
    </div>
    
    <!-- 自取地点（自取） -->
    <div id="pickupLocationSection" style="display:none;">
      <label>自取地点</label>
      <select id="pickupLocation">
        <option value="warehouse">仓库</option>
        <option value="store">门店</option>
      </select>
    </div>
    
    <!-- 备注 -->
    <div class="form-group">
      <label>备注</label>
      <textarea id="orderNotes"></textarea>
    </div>
    
    <button onclick="confirmWarehouseOrder()">确认提交</button>
  </div>
</div>
```

#### 3. 我的订单列表
```html
<div id="myOrdersSection">
  <h3>我的订单</h3>
  <table id="ordersTable">
    <thead>
      <tr>
        <th>订单号</th>
        <th>下单时间</th>
        <th>总金额</th>
        <th>配送方式</th>
        <th>状态</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody id="ordersTableBody"></tbody>
  </table>
</div>
```

### prototype-working.html 新增功能

#### 1. 订单管理标签页
```html
<div id="warehouseOrdersTab" class="tab-content">
  <h2>仓库订单管理</h2>
  
  <!-- 订单筛选 -->
  <div class="filter-bar">
    <select id="orderStatusFilter">
      <option value="">全部状态</option>
      <option value="pending">待确认</option>
      <option value="confirmed">已确认</option>
      <option value="shipped">已发货</option>
      <option value="completed">已完成</option>
    </select>
  </div>
  
  <!-- 订单列表 -->
  <table id="warehouseOrdersTable">
    <thead>
      <tr>
        <th>订单号</th>
        <th>商户</th>
        <th>下单时间</th>
        <th>总金额</th>
        <th>配送方式</th>
        <th>状态</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody id="warehouseOrdersTableBody"></tbody>
  </table>
</div>
```

#### 2. 订单详情对话框
```html
<div id="orderDetailModal" class="modal">
  <div class="modal-content">
    <h2>订单详情</h2>
    
    <!-- 订单信息 -->
    <div class="order-info">
      <p>订单号: <span id="detailOrderNumber"></span></p>
      <p>商户: <span id="detailMerchant"></span></p>
      <p>下单时间: <span id="detailOrderTime"></span></p>
      <p>配送方式: <span id="detailDeliveryMethod"></span></p>
      <p>状态: <span id="detailStatus"></span></p>
    </div>
    
    <!-- 产品列表 -->
    <table id="detailItemsTable">
      <thead>
        <tr>
          <th>产品</th>
          <th>SKU</th>
          <th>数量</th>
          <th>单价</th>
          <th>小计</th>
        </tr>
      </thead>
      <tbody id="detailItemsTableBody"></tbody>
    </table>
    
    <!-- 操作按钮 -->
    <div class="action-buttons">
      <button onclick="confirmOrder()">确认订单</button>
      <button onclick="markAsShipped()">标记发货</button>
      <button onclick="completeOrder()">完成订单</button>
    </div>
  </div>
</div>
```

## API 端点

### 商户端 API

#### 1. 获取仓库产品列表
```javascript
GET /api/warehouse/products
Query: { category, search }
Response: { success, data: [products] }
```

#### 2. 创建仓库订单
```javascript
POST /api/warehouse/orders
Body: {
  items: [{ productId, quantity }],
  deliveryMethod: 'delivery' | 'pickup',
  deliveryAddress: String,
  pickupLocation: String,
  notes: String
}
Response: { success, data: order }
```

#### 3. 获取我的订单列表
```javascript
GET /api/warehouse/orders/my
Query: { status }
Response: { success, data: [orders] }
```

#### 4. 获取订单详情
```javascript
GET /api/warehouse/orders/:id
Response: { success, data: order }
```

### 仓管员 API

#### 1. 获取所有订单
```javascript
GET /api/warehouse/orders
Query: { status, merchantId }
Response: { success, data: [orders] }
```

#### 2. 确认订单
```javascript
PUT /api/warehouse/orders/:id/confirm
Response: { success, data: order }
```

#### 3. 标记发货
```javascript
PUT /api/warehouse/orders/:id/ship
Response: { success, data: order }
```

#### 4. 完成订单
```javascript
PUT /api/warehouse/orders/:id/complete
Response: { success, data: order }
```

#### 5. 取消订单
```javascript
PUT /api/warehouse/orders/:id/cancel
Body: { reason: String }
Response: { success, data: order }
```

## 状态流转

```
pending (待确认)
  ↓ 仓管员确认
confirmed (已确认)
  ↓ 仓管员发货
shipped (已发货)
  ↓ 商户确认收货 / 自取完成
completed (已完成)

任何状态都可以 → cancelled (已取消)
```

## 库存处理

### 下单时
- 不扣减仓库库存（预留）
- 记录订单数量

### 确认订单时
- 检查仓库库存是否充足
- 如果不足，提示仓管员

### 发货/自取时
- 扣减仓库库存
- 增加商户库存（创建 MerchantInventory 记录）
- 记录库存转移（InventoryTransfer）

## 实施步骤

### Phase 1: 数据模型和 API
1. ⬜ 创建 WarehouseOrder 模型
2. ⬜ 实现商户端 API
3. ⬜ 实现仓管员 API

### Phase 2: 商户端界面
1. ⬜ 在 merchant.html 添加"从仓库订货"标签页
2. ⬜ 实现产品浏览（分类导航）
3. ⬜ 实现购物车功能
4. ⬜ 实现订单提交
5. ⬜ 实现订单列表和详情查看

### Phase 3: 仓管员界面
1. ⬜ 在 prototype-working.html 添加"订单管理"标签页
2. ⬜ 实现订单列表
3. ⬜ 实现订单详情查看
4. ⬜ 实现订单确认/发货/完成功能

### Phase 4: 库存处理
1. ⬜ 实现发货时的库存转移
2. ⬜ 创建 MerchantInventory 记录
3. ⬜ 记录 InventoryTransfer

### Phase 5: 测试
1. ⬜ 测试完整订单流程
2. ⬜ 测试库存转移
3. ⬜ 测试权限控制

## 注意事项

1. **权限控制**: 商户只能看到自己的订单
2. **库存检查**: 确认订单时检查库存
3. **价格使用**: 使用产品的批发价（wholesalePrice）
4. **订单号生成**: WO-YYYYMMDD-序号
5. **数据隔离**: 订单数据也需要按 merchantId 隔离

## 下一步

开始实施 Phase 1：创建数据模型和 API
