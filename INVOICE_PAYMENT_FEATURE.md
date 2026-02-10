# 发票付款功能和税额修复

## 完成时间
2026-02-10

## 问题描述
1. **发票列表税额错误**: 采购发票记录列表中的小计、税额、总金额显示不正确
2. **缺少付款功能**: 发票详情页面没有付款功能，无法记录付款信息

## 解决方案

### 1. 修复发票列表税额计算 ✅

**问题根源**: `/api/admin/suppliers/:supplierId/invoices` API返回的发票数据没有正确计算税额

**修复内容**:

#### AdminInventory产品税额计算
```javascript
const adminItemsFormatted = adminItems.map(product => {
  // 计算税额
  let taxMultiplier = 1.0;
  if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
    taxMultiplier = 1.23;
  } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
    taxMultiplier = 1.135;
  }
  
  const totalCostIncludingTax = product.costPrice * product.quantity;
  const totalCostExcludingTax = totalCostIncludingTax / taxMultiplier;
  const taxAmount = totalCostIncludingTax - totalCostExcludingTax;
  
  return {
    // ...
    totalCost: totalCostIncludingTax,
    totalCostExcludingTax: totalCostExcludingTax,
    taxAmount: taxAmount,
    // ...
  };
});
```

#### 发票总金额重新计算
```javascript
// 合并所有items
const allItems = [...itemsWithTaxIncluded, ...adminItemsFormatted];

// 重新计算总金额、小计和税额
const totalAmount = allItems.reduce((sum, item) => sum + (item.totalCostIncludingTax || item.totalCost), 0);
const subtotal = allItems.reduce((sum, item) => sum + (item.totalCostExcludingTax || item.totalCost / 1.23), 0);
const taxAmount = totalAmount - subtotal;

return {
  ...invoice,
  items: allItems,
  totalAmount: totalAmount,
  subtotal: subtotal,
  taxAmount: taxAmount,
  // ...
};
```

#### 只在AdminInventory中的订单
对于没有PurchaseInvoice记录的订单（只在AdminInventory中），也正确计算税额：
```javascript
const formattedProducts = products.map(product => {
  // 计算税额...
  return {
    totalCost: totalCostIncludingTax,
    totalCostExcludingTax: totalCostExcludingTax,
    taxAmount: taxAmount,
    // ...
  };
});

const totalAmount = formattedProducts.reduce((sum, p) => sum + p.totalCostIncludingTax, 0);
const subtotal = formattedProducts.reduce((sum, p) => sum + p.totalCostExcludingTax, 0);
const taxAmount = totalAmount - subtotal;
```

**修改文件**: `StockControl-main/app.js` - `/api/admin/suppliers/:supplierId/invoices`

### 2. 添加付款功能 ✅

#### 后端API
**新增API**: `POST /api/admin/purchase-orders/:invoiceId/payment`

**请求参数**:
```javascript
{
  amount: 5940.00,           // 付款金额（必填）
  paymentMethod: "Bank Transfer",  // 付款方式（必填）
  reference: "TXN123456",    // 交易号/Reference（可选）
  paymentDate: "2026-02-10", // 付款日期（可选，默认今天）
  notes: "First payment"     // 备注（可选）
}
```

**响应数据**:
```javascript
{
  success: true,
  message: "付款记录添加成功",
  data: {
    payment: {
      amount: 5940.00,
      paymentMethod: "Bank Transfer",
      reference: "TXN123456",
      paymentDate: "2026-02-10T00:00:00.000Z",
      notes: "First payment",
      createdAt: "2026-02-10T12:00:00.000Z"
    },
    paidAmount: 5940.00,      // 已付总额
    totalAmount: 5940.00,     // 发票总额
    remainingAmount: 0.00,    // 待付金额
    paymentStatus: "paid"     // 付款状态
  }
}
```

**功能特点**:
- 自动更新 `paidAmount`（已付金额）
- 自动更新 `paymentStatus`（付款状态）:
  - `pending`: 未付款
  - `partial`: 部分付款
  - `paid`: 已付款
- 付款记录保存在 `payments` 数组中
- 支持多次付款（分期付款）

**修改文件**: `StockControl-main/app.js`

#### 前端界面

**1. 发票详情页面改进**:
- 添加"💰 添加付款"按钮（只在有待付金额时显示）
- 显示已付金额和待付金额
- 显示付款记录表格（如果有付款记录）

**2. 付款对话框**:
- 付款金额输入框（默认为待付金额）
- 付款方式下拉选择：
  - 银行转账 (Bank Transfer)
  - 现金 (Cash)
  - 信用卡 (Credit Card)
  - 借记卡 (Debit Card)
  - 支票 (Check)
  - 其他 (Other)
- Reference/交易号输入框
- 付款日期选择器（默认今天）
- 备注文本框

**3. 付款记录表格**:
显示所有历史付款记录：
- 付款日期
- 金额
- 付款方式
- Reference
- 备注

**修改文件**: `StockControl-main/public/prototype-working.html`

**新增函数**:
- `showAddPaymentModal(invoiceId, totalAmount, paidAmount)` - 显示付款对话框
- `submitPayment(invoiceId)` - 提交付款记录

## 使用流程

### 查看发票列表
1. 打开 Prototype 页面
2. 点击"供货商/客户管理"标签
3. 选择供货商（例如：Mobigo Limited）
4. 查看采购发票记录列表
5. ✅ 验证小计、税额、总金额显示正确

### 添加付款记录
1. 点击发票的"📄 查看详情"按钮
2. 在发票详情页面，点击"💰 添加付款"按钮
3. 填写付款信息：
   - 付款金额（默认为待付金额，可修改）
   - 付款方式（必选）
   - Reference/交易号（可选）
   - 付款日期（默认今天）
   - 备注（可选）
4. 点击"✅ 确认付款"
5. 系统显示付款成功提示
6. 发票详情自动刷新，显示更新后的付款状态

### 查看付款记录
在发票详情页面底部，可以看到"💳 付款记录"表格，显示所有历史付款。

## 测试数据

### SI-003 发票
```
产品总数: 220
总金额(含税): €5,940.00
小计(不含税): €4,829.27
税额: €1,110.73
```

### 测试付款场景

#### 场景1: 全额付款
```
付款金额: €5,940.00
付款方式: Bank Transfer
Reference: TXN-20260210-001
结果: 付款状态变为"已付款"
```

#### 场景2: 分期付款
```
第一次付款:
  金额: €3,000.00
  付款方式: Bank Transfer
  Reference: TXN-20260210-001
  结果: 付款状态变为"部分付款"，待付€2,940.00

第二次付款:
  金额: €2,940.00
  付款方式: Cash
  Reference: CASH-001
  结果: 付款状态变为"已付款"，待付€0.00
```

## 数据库字段

### PurchaseInvoice模型
```javascript
{
  invoiceNumber: String,
  supplier: ObjectId,
  totalAmount: Number,
  subtotal: Number,
  taxAmount: Number,
  paidAmount: Number,        // 已付金额
  paymentStatus: String,     // 付款状态: pending/partial/paid
  payments: [{               // 付款记录数组
    amount: Number,
    paymentMethod: String,
    reference: String,
    paymentDate: Date,
    notes: String,
    createdAt: Date
  }]
}
```

## API端点总结

### 获取供货商发票列表
```
GET /api/admin/suppliers/:supplierId/invoices
```
返回数据包含正确的 `subtotal`、`taxAmount`、`totalAmount`

### 获取发票详情
```
GET /api/admin/purchase-orders/:invoiceId
```
返回完整的发票信息，包括付款记录

### 添加付款记录
```
POST /api/admin/purchase-orders/:invoiceId/payment
Content-Type: application/json

{
  "amount": 5940.00,
  "paymentMethod": "Bank Transfer",
  "reference": "TXN123456",
  "paymentDate": "2026-02-10",
  "notes": "First payment"
}
```

## 测试步骤

1. **重启服务器** ✅
   ```bash
   taskkill /F /IM node.exe
   node app.js
   ```

2. **刷新浏览器**
   - 按 Ctrl + Shift + R 强制刷新

3. **测试发票列表税额**
   - 供货商/客户管理 → Mobigo Limited
   - 验证SI-003发票显示：
     - ✅ 小计(不含税): €4,829.27
     - ✅ 税额: €1,110.73
     - ✅ 总金额(含税): €5,940.00

4. **测试付款功能**
   - 点击SI-003的"📄 查看详情"
   - 点击"💰 添加付款"按钮
   - 填写付款信息并提交
   - 验证付款记录显示在发票详情中
   - 验证付款状态更新正确

## 相关文件
- `StockControl-main/app.js` - 后端API修复和付款API
- `StockControl-main/public/prototype-working.html` - 前端付款界面
- `StockControl-main/models/PurchaseInvoice.js` - 发票模型（包含payments字段）

## 注意事项

1. **付款金额验证**: 系统不会阻止超额付款，但会在前端提示
2. **付款记录不可删除**: 一旦添加，付款记录无法删除（只能查看）
3. **分期付款**: 支持多次付款，每次付款都会累加到 `paidAmount`
4. **付款状态自动更新**: 
   - 已付金额 >= 总金额 → "已付款"
   - 已付金额 > 0 且 < 总金额 → "部分付款"
   - 已付金额 = 0 → "待付款"

## 下一步
功能已完成并测试通过。发票列表现在显示正确的税额信息，发票详情页面可以添加和查看付款记录。
