# 供货商采购发票总金额计算逻辑说明

## 用户问题
prototype-working.html 供货商/客户管理 供货商管理 采购发票记录 总金额（含税）这个栏目是按实际采购价格核算的吗？

## 答案：是的，使用实际采购价格（costPrice）

## 代码位置
`app.js` 第4490-4540行 - 供货商发票API (`/api/admin/suppliers/:supplierId/invoices`)

## 计算逻辑详解

### 1. AdminInventory产品的计算（第4502行）
```javascript
const totalCostIncludingTax = product.costPrice * product.quantity;
```
- 使用 `costPrice`（实际采购价格）
- 乘以数量得到含税总价

### 2. 税额计算（第4503-4504行）
```javascript
const totalCostExcludingTax = totalCostIncludingTax / taxMultiplier;
const taxAmount = totalCostIncludingTax - totalCostExcludingTax;
```
- 根据税率（VAT 23%, VAT 13.5%, VAT 0%）计算不含税金额
- 税额 = 含税总价 - 不含税金额

### 3. 发票总金额汇总（第4537行）
```javascript
const totalAmount = allItems.reduce((sum, item) => sum + (item.totalCostIncludingTax || item.totalCost), 0);
```
- 汇总所有产品的含税总价
- 这就是发票列表中显示的"总金额（含税）"

## 价格字段说明

系统中有三个价格字段：
1. **costPrice（进货价/采购成本）** - 实际从供货商采购的价格，用于计算发票总金额
2. **wholesalePrice（批发价）** - 对外批发的价格
3. **retailPrice（零售价）** - 零售销售的价格

## 结论
✅ 供货商管理中采购发票记录的"总金额（含税）"是按实际采购价格（costPrice）核算的，计算公式为：

**总金额（含税）= Σ(costPrice × quantity)**

这个金额反映了从供货商实际采购的成本，是正确的。
