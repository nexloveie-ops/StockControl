# PDF生成函数获取公司信息修复

## 问题描述

用户反馈PDF生成的方法中没有获得公司信息，导致生成的PDF中公司信息为空。

## 问题原因

有两个PDF生成函数没有正确获取公司信息：

### 1. downloadSalesInvoice (销售发票PDF)
- 位置：第8102行
- 问题：只获取发票详情，没有获取公司信息
- 结果：`generateInvoicePDF` 使用 `invoice.companyInfo`，但这个字段为空

### 2. downloadPurchaseInvoicePDF (采购发票PDF)
- 位置：第2624行
- 问题：使用了错误的API `${API_BASE}/company-info`（不存在）
- 结果：获取公司信息失败

## 修复方案

### 修复1：downloadSalesInvoice

**修复前**：
```javascript
async function downloadSalesInvoice(invoiceId) {
  try {
    // ❌ 只获取发票详情
    const response = await fetch(`${API_BASE}/sales-invoices/${invoiceId}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      // ❌ invoice.companyInfo 为空
      generateInvoicePDF(result.data);
    }
  }
}
```

**修复后**：
```javascript
async function downloadSalesInvoice(invoiceId) {
  try {
    // 获取当前用户
    const currentUser = localStorage.getItem('username');
    
    // ✅ 并行获取发票详情和公司信息
    const [invoiceResponse, companyResponse] = await Promise.all([
      fetch(`${API_BASE}/sales-invoices/${invoiceId}`),
      currentUser ? fetch(`/api/users/profile?username=${currentUser}`) : Promise.resolve(null)
    ]);
    
    const result = await invoiceResponse.json();
    const companyResult = companyResponse ? await companyResponse.json() : null;
    
    if (result.success && result.data) {
      const invoice = result.data;
      // ✅ 添加公司信息到发票数据中
      invoice.companyInfo = companyResult?.success && companyResult.data?.companyInfo 
        ? companyResult.data.companyInfo 
        : {};
      
      generateInvoicePDF(invoice);
    }
  }
}
```

### 修复2：downloadPurchaseInvoicePDF

**修复前**：
```javascript
async function downloadPurchaseInvoicePDF(invoiceId, invoiceNumber) {
  try {
    // 并行获取发票详情和公司信息
    const [invoiceResponse, companyResponse] = await Promise.all([
      fetch(`${API_BASE}/purchase-orders/${invoiceId}`),
      fetch(`${API_BASE}/company-info`)  // ❌ 这个API不存在！
    ]);
    
    if (!companyResponse.ok) throw new Error('Failed to get company info');
    
    const companyResult = await companyResponse.json();
    const companyInfo = companyResult.success && companyResult.data 
      ? companyResult.data 
      : null;
    
    // 生成PDF...
  }
}
```

**修复后**：
```javascript
async function downloadPurchaseInvoicePDF(invoiceId, invoiceNumber) {
  try {
    // 获取当前用户
    const currentUser = localStorage.getItem('username');
    if (!currentUser) {
      throw new Error('User not logged in');
    }
    
    // 并行获取发票详情和公司信息
    const [invoiceResponse, companyResponse] = await Promise.all([
      fetch(`${API_BASE}/purchase-orders/${invoiceId}`),
      fetch(`/api/users/profile?username=${currentUser}`)  // ✅ 使用正确的API
    ]);
    
    if (!companyResponse.ok) throw new Error('Failed to get company info');
    
    const companyResult = await companyResponse.json();
    const companyInfo = companyResult.success && companyResult.data && companyResult.data.companyInfo 
      ? companyResult.data.companyInfo 
      : null;
    
    // 生成PDF...
  }
}
```

## 修改内容

### 1. downloadSalesInvoice (第8102行)
- ✅ 添加了获取当前用户的逻辑
- ✅ 添加了并行获取公司信息的逻辑
- ✅ 将公司信息添加到发票数据中
- ✅ 传递完整的发票数据（包含公司信息）给 `generateInvoicePDF`

### 2. downloadPurchaseInvoicePDF (第2624行)
- ✅ 添加了获取当前用户的逻辑
- ✅ 修改API调用从 `${API_BASE}/company-info` 改为 `/api/users/profile?username=${currentUser}`
- ✅ 修改公司信息提取逻辑，使用 `companyResult.data.companyInfo`

## API对比

| 功能 | 错误的API | 正确的API |
|------|----------|----------|
| 获取公司信息 | `${API_BASE}/company-info` ❌ | `/api/users/profile?username=${user}` ✅ |
| 路径 | `/api/admin/company-info` (不存在) | `/api/users/profile` (存在) |
| 返回数据 | N/A | `{ success: true, data: { companyInfo: {...} } }` |

## 影响的功能

修复后，以下PDF生成功能都能正确显示公司信息：

1. ✅ 销售发票PDF（从发票详情页面下载）
2. ✅ 销售发票PDF（从客户发票列表下载）
3. ✅ 采购发票PDF（从供货商发票列表下载）

## PDF显示效果

修复后，PDF中会正确显示：

```
┌─────────────────────────────────────────────────────────┐
│                  SALES INVOICE                          │
│                  SI-1234567890-0001                     │
├─────────────────────────────────────────────────────────┤
│ FROM:                        │ TO:                      │
│ Celestia Trade Partners Ltd  │ Customer Name            │
│ 2nd Floor Office             │ Customer Address         │
│ 62 Main Street               │ ...                      │
│ Carrick-On-Suir, E32 C956    │                          │
│ Ireland                      │                          │
│ VAT: 4399799UH               │                          │
│ Phone: ...                   │                          │
│ Email: ...                   │                          │
└─────────────────────────────────────────────────────────┘
```

## 测试步骤

1. ✅ 强制刷新浏览器（Ctrl + Shift + R）
2. ✅ 确保已登录系统
3. ✅ 测试销售发票PDF：
   - 进入"供货商/客户管理" → "客户管理"
   - 点击"查看发票"
   - 点击"下载PDF"按钮
   - 验证PDF中显示公司信息
4. ✅ 测试采购发票PDF：
   - 进入"供货商/客户管理" → "供货商管理"
   - 点击"查看发票"
   - 点击发票编号查看详情
   - 点击"Download PDF"按钮
   - 验证PDF中显示公司信息

## 修改文件

- `StockControl-main/public/prototype-working.html`
  - 第8102-8130行 - downloadSalesInvoice函数
  - 第2624-2680行 - downloadPurchaseInvoicePDF函数

## 注意事项

1. 不需要重启服务器，只需强制刷新浏览器即可
2. 确保用户已登录（需要 `localStorage.getItem('username')`）
3. 使用 `Promise.all` 并行获取数据，提高性能
4. 使用可选链操作符 `?.` 安全访问嵌套属性

## 相关修复

这个修复是在以下修复的基础上进行的：
- `FIX_USER_PROFILE_COMPANY_INFO.md` - 修复用户profile API返回公司信息
- `FIX_INVOICE_COMPANY_INFO_DISPLAY.md` - 修复发票详情显示公司信息
- `FIX_PDF_DOWNLOAD_COMPLETE.md` - 修复PDF下载功能

## 日期
2026-02-12
