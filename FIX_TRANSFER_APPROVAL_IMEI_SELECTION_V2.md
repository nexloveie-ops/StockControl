# 修复调货审批IMEI选择功能 V2

## 问题描述
用户在批准调货申请时，没有看到IMEI选择界面。

## 根本原因
1. **错误的merchantId**: `approveTransfer`函数使用当前用户的`merchantId`查询库存，但应该使用调出方（`fromMerchant`）的ID
2. **查询参数错误**: 使用了不存在的`productName`参数，应该使用`search`参数
3. **缺少调试信息**: 没有足够的console.log来追踪问题

## 解决方案

### 1. 修复approveTransfer函数
```javascript
// 修改前：使用当前用户的merchantId
const invResponse = await fetch(
  `${API_BASE}/merchant/inventory?merchantId=${merchantId}&productName=${encodeURIComponent(item.productName)}`
);

// 修改后：使用调出方的merchantId和正确的参数
const queryUrl = `${API_BASE}/merchant/inventory?merchantId=${transfer.fromMerchant}&search=${encodeURIComponent(item.productName)}`;
const invResponse = await fetch(queryUrl);
```

### 2. 添加详细的调试日志
```javascript
console.log('=== 开始批准调货流程 ===');
console.log('调货ID:', transferId);
console.log('调出方:', transfer.fromMerchant, transfer.fromMerchantName);
console.log('调入方:', transfer.toMerchant, transfer.toMerchantName);
console.log('产品列表:', transfer.items);

// 为每个产品添加详细日志
console.log(`\n检查产品: ${item.productName}`);
console.log('  - inventoryId:', item.inventoryId);
console.log('  - 数量:', item.quantity);
console.log('  - 品牌:', item.brand);
console.log('  - 型号:', item.model);
console.log('  - 查询URL:', queryUrl);
console.log('  - 查询结果:', invResult);
console.log(`  - 找到 ${devicesAvailable.length} 个可用设备`);
```

### 3. 修复loadAvailableIMEIs函数
```javascript
// 修改前：使用当前用户的merchantId
const response = await fetch(`${API_BASE}/merchant/inventory?merchantId=${merchantId}&productName=${encodeURIComponent(item.productName)}&hasSerial=true`);

// 修改后：从全局数据中获取调出方merchantId
const fromMerchantId = window.imeiSelectionData.transfer.fromMerchant;
const queryUrl = `${API_BASE}/merchant/inventory?merchantId=${fromMerchantId}&search=${encodeURIComponent(item.productName)}`;
const response = await fetch(queryUrl);
```

### 4. 改进IMEI选择模态框
- 显示调出方和调入方信息
- 显示产品的品牌、型号、颜色
- 在IMEI列表中显示更多设备信息（成色、型号、颜色）
- 添加更多console.log来追踪模态框显示

## 调货流程说明

### 角色和数据流
```
调货申请：
  - 调入方（toMerchant）：请求调货的店铺
  - 调出方（fromMerchant）：拥有库存的店铺

审批阶段：
  - 审批人：调出方的用户
  - 查询库存：必须查询调出方（fromMerchant）的库存
  - 选择IMEI：从调出方的库存中选择具体的设备
```

### API参数说明
```javascript
// 获取调货详情
GET /api/merchant/inventory/transfer/:id
返回: {
  success: true,
  data: {
    transferNumber: "TF-20260211-xxxx",
    fromMerchant: "merchant_001",  // 调出方ID
    fromMerchantName: "MurrayRanelagh",
    toMerchant: "merchant_002",    // 调入方ID
    toMerchantName: "MurrayDundrum",
    items: [{
      inventoryId: "...",
      productName: "iPhone 15 Pro",
      brand: "Apple",
      model: "iPhone 15 Pro",
      quantity: 2
    }]
  }
}

// 查询库存
GET /api/merchant/inventory?merchantId=xxx&search=xxx
参数:
  - merchantId: 必须使用fromMerchant（调出方）
  - search: 产品名称（模糊搜索）
返回: {
  success: true,
  data: [{
    _id: "...",
    productName: "iPhone 15 Pro",
    serialNumber: "ABC123",
    imei: "123456789012345",
    status: "active",
    quantity: 1,
    condition: "全新",
    model: "iPhone 15 Pro",
    color: "黑色"
  }]
}
```

## 测试步骤

### 1. 准备测试数据
```bash
# 确保MurrayRanelagh有设备库存（有IMEI/序列号）
node check-merchant-inventory-status.js
```

### 2. 创建调货申请
1. 使用MurrayDundrum账号登录
2. 进入"群组库存"
3. 添加设备到购物车（不选择IMEI）
4. 提交调货申请

### 3. 测试审批流程
1. 使用MurrayRanelagh账号登录
2. 进入"调货管理" > "待审批"
3. 点击"批准"按钮
4. 打开浏览器控制台（F12）
5. 查看console.log输出：
   ```
   === 开始批准调货流程 ===
   调货ID: ...
   调出方: merchant_001 MurrayRanelagh
   调入方: merchant_002 MurrayDundrum
   产品列表: [...]
   
   检查产品: iPhone 15 Pro
     - inventoryId: ...
     - 数量: 2
     - 品牌: Apple
     - 型号: iPhone 15 Pro
     - 查询URL: /api/merchant/inventory?merchantId=merchant_001&search=iPhone%2015%20Pro
     - 查询结果: {...}
     - 找到 5 个可用设备
     ✅ 需要选择IMEI
   
   === 检查完成 ===
   需要选择IMEI的产品数量: 1
   ✅ 显示IMEI选择界面
   显示IMEI选择模态框
   模态框已添加到页面
   开始加载产品 1 的IMEI列表: iPhone 15 Pro
   ```

6. 应该看到IMEI选择模态框
7. 选择所需数量的IMEI
8. 点击"确认并批准"

## 预期结果
- 批准设备调货时，应该显示IMEI选择界面
- 界面显示调出方和调入方信息
- 显示所有可用的设备及其IMEI/序列号
- 可以选择所需数量的设备
- 选择完成后可以批准调货

## 文件修改
- `StockControl-main/public/merchant.html`
  - `approveTransfer()` 函数（第6445-6550行）
  - `showIMEISelectionModal()` 函数（第6552-6650行）
  - `loadAvailableIMEIs()` 函数（第6652-6730行）

## 注意事项
1. 修改HTML文件后需要强制刷新浏览器（Ctrl + Shift + R）
2. 查看浏览器控制台的调试信息来追踪问题
3. 确保调出方有可用的设备库存（status='active', quantity>0, 有IMEI/序列号）
4. 配件不需要选择IMEI，只有设备需要

## 相关文档
- `FIX_TRANSFER_APPROVAL_IMEI_SELECTION.md` - 第一版实现
- `FIX_TRANSFER_API_CALL.md` - 调货API修复
- `GROUP_INVENTORY_CART_COMPLETE.md` - 购物车功能
