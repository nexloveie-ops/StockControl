# 修复调货IMEI选择 - 正确实现

## 问题根源
之前的实现中，IMEI/序列号在**创建调货申请时**就已经从库存记录中复制到订单中了，而不是在批准时由用户选择。

### 问题代码位置
`app.js` 第8283行（调货申请API）：
```javascript
serialNumber: inv.serialNumber,  // ❌ 错误：直接复制了序列号
```

这导致：
1. 创建申请时，系统自动选择了第一个匹配的库存记录的IMEI
2. 批准时无法选择IMEI，因为已经被设置了
3. 用户无法控制调出哪个具体的设备

## 解决方案

### 1. 修改调货申请API
**不要在创建申请时复制序列号**

```javascript
// app.js 第8283行
transferItems.push({
  inventoryId: inv._id,
  productName: inv.productName,
  brand: inv.brand,
  model: inv.model,
  category: inv.category,
  quantity: qty,
  transferPrice: transferPrice,
  barcode: inv.barcode,
  // ❌ 删除这行：serialNumber: inv.serialNumber,
  color: inv.color,
  condition: inv.condition,
  taxClassification: inv.taxClassification,
  retailPrice: inv.retailPrice
});
```

### 2. 修改批准API
**接收并保存用户选择的IMEI映射**

```javascript
// app.js 第8440行
app.post('/api/merchant/inventory/transfer/approve', async (req, res) => {
  const { transferId, action, notes, merchantId, imeiMapping } = req.body;
  
  if (action === 'approve') {
    // 如果有IMEI映射，更新订单中的序列号
    if (imeiMapping) {
      console.log('收到IMEI映射:', imeiMapping);
      
      // 更新每个产品的序列号
      for (let i = 0; i < transfer.items.length; i++) {
        const item = transfer.items[i];
        const selectedInventoryIds = imeiMapping[item.inventoryId.toString()];
        
        if (selectedInventoryIds && selectedInventoryIds.length > 0) {
          // 获取选中的库存记录
          const selectedInventory = await MerchantInventory.findById(selectedInventoryIds[0]);
          if (selectedInventory) {
            // 更新订单项的序列号/IMEI
            transfer.items[i].serialNumber = selectedInventory.serialNumber || selectedInventory.imei;
            transfer.items[i].imei = selectedInventory.imei;
            // 更新inventoryId为实际选中的设备
            transfer.items[i].inventoryId = selectedInventory._id;
            
            console.log(`✅ 更新产品 ${item.productName} 的IMEI: ${transfer.items[i].serialNumber}`);
          }
        }
      }
    }
    
    transfer.status = 'approved';
    transfer.approvedBy = user._id;
    transfer.approvedAt = new Date();
    transfer.approvalNotes = notes || '';
    transfer.imeiMapping = imeiMapping; // 保存IMEI映射
  }
  
  await transfer.save();
});
```

### 3. 前端IMEI选择（已实现）
`merchant.html` 中的 `approveTransfer()` 函数：
- 检查产品是否有IMEI/序列号
- 显示IMEI选择模态框
- 用户选择具体设备
- 提交IMEI映射到批准API

## 完整流程

### 创建调货申请
```
1. 用户选择产品和数量
2. 系统创建订单，但不设置序列号
3. 订单状态：pending
4. items中的serialNumber字段为空
```

### 批准调货
```
1. 调出方点击"批准"
2. 系统检查产品是否有IMEI
3. 如果有IMEI：
   - 显示IMEI选择界面
   - 用户选择具体设备
   - 提交imeiMapping到API
4. API更新订单：
   - 设置items[i].serialNumber
   - 设置items[i].imei
   - 更新items[i].inventoryId
   - 保存imeiMapping
5. 订单状态：approved
```

### 确认收货
```
1. 调入方确认收货
2. 系统根据items中的inventoryId和serialNumber处理库存
3. 从调出方扣减库存
4. 为调入方创建新库存（带IMEI）
5. 订单状态：completed
```

## 数据结构

### 调货订单（InventoryTransfer）
```javascript
{
  transferNumber: "TRF20260211001",
  status: "approved",
  items: [
    {
      inventoryId: "698b5b5d6ea0dc97349026c4",  // 选中的具体设备ID
      productName: "IPHONE11",
      quantity: 1,
      serialNumber: "352928114188457",  // 批准时设置
      imei: "352928114188457",          // 批准时设置
      // ...
    }
  ],
  imeiMapping: {
    "原inventoryId": ["选中的设备inventoryId"]
  }
}
```

### IMEI映射格式
```javascript
{
  "698b5b5d6ea0dc97349026c4": ["698b5b5d6ea0dc97349026c4"],
  "698ab37b577c287584aa4c64": ["698ab37b577c287584aa4c64"]
}
```

## 测试步骤

### 1. 删除旧数据并重启服务器
```bash
# 删除所有调货记录
node reset-transfer-orders.js

# 重启服务器（因为修改了app.js）
# 停止当前服务器（Ctrl+C）
# 重新启动：node app.js
```

### 2. 创建新的调货申请
1. 使用Mobile123账号登录
2. 进入"群组库存"
3. 添加iPhone 11设备（数量：2）
4. 提交调货申请
5. **检查**：订单中的items应该没有serialNumber

### 3. 批准并选择IMEI
1. 使用MurrayRanelagh账号登录
2. 进入"调货管理" > "待审批"
3. 点击"批准"按钮
4. 应该看到IMEI选择界面
5. 选择2个设备
6. 确认并批准
7. **检查**：订单中的items应该有serialNumber

### 4. 验证数据
```bash
# 检查订单详情
node check-transfer-TRF20260211001.js

# 应该看到：
# - items中有serialNumber
# - imeiMapping字段存在
# - serialNumber是用户选择的设备
```

## 文件修改
1. `StockControl-main/app.js`
   - 第8283行：删除 `serialNumber: inv.serialNumber,`
   - 第8440-8520行：修改批准API，处理imeiMapping

2. `StockControl-main/public/merchant.html`
   - `approveTransfer()` 函数：检查设备并显示IMEI选择
   - `showIMEISelectionModal()` 函数：显示选择界面
   - `confirmIMEISelection()` 函数：提交IMEI映射

## 注意事项
1. **必须重启服务器**：修改了app.js后端代码
2. **必须强制刷新浏览器**：修改了merchant.html前端代码（Ctrl + Shift + R）
3. **删除旧订单**：旧订单的数据结构不正确，需要重新创建
4. **配件不需要选择IMEI**：只有设备（有serialNumber或imei字段）才需要选择

## 相关文档
- `check-transfer-TRF20260211001.js` - 检查订单详情脚本
- `reset-transfer-orders.js` - 删除调货记录脚本
- `FIX_TRANSFER_IMEI_SELECTION_FINAL.md` - 前端实现文档
