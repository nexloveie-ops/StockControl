# 调货IMEI选择功能 - 最终版本

## 需求确认
用户要求：在批准调货时，如果产品是设备（有IMEI/序列号），需要让调出方选择具体要调出的设备IMEI。

## 实现逻辑

### 1. 批准调货流程
```
1. 点击"批准"按钮
2. 获取调货详情
3. 检查每个产品是否是设备（有IMEI/序列号）
4. 如果有设备：
   - 显示IMEI选择模态框
   - 用户选择具体要调出的设备
   - 确认后提交批准
5. 如果没有设备（全是配件）：
   - 直接批准
```

### 2. 设备检测逻辑
```javascript
// 查询调出方的库存
const invResponse = await fetch(`${API_BASE}/merchant/inventory?merchantId=${transfer.fromMerchant}`);
const invResult = await invResponse.json();

// 找到对应的库存记录
const inventory = invResult.data.find(inv => inv._id === item.inventoryId);

// 如果有序列号或IMEI，说明是设备
if (inventory.serialNumber || inventory.imei) {
  // 查询相同产品的所有可用设备
  const sameProductDevices = invResult.data.filter(inv => 
    inv.productName === item.productName &&
    inv.status === 'active' &&
    inv.quantity > 0 &&
    (inv.serialNumber || inv.imei)
  );
  
  // 需要选择IMEI
  itemsNeedingIMEI.push({
    ...item,
    availableDevices: sameProductDevices,
    selectedIMEIs: []
  });
}
```

### 3. IMEI选择界面
- 显示调货单号、调出方、调入方
- 为每个设备产品显示：
  - 产品名称、品牌、型号
  - 需要数量 / 已选择数量
  - 可用设备列表（IMEI、成色、型号、颜色）
- 用户可以点击选择/取消选择设备
- 选中的设备显示绿色背景和勾选标记
- 限制选择数量不超过需要数量

### 4. 数据提交
```javascript
// 准备IMEI映射数据
const imeiMapping = {
  "原inventoryId": ["选中的设备inventoryId1", "选中的设备inventoryId2"]
};

// 提交批准
await fetch(`${API_BASE}/merchant/inventory/transfer/approve`, {
  method: 'POST',
  body: JSON.stringify({
    transferId: transferId,
    action: 'approve',
    notes: notes,
    merchantId: merchantId,
    imeiMapping: imeiMapping
  })
});
```

## 关键函数

### approveTransfer(transferId)
- 获取调货详情
- 检查产品是否是设备
- 显示IMEI选择界面或直接批准

### showIMEISelectionModal(transferId, itemsNeedingIMEI, transfer)
- 创建模态框
- 显示产品列表
- 加载可用IMEI

### loadAvailableIMEIs(item, index)
- 渲染可用设备列表
- 显示设备详细信息

### toggleIMEISelection(itemIndex, inventoryId, serialOrIMEI)
- 切换设备选择状态
- 更新UI显示
- 限制选择数量

### confirmIMEISelection(transferId)
- 验证选择数量
- 准备IMEI映射数据
- 提交批准

### submitApproval(transferId, imeiMapping)
- 调用批准API
- 传递IMEI映射数据

## 测试步骤

### 1. 准备测试数据
```bash
# 删除所有调货记录并恢复库存
node reset-transfer-orders.js

# 检查库存状态
node check-merchant-inventory-status.js
```

### 2. 创建调货申请
1. 使用Mobile123账号登录
2. 进入"群组库存"
3. 添加设备到购物车（例如：IPHONE11 x 2）
4. 提交调货申请

### 3. 测试IMEI选择
1. 使用MurrayRanelagh账号登录
2. 进入"调货管理" > "待审批"
3. 点击"批准"按钮
4. 打开浏览器控制台（F12）查看日志
5. 应该看到IMEI选择模态框：
   - 显示调货单号
   - 显示调出方和调入方
   - 显示产品信息
   - 显示可用设备列表（3个iPhone 11）
   - 需要数量：2 件
   - 已选择：0 件

6. 选择2个设备：
   - 点击第一个设备（背景变绿，显示勾选）
   - 点击第二个设备（背景变绿，显示勾选）
   - 已选择数量变为：2 件

7. 尝试选择第3个设备：
   - 应该弹出提示："最多只能选择 2 件"

8. 点击"✅ 确认并批准"
9. 输入备注（可选）
10. 确认批准

### 4. 验证结果
- 订单状态变为"已批准"
- 订单从"待审批"移到"已批准"标签
- 控制台显示IMEI映射数据

## 控制台日志示例
```
=== 开始批准调货流程 ===
调货ID: 698d035af441fd79946a57fb
调货详情: {...}
调出方: MurrayRanelagh ham lin
调入方: Mobile123 shu chen
产品列表: [...]

检查产品: IPHONE11
  - inventoryId: 698b5b5d6ea0dc97349026c4
  - 数量: 1
  - 找到库存记录: {...}
  - 序列号: null
  - IMEI: 352926111850103
  ✅ 这是设备，需要选择IMEI
  - 找到 3 个相同产品的可用设备

检查产品: IPHONE11
  - inventoryId: 698ab37b577c287584aa4c64
  - 数量: 1
  - 找到库存记录: {...}
  - 序列号: null
  - IMEI: 353988109592906
  ✅ 这是设备，需要选择IMEI
  - 找到 3 个相同产品的可用设备

=== 检查完成 ===
需要选择IMEI的产品数量: 2
✅ 显示IMEI选择界面
显示IMEI选择模态框
模态框已添加到页面
开始加载产品 1 的IMEI列表: IPHONE11
开始加载产品 2 的IMEI列表: IPHONE11

IMEI映射: {
  "698b5b5d6ea0dc97349026c4": ["698b5b5d6ea0dc97349026c4"],
  "698ab37b577c287584aa4c64": ["698ab37b577c287584aa4c64"]
}
```

## 注意事项

1. **设备判断**：通过检查库存记录是否有`serialNumber`或`imei`字段来判断是否是设备
2. **数量限制**：用户选择的设备数量不能超过申请的数量
3. **相同产品**：显示所有相同产品名称的可用设备供选择
4. **状态过滤**：只显示`status='active'`且`quantity>0`的设备
5. **UI反馈**：选中的设备显示绿色背景和勾选标记
6. **数据传递**：通过`imeiMapping`参数传递选中的设备ID映射

## 文件修改
- `StockControl-main/public/merchant.html`
  - `approveTransfer()` 函数
  - `showIMEISelectionModal()` 函数
  - `loadAvailableIMEIs()` 函数
  - `toggleIMEISelection()` 函数
  - `confirmIMEISelection()` 函数
  - `closeIMEISelectionModal()` 函数
  - `submitApproval()` 函数

## 后续工作
后端需要处理`imeiMapping`参数，在批准时记录选中的设备，在确认收货时使用这些设备进行库存变更。

## 相关文档
- `reset-transfer-orders.js` - 删除调货记录脚本
- `check-merchant-inventory-status.js` - 检查库存状态脚本
- `FIX_TRANSFER_API_CALL.md` - 调货API修复
- `GROUP_INVENTORY_CART_COMPLETE.md` - 购物车功能
