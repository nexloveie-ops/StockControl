# 修复调货IMEI自动分配

## 问题描述
用户反馈：iPhone 11的IMEI是系统自动分配的，不应该手动选择。

## 根本原因
之前的实现错误地在批准阶段要求手动选择IMEI，但实际上系统应该在确认收货时自动处理IMEI分配。

## 系统设计的正确流程

### 调货流程
```
1. 申请阶段（调入方）
   - 浏览群组库存
   - 添加产品到购物车（不选择IMEI）
   - 提交调货申请
   - 状态：pending

2. 批准阶段（调出方）
   - 审核调货申请
   - 批准或拒绝
   - 状态：approved / rejected
   ❌ 不需要选择IMEI

3. 发货阶段（调出方）
   - 准备货物
   - 确认发货
   - 状态：shipped

4. 收货阶段（调入方）
   - 确认收货
   - ✅ 系统自动处理库存和IMEI分配
   - 状态：completed
```

### IMEI自动分配逻辑
在确认收货（complete）时，系统会：
1. 从调出方库存中减少数量
2. 自动选择对应的库存记录（包含IMEI/序列号）
3. 在调入方创建新的库存记录
4. 继承所有产品信息（包括IMEI、序列号、成色等）

参考代码：`app.js` 第8517-8750行

## 解决方案

### 1. 简化批准函数
移除所有IMEI选择相关的逻辑，直接调用批准API：

```javascript
// 批准调货
async function approveTransfer(transferId) {
  const notes = prompt('批准备注（可选）:');
  if (notes === null) return;
  
  try {
    const response = await fetch(`${API_BASE}/merchant/inventory/transfer/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transferId: transferId,
        action: 'approve',
        notes: notes,
        merchantId: merchantId
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('✅ 已批准调货申请\n\n系统将在确认收货时自动分配IMEI/序列号');
      loadTransferList();
    } else {
      alert('批准失败: ' + result.error);
    }
  } catch (error) {
    console.error('批准调货失败:', error);
    alert('批准失败: ' + error.message);
  }
}
```

### 2. 删除不需要的函数
删除以下函数：
- `showIMEISelectionModal()` - IMEI选择模态框
- `loadAvailableIMEIs()` - 加载IMEI列表
- `toggleIMEISelection()` - 切换IMEI选择
- `confirmIMEISelection()` - 确认IMEI选择
- `closeIMEISelectionModal()` - 关闭模态框
- `submitApproval()` - 提交批准（已合并到approveTransfer）

### 3. 用户提示
在批准成功后，提示用户：
```
✅ 已批准调货申请

系统将在确认收货时自动分配IMEI/序列号
```

## 测试步骤

### 1. 测试批准功能
1. 使用MurrayRanelagh账号登录
2. 进入"调货管理" > "待审批"
3. 点击"批准"按钮
4. 输入备注（可选）
5. 确认批准
6. 应该看到成功提示，订单状态变为"已批准"
7. ❌ 不应该看到IMEI选择界面

### 2. 测试完整流程
1. 使用MurrayDundrum账号创建调货申请
2. 使用MurrayRanelagh账号批准申请
3. 使用MurrayDundrum账号确认收货
4. 检查库存：
   - MurrayRanelagh库存减少
   - MurrayDundrum库存增加
   - IMEI/序列号自动继承

### 3. 验证数据
```bash
# 检查调货订单
node check-transfer-test-data.js

# 检查库存状态
node check-merchant-inventory-status.js
```

## API端点

### 批准调货
```
POST /api/merchant/inventory/transfer/approve

请求体:
{
  "transferId": "698d035af441fd79946a57fb",
  "action": "approve",  // 或 "reject"
  "notes": "批准备注",
  "merchantId": "MurrayRanelagh"
}

响应:
{
  "success": true,
  "data": {
    "transferId": "698d035af441fd79946a57fb",
    "status": "approved",
    "message": "已批准调货申请"
  }
}
```

### 确认收货
```
POST /api/merchant/inventory/transfer/complete

请求体:
{
  "transferId": "698d035af441fd79946a57fb",
  "merchantId": "MurrayDundrum",
  "customPrices": null  // 内部调拨不需要
}

响应:
{
  "success": true,
  "data": {
    "transferId": "698d035af441fd79946a57fb",
    "status": "completed",
    "message": "已确认收货"
  }
}
```

## 文件修改
- `StockControl-main/public/merchant.html`
  - 简化 `approveTransfer()` 函数
  - 删除所有IMEI选择相关函数

## 相关文档
- `FIX_TRANSFER_APPROVAL_IMEI_SELECTION.md` - 第一版（错误的实现）
- `FIX_TRANSFER_APPROVAL_IMEI_SELECTION_V2.md` - 第二版（错误的实现）
- `FIX_TRANSFER_API_CALL.md` - 调货API修复
- `GROUP_INVENTORY_CART_COMPLETE.md` - 购物车功能

## 注意事项
1. IMEI/序列号由系统在确认收货时自动分配
2. 批准阶段只是改变订单状态，不涉及库存操作
3. 确认收货时才会真正处理库存变更
4. 系统会自动继承原产品的所有属性（IMEI、序列号、成色、颜色等）
5. 修改HTML文件后需要强制刷新浏览器（Ctrl + Shift + R）
