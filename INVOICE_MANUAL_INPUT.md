# 发票信息手动输入功能

## 功能说明
当图片识别无法识别发票号或日期时（显示"未识别"），系统会自动将这些字段转换为可编辑的输入框，允许用户手动填写。

## 数据映射

### 后端返回的数据结构（OpenAI）
```json
{
  "supplier": {
    "name": "供应商名称",
    "email": "邮箱",
    "phone": "电话",
    "address": "地址"
  },
  "invoice": {
    "number": "INV-2026-123456",
    "date": "2026-02-02",
    "dueDate": "2026-03-04",
    "currency": "EUR"
  },
  "products": [...],
  "totals": {
    "subtotal": 1000.00,
    "tax": 230.00,
    "total": 1230.00
  }
}
```

### 前端数据映射
系统会自动将后端返回的数据映射到前端使用的字段：
- `invoice.number` → `invoiceNumber`
- `invoice.date` → `invoiceDate`
- `invoice.currency` → `currency`
- `totals.total` → `totalAmount`

## 实现细节

### 1. 自动检测未识别字段
系统会检查以下字段：
- **供应商名称** (`supplier.name`)
- **发票号** (`invoiceNumber` 或 `invoice.number`)
- **发票日期** (`invoiceDate` 或 `invoice.date`)

### 2. 动态显示逻辑
- 如果字段值为空或等于"未识别"，显示输入框
- 如果字段有有效值，显示文本

### 3. 输入框类型
- **供应商名称**: 文本输入框
- **发票号**: 文本输入框
- **发票日期**: 日期选择器（type="date"）

### 4. 数据更新
用户在输入框中填写的数据会实时更新到 `window.recognizedData` 对象中，确认入库时会使用这些手动填写的值。

## 使用流程

1. 上传发票图片进行识别
2. 系统显示识别结果
3. 如果发票号或日期显示为输入框，手动填写
4. 填写完成后点击"确认入库"
5. 系统使用手动填写的值创建采购记录

## 技术实现

### 数据映射代码
```javascript
function displayRecognitionResult(data) {
  // 映射后端返回的 invoice 对象到前端使用的字段
  if (data.invoice) {
    data.invoiceNumber = data.invoice.number || data.invoiceNumber;
    data.invoiceDate = data.invoice.date || data.invoiceDate;
    data.currency = data.invoice.currency || data.currency;
  }
  
  // 映射 totals 对象
  if (data.totals) {
    data.totalAmount = data.totals.total || data.totalAmount;
  }
  
  // ... 显示逻辑
}
```

### 更新发票字段
```javascript
function updateInvoiceField(field, value) {
  if (!window.recognizedData) return;
  
  if (field === 'supplierName') {
    if (!window.recognizedData.supplier) {
      window.recognizedData.supplier = {};
    }
    window.recognizedData.supplier.name = value;
  } else if (field === 'invoiceNumber') {
    window.recognizedData.invoiceNumber = value;
  } else if (field === 'invoiceDate') {
    window.recognizedData.invoiceDate = value;
  }
}
```

### HTML 模板
```html
<div style="margin-bottom: 10px;">
  <strong>发票号:</strong> 
  ${!data.invoiceNumber || data.invoiceNumber === '未识别' ? 
    `<input type="text" id="invoiceNumberInput" placeholder="请输入发票号" 
            style="width: 70%; padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; margin-left: 5px;"
            onchange="updateInvoiceField('invoiceNumber', this.value)">` : 
    data.invoiceNumber}
</div>
```

## 修改文件
- `StockControl-main/public/prototype-working.html`

## 更新日期
2026-02-02

## 修正说明
- 修正了数据映射问题，现在正确使用OpenAI返回的 `invoice.number` 和 `invoice.date` 字段
- 添加了自动数据映射逻辑，将后端结构转换为前端使用的扁平结构
- 保持了手动输入功能，当识别失败时可以手动填写

