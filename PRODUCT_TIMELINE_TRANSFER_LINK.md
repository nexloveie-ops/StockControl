# 产品时间线调货单号可点击功能 ✅

## 功能描述

在产品时间线中，调货单号现在可以点击，点击后会弹出调货订单的详细信息模态框。

## 实现内容

### 1. 后端API增强

#### 时间线API返回 transferId
在产品时间线API中，调货入库和调货出库事件现在包含 `transferId` 和 `transferNumber` 字段。

**文件**: `app.js`

**调货入库**：
```javascript
timeline.push({
  type: 'transferred_in',
  icon: '📥',
  title: '调货入库',
  date: transferIn.completedAt,
  description: `从其他商户调入`,
  details: `调货单号: ${transferIn.transferNumber}<br>
            调出商户: ${transferIn.fromMerchant}<br>
            调货价格: €${transferPrice.toFixed(2)}`,
  transferId: transferIn._id.toString(), // ✅ 添加
  transferNumber: transferIn.transferNumber // ✅ 添加
});
```

**调货出库**：
```javascript
timeline.push({
  type: 'transferred_out',
  icon: '📤',
  title: '调货出库',
  date: transfer.completedAt || transfer.shippedAt,
  description: `产品调出到其他商户`,
  details: `调货单号: ${transfer.transferNumber}<br>
            调入商户: ${transfer.toMerchantName}<br>
            数量: ${transferItem.quantity}<br>
            调货价格: €${transferItem.transferPrice.toFixed(2)}`,
  transferId: transfer._id.toString(), // ✅ 添加
  transferNumber: transfer.transferNumber // ✅ 添加
});
```

#### 新增调货详情API
创建了获取单个调货详情的API。

**路由**: `GET /api/merchant/inventory/transfer/:id`

**功能**: 根据调货ID获取完整的调货信息

**返回数据**：
```javascript
{
  success: true,
  data: {
    _id: "...",
    transferNumber: "TF-1738761234567-0001",
    transferType: "INTERNAL_TRANSFER",
    status: "completed",
    fromMerchant: "MurrayRanelagh",
    toMerchant: "MurrayDundrum",
    fromCompany: { ... },
    toCompany: { ... },
    items: [ ... ],
    totalAmount: 600.00,
    notes: "...",
    createdAt: "...",
    completedAt: "..."
  }
}
```

### 2. 前端功能实现

#### 调货单号可点击
在 `showProductTimeline()` 函数中，将调货单号转换为可点击的链接。

**文件**: `merchant.html`

```javascript
// 处理详情中的调货单号，使其可点击
let details = event.details;
if (event.transferId && event.transferNumber) {
  details = details.replace(
    `调货单号: ${event.transferNumber}`,
    `调货单号: <a href="javascript:void(0)" onclick="showTransferDetails('${event.transferId}')" style="color: #3b82f6; text-decoration: underline; cursor: pointer;">${event.transferNumber}</a>`
  );
}
```

#### 调货详情模态框
创建了 `showTransferDetails()` 函数，显示调货订单的完整信息。

**功能**：
- 调货单号和状态
- 交易类型（内部调拨/公司间销售）
- 调出方和调入方信息
- 产品清单（包含序列号、成色、数量、价格）
- 备注信息
- 拒绝原因（如果被拒绝）

**样式**：
- 美观的卡片式布局
- 颜色区分交易类型和状态
- 响应式设计
- 可滚动的产品列表

## 使用流程

### 1. 查看产品时间线
```
我的库存 → 点击产品 → 产品时间线
```

### 2. 点击调货单号
在时间线中找到调货入库或调货出库事件，点击蓝色的调货单号链接。

### 3. 查看调货详情
弹出模态框显示完整的调货订单信息。

## 显示效果

### 时间线中的调货事件

**调货入库**：
```
📥 调货入库
从其他商户调入

调货单号: TF-1738761234567-0001  ← 可点击
调出商户: MurrayRanelagh
调货价格: €600.00
```

**调货出库**：
```
📤 调货出库
产品调出到其他商户

调货单号: TF-1738761234567-0002  ← 可点击
调入商户: MurrayDundrum
数量: 1
调货价格: €600.00
```

### 调货详情模态框

```
┌─────────────────────────────────────────────────────────┐
│ 📋 调货详情                                        ×    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ TF-1738761234567-0001  [已完成]  [📦 内部调拨]         │
│ 创建时间: 2026-02-05 14:30:00                          │
│ 完成时间: 2026-02-05 15:45:00                €600.00   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 调出方                    →              调入方         │
│ MurrayRanelagh                          MurrayDundrum  │
│ Murray Electronics Limited              Murray Electronics Limited │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 产品清单 (1 件)                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 产品名称 │ 序列号 │ 成色 │ 数量 │ 单价 │ 小计 │   │
│ ├─────────────────────────────────────────────────┤   │
│ │ iPhone 14│ 222333 │ A级 │  1  │€600 │€600 │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 💡 备注                                                 │
│ 内部调拨，用于补充库存                                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                      [关闭]                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 详情模态框内容

### 头部信息
- **调货单号**：TF-1738761234567-0001
- **状态徽章**：待审批/已批准/已拒绝/已完成
- **交易类型**：📦 内部调拨 / 💰 公司间销售
- **创建时间**：2026-02-05 14:30:00
- **完成时间**：2026-02-05 15:45:00（如果已完成）
- **总金额**：€600.00

### 双方信息
- **调出方**：
  - 用户名：MurrayRanelagh
  - 公司名称：Murray Electronics Limited
- **调入方**：
  - 用户名：MurrayDundrum
  - 公司名称：Murray Electronics Limited

### 产品清单
表格显示所有产品：
- 产品名称
- 序列号/IMEI
- 成色
- 数量
- 单价
- 小计

### 备注信息
如果有备注，显示在蓝色背景框中。

### 拒绝原因
如果订单被拒绝，显示拒绝原因在红色背景框中。

## 状态颜色

| 状态 | 颜色 | 说明 |
|------|------|------|
| **待审批** | 🟡 橙色 | 等待调出方审批 |
| **已批准** | 🔵 蓝色 | 已批准，等待收货 |
| **已拒绝** | 🔴 红色 | 已被拒绝 |
| **已完成** | 🟢 绿色 | 已确认收货 |

## 交易类型颜色

| 类型 | 颜色 | 图标 |
|------|------|------|
| **内部调拨** | 🔵 蓝色 | 📦 |
| **公司间销售** | 🟢 绿色 | 💰 |

## 技术实现

### 1. 字符串替换
使用 JavaScript 的 `replace()` 方法将调货单号文本替换为可点击的链接。

```javascript
details.replace(
  `调货单号: ${event.transferNumber}`,
  `调货单号: <a href="javascript:void(0)" onclick="showTransferDetails('${event.transferId}')" ...>${event.transferNumber}</a>`
);
```

### 2. 动态模态框
使用 JavaScript 动态创建模态框元素，避免HTML中的静态定义。

```javascript
const modal = document.createElement('div');
modal.id = 'transferDetailsModal';
modal.innerHTML = `...`;
document.body.appendChild(modal);
```

### 3. z-index 层级
调货详情模态框的 z-index 设置为 10001，高于产品时间线模态框（10000），确保正确显示在上层。

## 优势

### 1. 便捷性
- ✅ 一键查看调货详情
- ✅ 无需离开时间线页面
- ✅ 无需记住调货单号

### 2. 完整性
- ✅ 显示所有调货信息
- ✅ 包含产品清单
- ✅ 显示备注和拒绝原因

### 3. 美观性
- ✅ 现代化的卡片式设计
- ✅ 颜色区分不同状态
- ✅ 响应式布局

### 4. 一致性
- ✅ 与调货管理页面风格一致
- ✅ 使用相同的数据结构
- ✅ 统一的交互方式

## 测试验证

### 测试步骤

1. **登录商户账号**
   ```
   http://localhost:3000/merchant.html
   用户名: MurrayDundrum
   密码: password123
   ```

2. **进入我的库存**
   - 点击"我的库存"标签

3. **选择调货产品**
   - 找到来源为"商户调货"的产品
   - 点击产品行

4. **查看产品时间线**
   - 自动弹出时间线模态框

5. **点击调货单号**
   - 找到"调货入库"事件
   - 点击蓝色的调货单号链接

6. **验证调货详情**
   - 应该弹出调货详情模态框
   - 显示完整的调货信息
   - 产品清单正确
   - 状态和类型正确

7. **关闭模态框**
   - 点击"关闭"按钮
   - 或点击右上角的 × 按钮

### 预期结果

**时间线中**：
- 调货单号显示为蓝色下划线链接 ✅
- 鼠标悬停时显示手型光标 ✅

**点击后**：
- 弹出调货详情模态框 ✅
- 显示完整的调货信息 ✅
- 产品清单正确显示 ✅
- 可以正常关闭 ✅

## 代码位置

### 后端
**文件**: `StockControl-main/app.js`

**API 1**: `GET /api/merchant/inventory/:id/timeline`（约 4727 行）
- 修改：添加 transferId 和 transferNumber 字段

**API 2**: `GET /api/merchant/inventory/transfer/:id`（约 6078 行）
- 新增：获取单个调货详情

### 前端
**文件**: `StockControl-main/public/merchant.html`

**函数 1**: `showProductTimeline()`（约 4533 行）
- 修改：将调货单号转换为可点击链接

**函数 2**: `showTransferDetails()`（约 4620 行）
- 新增：显示调货详情模态框

**函数 3**: `closeTransferDetails()`（约 4780 行）
- 新增：关闭调货详情模态框

## 注意事项

1. **z-index 层级**
   - 产品时间线：10000
   - 调货详情：10001
   - 确保调货详情显示在时间线之上

2. **模态框清理**
   - 关闭时从 DOM 中移除模态框元素
   - 避免内存泄漏

3. **错误处理**
   - API 调用失败时显示错误提示
   - 数据不存在时友好提示

4. **性能优化**
   - 只在点击时加载调货详情
   - 不预加载所有调货数据

## 相关功能

- 产品时间线：显示产品的完整历史
- 调货管理：管理调货申请和审批
- 群组库存：查看和调货其他商户的产品

## 相关文档

- `PRODUCT_TIMELINE_COMPLETE.md` - 产品时间线功能
- `TRANSFER_MANAGEMENT_COMPLETE.md` - 调货管理功能
- `FIX_PRODUCT_TIMELINE_TRANSFER_DISPLAY.md` - 时间线显示优化

---
**完成日期**: 2026-02-05
**状态**: ✅ 已完成
**需要重启服务器**: 是（已重启）
