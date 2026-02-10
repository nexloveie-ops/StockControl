# 发票列表税额问题 - 最终解决方案

## 问题描述
采购发票记录列表显示的税额不正确：
- 显示: subtotal=€200, taxAmount=€46, totalAmount=€246
- 应该: subtotal=€4,991.87, taxAmount=€1,194.13, totalAmount=€6,186.00

## 根本原因
1. **数据分散在两个表中**:
   - `PurchaseInvoice` 表：创建发票时只有1个产品（€246）
   - `AdminInventory` 表：批量创建变体时添加了220个产品（€5,940）
   
2. **批量创建变体时没有更新PurchaseInvoice**:
   - 批量创建变体功能只在 `AdminInventory` 中创建产品记录
   - 没有更新 `PurchaseInvoice` 表中的发票金额
   - 导致发票列表显示的是创建时的原始金额

3. **API路由被覆盖**:
   - 在 `app.js` 中定义的新API代码（第4064行）没有生效
   - 因为 `routes/admin.js` 路由器在第85行被挂载到 `/api/admin`
   - `routes/admin.js` 第442行定义了 `router.get('/suppliers/:id/invoices')`
   - 该路由调用 `supplierController.getSupplierInvoices`，返回的是旧的简单查询

## 解决方案
更新 `controllers/admin/supplierController.js` 中的 `getSupplierInvoices` 函数：

### 核心逻辑
1. **查询两个数据源**:
   ```javascript
   // 查询PurchaseInvoice表
   const invoices = await PurchaseInvoice.find({ supplier: supplierId })
     .populate('supplier', 'name code')
     .populate('items.product', 'name sku barcode')
     .sort({ invoiceDate: -1 })
     .lean();
   
   // 查询AdminInventory表（按订单号分组）
   const adminInventoryProducts = await AdminInventory.find({ 
     supplier: supplier.name 
   }).lean();
   ```

2. **按订单号分组AdminInventory产品**:
   ```javascript
   const inventoryByInvoice = {};
   adminInventoryProducts.forEach(product => {
     const invoiceNum = product.invoiceNumber || 'N/A';
     if (!inventoryByInvoice[invoiceNum]) {
       inventoryByInvoice[invoiceNum] = [];
     }
     inventoryByInvoice[invoiceNum].push(product);
   });
   ```

3. **合并数据并重新计算税额**:
   ```javascript
   // 对每个发票
   const adminItems = inventoryByInvoice[invoice.invoiceNumber] || [];
   const allItems = [...purchaseInvoiceItems, ...adminInventoryItems];
   
   // 重新计算总金额
   const totalAmount = allItems.reduce((sum, item) => 
     sum + (item.totalCostIncludingTax || item.totalCost), 0);
   const subtotal = allItems.reduce((sum, item) => 
     sum + (item.totalCostExcludingTax || item.totalCost / 1.23), 0);
   const taxAmount = totalAmount - subtotal;
   ```

4. **税额计算公式**:
   ```javascript
   // AdminInventory产品的税额计算
   const taxMultiplier = taxClassification === 'VAT_23' ? 1.23 : 
                        taxClassification === 'VAT_13_5' ? 1.135 : 1.0;
   const totalCostIncludingTax = costPrice * quantity;
   const totalCostExcludingTax = totalCostIncludingTax / taxMultiplier;
   const taxAmount = totalCostIncludingTax - totalCostExcludingTax;
   ```

## 验证结果
SI-003发票数据（Mobigo Limited）:
- **PurchaseInvoice**: 1个产品，€246
- **AdminInventory**: 220个产品，€5,940
- **合并后**:
  - 产品总数: 221
  - 小计(不含税): €4,991.87
  - 税额: €1,194.13
  - 总金额(含税): €6,186.00
  - adminInventoryCount: 220
  - purchaseInvoiceCount: 1

## 修改的文件
- `StockControl-main/controllers/admin/supplierController.js` - 更新 `getSupplierInvoices` 函数

## 测试命令
```bash
node test-invoice-list-api.js
```

## 前端显示
前端 `prototype-working.html` 无需修改，因为：
- API返回的数据结构保持不变
- `subtotal`、`taxAmount`、`totalAmount` 字段已经是正确的合并后的值
- 前端直接显示这些字段即可

## 注意事项
1. **税率格式**: AdminInventory使用 `VAT_23` 或 `VAT 23%`，需要同时支持两种格式
2. **供货商匹配**: AdminInventory的 `supplier` 字段存储的是供货商名称（字符串），不是ObjectId
3. **订单号匹配**: 通过 `invoiceNumber` 字段关联PurchaseInvoice和AdminInventory
4. **路由优先级**: Express路由按定义顺序匹配，挂载的路由器优先于直接定义的路由

## 状态
✅ **已完成** - 发票列表税额显示正确
