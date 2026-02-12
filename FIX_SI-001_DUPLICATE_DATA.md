# SI-001重复数据清理和修复完成

## 问题描述

用户在Financial Reports中查询SI-001发票时，发现：
1. 税额显示错误：显示€-138.00，实际应该是€-325.37
2. 删除PurchaseInvoice表中的重复记录后，用户无法点击查看SI-001详情

## 根本原因

### 1. 重复数据问题
SI-001同时存在于两个表中：
- **PurchaseInvoice表**：3个产品，€738总金额，€138税额（错误数据）
- **AdminInventory表**：44个产品，€1740总金额，€325.37税额（正确数据）

### 2. 发票ID格式问题
Financial Reports API在返回AdminInventory发票时，设置`_id: null`，导致前端无法点击查看详情。

## 修复方案

### 修复1：删除重复数据
运行脚本`delete-duplicate-si-001.js`删除PurchaseInvoice表中的错误记录：
```javascript
const result = await PurchaseInvoice.deleteOne({ 
  _id: new ObjectId('698d2aea45a9908f057c4b2d') 
});
```

### 修复2：修复发票ID格式
修改`app.js`第5653行，将AdminInventory发票的`_id`设置为`admin-${invoiceNum}`格式：

**修改前：**
```javascript
results.push({
  _id: null,  // ❌ 导致前端无法点击
  invoiceNumber: invoiceNum,
  ...
});
```

**修改后：**
```javascript
results.push({
  _id: `admin-${invoiceNum}`,  // ✅ 使用admin-前缀格式
  invoiceNumber: invoiceNum,
  ...
});
```

## 技术细节

### Invoice Details API支持两种ID格式

`app.js`第1577-1750行的Invoice Details API已经支持：
1. **ObjectId格式**：直接查询PurchaseInvoice表
2. **admin-前缀格式**：查询AdminInventory表

```javascript
if (invoiceId.startsWith('admin-')) {
  invoiceNumber = invoiceId.replace('admin-', '');
  // 查询AdminInventory
  const adminProducts = await AdminInventory.find({ invoiceNumber }).lean();
  // 构造虚拟发票对象
  invoice = {
    _id: `admin-${invoiceNumber}`,
    invoiceNumber: invoiceNumber,
    ...
  };
}
```

### Financial Reports API逻辑

`app.js`第5606-5680行：
1. 查询PurchaseInvoice表的发票
2. 查询AdminInventory表，按invoiceNumber分组
3. 检查是否已存在于PurchaseInvoice（避免重复）
4. 计算税额（遵循Margin VAT规则）
5. 返回合并后的发票列表

## 验证结果

### SI-001正确数据
- **来源**：AdminInventory表
- **产品数量**：44个
- **总金额**：€1740.00（含税）
- **税额**：€325.37（可抵扣）
- **供货商**：Mobigo Limited

### 税额计算规则
- **VAT 23%**：税额 = 总金额 - (总金额 / 1.23)
- **VAT 13.5%**：税额 = 总金额 - (总金额 / 1.135)
- **Margin VAT**：采购时税额 = 0（只在销售时对差额征税）
- **VAT 0%**：税额 = 0

## 测试步骤

1. 打开`prototype-working.html`
2. 进入Financial Reports
3. 查询日期范围：2026-01-01 到 2026-02-28
4. 找到SI-001发票，应显示：
   - 发票号：SI-001
   - 类型：📥 Purchase
   - 供货商：Mobigo Limited
   - 总金额：€1740.00
   - 税额：€-325.37（负数表示可抵扣）
5. 点击SI-001发票号，应正常打开详情对话框
6. 详情中应显示44个产品

## 相关文件

- `StockControl-main/app.js` (第1577-1750行 - Invoice Details API)
- `StockControl-main/app.js` (第5606-5680行 - Financial Reports API)
- `StockControl-main/delete-duplicate-si-001.js` (删除重复数据脚本)
- `StockControl-main/FIX_FINANCIAL_REPORTS_ADMIN_INVENTORY.md` (Financial Reports支持AdminInventory)

## 状态

✅ **已完成** - 2026-02-12
- 删除PurchaseInvoice表中的重复SI-001记录
- 修复Financial Reports API返回的发票ID格式
- 服务器已重启（进程43）
- SI-001现在可以正常点击查看详情
