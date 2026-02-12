# 上下文转移完成 - 2026年2月11日

## 当前状态总结

### ✅ 已完成的任务

#### 1. 调货IMEI选择功能 (TASK 1-3)
- **状态**: 完成
- **功能**: 批准调货时，调出方可以选择具体要调出的设备IMEI
- **实现位置**:
  - 后端: `app.js` 第8283行（删除自动复制）、第8440-8520行（批准API）
  - 前端: `merchant.html` 第6445-6780行（IMEI选择模态框）
- **版本**: v2.4.0
- **注意**: 需要强制刷新浏览器（Ctrl + Shift + R）

#### 2. 批准后刷新函数修复 (TASK 2)
- **状态**: 完成
- **问题**: `loadTransferList is not defined`
- **修复**: 改为 `loadTransferManagement()`
- **位置**: `merchant.html` 第6779行

#### 3. IMEI选择界面显示用户名 (TASK 3)
- **状态**: 完成
- **修改**: 显示 `transfer.fromMerchant` 和 `transfer.toMerchant`（用户名）
- **位置**: `merchant.html` 第6550行左右

#### 4. 销售业务隐藏空品牌 (TASK 5)
- **状态**: 完成
- **功能**: 品牌为空、"Unknown"或"Generic"时隐藏
- **位置**: `merchant.html` 第2522行

#### 5. 调货详情PDF税额计算修复 (TASK 6)
- **状态**: 完成
- **功能**: 根据每个产品的 `taxClassification` 计算税额
- **位置**: `merchant.html` 第9220-9400行

#### 6. 本日销售明细利润计算说明 (TASK 7)
- **状态**: 完成（仅查询）
- **公式**: 利润 = (销售价格 - 成本价) × 数量
- **位置**: `merchant.html` 第1616-1750行

### 🔄 进行中的任务

#### TASK 4: 确认收货批发价默认值
- **状态**: 代码已修改，等待用户验证
- **问题**: 用户反馈批发价输入框仍然是空的
- **已完成的工作**:
  1. ✅ 修改了 `showPriceSettingDialog()` 函数
  2. ✅ 添加了 `value="${item.transferPrice || ''}"`
  3. ✅ 添加了调试 console.log
  4. ✅ 验证了数据库中有正确的 transferPrice 数据
  
- **数据库验证结果**:
  ```
  订单号: TRF20260211001
  1. IPHONE11 - transferPrice: 195, retailPrice: 249
  2. IPAD11 - transferPrice: 315, retailPrice: 379
  3. iPhone Screen Saver - transferPrice: 2, retailPrice: 10
  ```

- **代码位置**: `merchant.html` 第6862-6930行
  ```javascript
  <input type="number" id="wholesalePrice_${index}" min="0" step="0.01" required
         value="${item.transferPrice || ''}"
         style="...">
  ```

- **可能的原因**:
  1. 浏览器缓存问题（最可能）
  2. 模板字符串渲染问题
  3. 数据传递问题

- **下一步操作**:
  1. 用户需要强制刷新浏览器（Ctrl + Shift + R）
  2. 打开浏览器控制台查看调试输出
  3. 检查是否有 JavaScript 错误
  4. 如果仍然不行，可以访问测试页面: `http://localhost:3000/test-price-dialog.html`

### 📝 测试文件

创建了测试文件 `test-price-dialog.html` 用于独立测试价格对话框功能：
- 位置: `StockControl-main/public/test-price-dialog.html`
- 用途: 验证模板字符串和数据绑定是否正常工作
- 访问: `http://localhost:3000/test-price-dialog.html`

### 🔍 调试步骤

如果用户仍然看不到批发价默认值，请按以下步骤调试：

1. **强制刷新浏览器**
   - Windows: Ctrl + Shift + R
   - Mac: Cmd + Shift + R

2. **检查浏览器控制台**
   - 打开开发者工具（F12）
   - 查看 Console 标签
   - 应该看到以下调试输出：
     ```
     === 显示价格设置对话框 ===
     订单: {...}
     产品列表: [...]
     产品 1: IPHONE11
       - transferPrice: 195
       - retailPrice: 249
     ```

3. **检查输入框的值**
   - 在 Elements 标签中找到输入框
   - 查看 `value` 属性是否有值
   - 如果有值但不显示，可能是 CSS 问题

4. **测试独立页面**
   - 访问 `http://localhost:3000/test-price-dialog.html`
   - 点击"显示测试对话框"按钮
   - 查看输入框是否有默认值

### 📊 数据流程

```
数据库 (InventoryTransfer)
  ↓
  items[].transferPrice = 195, 315, 2
  ↓
API 返回数据
  ↓
前端 loadTransferManagement()
  ↓
showPriceSettingDialog(transfer)
  ↓
模板字符串: value="${item.transferPrice || ''}"
  ↓
HTML 输入框应该显示: 195, 315, 2
```

### 🎯 关键代码片段

**merchant.html 第6880-6890行**:
```javascript
const priceInputs = transfer.items.map((item, index) => {
  console.log(`产品 ${index + 1}:`, item.productName);
  console.log('  - transferPrice:', item.transferPrice);
  console.log('  - retailPrice:', item.retailPrice);
  
  return `
    <input type="number" id="wholesalePrice_${index}" min="0" step="0.01" required
           value="${item.transferPrice || ''}"
           style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
  `;
}).join('');
```

### 📌 重要提醒

1. **HTML 文件修改不需要重启服务器**，但需要强制刷新浏览器
2. **浏览器缓存**是最常见的问题，务必使用 Ctrl + Shift + R
3. **调试输出**已添加，可以在控制台查看数据是否正确传递
4. **数据库数据**已验证正确，问题应该在前端显示层面

### 🔧 如果问题仍然存在

如果强制刷新后仍然看不到默认值，可能需要：
1. 清除浏览器缓存和 Cookie
2. 使用无痕模式测试
3. 尝试不同的浏览器
4. 检查是否有 JavaScript 错误阻止了代码执行

## 文件清单

### 已修改的文件
- `StockControl-main/app.js` (调货IMEI选择后端逻辑)
- `StockControl-main/public/merchant.html` (多处修改)

### 新创建的文件
- `StockControl-main/check-transfer-prices.js` (数据验证脚本)
- `StockControl-main/public/test-price-dialog.html` (测试页面)
- `StockControl-main/FIX_TRANSFER_IMEI_SELECTION_CORRECT.md` (文档)
- `StockControl-main/TRANSFER_IMEI_SELECTION_COMPLETE.md` (文档)

### 使用的脚本
- `StockControl-main/reset-transfer-orders.js` (清空调货订单)

## 版本信息
- 当前版本: v2.4.0
- 最后更新: 2026年2月11日
- 服务器进程ID: 22

## 下一步行动

等待用户：
1. 强制刷新浏览器（Ctrl + Shift + R）
2. 查看浏览器控制台的调试输出
3. 确认批发价输入框是否显示默认值
4. 如果仍有问题，提供控制台截图或错误信息


---

## 新增完成任务 (2026-02-11 下午)

### ✅ TASK 8: 利润计算修复 - 使用真实采购成本并扣除税额
- **状态**: 完成
- **功能**: 修复利润计算逻辑，使用真实的采购成本（costPrice）而不是批发价（wholesalePrice），并从利润中扣除应缴税额
- **修改内容**:
  - **后端修改** (`app.js` 第7759行): 销售API优先使用`costPrice`而不是`wholesalePrice`
  - **前端修改** (`merchant.html` 第1679-1683行): 利润计算公式改为扣除税额
  - **新公式**: 净利润 = (销售价格 - 采购成本) × 数量 - 应缴税额
- **测试结果**: Mobile123的销售利润从€57.00（未扣税）变为€45.97（扣税后）
- **文件**: 
  - `StockControl-main/FIX_PROFIT_CALCULATION.md`
  - `StockControl-main/test-profit-calculation.js`
  - `StockControl-main/calculate-mobile123-profit-feb11.js`

### ✅ TASK 9: 调货确认收货时的成本价修复
- **状态**: 完成
- **功能**: 修复公司间销售确认收货时，成本价应该使用调货价格（transferPrice）而不是原产品的批发价
- **问题**: 确认收货时使用了`fromInventory.wholesalePrice`作为成本价
- **修复** (`app.js` 第8633行): 改为使用`item.transferPrice`作为成本价
- **正确逻辑**:
  - costPrice = transferPrice (€195) - 真实采购成本
  - wholesalePrice = 用户手动输入 (€200) - 对外批发价
  - retailPrice = 用户手动输入 (€249) - 零售价
- **文件**: 
  - `StockControl-main/FIX_TRANSFER_COSTPRICE.md`
  - `StockControl-main/check-imei-352928114188457.js`

### ✅ TASK 10: 产品追溯功能修复 - 支持商户系统数据
- **状态**: 完成
- **功能**: 修改产品追溯API，使其能够查询商户系统的数据（MerchantInventory, MerchantSale, InventoryTransfer, WarehouseOrder）
- **问题**: 原API只查询旧系统（ProductNew, PurchaseInvoice, SalesInvoice）
- **修复** (`app.js` 第3430行): 添加了对商户系统的查询
- **新增查询**:
  - MerchantInventory - 商户库存
  - WarehouseOrder - 仓库订单（采购）
  - InventoryTransfer - 调货记录
  - MerchantSale - 销售记录
- **额外修复**: 添加了直接通过序列号查找发票的逻辑，即使产品已被删除也能显示历史记录
- **文件**: 
  - `StockControl-main/FIX_PRODUCT_TRACKING.md`
  - `StockControl-main/check-imei-358239124217086.js`
  - `StockControl-main/check-invoice-si-3688.js`

### ✅ TASK 11: 产品追溯 - 发票详情功能和PDF导出格式更新
- **状态**: 完成
- **功能**: 在产品追溯的历史记录时间线中，让发票编号可以点击并显示完整的发票详情，支持标准发票格式的PDF导出
- **实现内容**:
  - **前端修改** (`prototype-working.html`):
    - 发票编号改为可点击链接
    - 添加了`showInvoiceDetails(invoiceId, type)`函数
    - 添加了`renderInvoiceDetailsModal(invoice, type)`函数
    - 添加了`closeInvoiceDetailsModal()`函数
    - 更新了`exportInvoicePDF()`函数为标准发票格式
  - **后端API已存在**: 
    - `/api/admin/purchase-invoices/:invoiceId` - 获取采购发票详情（第3905行）
    - `/api/admin/sales-invoices/:invoiceId` - 获取销售发票详情（第3925行）
    - `/api/merchant/transfers/:invoiceId` - 获取调货单详情
  - **PDF导出格式更新**:
    - 改为标准发票格式（双语标题、专业布局）
    - 包含完整的供应商/客户信息
    - 产品清单使用表格格式，带灰色表头
    - 支持多个序列号显示
    - 自动分页功能
    - 页脚显示页码和生成时间
- **文件**: 
  - `StockControl-main/public/prototype-working.html` (第7050-7450行)
  - `StockControl-main/FIX_TRACKING_INVOICE_DETAILS.md`
  - `StockControl-main/INVOICE_PDF_EXPORT_FORMAT_UPDATE.md`

### 🔄 服务器状态
- **最后重启**: 进程26（用于产品追溯API修复）
- **注意**: HTML文件修改不需要重启服务器，但需要强制刷新浏览器（Ctrl + Shift + R）

### 📝 重要提醒
1. 历史销售记录中的成本价不能修改（财务一致性）
2. 调货逻辑：costPrice = transferPrice（真实采购成本），wholesalePrice = 用户手动输入（对外批发价）
3. 利润计算公式：净利润 = (销售价格 - 采购成本) × 数量 - 应缴税额
4. 数据在远程MongoDB Atlas数据库，不在本地
5. 产品追溯功能现在支持完整的商户系统数据查询
6. 发票PDF导出使用标准发票格式，适合打印和存档
