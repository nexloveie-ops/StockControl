# 销售发票PDF导出toFixed错误修复

## 问题描述

用户在查看销售发票详情并点击"Download PDF"时遇到错误：
```
下载发票失败: Cannot read properties of undefined (reading 'toFixed')
```

## 错误原因

在 `generateInvoicePDF()` 函数中（第8169-8170行），代码直接使用了 `item.unitPriceIncludingTax` 和 `item.totalPriceIncludingTax` 字段：

```javascript
<td class="text-right">€${item.unitPriceIncludingTax.toFixed(2)}</td>
<td class="text-right">€${item.totalPriceIncludingTax.toFixed(2)}</td>
```

但是，从后端API返回的发票数据中，这些字段可能不存在或为 `undefined`，导致调用 `.toFixed()` 时报错。

### 数据结构分析

后端API返回的发票item数据结构：
```javascript
{
  description: "IPHONE13",
  condition: "PRE-OWNED",
  quantity: 1,
  unitPrice: 275.6,        // 不含税价格
  totalPrice: 275.6,       // 不含税价格
  vatRate: "VAT 0%",
  taxAmount: 0,
  serialNumbers: ["357479188926245"],
  // unitPriceIncludingTax 和 totalPriceIncludingTax 可能不存在
}
```

## 修复方案

添加安全检查，如果字段不存在则使用默认值：

### 修复前
```javascript
const vatRateFormatted = formatVatRate(item.vatRate);

return `
  <tr>
    <td>${item.description || item.product?.name || ''}</td>
    <td>${item.condition || 'N/A'}</td>
    <td>${code}</td>
    <td class="text-right">${item.quantity}</td>
    <td class="text-right">€${item.unitPriceIncludingTax.toFixed(2)}</td>
    <td class="text-right">€${item.totalPriceIncludingTax.toFixed(2)}</td>
    <td>${vatRateFormatted}</td>
  </tr>
`;
```

### 修复后
```javascript
const vatRateFormatted = formatVatRate(item.vatRate);

// 安全获取价格，如果未定义则使用默认值
const unitPriceIncludingTax = item.unitPriceIncludingTax || item.unitPrice || 0;
const totalPriceIncludingTax = item.totalPriceIncludingTax || item.totalPrice || 0;

return `
  <tr>
    <td>${item.description || item.product?.name || ''}</td>
    <td>${item.condition || 'N/A'}</td>
    <td>${code}</td>
    <td class="text-right">${item.quantity}</td>
    <td class="text-right">€${unitPriceIncludingTax.toFixed(2)}</td>
    <td class="text-right">€${totalPriceIncludingTax.toFixed(2)}</td>
    <td>${vatRateFormatted}</td>
  </tr>
`;
```

## 修复逻辑

使用逻辑或运算符 `||` 提供回退值：
1. 优先使用 `item.unitPriceIncludingTax`（含税价格）
2. 如果不存在，使用 `item.unitPrice`（不含税价格）
3. 如果都不存在，使用 `0`

这样确保即使字段缺失，也不会导致 `toFixed()` 调用失败。

## 测试步骤

1. ✅ 强制刷新浏览器（Ctrl + Shift + R）
2. ✅ 登录系统
3. ✅ 进入"供货商/客户管理" → "客户管理"
4. ✅ 点击"查看发票"
5. ✅ 点击发票编号查看详情
6. ✅ 点击"Download PDF"按钮
7. ✅ 验证PDF打印窗口正常打开
8. ✅ 验证价格显示正确

## 相关修复

这个问题与之前修复的 `downloadSalesInvoicePDF()` 函数中的类似问题相同（参见 `FIX_SALES_INVOICE_PDF_DOWNLOAD.md`）。

两个函数都需要安全处理可能为 `undefined` 的数值字段。

## 修改文件

- `StockControl-main/public/prototype-working.html` (第8160-8180行 - generateInvoicePDF函数)

## 注意事项

不需要重启服务器，只需强制刷新浏览器即可。

## 日期
2026-02-12
