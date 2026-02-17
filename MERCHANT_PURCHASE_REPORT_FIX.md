# 商户采购报表修复说明

## 问题描述

1. 商户在"入库管理"中手动录入的产品，无法在"报表中心 > 采购报表"中显示
2. 点击采购报表中的发票订单号时，显示"获取订单详情失败: 发票不存在"

## 原因分析

### 问题1：采购报表不显示手动录入数据

1. **数据存储位置不同**：
   - 商户手动录入的产品保存在 `MerchantInventory` 表
   - 采购报表API只查询 `AdminInventory` 表

2. **数据关联方式**：
   - 手动录入时，发票号和供货商ID保存在 `notes` 字段中
   - 格式：`"发票号: INV-123 | 供货商ID: 60a1b2c3d4e5f6g7h8i9j0k1"`

### 问题2：发票详情无法查看

1. **API查询范围不足**：
   - `/api/admin/purchase-orders/:invoiceId` 只查询 `AdminInventory` 表
   - 不查询 `MerchantInventory` 表

2. **供货商信息缺失**：
   - MerchantInventory中只保存供货商ID
   - 需要从Supplier表查询供货商名称

## 修复方案

### 修复1：采购报表API（app.js 第8050行）

修改 `/api/merchant/purchase-report` API，增加对 `MerchantInventory` 表的查询：

1. **查询MerchantInventory表**：
   ```javascript
   const merchantInventoryQuery = {
     merchantId: merchantId,
     notes: { $regex: /发票号:/, $options: 'i' }
   };
   const merchantInventory = await MerchantInventory.find(merchantInventoryQuery).lean();
   ```

2. **加载供货商信息**：
   ```javascript
   const Supplier = require('./models/Supplier');
   const suppliers = await Supplier.find({ merchantId: merchantId }).lean();
   const supplierMap = {};
   suppliers.forEach(s => {
     supplierMap[s._id.toString()] = s.name;
   });
   ```

3. **从notes字段提取发票号和供货商**：
   ```javascript
   merchantInventory.forEach(item => {
     const match = item.notes.match(/发票号:\s*([^\s|]+)/i);
     if (match) {
       const invoiceNum = match[1];
       
       let supplier = '未知供货商';
       const supplierMatch = item.notes.match(/供货商ID:\s*([^\s|]+)/i);
       if (supplierMatch) {
         const supplierId = supplierMatch[1];
         supplier = supplierMap[supplierId] || supplierId;
       }
       
       // 添加到发票分组
       if (!invoiceGroups[invoiceNum]) {
         invoiceGroups[invoiceNum] = {
           items: [],
           supplier: supplier,
           date: item.createdAt
         };
       }
       invoiceGroups[invoiceNum].items.push(item);
     }
   });
   ```

4. **合并数据源**：
   - AdminInventory（管理员入库的数据）
   - MerchantInventory（商户手动录入的数据）
   - 按发票号分组，避免重复

### 修复2：发票详情API（app.js 第1577行）

修改 `/api/admin/purchase-orders/:invoiceId` API，增加对 `MerchantInventory` 表的查询：

1. **查询MerchantInventory表**：
   ```javascript
   const MerchantInventory = require('./models/MerchantInventory');
   const merchantProducts = await MerchantInventory.find({
     notes: { $regex: new RegExp(`发票号:\\s*${invoiceNumber}`, 'i') }
   }).lean();
   ```

2. **提取供货商信息**：
   ```javascript
   // 优先从AdminInventory获取供货商
   if (adminProducts.length > 0 && adminProducts[0].supplier) {
     supplierName = adminProducts[0].supplier;
   } 
   // 如果AdminInventory没有，从MerchantInventory的notes提取
   else if (merchantProducts.length > 0 && merchantProducts[0].notes) {
     const supplierMatch = merchantProducts[0].notes.match(/供货商ID:\s*([^\s|]+)/i);
     if (supplierMatch) {
       const supplierId = supplierMatch[1];
       const Supplier = require('./models/Supplier');
       const supplier = await Supplier.findById(supplierId).lean();
       if (supplier) {
         supplierName = supplier.name;
       }
     }
   }
   ```

3. **格式化MerchantInventory产品**：
   ```javascript
   const merchantItems = merchantProducts.map(product => {
     // 计算税率和价格
     let vatRate = 'VAT 0%';
     let taxMultiplier = 1.0;
     
     if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
       vatRate = 'VAT 23%';
       taxMultiplier = 1.23;
     } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
       vatRate = 'VAT 13.5%';
       taxMultiplier = 1.135;
     }
     
     const unitCostExcludingTax = product.costPrice;
     const totalCostExcludingTax = unitCostExcludingTax * (product.quantity || 1);
     const taxAmount = totalCostExcludingTax * (taxMultiplier - 1);
     const totalCostIncludingTax = totalCostExcludingTax + taxAmount;
     
     return {
       _id: product._id,
       productName: product.productName,
       quantity: product.quantity || 1,
       unitCost: unitCostExcludingTax,
       totalCost: totalCostIncludingTax,
       vatRate: vatRate,
       taxAmount: taxAmount,
       serialNumbers: product.serialNumber ? [product.serialNumber] : [],
       source: 'MerchantInventory'
     };
   });
   ```

4. **合并所有产品**：
   ```javascript
   const allItems = [...purchaseInvoiceItems, ...adminItems, ...merchantItems];
   ```

## 测试步骤

### 测试采购报表显示：

1. 在"入库管理 > 产品入库 > 手动录入"中添加产品
2. 填写发票号码和选择供货商
3. 确认入库
4. 切换到"报表中心 > 采购报表"
5. 应该能看到刚才录入的采购记录

### 测试发票详情查看：

1. 在采购报表中找到手动录入的发票记录
2. 点击发票号（如 IS-010）
3. 应该能看到发票详情弹窗
4. 显示所有产品明细、供货商、金额等信息

### 前端修复（merchant.html）：

**问题**：前端代码使用 `orderDetails.products` 读取产品列表，但后端返回的是 `orderDetails.items`

**修复**：
1. 修改产品列表读取：`items = orderDetails.items || orderDetails.products || []`
2. 修改供货商显示：`supplier = orderDetails.supplier?.name || orderDetails.supplier`
3. 使用后端计算好的金额：`totalAmount = orderDetails.totalAmount`
4. 修改产品显示字段：
   - 单价：`item.unitCost || item.costPrice`
   - 总价：`item.totalCost`
   - 税率：`item.taxClassification || item.vatRate`
   - 序列号：支持 `item.serialNumber` 和 `item.serialNumbers` 数组

## 数据显示

采购报表会显示三种来源的采购记录：

- 📦 **调货**：从其他商户调货的记录（InventoryTransfer表）
- 🏢 **仓库**：从仓库订货的记录（WarehouseOrder表）
- 📄 **发票**：手动录入的采购记录（AdminInventory + MerchantInventory表）

## 注意事项

1. **供货商显示**：
   - 如果选择了供货商，会显示供货商名称
   - 如果没有选择供货商，显示"未知供货商"

2. **发票号必填**：
   - 手动录入时必须填写发票号
   - 发票号用于分组和查询

3. **税额计算**：
   - VAT 23%：税额 = 总额 - (总额 / 1.23)
   - VAT 13.5%：税额 = 总额 - (总额 / 1.135)
   - Margin VAT 0%：税额 = 0
   - VAT 0%：税额 = 0

4. **数据来源标识**：
   - 发票详情中每个产品都有 `source` 字段
   - 可能的值：PurchaseInvoice、AdminInventory、MerchantInventory

## 修复日期

2026-02-17

## 修复内容总结

### 1. 采购报表API修复
- 扩展查询范围：同时查询 AdminInventory 和 MerchantInventory
- 供货商名称映射：从Supplier表查询供货商名称
- 数据合并：按发票号分组，避免重复

### 2. 发票详情API修复
- 扩展查询范围：同时查询 AdminInventory 和 MerchantInventory
- 供货商信息提取：从notes字段提取并查询供货商名称
- 产品数据格式化：统一AdminInventory和MerchantInventory的数据格式
- 价格计算：正确计算税前价、税额、含税价

### 3. 前端显示修复
- 修改字段映射：使用 items 而不是 products
- 供货商显示：支持对象和字符串格式
- 价格字段：支持 unitCost/costPrice 和 totalCost
- 税率字段：支持 taxClassification 和 vatRate
- 序列号：支持字符串和数组格式

### 4. PDF生成修复
- 扩展查询范围：同时查询 AdminInventory 和 MerchantInventory
- 供货商信息：从notes字段提取并查询供货商名称
- 产品合并：将两个表的产品合并到PDF中
- 数量处理：支持quantity为空的情况（默认为1）

## 相关文件

- `StockControl-main/app.js` 
  - 第8050-8260行：采购报表API
  - 第1577-1900行：发票详情API
  - 第8729-8860行：PDF生成API
- `StockControl-main/public/merchant.html` 
  - 第8815行：发票产品列表读取
  - 第8860-8890行：产品显示字段映射
- `StockControl-main/models/MerchantInventory.js`
- `StockControl-main/models/Supplier.js`
