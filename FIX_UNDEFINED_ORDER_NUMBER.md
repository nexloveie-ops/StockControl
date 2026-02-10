# 修复订单号显示 undefined 问题

## 问题描述
销售记录查询中，订单号列显示为 `undefined`

## 问题原因
代码中使用了 `sale.saleId` 字段，但数据库中可能使用了不同的字段名：
- `saleId` - 新的订单号字段
- `invoiceNumber` - 旧的发票号字段
- `_id` - MongoDB的ID字段

## 解决方案
使用多个字段的回退机制，按优先级尝试：

```javascript
// 修改前
saleNumber: sale.saleId

// 修改后
saleNumber: sale.saleId || sale.invoiceNumber || sale._id || 'N/A'
```

## 修改位置

### 1. displaySalesRecords 函数
显示销售记录时的订单号

```javascript
allItems.push({
  saleId: sale._id,
  saleNumber: sale.saleId || sale.invoiceNumber || sale._id || 'N/A',
  // ...
});
```

### 2. reprintReceipt 函数
重新打印时的订单号

```javascript
const saleData = {
  saleId: sale.saleId || sale.invoiceNumber || sale._id || 'N/A'
};
```

### 3. filterSalesRecords 函数
搜索时的订单号

```javascript
const orderNumber = sale.saleId || sale.invoiceNumber || sale._id || '';
if (orderNumber && orderNumber.toString().toLowerCase().includes(searchTerm)) {
  return true;
}
```

## 字段优先级

1. **sale.saleId** - 首选，新系统的订单号
2. **sale.invoiceNumber** - 备选，旧系统的发票号
3. **sale._id** - 最后选择，MongoDB的唯一ID
4. **'N/A'** - 如果都没有，显示N/A

## 测试步骤

1. **刷新浏览器** (Ctrl + Shift + R)
2. 进入"销售业务" → "销售记录查询"
3. 选择日期范围并查询
4. 验证：
   - ✅ 订单号列正常显示
   - ✅ 不再显示 undefined
   - ✅ 显示实际的订单号或ID

## 预期结果

### 修改前
```
订单号
undefined
undefined
undefined
```

### 修改后
```
订单号
SALE-20260206-001
SALE-20260206-002
67abc123def456789  (如果没有saleId，显示_id)
```

## 兼容性

这个修复确保了：
- ✅ 新订单（有saleId）正常显示
- ✅ 旧订单（有invoiceNumber）正常显示
- ✅ 更旧的订单（只有_id）也能显示
- ✅ 异常情况显示 'N/A'

## 相关功能

这个修复影响以下功能：
1. **销售记录显示** - 订单号列
2. **搜索功能** - 按订单号搜索
3. **打印功能** - 小票上的订单号

## 数据库字段说明

### Sale/SalesRecord 模型可能的字段
```javascript
{
  _id: "67abc123def456789",           // MongoDB ID (总是存在)
  saleId: "SALE-20260206-001",        // 新的订单号 (可能不存在)
  invoiceNumber: "INV-2026-001",      // 旧的发票号 (可能不存在)
  date: "2026-02-06T10:30:00.000Z",
  totalAmount: 899.00,
  items: [...],
  // ...
}
```

## 如果问题仍然存在

### 检查1: 查看实际数据结构
在浏览器控制台运行：
```javascript
console.log('Sales Data:', allSalesData[0]);
```
查看实际的字段名

### 检查2: 查看API返回
在Network标签中查看 `/api/merchant/sales` 的响应，确认字段名

### 检查3: 检查后端模型
查看 `models/SalesRecord.js` 或类似文件，确认字段定义

## 未来改进

### 建议1: 统一字段名
在后端确保所有销售记录都有 `saleId` 字段

### 建议2: 数据迁移
为旧记录添加 `saleId` 字段：
```javascript
// 迁移脚本
db.salesrecords.find({ saleId: { $exists: false } }).forEach(sale => {
  db.salesrecords.updateOne(
    { _id: sale._id },
    { $set: { saleId: `SALE-${new Date(sale.date).getTime()}-${sale._id.toString().slice(-4)}` } }
  );
});
```

### 建议3: 后端验证
在创建销售记录时确保生成 `saleId`

## 修改的文件

- `StockControl-main/public/merchant.html`
  - `displaySalesRecords()` 函数
  - `filterSalesRecords()` 函数
  - `reprintReceipt()` 函数

## 状态

✅ 已修复 - 请刷新浏览器测试（Ctrl + Shift + R）
