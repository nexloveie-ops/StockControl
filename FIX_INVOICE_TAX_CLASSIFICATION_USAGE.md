# Invoice税务分类使用修复 ✅

## 问题描述

序列号111222的产品在公司间销售时，生成的Invoice使用了23%的VAT，而不是产品实际的税务分类（Margin VAT）。

## 问题分析

### 问题位置

在调货完成后生成InterCompanySalesInvoice时，所有产品的`taxClassification`都被硬编码为`'VAT_23'`。

**问题代码**：
```javascript
items: transfer.items.map(item => ({
  productName: item.productName,
  // ... 其他字段
  taxClassification: 'VAT_23'  // ❌ 硬编码，没有使用产品实际的税务分类
}))
```

### 影响

1. **Margin VAT产品**：应该使用差价征税，但被当作标准VAT 23%
2. **其他税率产品**：VAT_0、VAT_13.5等也都被当作VAT 23%
3. **税额计算错误**：导致Invoice中的VAT金额不正确

## 解决方案

使用产品实际的税务分类，而不是硬编码。

**文件**: `app.js`

**修复代码**：
```javascript
items: transfer.items.map(item => ({
  productName: item.productName,
  brand: item.brand,
  model: item.model,
  category: item.category,
  serialNumber: item.serialNumber,
  color: item.color,
  condition: item.condition,
  quantity: item.quantity,
  unitPrice: item.transferPrice,
  totalPrice: item.quantity * item.transferPrice,
  taxClassification: item.taxClassification || 'VAT_23'  // ✅ 使用产品实际的税务分类
}))
```

## 关于确认对话框中的VAT显示

### 当前行为

在提交调货申请后的确认对话框中，VAT计算使用固定的23%税率：

```javascript
const vatRate = 0.23;
const vatAmount = isInternalTransfer ? 0 : subtotal * vatRate;
const totalAmount = subtotal + vatAmount;
```

### 为什么这样设计？

**确认对话框阶段**：
- 这是一个**预估**，用于让用户了解大概的金额
- 此时还没有完成调货，没有生成正式的Invoice
- 显示简化的计算，避免复杂性

**实际Invoice阶段**：
- 调货完成后生成正式的Invoice
- 使用每个产品的实际税务分类
- 计算准确的VAT金额

### 改进建议

如果需要在确认对话框中显示更准确的VAT，可以：

1. **按产品分别计算VAT**：
```javascript
let totalVAT = 0;
items.forEach(item => {
  const price = isInternalTransfer ? item.costPrice : item.wholesalePrice;
  const itemTotal = price * item.quantity;
  
  // 根据税务分类计算VAT
  if (item.taxClassification === 'VAT_23') {
    totalVAT += itemTotal * 0.23;
  } else if (item.taxClassification === 'Margin VAT') {
    // Margin VAT需要知道成本价才能计算
    const margin = itemTotal - (item.costPrice * item.quantity);
    totalVAT += margin * 0.23 / 1.23;
  }
  // ... 其他税率
});
```

2. **显示说明**：
```
注意：此为预估金额，实际VAT将根据产品税务分类计算
```

## 税务分类说明

### VAT_23（标准税率）

**适用**：新品、标准商品

**计算**：
```
Price (Excl. VAT): €600.00
VAT (23%):         €138.00
Total (Incl. VAT): €738.00
```

### Margin VAT（差价征税）

**适用**：二手商品

**计算**：
```
Selling Price: €600.00
Cost Price:    €400.00
Margin:        €200.00
VAT = €200.00 × 23% / 123% = €37.40
```

### VAT_0（免税）

**适用**：出口、特定商品

**计算**：
```
Price: €600.00
VAT:   €0.00
Total: €600.00
```

### VAT_13.5（降低税率）

**适用**：特定服务、商品

**计算**：
```
Price (Excl. VAT): €600.00
VAT (13.5%):       €81.00
Total (Incl. VAT): €681.00
```

## 数据流程

### 1. 产品创建

```
管理员创建产品
└─ 设置税务分类
   └─ VAT_23 / Margin VAT / VAT_0 / VAT_13.5
```

### 2. 调货申请

```
用户提交调货申请
└─ 保存产品信息
   └─ 包含 taxClassification ✅
```

### 3. 确认对话框

```
显示预估金额
└─ 使用简化的23% VAT计算
   └─ 仅用于预估
```

### 4. 调货完成

```
生成 InterCompanySalesInvoice
└─ 使用产品实际的 taxClassification ✅
   └─ 计算准确的VAT
```

### 5. Invoice PDF

```
生成PDF
└─ 显示每个产品的税务分类
   └─ 显示准确的VAT金额
```

## 示例场景

### 场景：混合税务分类的调货

**产品列表**：
```
1. iPhone 14 (新品)
   - 税务分类: VAT_23
   - 批发价: €600.00
   - VAT: €138.00

2. iPhone 13 (二手)
   - 税务分类: Margin VAT
   - 批发价: €500.00
   - 成本价: €400.00
   - Margin: €100.00
   - VAT: €18.70
```

**确认对话框（预估）**：
```
小计: €1,100.00
VAT (23%): €253.00  ← 简化计算
总计: €1,353.00
```

**实际Invoice**：
```
小计: €1,100.00
VAT: €156.70  ← 准确计算（€138.00 + €18.70）
总计: €1,256.70
```

## 测试验证

### 测试步骤

1. **准备测试数据**
   ```
   产品1: iPhone 14 (新品)
   税务分类: VAT_23
   序列号: 222333
   
   产品2: iPhone 13 (二手)
   税务分类: Margin VAT
   序列号: 111222
   ```

2. **发起公司间销售调货**
   ```
   调出方: MurrayRanelagh (Murray Electronics)
   调入方: TestMerchant (Test Company)
   ```

3. **提交调货申请**
   - 查看确认对话框
   - 注意：这里显示的是预估金额

4. **完成调货**
   - 审批
   - 确认收货

5. **查看生成的Invoice**
   ```
   检查 InterCompanySalesInvoice 记录
   验证每个产品的 taxClassification
   ```

6. **生成Invoice PDF**
   - 打开调货详情
   - 点击"生成PDF"
   - 验证税务分类显示

### 预期结果

**Invoice记录**：
```json
{
  "invoiceNumber": "INV-20260205-001",
  "items": [
    {
      "productName": "iPhone 14",
      "serialNumber": "222333",
      "taxClassification": "VAT_23",  // ✅ 正确
      "unitPrice": 600.00
    },
    {
      "productName": "iPhone 13",
      "serialNumber": "111222",
      "taxClassification": "Margin VAT",  // ✅ 正确
      "unitPrice": 500.00
    }
  ]
}
```

## 注意事项

### 1. 确认对话框是预估

确认对话框中的VAT金额是**预估值**，使用简化的23%计算。实际金额在生成Invoice时计算。

### 2. Invoice是准确值

生成的InterCompanySalesInvoice使用每个产品的实际税务分类，计算准确的VAT。

### 3. 历史数据

已经生成的Invoice可能使用了错误的税务分类（都是VAT_23），需要手动修正或重新生成。

### 4. Margin VAT计算

Margin VAT的准确计算需要知道成本价，这在确认对话框阶段可能不可用。

## 代码位置

**文件**: `StockControl-main/app.js`

**API**: `POST /api/merchant/inventory/transfer/complete`

**行数**: 约 6370

**修改内容**: Invoice items的taxClassification字段

## 相关功能

- 调货申请：保存税务分类
- 调货完成：生成Invoice
- Invoice生成：使用税务分类
- PDF生成：显示税务信息

## 相关文档

- `FIX_TRANSFER_TAX_CLASSIFICATION.md` - 调货税务分类继承
- `TRANSFER_PDF_INVOICE_FORMAT.md` - Invoice PDF格式
- `FIX_TAX_CLASSIFICATION_LOGIC.md` - 税务分类逻辑

---
**完成日期**: 2026-02-05
**状态**: ✅ 已修复
**需要重启服务器**: 是（已重启）
