# 发票详情显示公司信息修复

## 问题描述

用户反馈在"供货商/客户管理"中查看所有发票时，发票详情没有显示公司信息（Company Information）。

## 问题原因

发票相关的API都没有返回公司信息（companyInfo）：

1. `/api/admin/suppliers/:supplierId/invoices` - 供货商发票列表
2. `/api/admin/customers/:customerId/invoices` - 客户发票列表
3. `/api/admin/purchase-invoices/:invoiceId` - 采购发票详情
4. `/api/admin/sales-invoices/:invoiceId` - 销售发票详情

但是前端在显示发票详情时需要公司信息（公司名称、地址、税号、银行信息等）。

## 解决方案

修改前端代码，在显示发票详情时主动获取公司信息。

### 修改的函数

#### 1. showPurchaseInvoiceDetails (采购发票详情)

**修改前**：
```javascript
async function showPurchaseInvoiceDetails(invoiceId) {
  try {
    const response = await fetch(`/api/admin/purchase-orders/${invoiceId}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      const invoice = result.data;
      const supplier = invoice.supplier || {};
      // ❌ 没有获取公司信息
      
      // 显示发票详情（缺少公司信息）
    }
  }
}
```

**修改后**：
```javascript
async function showPurchaseInvoiceDetails(invoiceId) {
  try {
    // 获取当前用户
    const currentUser = localStorage.getItem('username');
    
    // ✅ 并行获取发票详情和公司信息
    const [invoiceResponse, companyResponse] = await Promise.all([
      fetch(`/api/admin/purchase-orders/${invoiceId}`),
      currentUser ? fetch(`/api/users/profile?username=${currentUser}`) : Promise.resolve(null)
    ]);
    
    const result = await invoiceResponse.json();
    const companyResult = companyResponse ? await companyResponse.json() : null;
    
    if (result.success && result.data) {
      const invoice = result.data;
      const supplier = invoice.supplier || {};
      // ✅ 获取公司信息
      const companyInfo = companyResult?.success && companyResult.data?.companyInfo 
        ? companyResult.data.companyInfo 
        : null;
      
      // 显示发票详情（包含公司信息）
    }
  }
}
```

#### 2. showSalesInvoiceDetails (销售发票详情)

**修改前**：
```javascript
async function showSalesInvoiceDetails(invoiceId) {
  try {
    const response = await fetch(`/api/admin/sales-invoices/${invoiceId}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      const invoice = result.data;
      // ❌ 使用 invoice.companyInfo（但API不返回这个字段）
      const companyInfo = invoice.companyInfo || {};
      
      // 显示发票详情（公司信息为空）
    }
  }
}
```

**修改后**：
```javascript
async function showSalesInvoiceDetails(invoiceId) {
  try {
    // 获取当前用户
    const currentUser = localStorage.getItem('username');
    
    // ✅ 并行获取发票详情和公司信息
    const [invoiceResponse, companyResponse] = await Promise.all([
      fetch(`/api/admin/sales-invoices/${invoiceId}`),
      currentUser ? fetch(`/api/users/profile?username=${currentUser}`) : Promise.resolve(null)
    ]);
    
    const result = await invoiceResponse.json();
    const companyResult = companyResponse ? await companyResponse.json() : null;
    
    if (result.success && result.data) {
      const invoice = result.data;
      // ✅ 从API响应中获取公司信息
      const companyInfo = companyResult?.success && companyResult.data?.companyInfo 
        ? companyResult.data.companyInfo 
        : {};
      
      // 显示发票详情（包含公司信息）
    }
  }
}
```

## 修改内容

### 1. 采购发票详情（第3574行）

- ✅ 添加了并行获取公司信息的逻辑
- ✅ 在发票详情中显示公司信息（左侧）和供应商信息（右侧）
- ✅ 添加了发票信息卡片（Invoice Number, Date, Status）
- ✅ 如果公司信息不可用，显示"Company information not available"

### 2. 销售发票详情（第6665行）

- ✅ 修改为主动获取公司信息，而不是依赖API返回
- ✅ 使用 `companyResult?.success && companyResult.data?.companyInfo` 安全访问
- ✅ 添加了公司信息可用性检查
- ✅ 如果公司信息不可用，显示"Company information not available"

## 公司信息API

使用的API：`/api/users/profile?username=${currentUser}`

返回数据结构：
```javascript
{
  success: true,
  data: {
    username: "admin",
    email: "admin@example.com",
    companyInfo: {
      companyName: "My Company Ltd",
      address: {
        street: "123 Main St",
        city: "Dublin",
        postalCode: "D01 ABC1",
        country: "Ireland"
      },
      contact: {
        phone: "+353 1 234 5678",
        email: "info@company.com"
      },
      taxNumber: "IE1234567T",
      bankDetails: {
        iban: "IE12 BANK 1234 5678 9012",
        bic: "BANKIEXXX",
        bankName: "Bank of Ireland"
      }
    }
  }
}
```

## 显示效果

### 采购发票详情
```
┌─────────────────────────────────────────────────────────┐
│ Company Information      │ Supplier Information         │
│ My Company Ltd           │ ABC Supplier Ltd             │
│ 123 Main St              │ Contact: John Doe            │
│ Dublin D01 ABC1          │ Phone: +353 1 234 5678       │
│ Ireland                  │ Email: john@supplier.com     │
│ Phone: +353 1 234 5678   │                              │
│ Email: info@company.com  │                              │
│ VAT Number: IE1234567T   │                              │
└─────────────────────────────────────────────────────────┘
```

### 销售发票详情
```
┌─────────────────────────────────────────────────────────┐
│ Company Information      │ Customer Information         │
│ My Company Ltd           │ XYZ Customer Ltd             │
│ 123 Main St              │ Contact: Jane Smith          │
│ Dublin D01 ABC1          │ Phone: +353 1 987 6543       │
│ Ireland                  │ Email: jane@customer.com     │
│ Phone: +353 1 234 5678   │ VAT Number: IE9876543T       │
│ Email: info@company.com  │                              │
│ VAT Number: IE1234567T   │                              │
└─────────────────────────────────────────────────────────┘
```

## 测试步骤

1. ✅ 强制刷新浏览器（Ctrl + Shift + R）
2. ✅ 确保已登录系统
3. ✅ 确保用户profile中已设置公司信息
4. ✅ 进入"供货商/客户管理" → "供货商管理"
5. ✅ 点击"查看发票"
6. ✅ 点击发票编号查看详情
7. ✅ 验证公司信息正确显示
8. ✅ 进入"客户管理"，重复测试

## 修改文件

- `StockControl-main/public/prototype-working.html` 
  - 第3574-3650行 - showPurchaseInvoiceDetails函数
  - 第6665-6750行 - showSalesInvoiceDetails函数

## 注意事项

1. 不需要重启服务器，只需强制刷新浏览器即可
2. 如果用户未设置公司信息，会显示"Company information not available"
3. 使用 `Promise.all` 并行获取数据，提高性能
4. 使用可选链操作符 `?.` 安全访问嵌套属性

## 相关功能

这个修复确保了以下功能都能正确显示公司信息：
- ✅ 供货商发票详情
- ✅ 客户发票详情
- ✅ PDF导出（已在之前修复）

## 日期
2026-02-12
