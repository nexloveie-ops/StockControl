# 修复产品追溯功能

## 问题描述

产品追溯功能（`/api/admin/products/tracking`）只能查询旧系统的数据（ProductNew, PurchaseInvoice, SalesInvoice），无法查询商户系统的数据（MerchantInventory, MerchantSale, InventoryTransfer, WarehouseOrder）。

### 实际案例

搜索IMEI `352928114188457`时，没有显示任何历史记录，因为：
- 这个IMEI在商户系统中（MerchantInventory, MerchantSale, InventoryTransfer）
- 旧的API只查询ProductNew表，找不到数据

## 修复内容

### 文件: app.js

**位置**: 第3430行 - 产品追溯API

**修改**: 添加对商户系统数据的查询

### 新增查询

1. **MerchantInventory** - 商户库存
   - 按产品名称、序列号、条码搜索

2. **WarehouseOrder** - 仓库订单（采购入库）
   - 显示从仓库采购的记录
   - 包含产品信息、价格、序列号

3. **InventoryTransfer** - 调货记录
   - 显示调货历史
   - 包含调出方、调入方、调货价格
   - 区分内部调拨和公司间销售

4. **MerchantSale** - 商户销售
   - 显示销售记录
   - 包含销售价格、成本价、利润

### 时间线类型

修改后的API支持以下类型的历史记录：

1. **purchase** (采购)
   - 旧系统: PurchaseInvoice
   - 新系统: WarehouseOrder

2. **transfer** (调货)
   - 新系统: InventoryTransfer
   - 显示调出方和调入方

3. **sales** (销售)
   - 旧系统: SalesInvoice
   - 新系统: MerchantSale

## 数据结构

### 历史记录格式

```javascript
{
  type: 'purchase' | 'transfer' | 'sales',
  date: Date,
  invoiceNumber: String,
  invoiceId: ObjectId,
  partner: {
    name: String,
    code: String
  },
  product: {
    name: String,
    sku: String,
    barcode: String
  },
  quantity: Number,
  unitPrice: Number,
  totalPrice: Number,
  vatRate: String,
  serialNumbers: [String],
  status: String,
  
  // 商户系统特有字段
  merchant: String,           // 商户ID
  transferType: String,       // 调货类型
  fromMerchant: String,       // 调出方
  toMerchant: String,         // 调入方
  costPrice: Number,          // 成本价
  profit: Number              // 利润
}
```

### 产品列表格式

```javascript
{
  id: ObjectId,
  name: String,
  sku: String,
  barcode: String,
  stockQuantity: Number,
  source: 'old_system' | 'merchant_system',
  merchant: String,           // 商户系统特有
  status: String              // 商户系统特有
}
```

## IMEI 352928114188457 的追溯结果

修复后，搜索这个IMEI应该显示：

### 1. 仓库订单（如果有）
- 类型: purchase
- 来源: 仓库
- 价格: 批发价

### 2. 调货记录
- 类型: transfer
- 订单号: TRF20260211001
- 从: MurrayRanelagh → 到: Mobile123
- 调货价格: €195
- 日期: 2026-02-11

### 3. 销售记录
- 类型: sales
- 商户: Mobile123
- 销售价格: €249
- 成本价: €200（历史数据）
- 利润: €39.84
- 日期: 2026-02-12

## 测试步骤

1. 打开 `http://localhost:3000/prototype-working.html`
2. 登录管理员账户
3. 进入"供货商/客户管理"
4. 点击"产品追溯"标签
5. 输入IMEI: `352928114188457`
6. 点击搜索

### 预期结果

应该显示：
- 找到1个产品（IPHONE11）
- 历史记录时间线包含：
  - 调货记录（TRF20260211001）
  - 销售记录（Mobile123）

## 注意事项

1. **数据来源**: API现在同时查询旧系统和商户系统
2. **性能**: 查询多个集合可能影响性能，建议添加索引
3. **数据一致性**: 两个系统的数据格式不同，已做统一处理
4. **序列号匹配**: 支持模糊搜索，不区分大小写

## 建议的索引

为了提高查询性能，建议添加以下索引：

```javascript
// MerchantInventory
db.merchantinventories.createIndex({ serialNumber: 1 });
db.merchantinventories.createIndex({ productName: "text" });

// MerchantSale
db.merchantsales.createIndex({ "items.serialNumber": 1 });
db.merchantsales.createIndex({ "items.productName": "text" });

// InventoryTransfer
db.inventorytransfers.createIndex({ "items.serialNumber": 1 });
db.inventorytransfers.createIndex({ "items.productName": "text" });

// WarehouseOrder
db.warehouseorders.createIndex({ "items.serialNumber": 1 });
db.warehouseorders.createIndex({ "items.productName": "text" });
```

## 版本信息

- 修复日期: 2026年2月11日
- 版本: v2.4.3
- 服务器进程: 25
- 状态: ✅ 已重启并运行

## 相关文档

- `FIX_TRANSFER_COSTPRICE.md` - 调货成本价修复
- `FIX_PROFIT_CALCULATION.md` - 利润计算修复
- `check-imei-352928114188457.js` - IMEI追踪脚本
