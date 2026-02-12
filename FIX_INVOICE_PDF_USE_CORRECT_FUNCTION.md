# 发票PDF下载使用正确函数

## 问题描述

用户反馈客户发票列表中的"下载PDF"按钮生成的发票信息完全错误。

## 问题原因

系统中有两个PDF生成函数：

### 1. downloadSalesInvoice (正确的函数)
- 位置：第8052行
- 调用：`generateInvoicePDF(invoice)`
- 特点：使用 `window.open()` 打开新窗口，显示标准发票格式
- 用途：从发票详情页面下载PDF
- 状态：✅ 格式正确，信息完整

### 2. downloadSalesInvoicePDF (有问题的函数)
- 位置：第8724行
- 调用：使用 jsPDF 库生成PDF
- 特点：直接生成PDF文件并下载
- 用途：原本用于从客户发票列表下载PDF
- 状态：❌ 格式错误，信息不完整

## 问题分析

客户发票列表中的"下载PDF"按钮调用了 `downloadInvoicePDF()`，该函数又调用了 `downloadSalesInvoicePDF()`：

```javascript
// 客户发票列表 → 下载PDF按钮
async function downloadInvoicePDF(invoiceId, source) {
  if (source === 'SalesInvoice') {
    await downloadSalesInvoicePDF(invoiceId);  // ❌ 调用了错误的函数
  }
}
```

而发票详情页面的"Download PDF"按钮调用了正确的函数：

```javascript
// 发票详情页面 → Download PDF按钮
<button onclick="downloadSalesInvoice('${invoice._id}')" ...>
  📥 Download PDF
</button>
```

## 修复方案

修改 `downloadInvoicePDF()` 函数，让它调用正确的 `downloadSalesInvoice()` 函数：

### 修复前
```javascript
async function downloadInvoicePDF(invoiceId, source) {
  debugLog(`下载发票PDF: ${invoiceId}, 来源: ${source}`);
  
  if (source === 'SalesInvoice') {
    // 使用旧系统的PDF导出
    await downloadSalesInvoicePDF(invoiceId);  // ❌ 错误的函数
  } else {
    // 使用商户系统的PDF导出
    alert('商户系统的PDF导出功能开发中...');
  }
}
```

### 修复后
```javascript
async function downloadInvoicePDF(invoiceId, source) {
  debugLog(`下载发票PDF: ${invoiceId}, 来源: ${source}`);
  
  if (source === 'SalesInvoice') {
    // 使用旧系统的PDF导出（调用发票详情页面的函数）
    await downloadSalesInvoice(invoiceId);  // ✅ 正确的函数
  } else {
    // 使用商户系统的PDF导出
    alert('商户系统的PDF导出功能开发中...');
  }
}
```

## 两个函数的对比

| 特性 | downloadSalesInvoice | downloadSalesInvoicePDF |
|------|---------------------|------------------------|
| 生成方式 | window.open() + window.print() | jsPDF库 |
| 显示方式 | 新窗口打开，可预览 | 直接下载文件 |
| 格式 | 标准发票格式 | 自定义格式 |
| 信息完整性 | ✅ 完整 | ❌ 不完整 |
| 用户体验 | ✅ 可预览后打印 | ❌ 直接下载 |
| 推荐使用 | ✅ 是 | ❌ 否 |

## downloadSalesInvoice 函数说明

这个函数的工作流程：

1. 获取发票详情：`fetch('/api/admin/sales-invoices/${invoiceId}')`
2. 调用 `generateInvoicePDF(invoice)` 生成HTML格式的发票
3. 使用 `window.open()` 在新窗口中打开
4. 新窗口包含"Print Invoice"按钮，用户可以预览后打印或保存为PDF

## 优势

使用 `downloadSalesInvoice()` 的优势：

1. ✅ 发票格式标准、专业
2. ✅ 信息完整（公司信息、客户信息、产品明细、总计等）
3. ✅ 用户可以预览后再打印
4. ✅ 支持浏览器的"打印为PDF"功能
5. ✅ 与发票详情页面的PDF导出保持一致

## 测试步骤

1. ✅ 强制刷新浏览器（Ctrl + Shift + R）
2. ✅ 登录系统
3. ✅ 进入"供货商/客户管理" → "客户管理"
4. ✅ 点击"查看发票"
5. ✅ 在发票列表中点击"下载PDF"按钮
6. ✅ 验证新窗口打开，显示标准发票格式
7. ✅ 验证发票信息完整正确
8. ✅ 点击"Print Invoice"按钮测试打印功能

## 修改文件

- `StockControl-main/public/prototype-working.html` (第6604-6615行 - downloadInvoicePDF函数)

## 注意事项

1. 不需要重启服务器，只需强制刷新浏览器即可
2. `downloadSalesInvoicePDF()` 函数可以保留，以备将来需要时使用
3. 两个入口（客户发票列表和发票详情页面）现在使用相同的PDF生成函数，确保一致性

## 日期
2026-02-12
