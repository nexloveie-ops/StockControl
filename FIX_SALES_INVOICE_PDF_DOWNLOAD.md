# 销售发票PDF下载修复

## 修复时间
2026-02-11

## 问题描述
在"供货商/客户管理" → "客户管理" → "查看发票" → "销售发票记录" → "Download PDF"时出错。

## 问题原因

### 1. API端点错误
```javascript
// 错误的API端点
fetch(`${API_BASE}/sales-invoices/${invoiceId}`)

// 正确的API端点
fetch(`${API_BASE}/admin/sales-invoices/${invoiceId}`)
```

后端API路径是 `/api/admin/sales-invoices/:invoiceId`，但前端调用的是 `/api/sales-invoices/:invoiceId`，导致404错误。

### 2. 公司信息API错误
```javascript
// 错误的API端点
fetch(`${API_BASE}/company-info`)

// 正确的API端点
fetch(`${API_BASE}/users/profile?username=${currentUser}`)
```

系统中没有 `/api/company-info` 端点，应该从用户profile中获取公司信息。

### 3. 公司信息数据结构错误
```javascript
// 错误的数据结构
const companyInfo = companyResult.success && companyResult.data 
  ? companyResult.data 
  : null;

// 正确的数据结构
const companyInfo = companyResult.success && companyResult.data && companyResult.data.companyInfo 
  ? companyResult.data.companyInfo 
  : null;
```

公司信息在 `result.data.companyInfo` 中，而不是直接在 `result.data` 中。

## 解决方案

### 修改文件
`StockControl-main/public/prototype-working.html` - `downloadSalesInvoicePDF()` 函数

### 修复内容

#### 1. 修复API端点
```javascript
const [invoiceResponse, companyResponse] = await Promise.all([
  fetch(`${API_BASE}/admin/sales-invoices/${invoiceId}`),  // 添加 /admin
  fetch(`${API_BASE}/users/profile?username=${currentUser}`)  // 使用用户profile API
]);
```

#### 2. 修复公司信息获取
```javascript
const companyInfo = companyResult.success && companyResult.data && companyResult.data.companyInfo 
  ? companyResult.data.companyInfo 
  : null;
```

## API端点说明

### 销售发票详情API
- **端点**: `GET /api/admin/sales-invoices/:invoiceId`
- **定义位置**: `app.js` 第3925行
- **返回数据**:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "invoiceNumber": "SI-...",
    "customer": { ... },
    "items": [ ... ],
    "totalAmount": 100,
    "subtotal": 81.30,
    "taxAmount": 18.70,
    ...
  }
}
```

### 用户Profile API
- **端点**: `GET /api/users/profile?username=xxx`
- **返回数据**:
```json
{
  "success": true,
  "data": {
    "username": "...",
    "companyInfo": {
      "companyName": "...",
      "address": { ... },
      "taxNumber": "...",
      "contact": { ... },
      "bankDetails": { ... }
    }
  }
}
```

## PDF内容

### 生成的PDF包含
1. **标题**: SALES INVOICE
2. **发票编号**: SI-XXX
3. **卖方信息** (FROM):
   - 公司名称
   - 地址
   - VAT号码
   - 电话
   - 邮箱
4. **买方信息** (TO):
   - 客户名称/公司名称
   - 地址
   - VAT号码
5. **发票信息**:
   - Invoice Date
   - Payment Method
6. **产品明细表**:
   - Product
   - Qty
   - Price
   - Total
7. **总计**:
   - Subtotal
   - VAT
   - Total
8. **银行信息** (如果有):
   - IBAN
   - BIC
   - Bank Name

## 使用方法

1. 登录管理员账户（admin）
2. 进入"供货商/客户管理"
3. 点击"客户管理"
4. 选择一个客户，点击"查看发票"
5. 在销售发票记录中，点击"Download PDF"
6. PDF将自动下载

## 注意事项

- 不需要重启服务器
- 需要强制刷新浏览器（Ctrl + Shift + R）
- 如果用户没有设置公司信息，PDF中会显示"Company information not available"
- 如果客户信息不完整，PDF中会显示"Customer information not available"

## 测试建议

1. ✅ 测试有完整公司信息的用户
2. ✅ 测试没有公司信息的用户
3. ✅ 测试有完整客户信息的发票
4. ✅ 测试客户信息不完整的发票
5. ✅ 验证PDF内容是否正确
6. ✅ 验证PDF文件名格式

## 相关功能

### 其他PDF下载功能
- `downloadPurchaseInvoicePDF()` - 采购发票PDF下载
- `downloadWarehouseOrderPDF()` - 仓库订单PDF下载
- `exportInvoicePDF()` - 产品追溯中的发票PDF导出

### 相关API
- `/api/admin/sales-invoices/:invoiceId` - 获取销售发票详情
- `/api/admin/purchase-invoices/:invoiceId` - 获取采购发票详情
- `/api/users/profile` - 获取用户profile和公司信息

## 错误处理

### 常见错误
1. **HTTP 404**: API端点不存在
   - 原因：使用了错误的API路径
   - 解决：使用正确的 `/api/admin/sales-invoices/:invoiceId`

2. **Failed to get company info**: 公司信息获取失败
   - 原因：使用了不存在的 `/api/company-info` 端点
   - 解决：使用 `/api/users/profile` 获取公司信息

3. **Company information not available**: 公司信息不可用
   - 原因：用户没有设置公司信息
   - 解决：在系统设置中添加公司信息

## 相关文档
- `FIX_INVOICE_PDF_ENGLISH_ONLY.md` - 发票PDF纯英文版本
- `FIX_INVOICE_PDF_TAX_AND_NOTES.md` - 税务分类和备注修复
- `FIX_INVOICE_PDF_USE_PRODUCT_CONDITION.md` - 使用产品字段修复
- `INVOICE_PDF_EXPORT_FORMAT_UPDATE.md` - PDF导出格式更新
