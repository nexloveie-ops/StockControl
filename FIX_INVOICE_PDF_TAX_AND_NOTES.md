# 发票PDF导出修复 - 税务分类和备注

## 修复时间
2026-02-11

## 修复的问题

### 1. ✅ 税务分类字段错误
**问题**: PDF显示的税务分类与产品实际税务分类不符

**原因**: 
- 代码使用了 `item.taxClassification` 字段
- 但数据库中实际使用的是 `item.vatRate` 字段

**修复**:
```javascript
// 错误的代码
const taxClassification = item.taxClassification || 'Standard VAT';

// 正确的代码
const vatRate = item.vatRate || 'VAT 23%';
```

**数据库字段**:
- 采购发票: `items[].vatRate` (例如: "VAT 0%", "VAT 23%", "VAT 13.5%")
- 销售发票: `items[].vatRate` (例如: "VAT 0%", "VAT 23%", "VAT 13.5%")

### 2. ✅ Total Tax不显示
**问题**: 总计部分没有显示税额

**原因**: 
- 只有当 `totalTax > 0` 时才显示
- 税额计算不正确

**修复**:
```javascript
// 始终显示Subtotal和Total Tax
doc.text('Subtotal:', 130, yPos);
doc.text(`€${subtotalAmount.toFixed(2)}`, 188, yPos, { align: 'right' });

yPos += 7;
doc.text('Total Tax:', 130, yPos);
doc.text(`€${totalTax.toFixed(2)}`, 188, yPos, { align: 'right' });
```

**税额计算逻辑**:
```javascript
let itemTax = item.taxAmount || 0;
if (itemTax === 0 && totalPrice > 0) {
  // 如果没有taxAmount，根据vatRate计算
  if (vatRate === 'VAT 23%') {
    itemTax = totalPrice * 0.23 / 1.23;
  } else if (vatRate === 'VAT 13.5%') {
    itemTax = totalPrice * 0.135 / 1.135;
  } else if (vatRate === 'VAT 0%') {
    itemTax = 0;
  }
}

totalTax += itemTax;
subtotalAmount += (totalPrice - itemTax);
```

### 3. ✅ Notes乱码问题
**问题**: 备注中的中文字符显示为乱码

**原因**: jsPDF不支持中文字符

**修复**:
```javascript
// 过滤掉非ASCII字符，只保留英文
const notesEnglish = invoice.notes.replace(/[^\x00-\x7F]/g, '');
if (notesEnglish.trim()) {
  const notesLines = doc.splitTextToSize(notesEnglish, 170);
  doc.text(notesLines, 20, yPos);
} else {
  doc.text('(Notes contain non-English characters)', 20, yPos);
}
```

## 修改文件
- `StockControl-main/public/prototype-working.html` - `exportInvoicePDF()` 函数

## PDF格式示例

```
                    PURCHASE INVOICE
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Invoice Number: SI-3688
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
│ IPHONE15   │ Brand New  │ VAT 0%   │  1  │ €445 │ €445 │
│ PLUS       │            │          │     │      │      │
│ SN: 352459164934616                                    │
├────────────────────────────────────────────────────────┤
│ IPAD11     │ PRE-OWNED  │ VAT 0%   │  1  │ €315 │ €315 │
│ SN: CDFXDES3                                           │
└────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                                    Subtotal:    €760.00
                                    Total Tax:     €0.00
                                    
                                    TOTAL:       €760.00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Notes:
This is a sample note in English only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                        Page 1 of 1
              Generated: 11/02/2026, 15:30:00
```

## VAT Rate说明

### 常见税率
- `VAT 23%` - 标准增值税率（爱尔兰标准税率）
- `VAT 13.5%` - 低税率（某些商品和服务）
- `VAT 0%` - 零税率（出口、某些食品等）
- `Margin VAT` - 差价增值税（二手商品）

### 税额计算公式

**含税价格转换为不含税价格**:
- VAT 23%: 不含税价格 = 含税价格 / 1.23
- VAT 13.5%: 不含税价格 = 含税价格 / 1.135
- VAT 0%: 不含税价格 = 含税价格

**税额计算**:
- VAT 23%: 税额 = 含税价格 × 0.23 / 1.23
- VAT 13.5%: 税额 = 含税价格 × 0.135 / 1.135
- VAT 0%: 税额 = 0

## 总计部分说明

### 显示内容
1. **Subtotal（小计）**: 所有产品的不含税价格总和
2. **Total Tax（总税额）**: 所有产品的税额总和
3. **TOTAL（总计）**: 含税总价 = Subtotal + Total Tax

### 计算示例
```
产品1: €123.00 (含税), VAT 23%
  - 不含税: €100.00
  - 税额: €23.00

产品2: €113.50 (含税), VAT 13.5%
  - 不含税: €100.00
  - 税额: €13.50

总计:
  - Subtotal: €200.00
  - Total Tax: €36.50
  - TOTAL: €236.50
```

## 备注处理说明

### 英文备注
如果备注只包含英文字符，正常显示：
```
Notes:
This is a sample note in English.
```

### 中文备注
如果备注包含中文字符，显示提示信息：
```
Notes:
(Notes contain non-English characters)
```

### 建议
- 在系统中使用英文备注，以确保PDF正确显示
- 如果需要中文备注，可以在系统内部查看，但PDF导出时会被过滤

## 使用方法

1. 在产品追溯页面（prototype-working.html）
2. 点击历史记录时间线中的发票编号
3. 在发票详情对话框中点击"📄 导出PDF"
4. PDF将正确显示税率和税额

## 注意事项

- 不需要重启服务器
- 需要强制刷新浏览器（Ctrl + Shift + R）
- 税率字段使用 `vatRate` 而不是 `taxClassification`
- 总税额始终显示，即使为€0.00
- 备注只显示英文字符

## 测试建议

1. ✅ 测试VAT 0%的发票（税额应为€0.00）
2. ✅ 测试VAT 23%的发票（税额应正确计算）
3. ✅ 测试VAT 13.5%的发票（税额应正确计算）
4. ✅ 验证Subtotal + Total Tax = TOTAL
5. ✅ 测试包含中文备注的发票（应显示提示信息）
6. ✅ 测试包含英文备注的发票（应正常显示）

## 相关文件

- `StockControl-main/public/prototype-working.html` - 前端实现
- `StockControl-main/check-invoice-tax-fields.js` - 数据库字段验证脚本
- `StockControl-main/FIX_INVOICE_PDF_ENGLISH_ONLY.md` - 之前的修复文档
