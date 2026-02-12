# 发票PDF导出修复 - 纯英文版本

## 修复时间
2026-02-11

## 修复内容

### 1. PDF纯英文显示
- ✅ 移除所有中文标题和标签
- ✅ 所有文本使用英文
- ✅ 文件名使用英文格式：`PURCHASE_INVOICE_SI-XXX_timestamp.pdf`

### 2. 修复Supplier Address显示为"Object Object"
**问题**: 当address是对象时，直接显示会变成"[object Object]"

**解决方案**:
```javascript
const address = typeof invoice.supplier.contact.address === 'object' 
  ? `${invoice.supplier.contact.address.street || ''} ${invoice.supplier.contact.address.city || ''} ${invoice.supplier.contact.address.postalCode || ''}`.trim()
  : invoice.supplier.contact.address;
doc.text(`Address: ${address || 'N/A'}`, 20, yPos);
```

### 3. Items Detail添加成色和税务分类
**新增列**:
- `Condition` - 产品成色（Brand New, Used, Refurbished等）
- `Tax` - 税务分类（Standard VAT, Margin VAT, VAT 0%等）

**表头布局**:
```
Product | Condition | Tax | Qty | Unit Price | Total | Serial No.
```

### 4. 总计中添加总税额
**新增显示**:
- `Subtotal` - 小计（不含税）
- `Total Tax` - 总税额
- `TOTAL` - 总计（含税）

**计算逻辑**:
```javascript
let totalTax = 0;
invoice.items.forEach(item => {
  totalTax += item.taxAmount || 0;
});

const subtotal = invoice.totalAmount - totalTax;
```

## 修改文件
- `StockControl-main/public/prototype-working.html` - `exportInvoicePDF()` 函数

## PDF格式示例

```
                    PURCHASE INVOICE
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Invoice Number: SI-1770073268199-0003
Date: 11/02/2026
Status: Completed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Supplier Information:
Name: ABC Electronics Ltd
Phone: +353 1 234 5678
Email: info@abc.ie
Address: 123 Main Street Dublin D01 ABC1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Items:
┌────────────────────────────────────────────────────────┐
│ Product    │ Condition  │ Tax      │ Qty │ Unit │ Total│
├────────────────────────────────────────────────────────┤
│ IPHONE11   │ Brand New  │ Std VAT  │  1  │ €195 │ €195 │
│ 64GB Black │            │          │     │      │      │
│ SN: 352928114188457                                    │
├────────────────────────────────────────────────────────┤
│ IPAD11     │ Brand New  │ Std VAT  │  1  │ €315 │ €315 │
│ SN: 358239124217086                                    │
└────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                                    Subtotal:    €414.63
                                    Total Tax:    €95.37
                                    
                                    TOTAL:       €510.00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                        Page 1 of 1
              Generated: 11/02/2026, 14:30:00
```

## 字段说明

### Condition（成色）
- Brand New - 全新
- Used - 二手
- Refurbished - 翻新
- Excellent - 优秀
- Good - 良好
- Fair - 一般

### Tax Classification（税务分类）
- Standard VAT - 标准增值税（23%）
- Margin VAT - 差价增值税
- VAT 0% - 零税率
- VAT 13.5% - 低税率

## 使用方法

1. 在产品追溯页面（prototype-working.html）
2. 点击历史记录时间线中的发票编号
3. 在发票详情对话框中点击"📄 导出PDF"
4. PDF将自动下载，纯英文格式

## 注意事项

- 不需要重启服务器
- 需要强制刷新浏览器（Ctrl + Shift + R）
- 如果某些字段为空，会显示默认值（如"Brand New"、"Standard VAT"）
- 文件名格式：`PURCHASE_INVOICE_SI-XXX_timestamp.pdf`

## 测试建议

1. 测试采购发票PDF导出（检查Supplier Address格式）
2. 测试销售发票PDF导出
3. 测试调货单PDF导出
4. 验证Condition和Tax列显示正确
5. 验证总税额计算正确
6. 验证所有文本为英文

## 相关文件

- `StockControl-main/public/prototype-working.html` - 前端实现
- `StockControl-main/INVOICE_PDF_EXPORT_FORMAT_UPDATE.md` - 之前的更新文档
