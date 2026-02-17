# 采购发票PDF增强 - 供货商详细信息

## 功能描述

在采购发票PDF中显示完整的供货商信息，包括VAT号码、联系电话、邮箱和地址。

## 修改内容

### PDF生成API修改（app.js 第8729行）

#### 1. 获取完整供货商信息

修改供货商信息获取逻辑，从Supplier表查询完整信息：

```javascript
// 获取供货商信息
let supplierInfo = {
  name: '未知供货商',
  vatNumber: '',
  phone: '',
  email: '',
  address: ''
};

// 从MerchantInventory的notes提取供货商ID
if (merchantProducts.length > 0 && merchantProducts[0].notes) {
  const supplierMatch = merchantProducts[0].notes.match(/供货商ID:\s*([^\s|]+)/i);
  if (supplierMatch) {
    const supplierId = supplierMatch[1];
    const supplier = await Supplier.findById(supplierId).lean();
    if (supplier) {
      supplierInfo.name = supplier.name;
      supplierInfo.vatNumber = supplier.vatNumber || '';
      supplierInfo.phone = supplier.contact?.phone || '';
      supplierInfo.email = supplier.contact?.email || '';
      supplierInfo.address = supplier.contact?.address || '';
    }
  }
}
```

#### 2. PDF布局优化 - 两栏显示

采用左右两栏布局，分别显示发票信息和供货商信息：

```javascript
// 发票信息和供货商信息并排显示
const leftColumn = 50;
const rightColumn = 320;
let currentY = doc.y;

// 左侧：发票信息
doc.fontSize(10).font('Helvetica-Bold');
doc.text('Invoice Information', leftColumn, currentY);
doc.font('Helvetica').fontSize(9);
doc.text(`Date: ${new Date(allProducts[0].createdAt).toLocaleDateString('en-US')}`, leftColumn, currentY + 15);
doc.text(`Invoice #: ${invoiceNumber}`, leftColumn, currentY + 30);

// 右侧：供货商信息
doc.fontSize(10).font('Helvetica-Bold');
doc.text('Supplier Information', rightColumn, currentY);
doc.font('Helvetica').fontSize(9);

let supplierY = currentY + 15;
doc.text(`Name: ${supplierInfo.name}`, rightColumn, supplierY);

if (supplierInfo.vatNumber) {
  supplierY += 15;
  doc.text(`VAT #: ${supplierInfo.vatNumber}`, rightColumn, supplierY);
}

if (supplierInfo.phone) {
  supplierY += 15;
  doc.text(`Phone: ${supplierInfo.phone}`, rightColumn, supplierY);
}

if (supplierInfo.email) {
  supplierY += 15;
  doc.text(`Email: ${supplierInfo.email}`, rightColumn, supplierY);
}

if (supplierInfo.address) {
  supplierY += 15;
  doc.text(`Address: ${supplierInfo.address}`, rightColumn, supplierY, { width: 230 });
}

// 移动到供货商信息下方
doc.y = Math.max(currentY + 60, supplierY + 20);
doc.moveDown(1);
```

## PDF布局

### 标题部分
```
                    PURCHASE INVOICE
                        IS-010
```

### 信息部分（两栏）

**左栏 - Invoice Information**：
- Date: 2/17/2026
- Invoice #: IS-010

**右栏 - Supplier Information**：
- Name: ABC Electronics Ltd
- VAT #: IE1234567X
- Phone: +353 1 234 5678
- Email: sales@abcelectronics.ie
- Address: 123 Main Street, Dublin, Ireland

### 产品表格
```
Product                          Qty    Price      Total
----------------------------------------------------------------
iPhone Clear Case (iPhone 14...  2     €10.00     €20.00
Samsung Galaxy A53...            1     €250.00    €250.00
...
----------------------------------------------------------------
Subtotal:                                         €270.00
Tax:                                              €50.00
Total:                                            €320.00
```

## 显示规则

1. **必填字段**：
   - 供货商名称（始终显示）

2. **可选字段**（有值才显示）：
   - VAT号码
   - 联系电话
   - 邮箱地址
   - 详细地址

3. **布局自适应**：
   - 如果供货商信息较多，PDF会自动调整产品表格的起始位置
   - 地址字段支持自动换行（最大宽度230像素）

## 数据来源

1. **供货商ID提取**：
   - 从MerchantInventory的notes字段提取
   - 格式：`"发票号: IS-010 | 供货商ID: 60a1b2c3d4e5f6g7h8i9j0k1"`

2. **供货商信息查询**：
   - 使用提取的供货商ID查询Supplier表
   - 获取完整的供货商信息（名称、VAT号码、联系方式等）

3. **兼容性处理**：
   - 如果找不到供货商，显示"未知供货商"
   - 如果某些字段为空，不显示该行

## 测试步骤

1. 确保供货商已添加完整信息（包括VAT号码、电话、邮箱、地址）
2. 在"入库管理 > 产品入库 > 手动录入"中添加产品
3. 选择供货商并填写发票号
4. 确认入库
5. 进入"报表中心 > 采购报表"
6. 点击发票号查看详情
7. 点击"📥 下载PDF"按钮
8. 打开PDF文件，检查供货商信息是否完整显示

## 预期结果

PDF应该显示：
- ✅ 供货商名称
- ✅ VAT号码（如果有）
- ✅ 联系电话（如果有）
- ✅ 邮箱地址（如果有）
- ✅ 详细地址（如果有）
- ✅ 所有产品明细
- ✅ 正确的金额计算

## 修改日期

2026-02-17

## 相关文件

- `StockControl-main/app.js` - PDF生成API（第8729-8860行）
- `StockControl-main/models/Supplier.js` - 供货商模型
- `StockControl-main/models/MerchantInventory.js` - 商户库存模型

## 注意事项

1. **供货商信息完整性**：
   - 建议在添加供货商时填写完整信息
   - VAT号码、电话、邮箱、地址都是可选的，但填写后会在PDF中显示

2. **地址格式**：
   - 地址字段支持多行文本
   - PDF会自动换行显示长地址

3. **PDF文件命名**：
   - 格式：`invoice-{发票号}.pdf`
   - 例如：`invoice-IS-010.pdf`

4. **字体和样式**：
   - 标题：Helvetica-Bold 22pt
   - 小标题：Helvetica-Bold 10pt
   - 正文：Helvetica 9pt
   - 布局：A4纸张，50像素边距
