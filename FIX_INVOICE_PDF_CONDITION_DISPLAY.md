# 修复发票PDF中产品成色显示

## 问题描述
用户反馈：供货商/客户管理 → 查看发票 → 查看详情 → 下载PDF时，PDF中需要显示产品成色（Condition）信息。

## 问题分析

### 当前状态
1. ✅ PDF模板已有Condition列的表头（`public/prototype-working.html` 第7827行）
2. ✅ PDF代码已处理成色显示逻辑（第7907-7913行）
3. ✅ AdminInventory的items中已包含 `condition` 字段（`app.js` 第2095行）
4. ✅ MerchantInventory的items中已包含 `condition` 字段（`app.js` 第2157行）
5. ❌ PurchaseInvoice的items中**缺少** `condition` 字段（`app.js` 第2010-2038行）

### 根本原因
在 `app.js` 的 `/api/admin/purchase-orders/:invoiceId` API中，格式化PurchaseInvoice items时没有包含condition字段，导致PDF导出时无法显示成色信息。

## 解决方案

### 修改文件：`app.js`

在PurchaseInvoice items格式化代码中添加condition字段查找逻辑：

```javascript
// 格式化PurchaseInvoice items
const purchaseInvoiceItems = (invoice.items || []).map(item => {
  // ... 现有的税务计算代码 ...
  
  // 从AdminInventory中查找对应的condition信息
  let condition = '';
  if (item.serialNumbers && item.serialNumbers.length > 0) {
    // 通过序列号匹配（设备类产品）
    const matchingAdmin = adminProducts.find(ap => 
      ap.serialNumber && item.serialNumbers.includes(ap.serialNumber)
    );
    condition = matchingAdmin ? matchingAdmin.condition : '';
  } else if (item.product) {
    // 通过产品名称匹配（配件类产品）
    const matchingAdmin = adminProducts.find(ap => 
      ap.productName === (item.product.name || item.description)
    );
    condition = matchingAdmin ? matchingAdmin.condition : '';
  }
  
  return {
    // ... 现有字段 ...
    condition: condition,  // 新增字段
    source: 'PurchaseInvoice'
  };
});
```

### 工作原理

1. **设备类产品（有序列号）**：通过序列号从AdminInventory中查找对应的condition
2. **配件类产品（无序列号）**：通过产品名称从AdminInventory中查找对应的condition
3. **PDF显示**：PDF代码已经支持显示 `item.condition` 字段，无需修改

## 测试步骤

1. 重启服务器：
   ```bash
   node app.js
   ```

2. 访问供货商/客户管理页面

3. 点击发票号（如：admin-SI-3688）查看详情

4. 点击"下载PDF"按钮

5. 验证PDF中的Condition列是否正确显示产品成色

## 预期结果

- ✅ PDF中的Condition列显示正确的产品成色（如：Pre-Owned, Brand New等）
- ✅ 所有产品（设备和配件）都能正确显示成色信息
- ✅ 三种数据源（PurchaseInvoice, AdminInventory, MerchantInventory）的items都包含condition字段

## 相关文件

- `app.js` (第2010-2050行) - PurchaseInvoice items格式化
- `public/prototype-working.html` (第7900-7920行) - PDF成色显示逻辑
- `public/prototype-working.html` (第7827行) - PDF表格Condition列表头

## 完成时间
2026-02-18
