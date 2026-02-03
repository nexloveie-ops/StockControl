# Financial Reports - 仓库订单集成

## 📅 日期
2026-02-02

## 功能说明

Financial Reports 现在包含已完成的仓库订单，将其作为批发销售记录显示。

---

## 🎯 需求

> 仓库订单管理 已经完成的订单也是销售的一种，也应该出现在Financial Reports中

---

## 📊 实现内容

### 1. 后端 API 修改

**文件**：`app.js`

#### 主 API：`/api/admin/reports/financial`

添加了仓库订单查询：

```javascript
// 获取已完成的仓库订单（批发销售）
const warehouseOrders = await WarehouseOrder.find({
  status: 'completed',
  completedAt: { $gte: start, $lte: end }
})
.sort({ completedAt: -1 });

warehouseOrders.forEach(order => {
  results.push({
    _id: order._id,
    invoiceNumber: order.orderNumber,
    type: 'sales',
    subType: 'wholesale', // 批发
    partner: order.merchantName || order.merchantId,
    date: order.completedAt,
    totalAmount: order.totalAmount, // 批发价（不含税）
    taxAmount: 0, // 内部销售，无增值税
    subtotal: order.totalAmount
  });
});
```

#### 数据结构

每条发票记录现在包含：
- `type`: 'sales' 或 'purchase'
- `subType`: 
  - 'retail' - 零售销售
  - 'wholesale' - 批发销售（仓库订单）
  - 'external' - 外部采购
- `taxAmount`: 
  - 零售销售：正数（应缴增值税）
  - 批发销售：0（内部销售，无增值税）
  - 采购：负数（可抵扣增值税）

#### 汇总数据

添加了新的汇总字段：

```javascript
const summary = {
  totalSalesAmount: 0,      // 总计销售金额（零售+批发）
  totalSalesTax: 0,          // 总计销售税额（仅零售）
  totalPurchaseAmount: 0,    // 总计采购金额
  totalPurchaseTax: 0,       // 总计采购税额（负数）
  totalTaxPayable: 0,        // 总计应缴税额
  totalWholesaleAmount: 0    // 总计批发金额（新增）
};
```

### 2. 前端显示修改

**文件**：`public/prototype-working.html`

#### 发票列表显示

- **零售销售**：显示为 "🛒 Retail"，绿色标签
- **批发销售**：显示为 "📦 Wholesale"，绿色标签
- **采购**：显示为 "📥 Purchase"，黄色标签

#### 点击行为

- **零售销售**：可点击查看发票详情
- **批发销售**：不可点击（仓库订单没有详情页面）
- **采购**：可点击查看发票详情

#### 视觉区分

```javascript
// 批发销售的发票号显示为灰色，不带下划线
const isClickable = invoice.subType !== 'wholesale';
const clickHandler = isClickable ? 
  (invoice.type === 'sales' ? `showSalesInvoiceDetails('${invoice._id}')` : `showPurchaseInvoiceDetails('${invoice._id}')`) : 
  '';
```

---

## 💰 税务处理

### 批发销售（仓库订单）

- **性质**：内部销售（仓库 → 商户）
- **价格**：批发价（wholesalePrice）
- **增值税**：0（不涉及增值税）
- **原因**：内部调拨，不是最终销售

### 零售销售

- **性质**：对外销售（商户 → 客户）
- **价格**：零售价（含税）
- **增值税**：根据产品税率计算
- **税率**：VAT 23%, VAT 13.5%, Margin VAT 等

### 税额计算

```javascript
// 应缴增值税 = 零售销售税额 - 采购税额 + 盈利部分增值税
const profit = summary.totalSalesAmount - summary.totalPurchaseAmount;
const profitVAT = profit * (23 / 123);
summary.totalTaxPayable = summary.totalSalesTax - Math.abs(summary.totalPurchaseTax) + profitVAT;
```

---

## 📋 数据示例

### Financial Report 输出

```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "_id": "...",
        "invoiceNumber": "INV-2024-001",
        "type": "sales",
        "subType": "retail",
        "partner": "John Doe",
        "date": "2024-01-15",
        "totalAmount": 1230.00,
        "taxAmount": 230.00,
        "subtotal": 1000.00
      },
      {
        "_id": "...",
        "invoiceNumber": "WO-20240115-0001",
        "type": "sales",
        "subType": "wholesale",
        "partner": "MurrayRanelagh",
        "date": "2024-01-15",
        "totalAmount": 800.00,
        "taxAmount": 0,
        "subtotal": 800.00
      },
      {
        "_id": "...",
        "invoiceNumber": "PO-2024-001",
        "type": "purchase",
        "subType": "external",
        "partner": "Supplier Ltd",
        "date": "2024-01-10",
        "totalAmount": 1000.00,
        "taxAmount": -186.99,
        "subtotal": 813.01
      }
    ],
    "summary": {
      "totalSalesAmount": 2030.00,
      "totalSalesTax": 230.00,
      "totalPurchaseAmount": 1000.00,
      "totalPurchaseTax": -186.99,
      "totalTaxPayable": 416.99,
      "totalWholesaleAmount": 800.00
    }
  }
}
```

---

## 🎨 前端显示效果

### 发票列表

| Invoice Number | Type | Customer/Supplier | Date | Amount | VAT Amount |
|----------------|------|-------------------|------|--------|------------|
| INV-2024-001 | 🛒 Retail | John Doe | 15/01/2024 | €1,230.00 | €230.00 |
| WO-20240115-0001 | 📦 Wholesale | MurrayRanelagh | 15/01/2024 | €800.00 | €0.00 |
| PO-2024-001 | 📥 Purchase | Supplier Ltd | 10/01/2024 | €1,000.00 | -€186.99 |

### 汇总卡片

- **Total Sales (Incl. VAT)**: €2,030.00
  - 零售: €1,230.00
  - 批发: €800.00
- **Total Sales VAT**: €230.00
- **Total Purchase (Incl. VAT)**: €1,000.00
- **Total Purchase VAT (Deductible)**: €186.99
- **Net VAT Payable**: €416.99

---

## 🔍 查询条件

### 仓库订单筛选

```javascript
const warehouseOrders = await WarehouseOrder.find({
  status: 'completed',           // 只包含已完成的订单
  completedAt: { $gte: start, $lte: end }  // 按完成时间筛选
})
```

### 为什么使用 completedAt？

- `orderedAt`: 订单创建时间
- `confirmedAt`: 订单确认时间
- `shippedAt`: 订单发货时间
- **`completedAt`**: 订单完成时间 ✅

使用 `completedAt` 是因为：
1. 只有完成的订单才算作实际销售
2. 与财务报表的时间范围一致
3. 符合会计准则（收入确认原则）

---

## 📊 业务流程

### 仓库订单生命周期

```
1. 商户下单 (pending)
   ↓
2. 仓管确认 (confirmed)
   ↓
3. 仓管发货 (shipped)
   ↓
4. 订单完成 (completed) ← 此时计入 Financial Reports
   ↓
5. 显示在报表中（批发销售）
```

### 财务记录时机

- **零售销售**：使用 `invoiceDate`（发票日期）
- **批发销售**：使用 `completedAt`（完成日期）
- **采购**：使用 `invoiceDate`（发票日期）

---

## ✅ 测试验证

### 测试步骤

1. **创建仓库订单**
   - 登录商户账号（如 MurrayRanelagh）
   - 从仓库订货
   - 提交订单

2. **完成订单**
   - 登录仓管账号
   - 确认订单
   - 发货
   - 标记为完成

3. **查看 Financial Reports**
   - 登录管理员账号
   - 打开 Financial Reports
   - 选择包含订单完成日期的时间范围
   - 点击 "Generate Report"

4. **验证显示**
   - ✅ 仓库订单显示在发票列表中
   - ✅ 类型显示为 "📦 Wholesale"
   - ✅ 商户名称正确显示
   - ✅ 金额正确（批发价）
   - ✅ VAT Amount 为 €0.00
   - ✅ 不可点击查看详情

### 预期结果

```
Invoice List:
- WO-20240202-0001 | 📦 Wholesale | MurrayRanelagh | 02/02/2024 | €500.00 | €0.00

Summary:
- Total Sales: €500.00 (包含批发)
- Total Sales VAT: €0.00 (批发无税)
- Total Wholesale Amount: €500.00
```

---

## 🔧 相关文件

### 后端
- `app.js`
  - `/api/admin/reports/financial` (第 3466 行)
  - `/api/reports/financial` (第 3650 行，别名)
- `models/WarehouseOrder.js` - 仓库订单模型

### 前端
- `public/prototype-working.html`
  - `loadFinancialReport()` - 加载报表函数
  - `renderFinancialReport()` - 渲染报表函数

---

## 💡 技术要点

### 1. 数据合并

将三种类型的数据合并到一个列表：
- SalesInvoice（零售销售）
- WarehouseOrder（批发销售）
- PurchaseInvoice（采购）

### 2. 类型区分

使用 `subType` 字段区分：
- `retail` - 零售
- `wholesale` - 批发
- `external` - 外部采购

### 3. 税务处理

- 零售销售：计算增值税
- 批发销售：税额为 0
- 采购：税额为负数（可抵扣）

### 4. 前端渲染

使用条件渲染：
```javascript
const isClickable = invoice.subType !== 'wholesale';
const typeLabel = invoice.subType === 'wholesale' ? '📦 Wholesale' : 
                  invoice.subType === 'retail' ? '🛒 Retail' : 
                  typeLabels[invoice.type];
```

---

## 📝 注意事项

1. **只包含已完成的订单**
   - 待确认、已确认、已发货的订单不计入
   - 只有 `status: 'completed'` 的订单才显示

2. **使用完成时间**
   - 按 `completedAt` 筛选，不是 `orderedAt`
   - 确保财务报表的准确性

3. **批发订单不可点击**
   - 仓库订单没有详情页面
   - 前端禁用点击事件

4. **税额为零**
   - 内部销售不涉及增值税
   - 显示为 €0.00

5. **商户名称显示**
   - 优先使用 `merchantName`
   - 如果没有则使用 `merchantId`

---

## 🎉 总结

### 完成内容
- ✅ 后端 API 添加仓库订单查询
- ✅ 前端显示批发销售记录
- ✅ 区分零售和批发类型
- ✅ 正确处理税务（批发税额为0）
- ✅ 汇总数据包含批发金额
- ✅ 别名 API 同步更新

### 业务价值
- 完整的财务报表（包含所有销售类型）
- 清晰的零售/批发区分
- 准确的税务计算
- 便于财务分析和决策

---

**Financial Reports 现在包含仓库订单！** 🎊

**服务器进程**：40  
**状态**：已完成并测试
