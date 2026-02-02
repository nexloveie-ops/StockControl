# 销售发票详情查看功能

## 功能描述
在客户管理页面查看销售发票记录时，点击发票编号可以查看完整的发票详情。

## 实现内容

### 1. ✅ 发票编号可点击
**修改位置：** `public/prototype-working.html` - `showCustomerInvoicesModal()` 函数

**修改内容：**
- 发票编号添加点击事件
- 蓝色文字 + 下划线样式
- 点击调用 `showSalesInvoiceDetails(invoiceId)`

**代码示例：**
```javascript
<strong style="color: #3b82f6; cursor: pointer; text-decoration: underline;" 
        onclick="showSalesInvoiceDetails('${invoice._id}')">
  ${invoice.invoiceNumber}
</strong>
```

### 2. ✅ 发票详情模态框
**新增函数：** `showSalesInvoiceDetails(invoiceId)`

**显示内容：**

#### 公司信息和客户信息（并排显示）
- Company Information:
  - 公司名称
  - 地址（街道、城市、邮编、国家）
  - 电话、邮箱
  - VAT Number（税号）

- Customer Information:
  - 客户名称
  - 联系人
  - 电话、邮箱
  - VAT Number（税号）

#### 发票基本信息（4个卡片）
- Invoice Number（发票编号）
- Invoice Date（发票日期）
- Status（状态）
- Payment Status（付款状态）

#### 产品明细表格
| Description | Code | Quantity | Unit Price (Incl. VAT) | Total Price (Incl. VAT) | VAT Rate | VAT Amount |
|-------------|------|----------|------------------------|-------------------------|----------|------------|
| 产品名称 | 序列号/条码 | 数量 | 单价（含税） | 总价（含税） | 税率 | 税额 |

**Code字段逻辑：**
- 设备：显示序列号（IMEI/SN）
- 配件：显示barcode
- 如果都没有：显示 "N/A"

#### 金额汇总（右对齐）
- Subtotal (Excl. VAT): 小计（不含税）
- VAT Amount: 税额
- **Total Amount (Incl. VAT): 总金额（含税）** - 大字体、蓝色

#### 付款信息
- IBAN
- BIC/SWIFT
- Bank（银行名称）

#### 操作按钮
- 📥 Download PDF - 下载发票PDF
- Close - 关闭弹窗

## 使用流程

### 测试步骤

1. **进入客户管理**
   - 访问 http://localhost:3000/prototype-working.html
   - 点击"👥 供货商/客户管理"标签
   - 点击"🛒 客户管理"子标签

2. **查看客户发票**
   - 找到有销售记录的客户
   - 点击"📋 查看发票"按钮
   - 显示该客户的所有销售发票列表

3. **查看发票详情**
   - 点击任意发票编号（蓝色、带下划线）
   - 弹出发票详情模态框
   - 显示完整的发票信息

4. **下载PDF**
   - 在详情页面点击"📥 Download PDF"按钮
   - 在新窗口打开PDF预览
   - 可以打印或保存

## 数据结构

### API响应格式
```javascript
{
  success: true,
  data: {
    _id: "...",
    invoiceNumber: "SI-1738456789-0001",
    invoiceDate: "2026-02-02T00:00:00.000Z",
    status: "confirmed",
    paymentStatus: "pending",
    subtotal: 850.00,
    taxAmount: 195.50,
    totalAmount: 1045.50,
    currency: "EUR",
    customer: {
      _id: "...",
      name: "Customer Name",
      contact: {
        person: "John Doe",
        phone: "+353-1-234-5678",
        email: "john@example.com"
      },
      taxNumber: "IE1234567T"
    },
    items: [
      {
        product: {...},
        description: "iPhone 15 Pro",
        quantity: 1,
        unitPrice: 691.06, // 不含税
        totalPrice: 691.06, // 不含税
        unitPriceIncludingTax: 850.00, // 含税
        totalPriceIncludingTax: 850.00, // 含税
        vatRate: "VAT 23%",
        taxAmount: 158.94,
        serialNumbers: ["359123456789012"],
        barcode: "",
        code: "359123456789012"
      }
    ],
    companyInfo: {
      companyName: "My Company Ltd",
      address: {
        street: "123 Main Street",
        city: "Dublin",
        postalCode: "D01 ABC1",
        country: "Ireland"
      },
      contact: {
        phone: "+353-1-234-5678",
        email: "info@mycompany.ie"
      },
      taxNumber: "IE9876543T",
      bankDetails: {
        iban: "IE12 BOFI 9000 0112 3456 78",
        bic: "BOFIIE2D",
        bankName: "Bank of Ireland",
        accountName: "My Company Ltd"
      }
    }
  }
}
```

## 界面特点

### 设计风格
- 清晰的信息层次
- 使用卡片和颜色区分不同区域
- 响应式布局
- 专业的商业发票样式

### 颜色方案
- 蓝色（#3b82f6）：发票编号、总金额
- 绿色（#10b981）：日期信息
- 橙色（#f59e0b）：状态信息
- 粉色（#ec4899）：付款状态
- 浅蓝色背景（#f0f9ff）：付款信息区域
- 灰色背景（#f8fafc）：表头、汇总区域

### 全英文界面
所有标签和文字都是英文，符合国际商业标准。

## 预期效果

✅ **发票列表：**
- 发票编号显示为蓝色、带下划线
- 鼠标悬停显示手型光标
- 点击打开详情弹窗

✅ **详情页面：**
- 完整显示公司和客户信息
- 清晰的产品明细表格
- Code列显示序列号或条码
- 准确的金额计算和汇总
- 付款信息完整显示
- 可以直接下载PDF

✅ **用户体验：**
- 信息层次清晰
- 操作流畅
- 专业的商业外观
- 全英文界面

## 服务器状态

✅ 服务器运行中：http://localhost:3000
✅ 数据库已连接
✅ 功能已生效

---

**开发时间：** 2026-02-02
**状态：** ✅ 完成
**测试：** ⏳ 待用户测试
