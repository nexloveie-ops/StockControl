# PDF下载功能完整修复

## 问题描述

用户在客户发票列表中点击"下载PDF"按钮后，遇到一系列错误：
1. 页面卡住，显示"Generating PDF..."
2. `currentUser is not defined`
3. `Failed to get company info`

## 问题分析

PDF下载功能 `downloadSalesInvoicePDF()` 存在三个问题：

### 问题1：API路径重复
```javascript
fetch(`${API_BASE}/admin/sales-invoices/${invoiceId}`)
```
- `API_BASE` = `/api/admin`
- 实际路径：`/api/admin/admin/sales-invoices/...` ❌
- 正确路径：`/api/admin/sales-invoices/...` ✅

### 问题2：currentUser未定义
```javascript
fetch(`${API_BASE}/users/profile?username=${currentUser}`)
```
- `currentUser` 变量未定义 ❌
- 需要从 `localStorage` 获取 ✅

### 问题3：公司信息API路径错误
```javascript
fetch(`${API_BASE}/users/profile?username=${currentUser}`)
```
- 使用了 `${API_BASE}` 前缀
- 实际路径：`/api/admin/users/profile` ❌
- 正确路径：`/api/users/profile` ✅

## 完整修复方案

### 修复前
```javascript
async function downloadSalesInvoicePDF(invoiceId, invoiceNumber) {
  try {
    debugLog(`下载销售发票 PDF: ${invoiceId}`);
    
    // 显示加载提示
    const loadingMsg = document.createElement('div');
    loadingMsg.style.cssText = '...';
    loadingMsg.textContent = 'Generating PDF...';
    document.body.appendChild(loadingMsg);
    
    // 并行获取发票详情和公司信息
    const [invoiceResponse, companyResponse] = await Promise.all([
      fetch(`${API_BASE}/admin/sales-invoices/${invoiceId}`),        // ❌ 路径重复
      fetch(`${API_BASE}/users/profile?username=${currentUser}`)     // ❌ currentUser未定义，路径错误
    ]);
    
    if (!invoiceResponse.ok) throw new Error(`HTTP ${invoiceResponse.status}`);
    if (!companyResponse.ok) throw new Error(`Failed to get company info`);
    
    // ... 其余代码
  } catch (error) {
    // ... 错误处理
  }
}
```

### 修复后
```javascript
async function downloadSalesInvoicePDF(invoiceId, invoiceNumber) {
  try {
    debugLog(`下载销售发票 PDF: ${invoiceId}`);
    
    // ✅ 获取当前用户
    const currentUser = localStorage.getItem('username');
    if (!currentUser) {
      throw new Error('User not logged in');
    }
    
    // 显示加载提示
    const loadingMsg = document.createElement('div');
    loadingMsg.style.cssText = '...';
    loadingMsg.textContent = 'Generating PDF...';
    document.body.appendChild(loadingMsg);
    
    // 并行获取发票详情和公司信息
    const [invoiceResponse, companyResponse] = await Promise.all([
      fetch(`${API_BASE}/sales-invoices/${invoiceId}`),              // ✅ 路径正确
      fetch(`/api/users/profile?username=${currentUser}`)            // ✅ currentUser已定义，路径正确
    ]);
    
    if (!invoiceResponse.ok) throw new Error(`HTTP ${invoiceResponse.status}`);
    if (!companyResponse.ok) throw new Error(`Failed to get company info`);
    
    // ... 其余代码
  } catch (error) {
    // ... 错误处理
  }
}
```

## 修复内容总结

| 问题 | 修复前 | 修复后 | 状态 |
|------|--------|--------|------|
| 发票API路径 | `/api/admin/admin/sales-invoices/` | `/api/admin/sales-invoices/` | ✅ |
| currentUser变量 | 未定义 | `localStorage.getItem('username')` | ✅ |
| 公司信息API路径 | `/api/admin/users/profile` | `/api/users/profile` | ✅ |

## API路径说明

系统中有两个不同的API基础路径：

### 1. Admin API (需要 API_BASE 前缀)
```javascript
const API_BASE = '/api/admin';

// 正确用法：
fetch(`${API_BASE}/sales-invoices/${id}`)     // → /api/admin/sales-invoices/...
fetch(`${API_BASE}/customers/${id}`)          // → /api/admin/customers/...
fetch(`${API_BASE}/suppliers`)                // → /api/admin/suppliers
```

### 2. General API (不需要 API_BASE 前缀)
```javascript
// 正确用法：
fetch(`/api/users/profile?username=${user}`)  // → /api/users/profile
fetch(`/api/login`)                           // → /api/login
fetch(`/api/db-status`)                       // → /api/db-status
```

## 测试步骤

1. ✅ 强制刷新浏览器（Ctrl + Shift + R）
2. ✅ 确保已登录系统
3. ✅ 进入"供货商/客户管理" → "客户管理"
4. ✅ 点击"查看发票"
5. ✅ 在发票列表中点击"下载PDF"按钮
6. ✅ 验证PDF生成成功（不再卡住）
7. ✅ 验证PDF内容正确显示（包含公司信息）

## 修改文件

- `StockControl-main/public/prototype-working.html` (第8724-8745行 - downloadSalesInvoicePDF函数)

## 相关修复文档

- `FIX_CUSTOMER_INVOICE_API_COMPLETE.md` - 客户发票API路径修复
- `FIX_SALES_INVOICE_PDF_DOWNLOAD.md` - 销售发票PDF下载修复
- `FIX_SALES_INVOICE_PDF_TOFIXED_ERROR.md` - PDF导出toFixed错误修复

## 注意事项

不需要重启服务器，只需强制刷新浏览器即可。

## 日期
2026-02-12
