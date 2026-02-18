# 手动录入入库 - AdminInventory记录修复

## 问题描述

用户在仓库管理员页面手动录入产品（如iPhone 17，序列号99881133、99881144等）后，产品在产品列表中可以看到，但是点击查看进货记录时显示为空。

## 根本原因

1. **数据保存位置不匹配**：
   - 手动录入入库使用的API是 `/api/admin/receiving/confirm`
   - 这个API只保存数据到 `ProductNew` 表（产品主表）
   - 但仓库管理员页面显示的库存是从 `AdminInventory` 表读取的
   - 商户页面的进货历史也是从 `MerchantInventory` 表读取的

2. **更新产品时缺少入库记录**：
   - 当产品已存在时，API只更新 `ProductNew` 表的库存数量和序列号
   - 不会在 `AdminInventory` 中创建入库记录
   - 因此前端无法显示入库记录（因为 `AdminInventory` 中没有对应的记录，或者记录缺少 `source`、`invoiceNumber` 等字段）

3. **Margin VAT验证错误**：
   - `PurchaseInvoice` 模型的 `vatRate` 枚举中没有包含 'Margin VAT'
   - 导致创建发票时验证失败

## 解决方案

### 1. 修改 `/api/admin/receiving/confirm` API (app.js)

在创建或更新产品时，同时创建 `AdminInventory` 记录：

```javascript
// 新增：转换VAT税率格式为AdminInventory的taxClassification格式
const convertVatRateToTaxClassification = (vatRate) => {
  if (!vatRate) return 'VAT_23';
  if (vatRate === 'VAT 23%') return 'VAT_23';
  if (vatRate === 'VAT 13.5%') return 'VAT_13_5';
  if (vatRate === 'VAT 0%') return 'VAT_0';
  if (vatRate === 'Margin VAT' || vatRate === 'Margin Vat') return 'MARGIN_VAT_0';
  return 'VAT_23';
};

// 为每个产品创建AdminInventory记录
const AdminInventory = require('./models/AdminInventory');
const adminInventoryRecord = new AdminInventory({
  productName: product.name,
  brand: product.brand || '',
  model: product.model || '',
  color: product.color || '',
  category: product.category,
  taxClassification: convertVatRateToTaxClassification(product.vatRate),
  quantity: product.quantity || 1,
  costPrice: product.unitPrice || 0,
  wholesalePrice: product.wholesalePrice || 0,
  retailPrice: product.retailPrice || 0,
  barcode: product.barcode || '',
  serialNumber: product.serialNumber || '',
  condition: product.condition || 'BRAND_NEW',
  supplier: supplierDoc.name,
  location: '',
  invoiceNumber: invoiceInfo?.number || '',
  source: 'manual',  // 标记为手动录入
  status: 'AVAILABLE',
  salesStatus: 'UNSOLD',
  notes: '手动录入入库',
  isActive: true
});
await adminInventoryRecord.save();
```

### 2. 更新 PurchaseInvoice 模型 (models/PurchaseInvoice.js)

添加 'Margin VAT' 到枚举值：

```javascript
vatRate: {
  type: String,
  enum: ['VAT 23%', 'VAT 13.5%', 'VAT 0%', 'Margin VAT'],
  default: 'VAT 23%'
}
```

### 3. 修复税额计算逻辑

在发票创建时，正确处理 Margin VAT（税额为0）：

```javascript
// 计算税额
const calculateTaxAmount = (products) => {
  return products.reduce((totalTax, p) => {
    const itemSubtotal = (p.quantity || 1) * (p.unitPrice || 0);
    let itemTax = 0;
    
    if (p.vatRate === 'VAT 23%') {
      itemTax = itemSubtotal * 0.23;
    } else if (p.vatRate === 'VAT 13.5%') {
      itemTax = itemSubtotal * 0.135;
    } else if (p.vatRate === 'VAT 0%' || p.vatRate === 'Margin VAT' || p.vatRate === 'Margin Vat') {
      itemTax = 0;
    }
    
    return totalTax + itemTax;
  }, 0);
};

// 标准化vatRate格式
let normalizedVatRate = p.vatRate || 'VAT 23%';
if (normalizedVatRate === 'Margin Vat') {
  normalizedVatRate = 'Margin VAT';
}
```

## 修改的文件

1. `StockControl-main/app.js` (lines 1090-1450)
   - 添加 `convertVatRateToTaxClassification` 函数
   - 在产品创建/更新时创建 `AdminInventory` 记录
   - 修复税额计算逻辑，支持 Margin VAT
   - 标准化 vatRate 格式

2. `StockControl-main/models/PurchaseInvoice.js`
   - 添加 'Margin VAT' 到 vatRate 枚举

## 测试步骤

1. 打开仓库管理员页面：http://localhost:3000/prototype-working.html
2. 进入"入库管理" -> "手动录入入库"
3. 选择供货商，输入发票号码
4. 添加产品信息：
   - 产品名称：iPhone 17
   - 品牌：Apple
   - 型号：128GB
   - 颜色：White
   - 分类：Pre-Owned Devices
   - 成色：PRE-OWNED
   - 税率：Margin VAT
   - 进货价：600
   - 批发价：635
   - 零售价：699
   - 序列号：99881155（新序列号）
5. 点击"确认入库"
6. 检查控制台日志，应该看到：
   - `✅ 创建AdminInventory记录: iPhone 17 (99881155)`
   - `productsUpdated: 1`
   - `adminInventoryRecordsCreated: 1`
7. 在产品列表中找到iPhone 17，点击查看进货记录
8. 应该能看到新的手动入库记录，来源显示为"手动入库"

## 预期结果

- 手动录入的产品会同时保存到 `ProductNew` 和 `AdminInventory` 表
- `AdminInventory` 记录包含完整的入库信息：
  - `source: 'manual'`
  - `invoiceNumber`: 发票号码
  - `supplier`: 供货商名称
  - `serialNumber`: 序列号（如果是设备产品）
  - `barcode`: 条码（如果是配件产品）
- 仓库管理员页面可以正确显示进货记录
- 商户页面的进货历史也能正确显示（需要产品分配到商户后）
- Margin VAT 产品的税额正确计算为0

## 注意事项

1. **历史数据**：此修复只影响新的手动录入，历史数据（如序列号99881133）不会自动修复
2. **数据迁移**：如果需要修复历史数据，需要编写数据迁移脚本
3. **双表同步**：现在手动录入会同时更新两个表，确保数据一致性
4. **Margin VAT**：二手设备使用 Margin VAT 时，税额为0，但仍需在发票中记录

## 相关文档

- AdminInventory模型：`StockControl-main/models/AdminInventory.js`
- ProductNew模型：`StockControl-main/models/ProductNew.js`
- PurchaseInvoice模型：`StockControl-main/models/PurchaseInvoice.js`
- 手动录入前端：`StockControl-main/public/prototype-working.html` (lines 4268-4650)

## 修复日期

2026-02-18
