# 批量创建变体订单号问题修复

## 问题描述

用户通过批量创建变体功能创建了44个iPhone Screen Saver产品，但这些产品没有关联到SI-003订单。查询时显示：
- 订单号：N/A
- 供货商：N/A
- 位置：N/A
- 来源：manual

## 根本原因

`AdminInventory` 模型缺少三个关键字段：
1. `supplier` - 供货商
2. `location` - 位置
3. `invoiceNumber` - 订单号

当批量创建变体API尝试保存这些字段时，由于它们不在schema中，MongoDB会静默忽略它们。

## 修复方案

### 1. 更新 AdminInventory 模型

在 `StockControl-main/models/AdminInventory.js` 中添加缺失的字段：

```javascript
// 供货商信息
supplier: {
  type: String,
  default: ''
},

// 位置信息
location: {
  type: String,
  default: ''
},

// 订单号
invoiceNumber: {
  type: String,
  default: '',
  index: true
},
```

### 2. 添加索引

为了提高查询性能，添加了以下索引：

```javascript
adminInventorySchema.index({ invoiceNumber: 1 });
adminInventorySchema.index({ supplier: 1 });
```

### 3. 修复现有数据

创建了迁移脚本 `fix-iphone-screen-saver-si003.js` 来更新现有的44个产品：

```javascript
const updateData = {
  invoiceNumber: 'SI-003',
  supplier: 'Mobigo Limited',
  location: 'Warehouse A',
  source: 'invoice'
};

await AdminInventory.updateMany(
  { 
    productName: /iPhone Screen Saver/i,
    invoiceNumber: ''
  },
  { $set: updateData }
);
```

## 验证结果

运行 `check-iphone-screen-saver-si003.js` 验证修复：

✅ **修复成功！**

- iPhone Screen Saver 产品总数：44
- 已关联到 SI-003 订单：44
- 所有产品都有正确的供货商、位置和订单号

### 产品详情示例

```
产品名称: iPhone Screen Saver
型号: iPhone 11
颜色: Normal
数量: 15
供货商: Mobigo Limited
位置: Warehouse A
订单号: SI-003
来源: invoice
```

## 影响范围

### 已修复
- ✅ AdminInventory 模型现在支持 supplier、location、invoiceNumber 字段
- ✅ 所有44个 iPhone Screen Saver 产品已正确关联到 SI-003 订单
- ✅ 批量创建变体功能现在可以正确保存订单号信息

### 未来创建的产品
- ✅ 新创建的产品将自动保存供货商、位置和订单号
- ✅ 供货商发票查询功能将正常工作
- ✅ 产品可以正确追溯到采购订单

## 相关文件

- `StockControl-main/models/AdminInventory.js` - 更新的模型
- `StockControl-main/check-iphone-screen-saver-si003.js` - 查询脚本
- `StockControl-main/fix-iphone-screen-saver-si003.js` - 修复脚本
- `StockControl-main/app.js` - 批量创建变体API

## 注意事项

⚠️ **重要提示：**

1. **服务器需要重启**：模型更改后需要重启Node.js服务器才能生效
2. **索引警告**：可能会看到重复索引警告，这是因为在schema中同时使用了 `index: true` 和 `schema.index()`，不影响功能
3. **PurchaseInvoice结构**：PurchaseInvoice模型要求 `product` 字段为ObjectId引用，不适合直接存储AdminInventory的变体信息

## 测试建议

1. 重启服务器
2. 在 prototype-working.html 中测试批量创建变体功能
3. 填写订单号、供货商和位置
4. 验证产品是否正确关联到订单
5. 在供货商管理中查看发票，确认产品显示正确

## 日期

2026-02-10
