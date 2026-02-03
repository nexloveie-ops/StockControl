# 修复仓库订单 Margin VAT 税额计算

## 日期: 2026-02-02

## 问题
仓库订单的税额计算错误：
- Margin VAT 产品的税额被计算为 0 或使用 VAT 23% 计算
- 订单详情中显示的税分类不正确

## 示例
订单 WO-20260202-9112:
- 产品: galaxy A53
- 实际税分类: Margin VAT (VAT 0%)
- 订单中显示: VAT 23%
- 税额: €0 或 €46.75 (错误)
- 应该是: €5.61 (正确)

## 原因分析

### 1. 税分类判断错误
```javascript
// ❌ 错误的代码
const taxClassification = product.taxClassification || 'VAT_23';
```

问题：
- 产品的 `taxClassification` 字段是 undefined
- 默认使用 'VAT_23'，导致 Margin VAT 产品被错误分类

### 2. Margin VAT 计算未实现
```javascript
// ❌ 错误的代码
else if (taxClassification === 'MARGIN_VAT_0') {
  // Margin VAT 需要知道成本价，这里简化处理
  itemTaxAmount = 0;
}
```

问题：
- Margin VAT 的税额被设置为 0
- 没有使用正确的公式计算

## 正确的 Margin VAT 计算公式

### 公式
```
利润 = 卖价 - 成本价
税额 = 利润 × 23/123
小计 = 卖价 - 税额
```

### 示例计算
```
产品: galaxy A53
数量: 1
卖价 (批发价): €125
成本价: €95

利润 = €125 - €95 = €30
税额 = €30 × 23/123 = €5.61
小计 = €125 - €5.61 = €119.39
```

## 解决方案

### 1. 修复税分类判断
从 `vatRate` 字段获取税务分类：

```javascript
// ✅ 正确的代码
let taxClassification = 'VAT_23';
if (product.vatRate === 'VAT 23%') {
  taxClassification = 'VAT_23';
} else if (product.vatRate === 'VAT 13.5%' || product.vatRate === 'Service VAT 13.5%') {
  taxClassification = 'SERVICE_VAT_13_5';
} else if (product.vatRate === 'VAT 0%' || product.vatRate === 'Margin VAT') {
  taxClassification = 'MARGIN_VAT_0';
}
```

### 2. 实现 Margin VAT 计算
```javascript
// ✅ 正确的代码
else if (taxClassification === 'MARGIN_VAT_0') {
  // Margin VAT: 税额 = (卖价 - 成本价) × 23/123
  const costPrice = product.costPrice || 0;
  const margin = itemTotal - (costPrice * item.quantity);
  itemTaxAmount = margin * (23 / 123);
  itemSubtotal = itemTotal - itemTaxAmount;
}
```

### 3. 完整的税额计算逻辑
```javascript
let itemTaxAmount = 0;
let itemSubtotal = 0;

if (taxClassification === 'VAT_23') {
  // VAT 23%: 税额 = 总价 × 23/123
  itemTaxAmount = itemTotal * (23 / 123);
  itemSubtotal = itemTotal - itemTaxAmount;
} else if (taxClassification === 'SERVICE_VAT_13_5') {
  // Service VAT 13.5%: 税额 = 总价 × 13.5/113.5
  itemTaxAmount = itemTotal * (13.5 / 113.5);
  itemSubtotal = itemTotal - itemTaxAmount;
} else if (taxClassification === 'MARGIN_VAT_0') {
  // Margin VAT: 税额 = (卖价 - 成本价) × 23/123
  const costPrice = product.costPrice || 0;
  const margin = itemTotal - (costPrice * item.quantity);
  itemTaxAmount = margin * (23 / 123);
  itemSubtotal = itemTotal - itemTaxAmount;
} else {
  // VAT_0 或其他
  itemTaxAmount = 0;
  itemSubtotal = itemTotal;
}
```

## 修复现有订单

### 运行修复脚本
```bash
node fix-warehouse-order-tax.js
```

### 修复结果
```
=== 处理订单: WO-20260202-1061 ===
  Margin VAT 计算:
  - 卖价: €250
  - 成本: €190
  - 利润: €60.00
  - 税额: €11.22
  galaxy A53:
    旧税分类: VAT_23 → 新税分类: MARGIN_VAT_0
    旧税额: €46.75 → 新税额: €11.22
✅ 订单已更新

=== 处理订单: WO-20260202-7228 ===
  Margin VAT 计算:
  - 卖价: €125
  - 成本: €95
  - 利润: €30.00
  - 税额: €5.61
  galaxy A53:
    旧税分类: VAT_23 → 新税分类: MARGIN_VAT_0
    旧税额: €0 → 新税额: €5.61
✅ 订单已更新

=== 处理订单: WO-20260202-9112 ===
  Margin VAT 计算:
  - 卖价: €125
  - 成本: €95
  - 利润: €30.00
  - 税额: €5.61
  galaxy A53:
    旧税分类: VAT_23 → 新税分类: MARGIN_VAT_0
    旧税额: €0 → 新税额: €5.61
✅ 订单已更新
```

## 验证

### 订单 WO-20260202-9112
```
总金额: €125.00
小计: €119.39
税额: €5.61

项目详情:
- galaxy A53
  税分类: MARGIN_VAT_0
  税额: €5.61
```

### Financial Reports
现在 Financial Reports 中的仓库订单会显示正确的税额：
- 订单号: WO-20260202-1061
- 总金额: €250.00
- 税额: €11.22 (之前是 €46.75)

## 税务分类映射

### vatRate → taxClassification
```
"VAT 23%" → VAT_23
"VAT 13.5%" → SERVICE_VAT_13_5
"Service VAT 13.5%" → SERVICE_VAT_13_5
"VAT 0%" → MARGIN_VAT_0
"Margin VAT" → MARGIN_VAT_0
```

## 税额计算公式总结

### VAT 23%
```
税额 = 总价 × 23/123
小计 = 总价 - 税额
```

### Service VAT 13.5%
```
税额 = 总价 × 13.5/113.5
小计 = 总价 - 税额
```

### Margin VAT
```
利润 = 总价 - 成本价
税额 = 利润 × 23/123
小计 = 总价 - 税额
```

### VAT 0%
```
税额 = 0
小计 = 总价
```

## 影响范围

### 1. 创建新订单
- ✅ 新订单会使用正确的税额计算
- ✅ 自动识别 Margin VAT 产品
- ✅ 使用成本价计算 Margin VAT

### 2. 现有订单
- ✅ 已通过脚本修复所有现有订单
- ✅ 税分类已更新
- ✅ 税额已重新计算

### 3. Financial Reports
- ✅ 显示正确的税额
- ✅ 税务汇总正确

### 4. 订单详情
- ✅ 显示正确的税分类
- ✅ 显示正确的税额

## 相关文件
- `StockControl-main/app.js` - 创建订单 API (第 1456-1490 行)
- `StockControl-main/fix-warehouse-order-tax.js` - 修复脚本
- `StockControl-main/models/WarehouseOrder.js` - 订单模型

## 服务器状态
- ✅ 服务器运行中 (Process ID: 53)
- ✅ http://localhost:3000

## 测试
1. 刷新 Financial Reports 页面
2. 查看仓库订单详情
3. 验证税分类显示为 "Margin VAT"
4. 验证税额正确（€5.61 或 €11.22）
