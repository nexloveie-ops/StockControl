# 调货审批添加IMEI选择功能

## 日期
2026-02-11

## 问题描述
用户反馈：在merchant.html的"调货管理" → "待审批"中，批准调货申请时没有选择IMEI的步骤，这与我们的设计不符。

## 设计要求

### 调货流程
1. **申请阶段**（调入方）：选择产品和数量，不选择IMEI
2. **审批阶段**（调出方）：审批时为设备选择具体的IMEI
3. **发货阶段**（调出方）：确认发货
4. **收货阶段**（调入方）：确认收货

### 为什么在审批时选择IMEI？
1. **灵活性**：调出方可以根据实际情况选择最合适的设备
2. **准确性**：避免申请时选择的设备在审批时已被占用
3. **效率**：简化申请流程，只在必要时选择IMEI

## 解决方案

### 实现思路

#### 1. 检测设备类型
在批准时，检查调货项目中是否有设备（有序列号/IMEI的产品）：
- 如果有设备：显示IMEI选择界面
- 如果没有设备（只有配件）：直接批准

#### 2. IMEI选择界面
为每个设备显示：
- 产品名称、型号、颜色
- 需要数量
- 已选择数量
- 可用的序列号/IMEI列表（可多选）

#### 3. 验证选择
确保每个设备都选择了足够数量的IMEI

#### 4. 提交批准
将IMEI映射数据发送给后端

## 实现细节

### 新增函数

#### 1. `approveTransfer(transferId)` - 重构
```javascript
async function approveTransfer(transferId) {
  // 1. 获取调货详情
  const transfer = await getTransferDetails(transferId);
  
  // 2. 检查是否有需要选择IMEI的设备
  const itemsNeedingIMEI = [];
  for (const item of transfer.items) {
    const inventory = await getInventoryDetails(item.inventoryId);
    if (inventory.serialNumber || inventory.imei) {
      itemsNeedingIMEI.push(item);
    }
  }
  
  // 3. 如果有设备，显示IMEI选择界面
  if (itemsNeedingIMEI.length > 0) {
    showIMEISelectionModal(transferId, itemsNeedingIMEI, transfer);
  } else {
    // 没有设备，直接批准
    await submitApproval(transferId, null);
  }
}
```

#### 2. `showIMEISelectionModal()` - 显示IMEI选择界面
```javascript
function showIMEISelectionModal(transferId, itemsNeedingIMEI, transfer) {
  // 创建模态框
  const modal = document.createElement('div');
  
  // 为每个设备创建选择界面
  itemsNeedingIMEI.forEach((item, index) => {
    // 显示产品信息
    // 显示需要数量和已选择数量
    // 加载可用的IMEI列表
  });
  
  // 添加确认和取消按钮
  document.body.appendChild(modal);
  
  // 保存数据到全局变量
  window.imeiSelectionData = {
    transferId,
    items: itemsNeedingIMEI,
    transfer
  };
}
```

#### 3. `loadAvailableIMEIs()` - 加载可用IMEI
```javascript
async function loadAvailableIMEIs(item, index) {
  // 查询相同产品的所有可用库存
  const response = await fetch(
    `${API_BASE}/merchant/inventory?merchantId=${merchantId}&productName=${item.productName}&hasSerial=true`
  );
  
  // 过滤出有序列号/IMEI且状态为active的库存
  const availableItems = result.data.filter(inv => 
    inv.status === 'active' && 
    inv.quantity > 0 &&
    (inv.serialNumber || inv.imei)
  );
  
  // 渲染IMEI选项（可点击选择）
  availableItems.forEach(inv => {
    // 显示序列号/IMEI
    // 显示成色
    // 添加选择框
  });
}
```

#### 4. `toggleIMEISelection()` - 切换IMEI选择
```javascript
function toggleIMEISelection(itemIndex, inventoryId, serialOrIMEI) {
  const item = window.imeiSelectionData.items[itemIndex];
  
  // 检查是否已选择
  const selectedIndex = item.selectedIMEIs.findIndex(s => s.inventoryId === inventoryId);
  
  if (selectedIndex >= 0) {
    // 取消选择
    item.selectedIMEIs.splice(selectedIndex, 1);
    // 更新UI
  } else {
    // 检查数量上限
    if (item.selectedIMEIs.length >= item.quantity) {
      alert(`最多只能选择 ${item.quantity} 件`);
      return;
    }
    
    // 添加选择
    item.selectedIMEIs.push({ inventoryId, serialOrIMEI });
    // 更新UI
  }
  
  // 更新已选择数量显示
  document.getElementById(`selected-count-${itemIndex}`).textContent = item.selectedIMEIs.length;
}
```

#### 5. `confirmIMEISelection()` - 确认选择
```javascript
async function confirmIMEISelection(transferId) {
  const items = window.imeiSelectionData.items;
  
  // 验证所有设备都已选择足够的IMEI
  for (const item of items) {
    if (item.selectedIMEIs.length < item.quantity) {
      alert(`${item.productName} 还需要选择 ${item.quantity - item.selectedIMEIs.length} 件设备`);
      return;
    }
  }
  
  // 准备IMEI映射数据
  const imeiMapping = {};
  items.forEach(item => {
    imeiMapping[item.inventoryId] = item.selectedIMEIs.map(s => s.inventoryId);
  });
  
  // 关闭模态框并提交批准
  closeIMEISelectionModal();
  await submitApproval(transferId, imeiMapping);
}
```

#### 6. `submitApproval()` - 提交批准
```javascript
async function submitApproval(transferId, imeiMapping) {
  const notes = prompt('批准备注（可选）:');
  if (notes === null) return;
  
  const response = await fetch(`${API_BASE}/merchant/inventory/transfer/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transferId,
      action: 'approve',
      notes,
      merchantId,
      imeiMapping  // 传递IMEI映射
    })
  });
  
  if (result.success) {
    alert('✅ 已批准调货申请');
    loadPendingApprovalList();
  }
}
```

## IMEI映射数据结构

### 前端发送给后端
```javascript
{
  transferId: '...',
  action: 'approve',
  notes: '批准备注',
  merchantId: 'MurrayDundrum',
  imeiMapping: {
    'original_inventory_id_1': ['selected_inventory_id_1', 'selected_inventory_id_2'],
    'original_inventory_id_2': ['selected_inventory_id_3']
  }
}
```

### 说明
- `original_inventory_id`: 调货申请中的原始库存ID
- `selected_inventory_id`: 调出方选择的具体设备的库存ID
- 一个原始ID可以映射到多个选择的ID（因为数量可能大于1）

## UI设计

### IMEI选择模态框

```
┌─────────────────────────────────────────────────────┐
│ 📱 选择设备序列号/IMEI                        ×    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📋 调货单号: TR-1234567890                         │
│ 请为每个设备选择具体的序列号/IMEI，然后批准调货申请 │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ iPhone 13 - 128GB - Blue                        │ │
│ │                                                 │ │
│ │ 需要数量: 3 件    已选择: 2 件                  │ │
│ │                                                 │ │
│ │ 选择序列号/IMEI:                                │ │
│ │ ┌─────────────────────────────────────────────┐ │ │
│ │ │ ☑ 351952298904928                           │ │ │
│ │ │   成色: New                                 │ │ │
│ │ ├─────────────────────────────────────────────┤ │ │
│ │ │ ☑ 351952298904929                           │ │ │
│ │ │   成色: New                                 │ │ │
│ │ ├─────────────────────────────────────────────┤ │ │
│ │ │ ☐ 351952298904930                           │ │ │
│ │ │   成色: Like New                            │ │ │
│ │ └─────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Samsung Galaxy S22 - 256GB - Black              │ │
│ │                                                 │ │
│ │ 需要数量: 1 件    已选择: 1 件                  │ │
│ │                                                 │ │
│ │ 选择序列号/IMEI:                                │ │
│ │ ┌─────────────────────────────────────────────┐ │ │
│ │ │ ☑ 123456789012345                           │ │ │
│ │ │   成色: New                                 │ │ │
│ │ └─────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌──────────────┐  ┌──────────────────────────────┐ │
│ │   取消       │  │  ✅ 确认并批准                │ │
│ └──────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 特性
1. **可视化选择**：点击IMEI选项进行选择/取消
2. **实时反馈**：已选择的项显示绿色背景和勾选标记
3. **数量提示**：实时显示已选择数量
4. **验证提示**：数量不足时无法确认
5. **滚动列表**：IMEI列表可滚动查看

## 业务流程

### 场景：MurrayRanelagh 向 MurrayDundrum 申请调货

#### 步骤1：申请（MurrayRanelagh）
1. 浏览 MurrayDundrum 的群组库存
2. 添加产品到购物车：
   - iPhone 13 - 128GB - Blue × 3
   - Samsung Galaxy S22 × 1
3. 提交调货申请（不选择IMEI）

#### 步骤2：审批（MurrayDundrum）
1. 收到调货申请通知
2. 进入"调货管理" → "待审批"
3. 点击"✅ 批准"按钮
4. 系统检测到有设备需要选择IMEI
5. 显示IMEI选择界面：
   - iPhone 13: 显示3个可用设备，选择3个
   - Samsung: 显示2个可用设备，选择1个
6. 点击"✅ 确认并批准"
7. 输入批准备注（可选）
8. 提交批准

#### 步骤3：发货（MurrayDundrum）
1. 进入"待发货"列表
2. 查看已选择的IMEI
3. 准备货物
4. 确认发货

#### 步骤4：收货（MurrayRanelagh）
1. 收到发货通知
2. 进入"待收货"列表
3. 查看发货的IMEI
4. 确认收货
5. 产品进入库存（带有IMEI）

## 后端API调整（可能需要）

### 审批API需要处理IMEI映射
```javascript
app.post('/api/merchant/inventory/transfer/approve', async (req, res) => {
  const { transferId, action, notes, merchantId, imeiMapping } = req.body;
  
  if (action === 'approve' && imeiMapping) {
    // 更新调货记录，保存IMEI映射
    await InventoryTransfer.findByIdAndUpdate(transferId, {
      status: 'approved',
      approvedBy: merchantId,
      approvedAt: new Date(),
      approvalNotes: notes,
      imeiMapping: imeiMapping  // 保存IMEI映射
    });
    
    // 可能需要更新库存记录，标记选择的设备为"已预留"
    for (const [originalId, selectedIds] of Object.entries(imeiMapping)) {
      for (const selectedId of selectedIds) {
        await MerchantInventory.findByIdAndUpdate(selectedId, {
          status: 'reserved',  // 标记为已预留
          reservedFor: transferId
        });
      }
    }
  }
  
  // ...
});
```

## 测试步骤

### 准备测试数据
1. 确保 MurrayDundrum 有多个相同产品的设备：
   - iPhone 13 - 128GB - Blue × 5（每个有不同的序列号）
   - Samsung Galaxy S22 × 3（每个有不同的IMEI）

### 测试流程

#### 1. 创建调货申请
1. 登录 MurrayRanelagh
2. 进入"群组库存"
3. 选择 MurrayDundrum
4. 添加产品：
   - iPhone 13 - 128GB - Blue × 3
   - Samsung Galaxy S22 × 1
5. 提交申请

#### 2. 测试IMEI选择
1. 登录 MurrayDundrum
2. 进入"调货管理" → "待审批"
3. 点击"✅ 批准"
4. 验证IMEI选择界面：
   - ✅ 显示两个产品
   - ✅ iPhone 13 显示"需要数量: 3 件"
   - ✅ Samsung 显示"需要数量: 1 件"
   - ✅ 显示可用的IMEI列表

#### 3. 测试选择功能
1. 点击 iPhone 13 的第一个IMEI
   - ✅ 背景变绿
   - ✅ 显示勾选标记
   - ✅ "已选择"数量变为1
2. 点击第二个和第三个IMEI
   - ✅ "已选择"数量变为3
3. 尝试点击第四个IMEI
   - ✅ 显示提示："最多只能选择 3 件"
4. 点击已选择的IMEI取消选择
   - ✅ 背景变白
   - ✅ 勾选标记消失
   - ✅ "已选择"数量减少

#### 4. 测试验证
1. 只选择2个 iPhone 13 的IMEI
2. 选择1个 Samsung 的IMEI
3. 点击"✅ 确认并批准"
   - ✅ 显示提示："iPhone 13 还需要选择 1 件设备"
4. 补充选择第3个 iPhone 13 的IMEI
5. 再次点击"✅ 确认并批准"
   - ✅ 显示备注输入框
   - ✅ 提交成功
   - ✅ 显示："✅ 已批准调货申请"

#### 5. 验证结果
1. 检查调货记录状态变为"已批准"
2. 检查IMEI映射数据已保存
3. 检查选择的设备状态（如果后端实现了预留功能）

### 预期结果
- ✅ IMEI选择界面正常显示
- ✅ 可以选择和取消选择IMEI
- ✅ 数量限制生效
- ✅ 验证功能正常
- ✅ 批准成功
- ✅ IMEI映射数据正确

## 常见问题

### Q1: 如果没有足够的可用设备怎么办？
**A:** 系统会显示所有可用设备，如果数量不足，调出方无法完成选择，需要先补充库存或拒绝申请。

### Q2: 可以选择不同成色的设备吗？
**A:** 可以。IMEI选择界面会显示每个设备的成色，调出方可以根据实际情况选择。

### Q3: 如果是配件（没有IMEI）怎么办？
**A:** 系统会自动检测，如果调货项目中没有设备（都是配件），会跳过IMEI选择步骤，直接批准。

### Q4: 可以修改已选择的IMEI吗？
**A:** 在确认之前可以随时修改。确认后如需修改，需要拒绝申请并让对方重新申请。

### Q5: IMEI映射数据如何使用？
**A:** 后端在发货时会使用IMEI映射，将选择的具体设备从调出方库存转移到调入方库存。

## 文件修改

### StockControl-main/public/merchant.html
- 重构 `approveTransfer()` 函数
- 新增 `showIMEISelectionModal()` 函数
- 新增 `loadAvailableIMEIs()` 函数
- 新增 `toggleIMEISelection()` 函数
- 新增 `confirmIMEISelection()` 函数
- 新增 `closeIMEISelectionModal()` 函数
- 新增 `submitApproval()` 函数

## 相关文档
- `FIX_GROUP_INVENTORY_TRANSFER_CART.md` - 购物车功能改进
- `FIX_TRANSFER_API_CALL.md` - API调用修复
- `GROUP_INVENTORY_CART_COMPLETE.md` - 完成总结

## 状态
✅ 已实现

## 下一步
1. 清除浏览器缓存
2. 强制刷新页面（Ctrl + Shift + R）
3. 测试IMEI选择功能
4. 验证数据正确性
5. 可能需要调整后端API以支持IMEI映射
