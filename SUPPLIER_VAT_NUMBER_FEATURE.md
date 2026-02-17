# 供货商VAT号码功能添加

## 功能描述

在商户供货商管理中添加VAT号码字段，允许商户记录和管理供货商的增值税号码。

## 修改内容

### 1. 数据模型修改（Supplier.js）

添加 `vatNumber` 字段到Supplier模型：

```javascript
vatNumber: {
  type: String,
  trim: true,
  default: ''
}
```

**位置**：`StockControl-main/models/Supplier.js`

### 2. 前端表单修改（merchant.html）

#### 添加供货商表单（第1109-1180行）

在供货商代码字段后添加VAT号码输入框：

```html
<div>
  <label style="display: block; font-weight: 600; margin-bottom: 5px;">VAT号码</label>
  <input type="text" id="supplierVatNumber" 
    placeholder="例如: IE1234567X"
    style="width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px;">
  <small style="color: #6b7280;">供货商的增值税号码</small>
</div>
```

#### 保存供货商函数（第12196行）

添加VAT号码到请求数据：

```javascript
const vatNumber = document.getElementById('supplierVatNumber').value;

// 在body中添加
body: JSON.stringify({
  merchantId,
  name,
  code,
  vatNumber,  // 新增
  contactPerson,
  contactPhone,
  contactEmail,
  contactAddress,
  paymentTerms,
  notes
})
```

#### 编辑供货商函数（第12245行）

加载供货商数据时填充VAT号码：

```javascript
document.getElementById('supplierVatNumber').value = supplier.vatNumber || '';
```

#### 供货商列表显示（第12128行）

在表格中添加VAT号码列：

```html
<thead>
  <tr>
    <th>供货商名称</th>
    <th>代码</th>
    <th>VAT号码</th>  <!-- 新增 -->
    <th>联系人</th>
    <th>电话</th>
    <th>邮箱</th>
    <th>操作</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td>${supplier.name}</td>
    <td>${supplier.code}</td>
    <td>${supplier.vatNumber || '-'}</td>  <!-- 新增 -->
    <td>${supplier.contact?.person || '-'}</td>
    ...
  </tr>
</tbody>
```

### 3. 后端API修改（app.js）

#### POST /api/merchant/suppliers（第9956行）

添加VAT号码到创建逻辑：

```javascript
const { vatNumber } = req.body;

const supplier = new Supplier({
  merchantId,
  name,
  code: code.toUpperCase(),
  vatNumber: vatNumber || '',  // 新增
  contact: { ... },
  paymentTerms: paymentTerms || 'net30',
  notes: notes || '',
  isActive: true
});
```

#### PUT /api/merchant/suppliers/:id（第10020行）

添加VAT号码到更新逻辑：

```javascript
const { vatNumber } = req.body;

if (vatNumber !== undefined) supplier.vatNumber = vatNumber;
```

## 使用说明

### 添加供货商

1. 进入"入库管理 > 供货商管理"
2. 点击"+ 添加供货商"按钮
3. 填写供货商信息：
   - 供货商名称（必填）
   - 供货商代码（必填）
   - VAT号码（可选）- 例如：IE1234567X
   - 联系人、电话、邮箱、地址（可选）
   - 付款条款（默认Net 30）
   - 备注（可选）
4. 点击"保存"

### 编辑供货商

1. 在供货商列表中找到要编辑的供货商
2. 点击"✏️ 编辑"按钮
3. 修改VAT号码或其他信息
4. 点击"保存"

### 查看供货商

供货商列表会显示所有字段，包括：
- 供货商名称
- 代码
- VAT号码（如果有）
- 联系人
- 电话
- 邮箱

## VAT号码格式示例

不同国家的VAT号码格式：

- 爱尔兰：IE1234567X
- 英国：GB123456789
- 德国：DE123456789
- 法国：FR12345678901
- 西班牙：ES12345678X
- 意大利：IT12345678901

系统不强制验证VAT号码格式，允许商户输入任何格式。

## 数据库兼容性

- 新字段 `vatNumber` 有默认值空字符串
- 现有供货商记录会自动获得空的VAT号码字段
- 不需要数据迁移

## 测试步骤

1. 刷新浏览器（Ctrl + Shift + R）
2. 进入"入库管理 > 供货商管理"
3. 添加新供货商，填写VAT号码
4. 保存后在列表中查看VAT号码是否显示
5. 编辑供货商，修改VAT号码
6. 确认修改已保存

## 修改日期

2026-02-17

## 相关文件

- `StockControl-main/models/Supplier.js` - 数据模型
- `StockControl-main/app.js` - 后端API（第9956行、第10020行）
- `StockControl-main/public/merchant.html` - 前端UI和逻辑
  - 第1109-1180行：添加供货商表单
  - 第12128-12185行：供货商列表显示
  - 第12196-12240行：保存供货商函数
  - 第12245-12275行：编辑供货商函数
