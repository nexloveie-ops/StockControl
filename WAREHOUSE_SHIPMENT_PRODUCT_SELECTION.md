# 仓库发货产品选择功能

## 功能描述
仓管员在标记订单发货时，需要手动选择具体的产品：
- **设备**（有 IMEI/SN）：从可用设备列表中选择具体的设备
- **配件**（无 IMEI/SN）：填写发货数量（默认为订单数量）

## 业务流程

### 1. 商户下单
```
商户选择产品 → 添加到购物车 → 提交订单
↓
订单状态: pending（待确认）
库存状态: 已预留（quantity 已扣减）
```

### 2. 仓管员确认订单
```
仓管员查看订单 → 确认订单
↓
订单状态: confirmed（已确认）
库存状态: 保持预留
```

### 3. 仓管员发货（新功能）
```
仓管员点击"标记发货" → 打开发货对话框
↓
对于每个订单项目：
  - 如果是设备 → 显示可用设备列表（IMEI/SN）
    → 仓管员选择具体设备（必须选够数量）
  - 如果是配件 → 显示数量输入框
    → 仓管员确认或修改数量
↓
仓管员点击"确认发货"
↓
后端处理：
  - 设备：标记选中的设备为已转移（quantity=0, isActive=false）
  - 配件：保持原产品记录不变
  - 创建商户库存记录（继承 IMEI/SN 等信息）
  - 记录库存转移历史
↓
订单状态: shipped（已发货）
```

## 前端实现

### 发货对话框（prototype-working.html）

#### 1. 打开发货对话框
```javascript
async function openShipmentDialog(order) {
  // 为每个订单项目加载可用产品
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    
    // 获取该产品的所有可用库存
    const response = await fetch(`/api/warehouse/products/${item.productId}/available`);
    const availableProducts = response.data;
    
    // 判断是设备还是配件
    const isDevice = availableProducts.some(p => p.imei || p.serialNumber);
    
    if (isDevice) {
      // 显示设备选择列表（复选框）
      // 每个设备显示 IMEI/SN、品牌、型号、颜色、成色
    } else {
      // 显示数量输入框
      // 默认值为订单数量
    }
  }
}
```

#### 2. 设备选择
```javascript
function updateDeviceSelection(itemIndex, requiredCount) {
  const checkboxes = document.querySelectorAll(`input[name="device_${itemIndex}"]:checked`);
  const selectedCount = checkboxes.length;
  
  // 更新选择计数显示
  document.getElementById(`selectedCount_${itemIndex}`).textContent = selectedCount;
  
  // 如果已选够，禁用其他复选框
  if (selectedCount >= requiredCount) {
    // 禁用未选中的复选框
  }
}
```

#### 3. 确认发货
```javascript
async function confirmShipment() {
  const shipmentItems = [];
  
  for (let i = 0; i < itemCount; i++) {
    const isDevice = document.getElementById(`isDevice_${i}`).value === 'true';
    
    if (isDevice) {
      // 收集选中的设备 ID
      const checkboxes = document.querySelectorAll(`input[name="device_${i}"]:checked`);
      const selectedProducts = Array.from(checkboxes).map(cb => cb.value);
      
      shipmentItems.push({
        productId,
        isDevice: true,
        selectedProducts
      });
    } else {
      // 获取数量
      const quantity = parseInt(document.getElementById(`quantity_${i}`).value);
      
      shipmentItems.push({
        productId,
        isDevice: false,
        quantity
      });
    }
  }
  
  // 发送发货请求
  await fetch(`/api/warehouse/orders/${orderId}/ship`, {
    method: 'PUT',
    body: JSON.stringify({ shipmentItems })
  });
}
```

### 发货对话框 HTML 结构
```html
<div id="shipmentModal" class="modal">
  <div class="modal-content">
    <h2>🚚 标记发货</h2>
    
    <div id="shipmentItemsList">
      <!-- 对于每个订单项目 -->
      <div data-item-index="0">
        <h4>产品名称 (订购数量: 2)</h4>
        
        <!-- 设备：显示选择列表 -->
        <div id="deviceList_0">
          <label>
            <input type="checkbox" name="device_0" value="productId1">
            IMEI: 123456789012345
            <div>Samsung Galaxy A53 - Black - New</div>
          </label>
          <label>
            <input type="checkbox" name="device_0" value="productId2">
            IMEI: 123456789012346
            <div>Samsung Galaxy A53 - Blue - New</div>
          </label>
        </div>
        <div>已选择: <span id="selectedCount_0">0</span> / 2</div>
        
        <!-- 配件：显示数量输入 -->
        <input type="number" id="quantity_0" value="5" max="5">
      </div>
    </div>
    
    <button onclick="confirmShipment()">✅ 确认发货</button>
  </div>
</div>
```

## 后端实现

### 1. 获取可用产品 API
**路由**: `GET /api/warehouse/products/:productId/available`

```javascript
app.get('/api/warehouse/products/:productId/available', async (req, res) => {
  const baseProduct = await ProductNew.findById(productId);
  
  // 查找相同产品类型的所有可用库存
  const availableProducts = await ProductNew.find({
    name: baseProduct.name,
    brand: baseProduct.brand,
    model: baseProduct.model,
    isActive: true,
    quantity: { $gt: 0 }
  }).select('_id name brand model imei serialNumber color condition quantity');
  
  res.json({ success: true, data: availableProducts });
});
```

### 2. 发货 API（修改）
**路由**: `PUT /api/warehouse/orders/:id/ship`

**请求体**:
```json
{
  "shipmentItems": [
    {
      "productId": "...",
      "isDevice": true,
      "selectedProducts": ["productId1", "productId2"]
    },
    {
      "productId": "...",
      "isDevice": false,
      "quantity": 5
    }
  ]
}
```

**处理逻辑**:
```javascript
for (const shipmentItem of shipmentItems) {
  if (shipmentItem.isDevice) {
    // 设备：处理每个选中的产品
    for (const productId of shipmentItem.selectedProducts) {
      const product = await ProductNew.findById(productId);
      
      // 创建商户库存（继承 IMEI/SN）
      const merchantInventory = new MerchantInventory({
        merchantId: order.merchantId,
        productName: product.name,
        imei: product.imei,
        serialNumber: product.serialNumber,
        color: product.color,
        condition: product.condition,
        // ... 其他字段
      });
      await merchantInventory.save();
      
      // 标记仓库产品为已转移
      product.quantity = 0;
      product.isActive = false;
      await product.save();
    }
  } else {
    // 配件：按数量创建商户库存
    for (let i = 0; i < shipmentItem.quantity; i++) {
      const merchantInventory = new MerchantInventory({
        merchantId: order.merchantId,
        productName: product.name,
        // ... 其他字段
      });
      await merchantInventory.save();
    }
  }
}
```

## 数据模型

### ProductNew（仓库产品）
```javascript
{
  _id: ObjectId,
  name: String,
  brand: String,
  model: String,
  imei: String,          // 设备特有
  serialNumber: String,  // 设备特有
  color: String,
  condition: String,
  quantity: Number,      // 0 = 已转移
  isActive: Boolean,     // false = 已转移
  // ...
}
```

### MerchantInventory（商户库存）
```javascript
{
  _id: ObjectId,
  merchantId: String,
  productName: String,
  imei: String,          // 从仓库产品继承
  serialNumber: String,  // 从仓库产品继承
  color: String,         // 从仓库产品继承
  condition: String,     // 从仓库产品继承
  quantity: Number,      // 始终为 1
  source: 'warehouse',
  sourceOrderId: ObjectId,
  // ...
}
```

### InventoryTransfer（库存转移记录）
```javascript
{
  _id: ObjectId,
  fromLocation: 'warehouse',
  toLocation: String,    // merchantId
  productId: ObjectId,
  productName: String,
  quantity: Number,
  transferType: 'warehouse_to_merchant',
  status: 'completed',
  orderId: ObjectId,
  details: [             // 设备转移详情
    { productId: ObjectId }
  ],
  // ...
}
```

## 用户界面

### 发货对话框示例

```
┌─────────────────────────────────────────────────────┐
│ 🚚 标记发货                                    ✕    │
├─────────────────────────────────────────────────────┤
│ 请为每个订单项目选择具体的产品或填写发货数量。      │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Samsung Galaxy A53 (订购数量: 2)               │ │
│ │                                                 │ │
│ │ 选择设备 (需选择 2 台):                         │ │
│ │ ┌───────────────────────────────────────────┐   │ │
│ │ │ ☑ IMEI: 123456789012345                   │   │ │
│ │ │   Samsung Galaxy A53 - Black - New        │   │ │
│ │ │                                           │   │ │
│ │ │ ☑ IMEI: 123456789012346                   │   │ │
│ │ │   Samsung Galaxy A53 - Blue - New         │   │ │
│ │ │                                           │   │ │
│ │ │ ☐ IMEI: 123456789012347                   │   │ │
│ │ │   Samsung Galaxy A53 - White - New        │   │ │
│ │ └───────────────────────────────────────────┘   │ │
│ │ 已选择: 2 / 2                                   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ USB-C Cable (订购数量: 5)                      │ │
│ │                                                 │ │
│ │ 发货数量: [5] (最多 5 件)                       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│                          [取消]  [✅ 确认发货]      │
└─────────────────────────────────────────────────────┘
```

## 测试步骤

### 测试 1：设备发货
1. 登录仓管员账号（warehouse_manager / 123456）
2. 查看待发货订单（status: confirmed）
3. 点击"标记发货"
4. 对于设备产品：
   - ✅ 显示可用设备列表（IMEI/SN）
   - ✅ 选择具体设备（复选框）
   - ✅ 选择计数正确显示
   - ✅ 选够后禁用其他复选框
5. 点击"确认发货"
6. ✅ 发货成功
7. 商户登录查看库存
8. ✅ 确认商户库存包含正确的 IMEI/SN

### 测试 2：配件发货
1. 仓管员查看包含配件的订单
2. 点击"标记发货"
3. 对于配件产品：
   - ✅ 显示数量输入框
   - ✅ 默认值为订单数量
   - ✅ 可以修改数量（不超过订单数量）
4. 点击"确认发货"
5. ✅ 发货成功
6. 商户登录查看库存
7. ✅ 确认商户库存数量正确

### 测试 3：混合订单
1. 订单包含设备和配件
2. 点击"标记发货"
3. ✅ 设备显示选择列表
4. ✅ 配件显示数量输入
5. 完成所有选择后发货
6. ✅ 两种产品都正确转移到商户库存

### 测试 4：验证错误处理
1. 设备未选够数量 → ✅ 提示错误
2. 配件数量超过订单 → ✅ 提示错误
3. 设备已被其他订单使用 → ✅ 提示不可用

## 修改文件
- `StockControl-main/public/prototype-working.html` - 前端发货对话框和逻辑
- `StockControl-main/app.js` - 后端 API（获取可用产品、发货处理）

## 修改时间
2026-02-02
