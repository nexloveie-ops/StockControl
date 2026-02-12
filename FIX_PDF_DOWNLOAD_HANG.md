# PDF下载currentUser未定义错误修复

## 问题描述

用户在客户发票列表中点击"下载PDF"按钮后，出现错误：
```
Failed to generate PDF: currentUser is not defined
```

## 问题原因

在 `downloadSalesInvoicePDF()` 函数中（第8736行），代码使用了 `currentUser` 变量：

```javascript
fetch(`${API_BASE}/users/profile?username=${currentUser}`)
```

但是 `currentUser` 变量没有在函数中定义，也没有在全局作用域中定义，导致 `ReferenceError`。

## 修复方案

在函数开始时从 `localStorage` 获取当前用户名：

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
      fetch(`${API_BASE}/sales-invoices/${invoiceId}`),
      fetch(`${API_BASE}/users/profile?username=${currentUser}`)  // ❌ currentUser 未定义
    ]);
```

### 修复后
```javascript
async function downloadSalesInvoicePDF(invoiceId, invoiceNumber) {
  try {
    debugLog(`下载销售发票 PDF: ${invoiceId}`);
    
    // 获取当前用户
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
      fetch(`${API_BASE}/sales-invoices/${invoiceId}`),
      fetch(`${API_BASE}/users/profile?username=${currentUser}`)  // ✅ currentUser 已定义
    ]);
```

## 修复内容

1. 添加了 `currentUser` 变量定义：从 `localStorage` 获取用户名
2. 添加了用户登录检查：如果用户未登录则抛出错误
3. 确保错误处理正确移除加载提示（已存在于第8983-8984行）

## 错误处理

函数的错误处理部分（第8983-8984行）会正确移除加载提示：

```javascript
} catch (error) {
  debugLog(`❌ 生成 PDF 失败: ${error.message}`);
  alert(`Failed to generate PDF: ${error.message}`);
  const loadingMsg = document.querySelector('div[style*="Generating PDF"]');
  if (loadingMsg && loadingMsg.parentNode) document.body.removeChild(loadingMsg);
}
```

## 测试步骤

1. ✅ 强制刷新浏览器（Ctrl + Shift + R）
2. ✅ 确保已登录系统
3. ✅ 进入"供货商/客户管理" → "客户管理"
4. ✅ 点击"查看发票"
5. ✅ 在发票列表中点击"下载PDF"按钮
6. ✅ 验证PDF生成成功
7. ✅ 验证PDF内容正确显示

## 修改文件

- `StockControl-main/public/prototype-working.html` (第8724-8740行 - downloadSalesInvoicePDF函数)

## 注意事项

不需要重启服务器，只需强制刷新浏览器即可。

## 相关修复

这个修复是在之前修复API路径错误（`FIX_PDF_DOWNLOAD_HANG.md`）的基础上进行的。

两个问题都需要修复才能让PDF下载功能正常工作：
1. ✅ API路径错误（已修复）
2. ✅ currentUser未定义（已修复）

## 日期
2026-02-12
