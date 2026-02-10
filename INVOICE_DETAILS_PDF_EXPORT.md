# Invoice Details PDF导出功能 - 包含双方公司完整信息

## 功能描述
在 `prototype-working.html` 的库存报表（Financial Reports）中的 Invoice Details 表格，为每一个订单添加了导出PDF的功能，PDF包含双方公司的完整信息（不包括联系人）。

## PDF内容特点

### ✅ 包含的信息
- 双方公司名称
- 双方公司地址（街道、城市、州、邮编、国家）
- 双方公司VAT号码
- 公司联系方式（电话、邮箱）
- 银行信息（IBAN、BIC、银行名称）
- 产品明细
- 价格汇总

### ❌ 不包含的信息
- 联系人姓名

## 销售发票PDF格式

```
SALES INVOICE
SI-XXXXXX

FROM:                          TO:
[我方公司名称]                  [客户公司名称]
[街道地址]                      [街道地址]
[城市, 州, 邮编]                [城市, 州, 邮编]
[国家]                          [国家]
VAT: [VAT号]                    VAT: [VAT号]
Tel: [电话]
Email: [邮箱]

Invoice Date: XX/XX/XXXX
Payment Method: XXXX

Product                 Qty    Price      Total
----------------------------------------
[产品列表]

                        Subtotal:  €XXX.XX
                        VAT:       €XXX.XX
                        Total:     €XXX.XX

Bank Details:
IBAN: XXXX
BIC: XXXX
Bank: XXXX
```

## 采购发票PDF格式

```
PURCHASE INVOICE
PI-XXXXXX

FROM:                          TO:
[供应商公司名称]                [我方公司名称]
[街道地址]                      [街道地址]
[城市, 州, 邮编]                [城市, 州, 邮编]
[国家]                          [国家]
VAT: [VAT号]                    VAT: [VAT号]
                                Tel: [电话]
                                Email: [邮箱]

Invoice Date: XX/XX/XXXX
Due Date: XX/XX/XXXX
Currency: EUR

Product                 Qty    Unit Price  VAT    Total
--------------------------------------------------------
[产品列表]

                        Subtotal (excl. VAT):  €XXX.XX
                        VAT Amount:            €XXX.XX
                        Total (incl. VAT):     €XXX.XX

Payment Details:
IBAN: XXXX
BIC: XXXX
Bank: XXXX
```

## 修改文件
- `StockControl-main/public/prototype-working.html`
  - 第3210-3280行：Invoice Details表格添加Actions列
  - 第7937-8200行：PDF生成函数

## 技术实现

### API调用
```javascript
// 并行获取发票详情和公司信息
const [invoiceResponse, companyResponse] = await Promise.all([
  fetch(`${API_BASE}/sales-invoices/${invoiceId}`),
  fetch(`${API_BASE}/admin/company-info`)
]);
```

### 数据来源
- **发票数据**：从各自的API获取（sales-invoices, purchase-orders）
- **公司信息**：从 `/api/admin/company-info` 获取
- **CompanyInfo模型**包含：
  - companyName
  - address (street, city, state, postalCode, country)
  - taxNumber
  - contact (phone, email, website)
  - bankDetails (iban, bic, bankName, accountName)

## 测试步骤

1. **强制刷新浏览器** (`Ctrl + Shift + R`)
2. **进入库存报表**
3. **生成报表**（选择日期范围）
4. **点击PDF按钮**
5. **验证PDF内容**：
   - ✅ 双方公司名称正确
   - ✅ 双方公司地址完整
   - ✅ VAT号码显示
   - ✅ 联系方式显示（电话、邮箱）
   - ✅ 银行信息显示（如果有）
   - ✅ 产品明细正确
   - ✅ 价格计算正确
   - ❌ 没有联系人姓名

## 修复日期
2026-02-10

## 状态
✅ 已完成 - PDF包含双方公司完整信息，不包括联系人
