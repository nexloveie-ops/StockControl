# 发票功能问题状态

## 完成时间
2026-02-10

## 已修复问题

### 1. 付款功能enum值错误 ✅
**问题**: 付款时报错 `Bank Transfer` is not a valid enum value

**原因**: PurchaseInvoice模型中paymentMethod字段的enum值是：
- `cash`
- `bank_transfer`
- `credit_card`
- `check`

但前端使用的是 `Bank Transfer`（大写+空格）

**修复**:
- 更新前端付款方式选项值为小写+下划线格式
- 添加 `formatPaymentMethod()` 函数用于显示时格式化
- 文件: `StockControl-main/public/prototype-working.html`

### 2. 付款记录显示格式化 ✅
**修复**: 在显示付款记录时使用 `formatPaymentMethod()` 函数将数据库值转换为友好显示

## 待修复问题

### 1. 发票列表税额显示不正确 ❌

**问题描述**:
采购发票记录列表中显示的小计、税额、总金额不正确。

**当前状态**:
- API `/api/admin/suppliers/:supplierId/invoices` 已修复税额计算逻辑
- 但返回的数据中 `supplier` 字段变成了字符串ID而不是对象
- 这导致前端可能无法正确显示某些信息

**根本原因**:
使用 `.lean()` 和 `populate()` 后，在使用spread operator `...invoice` 时，supplier对象可能被序列化为ID字符串。

**尝试的修复**:
1. 明确指定 `supplier: invoice.supplier`
2. 不使用spread operator，明确列出所有字段
3. 添加调试日志（但日志未出现，说明代码可能有缓存问题）

**建议解决方案**:
```javascript
// 在返回前明确格式化supplier对象
return {
  _id: invoice._id,
  invoiceNumber: invoice.invoiceNumber,
  supplier: {
    _id: invoice.supplier._id || invoice.supplier,
    name: invoice.supplier.name || '',
    code: invoice.supplier.code || ''
  },
  // ... 其他字段
  totalAmount: totalAmount,
  subtotal: subtotal,
  taxAmount: taxAmount
};
```

**测试数据** (SI-003):
- 期望: subtotal=€4,829.27, taxAmount=€1,110.73, totalAmount=€5,940.00
- 实际: subtotal=€200, taxAmount=€46, totalAmount=€246 (只包含PurchaseInvoice数据，没有AdminInventory数据)

## 测试步骤

### 测试付款功能
1. ✅ 服务器已重启
2. 刷新浏览器 (Ctrl + Shift + R)
3. 供货商/客户管理 → Mobigo Limited → SI-003 → 查看详情
4. 点击"💰 添加付款"
5. 选择付款方式（现在应该不会报错）
6. 提交付款

### 测试发票列表
1. 供货商/客户管理 → Mobigo Limited
2. 查看采购发票记录列表
3. ❌ 验证小计、税额、总金额是否正确
   - 当前显示: €200, €46, €246
   - 应该显示: €4,829.27, €1,110.73, €5,940.00

## 相关文件
- `StockControl-main/app.js` - 后端API (需要进一步调试)
- `StockControl-main/public/prototype-working.html` - 前端显示 (已修复付款方式)
- `StockControl-main/models/PurchaseInvoice.js` - 发票模型

## 下一步行动

1. **调试发票列表API**:
   - 添加更多调试日志
   - 确认AdminInventory产品是否被正确合并
   - 确认税额计算是否正确执行

2. **修复supplier对象序列化问题**:
   - 明确格式化supplier对象
   - 确保返回的是对象而不是ID字符串

3. **验证完整流程**:
   - 创建新的测试发票
   - 验证税额计算
   - 验证付款功能

## 技术笔记

### Mongoose populate + lean() 问题
当使用 `.lean()` 时，populate的结果会被转换为普通JavaScript对象，但在某些情况下ObjectId可能不会被正确转换。

**解决方案**:
```javascript
// 方法1: 不使用lean()
const invoices = await PurchaseInvoice.find({ supplier: supplierId })
  .populate('supplier', 'name code')
  .sort({ invoiceDate: -1 });

// 方法2: 使用lean()但明确格式化
const invoices = await PurchaseInvoice.find({ supplier: supplierId })
  .populate('supplier', 'name code')
  .lean();

// 然后明确格式化每个invoice
const formatted = invoices.map(inv => ({
  ...inv,
  supplier: {
    _id: inv.supplier._id.toString(),
    name: inv.supplier.name,
    code: inv.supplier.code
  }
}));
```

### 付款方式enum值
数据库存储: `bank_transfer`, `cash`, `credit_card`, `check`
显示格式: `银行转账`, `现金`, `信用卡`, `支票`

使用 `formatPaymentMethod()` 函数进行转换。
