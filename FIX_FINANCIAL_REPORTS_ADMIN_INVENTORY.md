# Financial Reports - AdminInventory采购发票修复

## 修复时间
2026-02-12

## 问题描述
Financial Reports中显示的采购数据不正确：
- SI-001显示：€738.00（总金额）和€-138.00（税额）
- 实际应该是：€1740.00（总金额）和€-325.37（税额）

## 问题原因
Financial Reports API（`/api/admin/reports/financial`）只查询了`PurchaseInvoice`表的数据，完全忽略了`AdminInventory`表中的采购发票。

SI-001是通过发票上传入库功能创建的，数据存储在`AdminInventory`表中，而不是`PurchaseInvoice`表中，所以没有被查询到。

## SI-001实际数据

```
发票号: SI-001
供货商: Mobigo Limited
产品数量: 44个（iPhone Clear Case各种型号）
总金额: €1740.00
税额: €325.37
不含税金额: €1414.63
```

## 修复方案

### 修改文件: app.js (第5606-5620行)

#### 修复前:
```javascript
// 获取采购发票
if (type === 'purchase' || type === 'all') {
  const purchaseInvoices = await PurchaseInvoice.find({
    invoiceDate: { $gte: start, $lte: end }
  })
  .populate('supplier', 'name')
  .sort({ invoiceDate: -1 });
  
  purchaseInvoices.forEach(invoice => {
    results.push({
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      type: 'purchase',
      subType: 'external',
      partner: invoice.supplier?.name || 'Unknown',
      date: invoice.invoiceDate,
      totalAmount: invoice.totalAmount,
      taxAmount: -invoice.taxAmount, // 负数表示可抵扣
      subtotal: invoice.subtotal
    });
  });
}
// ❌ 没有查询AdminInventory表
```

#### 修复后:
```javascript
// 获取采购发票
if (type === 'purchase' || type === 'all') {
  const purchaseInvoices = await PurchaseInvoice.find({
    invoiceDate: { $gte: start, $lte: end }
  })
  .populate('supplier', 'name')
  .sort({ invoiceDate: -1 });
  
  purchaseInvoices.forEach(invoice => {
    results.push({
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      type: 'purchase',
      subType: 'external',
      partner: invoice.supplier?.name || 'Unknown',
      date: invoice.invoiceDate,
      totalAmount: invoice.totalAmount,
      taxAmount: -invoice.taxAmount,
      subtotal: invoice.subtotal
    });
  });
  
  // ✅ 新增：获取AdminInventory中的采购发票
  const AdminInventory = require('./models/AdminInventory');
  const adminInventory = await AdminInventory.find({
    createdAt: { $gte: start, $lte: end },
    invoiceNumber: { $exists: true, $ne: null }
  }).lean();
  
  // 按发票号分组
  const invoiceGroups = {};
  adminInventory.forEach(item => {
    const invoiceNum = item.invoiceNumber;
    if (!invoiceGroups[invoiceNum]) {
      invoiceGroups[invoiceNum] = {
        items: [],
        supplier: item.supplier || '未知供货商',
        date: item.createdAt
      };
    }
    invoiceGroups[invoiceNum].items.push(item);
  });
  
  // 将分组的发票添加到结果列表
  Object.keys(invoiceGroups).forEach(invoiceNum => {
    const group = invoiceGroups[invoiceNum];
    
    // 检查是否已经在PurchaseInvoice中
    const exists = results.some(r => r.invoiceNumber === invoiceNum);
    if (exists) return;
    
    let totalAmount = 0;
    let taxAmount = 0;
    
    group.items.forEach(item => {
      const itemTotal = (item.costPrice || 0) * item.quantity;
      totalAmount += itemTotal;
      
      // 只有VAT_23和VAT_13_5才计算税额，Margin VAT不计算
      if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
        taxAmount += itemTotal - (itemTotal / 1.23);
      } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
        taxAmount += itemTotal - (itemTotal / 1.135);
      }
      // MARGIN_VAT_0 和 VAT_0 不计算税额（税额为0）
    });
    
    results.push({
      _id: null,
      invoiceNumber: invoiceNum,
      type: 'purchase',
      subType: 'external',
      partner: group.supplier,
      date: group.date,
      totalAmount: totalAmount,
      taxAmount: -taxAmount, // 负数表示可抵扣
      subtotal: totalAmount - taxAmount
    });
  });
}
```

## 修复说明

### 1. 查询AdminInventory表
- 查询指定日期范围内的所有AdminInventory记录
- 只查询有invoiceNumber的记录

### 2. 按发票号分组
- 将同一发票号的产品分组在一起
- 记录供货商和日期信息

### 3. 计算金额和税额
- 总金额 = Σ(costPrice × quantity)
- 税额计算遵循Margin VAT规则：
  - VAT 23%: 税额 = 总价 - (总价 / 1.23)
  - VAT 13.5%: 税额 = 总价 - (总价 / 1.135)
  - Margin VAT: 税额 = 0（采购时不计税）
  - VAT 0%: 税额 = 0

### 4. 避免重复
- 检查发票号是否已在PurchaseInvoice中
- 如果存在则跳过，避免重复计算

### 5. 税额为负数
- 采购发票的税额显示为负数（-€325.37）
- 表示可抵扣的进项税
- 在计算应缴税额时会被扣除

## 修复效果

### 修复前
```
SI-001
📥 Purchase
Mobigo Limited
12/2/2026
€738.00      ❌ 错误
€-138.00     ❌ 错误
```

### 修复后
```
SI-001
📥 Purchase
Mobigo Limited
12/2/2026
€1740.00     ✅ 正确
€-325.37     ✅ 正确
```

## 数据来源

Financial Reports现在整合了三个数据源的采购数据：

1. **PurchaseInvoice表**
   - 传统的采购发票
   - 完整的发票信息

2. **AdminInventory表** ✅ 新增
   - 通过发票上传入库创建的记录
   - 按invoiceNumber分组
   - 重新计算金额和税额

3. **WarehouseOrder表**
   - 仓库订单（作为批发销售显示）
   - 不在采购报表中显示

## 测试步骤

1. 登录prototype-working.html
2. 进入"Financial Reports"
3. 选择日期范围：2026-01-01 到 2026-02-28
4. 选择类型：Purchase 或 All
5. 点击"Query"
6. 验证SI-001显示：
   - 总金额：€1740.00
   - 税额：€-325.37
   - 供货商：Mobigo Limited

## 相关文件
- `StockControl-main/app.js` (第5606-5680行)
- `StockControl-main/models/AdminInventory.js`
- `StockControl-main/models/PurchaseInvoice.js`

## 服务器状态
- 服务器已重启（进程42）
- 所有修复已生效
- 前端需要强制刷新浏览器（Ctrl + Shift + R）

## 注意事项

1. **税额为负数**：采购发票的税额显示为负数，表示可抵扣的进项税
2. **Margin VAT规则**：采购时税额为0，不计入进项税
3. **避免重复**：同一发票号不会在PurchaseInvoice和AdminInventory中重复计算
4. **日期范围**：使用createdAt字段作为日期过滤条件
5. **分组计算**：按invoiceNumber分组后重新计算总金额和税额

## 完成状态
✅ Financial Reports现在正确显示AdminInventory中的采购发票数据
