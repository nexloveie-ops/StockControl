# 调货税务分类继承修复 ✅

## 问题描述

在群组库存提交调货申请时，公司间销售的税务计算没有读取正确的税务分类。

## 原因分析

### 1. 调货请求API缺少税务分类

在 `POST /api/merchant/inventory/transfer/request` API中，创建调货记录时没有将产品的 `taxClassification` 字段添加到 `transferItems` 中。

**问题代码**：
```javascript
transferItems.push({
  inventoryId: inventory._id,
  productName: inventory.productName,
  // ... 其他字段
  condition: inventory.condition,
  // ❌ 缺少 taxClassification
  retailPrice: inventory.retailPrice
});
```

### 2. InventoryTransfer模型缺少字段定义

`InventoryTransfer` 模型的 `items` 数组中没有定义 `taxClassification` 字段。

**问题代码**：
```javascript
items: [{
  inventoryId: { ... },
  productName: { ... },
  // ... 其他字段
  condition: String
  // ❌ 缺少 taxClassification 字段定义
}]
```

## 解决方案

### 1. 修改调货请求API

在创建调货记录时，添加 `taxClassification` 字段。

**文件**: `app.js`

**修复代码**：
```javascript
transferItems.push({
  inventoryId: inventory._id,
  productName: inventory.productName,
  brand: inventory.brand,
  model: inventory.model,
  category: inventory.category,
  quantity: item.quantity,
  transferPrice: transferPrice,
  barcode: inventory.barcode,
  serialNumber: inventory.serialNumber,
  color: inventory.color,
  condition: inventory.condition,
  taxClassification: inventory.taxClassification, // ✅ 添加税务分类
  retailPrice: inventory.retailPrice
});
```

### 2. 修改InventoryTransfer模型

在模型定义中添加 `taxClassification` 和 `retailPrice` 字段。

**文件**: `models/InventoryTransfer.js`

**修复代码**：
```javascript
items: [{
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MerchantInventory',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  brand: String,
  model: String,
  category: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  transferPrice: {
    type: Number,
    required: true,
    min: 0
  },
  barcode: String,
  serialNumber: String,
  color: String,
  condition: String,
  taxClassification: {           // ✅ 添加税务分类
    type: String,
    default: 'VAT_23'
  },
  retailPrice: Number            // ✅ 添加零售价
}]
```

## 税务分类的重要性

### 公司间销售

公司间销售需要生成正式的Invoice（发票），发票中需要正确的税务分类来计算VAT。

**税务分类类型**：
- **VAT_23**: 标准VAT税率（23%）
- **Margin VAT**: 差价征税（二手商品）
- **VAT_0**: 免税
- **VAT_13.5**: 降低税率（13.5%）

### VAT计算示例

#### VAT_23（标准税率）

```
产品: iPhone 14 (新品)
税务分类: VAT_23
批发价: €600.00

计算:
Subtotal (Excl. VAT): €600.00
VAT (23%):            €138.00
Total (Incl. VAT):    €738.00
```

#### Margin VAT（差价征税）

```
产品: iPhone 13 (二手)
税务分类: Margin VAT
批发价: €500.00
成本价: €400.00

计算:
Margin: €500.00 - €400.00 = €100.00
VAT = €100.00 × 23% / 123% = €18.70
```

## 数据流程

### 1. 群组库存查看

```
用户查看群组库存
└─ 显示产品信息
   ├─ 产品名称
   ├─ 批发价
   ├─ 零售价
   └─ 税务分类 ✅
```

### 2. 添加到调货清单

```
用户添加产品到调货清单
└─ 保存产品信息
   ├─ inventoryId
   ├─ 产品详情
   ├─ 价格信息
   └─ 税务分类 ✅
```

### 3. 提交调货申请

```
用户提交调货申请
└─ 创建调货记录
   ├─ 从库存读取产品信息
   ├─ 包含税务分类 ✅
   └─ 保存到 InventoryTransfer
```

### 4. 生成Invoice（公司间销售）

```
调货完成后生成Invoice
└─ 使用调货记录中的税务分类 ✅
   ├─ 计算正确的VAT
   ├─ 生成发票
   └─ 显示在PDF中
```

## 影响范围

### 已修复
- ✅ 新的调货申请会正确保存税务分类
- ✅ 公司间销售Invoice会使用正确的税务分类
- ✅ VAT计算正确

### 需要注意
- ⚠️ 已存在的调货记录可能没有税务分类
- ⚠️ 旧记录生成Invoice时可能使用默认值（VAT_23）

## 测试验证

### 测试步骤

1. **准备测试数据**
   ```
   创建两个不同公司的商户
   MurrayRanelagh: Murray Electronics Limited
   TestMerchant: Test Company Ltd
   ```

2. **创建不同税务分类的产品**
   ```
   产品1: iPhone 14 (新品)
   税务分类: VAT_23
   
   产品2: iPhone 13 (二手)
   税务分类: Margin VAT
   ```

3. **发起调货申请**
   ```
   登录: TestMerchant
   进入: 群组库存
   添加两个产品到调货清单
   提交调货申请
   ```

4. **审批并完成调货**
   ```
   MurrayRanelagh 批准
   TestMerchant 确认收货
   ```

5. **验证税务分类**
   ```
   查看调货记录
   检查 items 数组中的 taxClassification 字段
   应该正确保存 ✅
   ```

6. **生成Invoice PDF**
   ```
   打开调货详情
   点击"生成PDF"
   验证税务分类和VAT计算 ✅
   ```

### 预期结果

**调货记录**：
```json
{
  "transferNumber": "TRF20260205001",
  "transferType": "INTER_COMPANY_SALE",
  "items": [
    {
      "productName": "iPhone 14",
      "taxClassification": "VAT_23",  // ✅ 正确保存
      "transferPrice": 600.00
    },
    {
      "productName": "iPhone 13",
      "taxClassification": "Margin VAT",  // ✅ 正确保存
      "transferPrice": 500.00
    }
  ]
}
```

**Invoice PDF**：
```
ITEMS
┌────────────────────────────────────────────┐
│ Description  │ Tax Class │ Price │ Total  │
├────────────────────────────────────────────┤
│ iPhone 14    │ VAT 23%   │ €600  │ €600   │
│ iPhone 13    │ Margin VAT│ €500  │ €500   │
└────────────────────────────────────────────┘

Subtotal (Excl. VAT): €1,100.00
VAT:                  €253.00  ✅ 正确计算
Total (Incl. VAT):    €1,353.00
```

## 代码位置

### 后端API
**文件**: `StockControl-main/app.js`

**API**: `POST /api/merchant/inventory/transfer/request`

**行数**: 约 5920

### 模型定义
**文件**: `StockControl-main/models/InventoryTransfer.js`

**字段**: `items.taxClassification`

**行数**: 约 120

## 相关功能

- 调货申请：创建调货记录
- 公司间销售：生成Invoice
- VAT计算：基于税务分类
- PDF生成：显示税务信息

## 相关文档

- `FIX_TRANSFER_TAX_CLASSIFICATION_INHERITANCE.md` - 调货完成时税务分类继承
- `TRANSFER_PDF_INVOICE_FORMAT.md` - Invoice PDF格式
- `COMPANY_BASED_TRANSFER_DESIGN.md` - 公司信息调货设计

---
**完成日期**: 2026-02-05
**状态**: ✅ 已修复
**需要重启服务器**: 是（已重启）
