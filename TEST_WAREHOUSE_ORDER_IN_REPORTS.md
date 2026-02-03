# 测试仓库订单在 Financial Reports 中显示

## 测试时间: 2026-02-02

## 问题
Financial Reports 中没有显示仓库订单。

## 原因分析
1. **订单状态问题**: 数据库中的 3 个仓库订单状态都是 `shipped`，而 Financial Reports API 只查询 `status: 'completed'` 的订单
2. **税额缺失**: 现有订单是在添加税额计算功能之前创建的，`subtotal` 和 `taxAmount` 都是 0

## 解决方案

### 1. 更新测试订单
已将订单 `WO-20260202-1061` 更新为：
- 状态: `completed`
- 完成时间: `2026-02-02T22:26:21.150Z`
- 小计 (不含税): €203.25
- 税额: €46.75
- 总金额 (含税): €250.00

### 2. 订单详情
```
订单号: WO-20260202-1061
商户: ham
产品: galaxy A53
数量: 2
单价: €125.00
税分类: VAT_23
```

### 3. 税额计算
```
总金额 (含税) = €250.00
税率 = 23%
税额 = €250.00 × (23/123) = €46.75
小计 (不含税) = €250.00 - €46.75 = €203.25
```

## 测试步骤

### 1. 访问 Financial Reports
```
http://localhost:3000/prototype-working.html
```

### 2. 选择日期范围
- Start Date: 2026-02-01
- End Date: 2026-02-02
- Type: All

### 3. 点击 Query 按钮

### 4. 验证显示
应该看到：
- **Invoice Details** 表格中有一行仓库订单
- **Type**: 📦 Wholesale (绿色标签)
- **Invoice Number**: WO-20260202-1061 (蓝色可点击链接)
- **Customer/Supplier**: ham
- **Date**: 2/2/2026
- **Amount (Incl. VAT)**: €250.00
- **VAT Amount**: €46.75

### 5. 点击订单号
应该弹出模态框显示：
- 商户信息 (ham)
- 订单信息 (订单号、日期、状态、配送方式)
- 产品列表 (galaxy A53, 数量 2, 单价 €125.00)
- 税务汇总 (小计 €203.25, 税额 €46.75, 总计 €250.00)

### 6. 验证汇总数据
- **Total Sales (Incl. VAT)**: 应该包含这 €250.00
- **Total Sales VAT**: 应该包含这 €46.75
- **Net VAT Payable**: 应该正确计算

## 预期结果

### Financial Reports 显示
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Invoice Details                                                             │
├──────────────────┬──────────┬─────────────┬──────────┬──────────┬──────────┤
│ INVOICE NUMBER   │ TYPE     │ CUSTOMER    │ DATE     │ AMOUNT   │ VAT AMT  │
├──────────────────┼──────────┼─────────────┼──────────┼──────────┼──────────┤
│ WO-20260202-1061 │📦Wholesale│ ham        │ 2/2/2026 │ €250.00  │ €46.75   │
│ (可点击)          │          │             │          │          │          │
└──────────────────┴──────────┴─────────────┴──────────┴──────────┴──────────┘
```

### 点击后的模态框
```
📦 Warehouse Order Details - WO-20260202-1061

┌─────────────────────────────────────────────────────────┐
│ Merchant Information    │ Order Information             │
│ - ham                   │ - Order Number: WO-20260202-  │
│ - Merchant ID: ham      │   1061                        │
│                         │ - Date: 2/2/2026              │
│                         │ - Status: ✔️ Completed        │
│                         │ - Delivery: 🚚 Delivery       │
└─────────────────────────────────────────────────────────┘

Items:
┌──────────┬──────────┬────────────┬──────────┬──────────┬──────────┐
│ Product  │ Quantity │ Unit Price │ Tax Class│ Tax Amt  │ Subtotal │
├──────────┼──────────┼────────────┼──────────┼──────────┼──────────┤
│ galaxy   │    2     │  €125.00   │ VAT 23%  │ €46.75   │ €250.00  │
│ A53      │          │            │          │          │          │
└──────────┴──────────┴────────────┴──────────┴──────────┴──────────┘

Tax Summary:
- Subtotal (Excl. VAT): €203.25
- VAT Amount: €46.75
- Total Amount (Incl. VAT): €250.00
```

## 其他订单

### 如需更多测试数据
可以将其他两个订单也标记为完成：
```javascript
// WO-20260202-7228
// WO-20260202-9112
```

使用脚本：
```javascript
const order = await WarehouseOrder.findOne({ orderNumber: 'WO-20260202-7228' });
order.status = 'completed';
order.completedAt = new Date();
order.completedBy = 'warehouse_manager';

// 计算税额
const taxAmount = order.totalAmount * (23 / 123);
const subtotal = order.totalAmount - taxAmount;
order.subtotal = subtotal;
order.taxAmount = taxAmount;

// 更新项目税额
order.items.forEach(item => {
  const itemTax = item.subtotal * (23 / 123);
  item.taxAmount = itemTax;
});

await order.save();
```

## 注意事项

1. **新订单自动计算税额**: 从现在开始创建的新仓库订单会自动计算税额
2. **旧订单需要手动更新**: 之前创建的订单需要手动更新税额
3. **订单状态**: 只有 `completed` 状态的订单才会出现在 Financial Reports 中
4. **完成时间**: 订单的 `completedAt` 时间必须在查询的日期范围内

## 服务器状态
- ✅ 服务器运行中 (Process ID: 42)
- ✅ 地址: http://localhost:3000
- ✅ 数据库连接正常

## 相关文档
- `WAREHOUSE_ORDER_DETAILS_COMPLETE.md` - 仓库订单详情功能
- `FINANCIAL_REPORTS_WAREHOUSE_ORDERS.md` - Financial Reports 包含仓库订单
- `WAREHOUSE_ORDER_FEATURE.md` - 仓库订单管理功能
