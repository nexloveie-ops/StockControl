# 仓库订单发货 - IMEI/SN选择功能

## 功能说明
仓库订单管理中的发货功能已经完整实现了设备IMEI/SN选择功能。当仓库管理员标记发货时，系统会自动识别产品类型：
- **设备产品**（有IMEI/SN）：显示可选择的IMEI/SN列表
- **配件产品**（无IMEI/SN）：显示数量输入框

## 功能特点

### 1. 自动识别产品类型
系统会调用 `/api/warehouse/products/:productId/available` API获取产品的可用库存：
- 如果产品有 `serialNumbers` 数组且长度 > 0，识别为设备
- 否则识别为配件

### 2. 设备产品 - IMEI/SN选择
对于设备产品，界面会显示：
- ✅ 所有可用设备的IMEI/SN列表
- ✅ 每个设备的详细信息（品牌、型号、颜色、成色）
- ✅ 复选框供管理员选择具体设备
- ✅ 实时显示已选择数量 / 需要数量
- ✅ 达到需要数量后自动禁用其他复选框

示例界面：
```
选择设备 (需选择 3 台):
☑ IMEI: 123456789012345
  Apple iPhone 15 Pro - Black - Brand New
☑ IMEI: 123456789012346
  Apple iPhone 15 Pro - Black - Brand New
☐ IMEI: 123456789012347
  Apple iPhone 15 Pro - Black - Brand New

已选择: 2 / 3
```

### 3. 配件产品 - 数量输入
对于配件产品，界面会显示：
- ✅ 数量输入框
- ✅ 默认值为订购数量
- ✅ 最大值限制为订购数量

示例界面：
```
发货数量: [3] (最多 5 件)
```

### 4. 发货验证
点击"✅ 确认发货"时，系统会验证：
- 设备产品：必须选择足够数量的IMEI/SN
- 配件产品：必须输入有效的数量（≥1）

## 代码实现

### 前端代码
**文件**: `StockControl-main/public/prototype-working.html`

#### 1. 打开发货对话框 (第7938-8046行)
```javascript
async function openShipmentDialog(order) {
  const modal = document.getElementById('shipmentModal');
  const container = document.getElementById('shipmentItemsList');
  
  // 为每个订单项目加载可用的产品
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    
    // 获取该产品的所有可用库存（带 IMEI/SN）
    const productsResponse = await fetch(`/api/warehouse/products/${productId}/available`);
    const availableProducts = productsResult.success ? productsResult.data : [];
    
    // 判断是否为设备
    const isDevice = availableProducts.some(p => p.imei || p.serialNumber);
    
    // 根据产品类型渲染不同的界面
    if (isDevice) {
      // 显示IMEI/SN选择列表
    } else {
      // 显示数量输入框
    }
  }
}
```

#### 2. 更新设备选择计数 (第8048-8068行)
```javascript
function updateWarehouseDeviceSelection(itemIndex, requiredCount) {
  const checkboxes = document.querySelectorAll(`input[name="device_${itemIndex}"]:checked`);
  const selectedCount = checkboxes.length;
  
  // 更新计数显示
  document.getElementById(`selectedCount_${itemIndex}`).textContent = selectedCount;
  
  // 如果已选够，禁用其他复选框
  if (selectedCount >= requiredCount) {
    // 禁用未选中的复选框
  }
}
```

#### 3. 确认发货 (第8070-8141行)
```javascript
async function confirmShipment() {
  const shipmentItems = [];
  
  for (let i = 0; i < itemCount; i++) {
    const isDevice = document.getElementById(`isDevice_${i}`).value === 'true';
    
    if (isDevice) {
      // 收集选中的 IMEI/SN
      const checkboxes = document.querySelectorAll(`input[name="device_${i}"]:checked`);
      const selectedProducts = Array.from(checkboxes).map(cb => cb.value);
      
      if (selectedProducts.length === 0) {
        alert('请为所有设备选择 IMEI/SN');
        return;
      }
      
      shipmentItems.push({
        productId,
        isDevice: true,
        selectedProducts  // 选中的设备ID数组
      });
    } else {
      // 获取配件数量
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

### 后端API

#### 1. 获取可用产品 (app.js 第1972-2085行)
```javascript
app.get('/api/warehouse/products/:productId/available', async (req, res) => {
  const { productId } = req.params;
  
  // 查找产品（支持 ProductNew 和 AdminInventory）
  let baseProduct = await ProductNew.findById(productId);
  
  // 检查产品是否有序列号（设备）
  if (baseProduct.serialNumbers && baseProduct.serialNumbers.length > 0) {
    // 设备：返回每个可用的序列号作为单独的产品
    const availableDevices = baseProduct.serialNumbers
      .filter(sn => sn.status === 'available')
      .map(sn => ({
        _id: sn._id,
        name: baseProduct.name,
        serialNumber: sn.serialNumber,
        imei: sn.imei || null,
        brand: baseProduct.brand,
        model: baseProduct.model,
        color: baseProduct.color,
        condition: baseProduct.condition,
        quantity: 1,
        source: 'ProductNew'
      }));
    
    return res.json({ success: true, data: availableDevices });
  }
  
  // 配件：返回产品本身（按 stockQuantity）
  return res.json({
    success: true,
    data: [{
      _id: baseProduct._id,
      name: baseProduct.name,
      quantity: baseProduct.stockQuantity,
      source: 'ProductNew'
    }]
  });
});
```

#### 2. 标记发货 (app.js 第2687-2724行)
```javascript
app.put('/api/warehouse/orders/:id/ship', async (req, res) => {
  const order = await WarehouseOrder.findById(req.params.id);
  const { shipmentItems } = req.body;
  
  if (order.status !== 'confirmed') {
    return res.status(400).json({ error: '订单必须先确认' });
  }
  
  // 保存发货信息到订单（用于后续商户确认收货时使用）
  order.shipmentDetails = shipmentItems;
  
  // 更新订单状态为已发货
  order.status = 'shipped';
  order.shippedAt = new Date();
  
  await order.save();
  
  res.json({
    success: true,
    message: '订单已标记为发货，等待商户确认收货'
  });
});
```

#### 3. 商户确认收货 - 转移库存 (app.js 第2726行开始)
当商户确认收货时，系统会根据 `shipmentDetails` 中的信息转移库存：
- 对于设备：转移指定的IMEI/SN到商户库存
- 对于配件：转移指定数量到商户库存

## 使用流程

### 仓库管理员操作
1. 登录仓库管理员账号
2. 进入"🛒 订单管理"标签页
3. 找到状态为"已确认"的订单
4. 点击"查看详情"
5. 点击"🚚 标记发货"按钮
6. 系统自动加载每个产品的可用库存
7. 对于设备产品：
   - 查看IMEI/SN列表
   - 勾选需要发货的设备
   - 确保选择数量 = 订购数量
8. 对于配件产品：
   - 输入发货数量
9. 点击"✅ 确认发货"
10. 订单状态变更为"已发货"

### 商户操作
1. 商户收到货物后
2. 在"订单管理"中找到"已发货"的订单
3. 点击"✅ 确认收货"
4. 系统自动将库存转移到商户的MerchantInventory
5. 订单状态变更为"已完成"

## 数据流

```
1. 仓库管理员点击"标记发货"
   ↓
2. 前端调用 GET /api/warehouse/products/:productId/available
   ↓
3. 后端返回可用产品列表（设备返回IMEI/SN，配件返回数量）
   ↓
4. 前端根据产品类型渲染界面
   ↓
5. 管理员选择IMEI/SN或输入数量
   ↓
6. 前端调用 PUT /api/warehouse/orders/:id/ship
   ↓
7. 后端保存 shipmentDetails 到订单
   ↓
8. 订单状态变更为 'shipped'
   ↓
9. 商户确认收货
   ↓
10. 后端根据 shipmentDetails 转移库存
   ↓
11. 订单状态变更为 'completed'
```

## 测试方法

### 1. 检查现有订单
```bash
node check-warehouse-orders.js
```

### 2. 测试发货功能
1. 在浏览器中打开 `http://localhost:3000/prototype-working.html`
2. 登录仓库管理员账号（如 `warehouse1`）
3. 进入"🛒 订单管理"
4. 找到状态为"已确认"的订单
5. 点击"🚚 标记发货"
6. 验证设备产品显示IMEI/SN选择界面
7. 验证配件产品显示数量输入框

### 3. 验证API
```bash
# 获取可用产品（替换为实际的productId）
curl http://localhost:3000/api/warehouse/products/[productId]/available

# 标记发货（替换为实际的orderId）
curl -X PUT http://localhost:3000/api/warehouse/orders/[orderId]/ship \
  -H "Content-Type: application/json" \
  -d '{"shipmentItems":[{"productId":"xxx","isDevice":true,"selectedProducts":["sn1","sn2"]}]}'
```

## 注意事项

1. **设备识别逻辑**：
   - 产品必须有 `serialNumbers` 数组且长度 > 0
   - 每个序列号对象必须有 `imei` 或 `serialNumber` 字段

2. **库存状态**：
   - 只显示 `status === 'available'` 的设备
   - 已售出或已预留的设备不会显示

3. **数量验证**：
   - 设备：必须选择足够数量的IMEI/SN
   - 配件：输入的数量不能超过订购数量

4. **兼容性**：
   - 支持 ProductNew（设备和配件）
   - 支持 AdminInventory（主要是配件）

## 状态
✅ **功能已完整实现** - 仓库订单发货时可以选择设备的IMEI/SN
