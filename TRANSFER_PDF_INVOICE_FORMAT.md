# 调货PDF根据类型生成不同格式 ✅

## 功能描述

根据调货类型（内部调拨 vs 公司间销售）生成不同格式的PDF文档：
- **内部调拨**：生成调货单格式
- **公司间销售**：生成正式的Invoice（发票）格式

## 实现逻辑

### 判断条件

```javascript
const isInternalTransfer = transfer.transferType === 'INTERNAL_TRANSFER';

if (!isInternalTransfer) {
  // 公司间销售 → 生成Invoice
  generateInterCompanyInvoicePDF(transfer);
} else {
  // 内部调拨 → 生成调货单
  generateInternalTransferPDF(transfer);
}
```

## 两种PDF格式对比

### 1. 内部调拨（调货单格式）

**标题**: 📦 内部调货单 / Internal Transfer

**特点**:
- 简洁的调货单格式
- 显示调出方和调入方用户名
- 不显示VAT计算
- 不显示付款信息
- 中文界面

**适用场景**:
- 同一公司内部门店之间调货
- 内部库存调配
- 不涉及销售交易

### 2. 公司间销售（Invoice格式）

**标题**: SALES INVOICE

**特点**:
- 正式的发票格式
- 显示完整的公司信息（地址、VAT号码）
- 显示VAT计算（23%）
- 显示付款信息（IBAN、BIC、银行）
- 英文界面（国际标准）

**适用场景**:
- 不同公司之间的产品销售
- 需要正式发票的交易
- 涉及VAT的销售

## 内部调拨PDF格式

### 文档结构

```
┌─────────────────────────────────────────────────────┐
│ 📦 内部调货单                TF-1738761234567-0001  │
│ Internal Transfer            状态: [已完成]         │
│                              创建时间: 2026-02-05   │
│                              完成时间: 2026-02-05   │
├─────────────────────────────────────────────────────┤
│ 调货双方                                            │
│ ┌─────────────┐      →      ┌─────────────┐       │
│ │ 调出方      │              │ 调入方      │       │
│ │MurrayRanelagh│             │MurrayDundrum│       │
│ │Murray Electronics Limited  │Murray Electronics Limited│
│ └─────────────┘              └─────────────┘       │
├─────────────────────────────────────────────────────┤
│ 产品清单                                            │
│ ┌─────────────────────────────────────────────┐   │
│ │产品名称│序列号│成色│数量│单价│小计│         │
│ ├─────────────────────────────────────────────┤   │
│ │iPhone 14│222333│A级│ 1 │€500│€500│         │
│ └─────────────────────────────────────────────┘   │
│                              总金额: €500.00       │
├─────────────────────────────────────────────────────┤
│ 备注                                                │
│ 内部调拨，用于补充库存                              │
└─────────────────────────────────────────────────────┘
```

### 关键字段

- 调货单号
- 状态徽章
- 创建时间和完成时间
- 调出方和调入方用户名
- 公司名称（如果有）
- 产品清单
- 总金额（不含VAT）
- 备注

## 公司间销售Invoice格式

### 文档结构

```
┌─────────────────────────────────────────────────────┐
│ Murray Electronics Limited  SALES INVOICE          │
│ 123 Main Street              Invoice: TF-...       │
│ Dublin D01 ABC               Date: 05/02/2026      │
│ Ireland                      Completed: 05/02/2026 │
│ Phone: +353 1 234 5678       Status: Completed     │
│ Email: info@murray.ie                              │
│ VAT Number: IE1234567                              │
├─────────────────────────────────────────────────────┤
│ BILL TO                                             │
│ ┌─────────────────────────────────────────────┐   │
│ │ Tech Solutions Ltd                          │   │
│ │ 456 High Street                             │   │
│ │ Dublin D02 XYZ                              │   │
│ │ Ireland                                     │   │
│ │ Phone: +353 1 987 6543                      │   │
│ │ Email: contact@techsolutions.ie             │   │
│ │ VAT Number: IE7654321                       │   │
│ └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│ ITEMS                                               │
│ ┌─────────────────────────────────────────────┐   │
│ │Description│Serial│Condition│Qty│Price│Total│   │
│ ├─────────────────────────────────────────────┤   │
│ │iPhone 14  │222333│A Grade  │ 1 │€600 │€600 │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│                    Subtotal (Excl. VAT): €600.00   │
│                    VAT (23%):         €138.00   │
│                    Total (Incl. VAT): €738.00   │
├─────────────────────────────────────────────────────┤
│ NOTES                                               │
│ Company-to-company sale                             │
├─────────────────────────────────────────────────────┤
│ PAYMENT INFORMATION                                 │
│ IBAN: IE29 AIBK 9311 5212 3456 78                 │
│ BIC: AIBKIE2D                                      │
│ Bank: AIB Bank                                     │
└─────────────────────────────────────────────────────┘
```

### 关键字段

**卖方信息（调出方）**:
- 公司名称
- 完整地址
- 联系电话和邮箱
- VAT号码

**买方信息（调入方）**:
- 公司名称
- 完整地址
- 联系电话和邮箱
- VAT号码

**发票信息**:
- Invoice Number（调货单号）
- Date（创建日期）
- Completed Date（完成日期）
- Status（状态）

**产品清单**:
- Description（产品名称）
- Serial Number（序列号）
- Condition（成色）
- Quantity（数量）
- Unit Price (Excl. VAT)（不含税单价）
- Total (Excl. VAT)（不含税小计）

**金额汇总**:
- Subtotal (Excl. VAT)（不含税小计）
- VAT (23%)（增值税）
- Total Amount (Incl. VAT)（含税总额）

**付款信息**:
- IBAN（国际银行账号）
- BIC（银行识别码）
- Bank Name（银行名称）

## VAT计算

### 公司间销售

```javascript
const subtotal = transfer.totalAmount;  // 不含税金额
const vatRate = 0.23;                   // 23% VAT
const vatAmount = subtotal * vatRate;   // VAT金额
const totalAmount = subtotal + vatAmount; // 含税总额
```

**示例**:
```
Subtotal (Excl. VAT): €600.00
VAT (23%):            €138.00
Total (Incl. VAT):    €738.00
```

### 内部调拨

不显示VAT计算，只显示总金额。

## 代码实现

### 主函数

```javascript
async function generateTransferPDF(transferId) {
  // 获取调货详情
  const transfer = result.data;
  const isInternalTransfer = transfer.transferType === 'INTERNAL_TRANSFER';
  
  // 根据类型生成不同格式
  if (!isInternalTransfer) {
    generateInterCompanyInvoicePDF(transfer);
  } else {
    generateInternalTransferPDF(transfer);
  }
}
```

### 公司间销售Invoice生成

```javascript
function generateInterCompanyInvoicePDF(transfer) {
  // 计算VAT
  const subtotal = transfer.totalAmount;
  const vatRate = 0.23;
  const vatAmount = subtotal * vatRate;
  const totalAmount = subtotal + vatAmount;
  
  // 生成Invoice格式HTML
  // ...
}
```

### 内部调拨调货单生成

```javascript
function generateInternalTransferPDF(transfer) {
  // 生成调货单格式HTML
  // 不计算VAT
  // 不显示付款信息
  // ...
}
```

## 样式差异

### 内部调拨

- **语言**: 中文
- **标题**: 📦 内部调货单
- **颜色**: 蓝色主题
- **信息**: 简洁，只显示必要信息

### 公司间销售

- **语言**: 英文（国际标准）
- **标题**: SALES INVOICE
- **颜色**: 专业商务风格
- **信息**: 完整，包含所有法律要求的信息

## 使用场景对比

| 场景 | 内部调拨 | 公司间销售 |
|------|---------|-----------|
| **公司关系** | 同一公司 | 不同公司 |
| **交易性质** | 内部调配 | 销售交易 |
| **VAT** | 不涉及 | 需要计算 |
| **发票** | 不需要 | 正式发票 |
| **付款** | 不需要 | 需要付款信息 |
| **语言** | 中文 | 英文 |

## 优势

### 1. 符合业务逻辑
- ✅ 内部调拨使用简洁格式
- ✅ 公司间销售使用正式发票
- ✅ 符合会计和税务要求

### 2. 专业性
- ✅ Invoice格式符合国际标准
- ✅ 包含所有必要的法律信息
- ✅ 可用于正式的商业交易

### 3. 清晰性
- ✅ 不同类型使用不同格式
- ✅ 避免混淆
- ✅ 易于识别

### 4. 完整性
- ✅ 公司间销售包含VAT计算
- ✅ 包含付款信息
- ✅ 符合发票要求

## 测试验证

### 测试内部调拨

1. **设置测试数据**
   ```
   MurrayRanelagh 和 MurrayDundrum
   都属于 Murray Electronics Limited
   ```

2. **发起调货并完成**

3. **生成PDF**
   - 打开调货详情
   - 点击"生成PDF"

4. **验证格式**
   - 标题：📦 内部调货单 ✅
   - 语言：中文 ✅
   - 无VAT计算 ✅
   - 无付款信息 ✅

### 测试公司间销售

1. **设置测试数据**
   ```
   MurrayRanelagh: Murray Electronics Limited
   MurrayDundrum: Tech Solutions Ltd
   ```

2. **发起调货并完成**

3. **生成PDF**
   - 打开调货详情
   - 点击"生成PDF"

4. **验证格式**
   - 标题：SALES INVOICE ✅
   - 语言：英文 ✅
   - 有VAT计算 ✅
   - 有付款信息 ✅
   - 完整的公司信息 ✅

## 注意事项

1. **公司信息完整性**
   - 公司间销售需要完整的公司信息
   - 包括地址、VAT号码、银行信息
   - 如果信息不完整，会显示"not available"

2. **VAT计算**
   - 固定使用23%的VAT率
   - 基于不含税金额计算
   - 显示含税和不含税金额

3. **语言选择**
   - 内部调拨：中文（内部使用）
   - 公司间销售：英文（国际标准）

4. **打印设置**
   - 建议使用A4纸张
   - 纵向打印
   - 边距：默认或最小

## 代码位置

**文件**: `StockControl-main/public/merchant.html`

**函数**:
- `generateTransferPDF()` - 主函数（约 4790 行）
- `generateInterCompanyInvoicePDF()` - Invoice生成（约 4810 行）
- `generateInternalTransferPDF()` - 调货单生成（约 4970 行）

## 相关功能

- 调货详情显示：显示完整的调货信息
- 调货管理：管理所有调货记录
- 公司信息设置：设置公司详细信息

## 相关文档

- `TRANSFER_PDF_GENERATION.md` - 调货PDF生成功能
- `COMPANY_BASED_TRANSFER_DESIGN.md` - 公司信息调货设计
- `SALES_INVOICE_DETAILS_FEATURE.md` - 销售发票功能（参考）

---
**完成日期**: 2026-02-05
**状态**: ✅ 已完成
**需要重启服务器**: 否（纯前端功能）
