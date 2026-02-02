# 销售功能修复 - 2026-02-02

## 修复内容

### 1. ✅ 销售显示价格改为批发价
**修改位置：** `public/prototype-working.html`

**修改内容：**
- 设备显示价格：从 `retailPrice` 改为 `wholesalePrice`
- 配件显示价格：从 `retailPrice` 改为 `wholesalePrice`
- 价格传递：`updateDeviceSelection()` 和 `updateAccessorySelection()` 函数使用批发价

**代码示例：**
```javascript
// 设备
€${(product.wholesalePrice || 0).toFixed(2)} / Unit

// 配件
onchange="updateAccessorySelection('${product._id}', '${product.name}', ${product.wholesalePrice || 0}, ...)"
```

### 2. ✅ Invoice中显示产品名称和Code字段
**修改位置：** 
- `app-new.js` - 后端API
- `public/prototype-working.html` - PDF生成

**修改内容：**
- Invoice表格显示：Description（产品名称）+ Code（barcode或IMEI/SN）
- 移除SKU列
- Code字段逻辑：
  - 设备：显示序列号（IMEI/SN）
  - 配件：显示barcode
  - 如果都没有：显示 "N/A"

**后端处理：**
```javascript
// 确定Code字段：优先使用序列号，否则使用barcode
const code = item.serialNumbers && item.serialNumbers.length > 0 
  ? item.serialNumbers.join(', ') 
  : (product.barcode || '');

return {
  ...
  code: code // 新增code字段
};
```

**前端显示：**
```javascript
const code = item.serialNumbers && item.serialNumbers.length > 0 
  ? item.serialNumbers.join(', ') 
  : (item.barcode || item.code || 'N/A');
```

### 3. ✅ Invoice全英文
**修改位置：** `public/prototype-working.html` - PDF生成函数

**修改内容：**
- 标题：`销售发票` → `SALES INVOICE`
- 表头：
  - `产品名称` → `Description`
  - `SKU` → `Code`
  - `数量` → `Quantity`
  - `单价（含税）` → `Unit Price (Incl. VAT)`
  - `总价（含税）` → `Total Price (Incl. VAT)`
  - `税率` → `VAT Rate`
- 客户信息：`客户信息` → `BILL TO`
- 产品明细：`产品明细` → `ITEMS`
- 金额汇总：
  - `小计（不含税）` → `Subtotal (Excl. VAT)`
  - `税额` → `VAT Amount`
  - `总金额（含税）` → `Total Amount (Incl. VAT)`
- 付款信息：`付款信息` → `PAYMENT INFORMATION`
- 按钮：
  - `打印发票` → `Print Invoice`
  - `关闭` → `Close`
- 日期格式：`zh-CN` → `en-IE`
- 公司信息标签：
  - `电话` → `Phone`
  - `邮箱` → `Email`
  - `税号` → `VAT Number`
- 客户信息标签：
  - `联系人` → `Contact`
  - `电话` → `Phone`
  - `邮箱` → `Email`
  - `税号` → `VAT Number`
- 银行信息：`银行` → `Bank`

## 测试步骤

### 1. 测试批发价显示
1. 访问 http://localhost:3000/prototype-working.html
2. 进入"👥 供货商/客户管理" → "🛒 客户管理"
3. 点击任意客户的"💰 销售"按钮
4. 查看产品价格是否显示批发价（wholesalePrice）
5. 验证设备和配件都显示批发价

### 2. 测试Code字段
1. 选择设备（全新设备或二手设备）
2. 勾选序列号
3. 选择配件并输入数量
4. 点击"✅ 确认销售"
5. 下载PDF发票
6. 验证：
   - 设备的Code列显示序列号（IMEI/SN）
   - 配件的Code列显示barcode
   - 产品名称正确显示在Description列

### 3. 测试英文Invoice
1. 下载生成的PDF发票
2. 验证所有文字都是英文：
   - 标题：SALES INVOICE
   - 表头：Description, Code, Quantity, Unit Price, Total Price, VAT Rate
   - 客户信息：BILL TO
   - 产品明细：ITEMS
   - 金额汇总：Subtotal, VAT Amount, Total Amount
   - 付款信息：PAYMENT INFORMATION
   - 按钮：Print Invoice, Close

## 数据结构

### 前端选择的产品数据
```javascript
selectedProducts = [
  {
    productId: "...",
    productName: "iPhone 15 Pro",
    quantity: 1,
    price: 850.00, // 批发价（wholesalePrice）
    serialNumbers: ["359123456789012"], // 设备有此字段
    code: "359123456789012" // 设备：序列号
  },
  {
    productId: "...",
    productName: "USB-C Cable",
    quantity: 10,
    price: 3.50, // 批发价（wholesalePrice）
    code: "1234567890123" // 配件：barcode
  }
]
```

### 后端保存的发票数据
```javascript
{
  items: [
    {
      product: ObjectId("..."),
      description: "iPhone 15 Pro",
      quantity: 1,
      unitPrice: 691.06, // 不含税价格
      totalPrice: 691.06,
      vatRate: "VAT 23%",
      taxAmount: 158.94,
      serialNumbers: ["359123456789012"],
      barcode: "",
      code: "359123456789012" // 新增字段
    }
  ]
}
```

## 预期结果

✅ **批发价显示：**
- 销售界面显示批发价（wholesalePrice）
- 发票金额基于批发价计算

✅ **Code字段：**
- 设备显示序列号（IMEI/SN）
- 配件显示barcode
- 产品名称显示在Description列

✅ **英文Invoice：**
- 所有标签和文字都是英文
- 日期格式为英文（en-IE）
- 专业的商业发票格式

## 服务器状态

✅ 服务器运行中：http://localhost:3000
✅ 数据库已连接
✅ 所有修改已生效

---

**修复时间：** 2026-02-02
**修复状态：** ✅ 完成
**测试状态：** ⏳ 待用户测试
