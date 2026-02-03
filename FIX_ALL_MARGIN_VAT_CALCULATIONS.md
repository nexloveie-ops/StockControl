# 修复所有 Margin VAT 税额计算

## 日期: 2026-02-02

## 问题总结
所有涉及 Margin VAT 产品的税额计算都有问题：
1. **仓库订单**: 税额被错误计算为 0 或使用 VAT 23%
2. **零售销售**: 税额被错误计算为 VAT 23%（€37.21 而不是 €19.45）

## 根本原因

### 1. 税分类判断错误
- 使用了不存在的 `product.taxClassification` 字段
- 没有从 `vatRate` 字段正确映射到标准化的税分类

### 2. Margin VAT 公式未实现或错误
- 仓库订单：税额被简单设置为 0
- 零售销售：前端传递的税分类不标准（"VAT 0%" 而不是 "MARGIN_VAT_0"）

### 3. 税分类值不统一
```
前端可能传递: "VAT 0%", "Margin VAT", "VAT 23%", "Service VAT 13.5%"
后端期望: "MARGIN_VAT_0", "VAT_23", "SERVICE_VAT_13_5"
```

## 正确的 Margin VAT 计算公式

```
利润 = 卖价 - 成本价
税额 = 利润 × 23/123
小计 = 卖价 - 税额
```

### 示例
```
产品: galaxy A53
卖价: €199
成本: €95
利润: €104
税额: €19.45 ✅ (之前是 €37.21 ❌)
```

## 解决方案

### 1. 仓库订单 (app.js - 创建订单 API)

#### 修复税分类判断
```javascript
// ✅ 从 vatRate 获取税务分类
let taxClassification = 'VAT_23';
if (product.vatRate === 'VAT 23%') {
  taxClassification = 'VAT_23';
} else if (product.vatRate === 'VAT 13.5%' || product.vatRate === 'Service VAT 13.5%') {
  taxClassification = 'SERVICE_VAT_13_5';
} else if (product.vatRate === 'VAT 0%' || product.vatRate === 'Margin VAT') {
  taxClassification = 'MARGIN_VAT_0';
}
```

#### 实现 Margin VAT 计算
```javascript
else if (taxClassification === 'MARGIN_VAT_0') {
  // Margin VAT: 税额 = (卖价 - 成本价) × 23/123
  const costPrice = product.costPrice || 0;
  const margin = itemTotal - (costPrice * item.quantity);
  itemTaxAmount = margin * (23 / 123);
  itemSubtotal = itemTotal - itemTaxAmount;
}
```

### 2. 零售销售 (app.js - 销售 API)

#### 标准化税分类
```javascript
// ✅ 标准化各种格式的税分类
let taxClassification = item.taxClassification || 'VAT_23';

if (taxClassification === 'VAT 23%' || taxClassification === 'VAT_23') {
  taxClassification = 'VAT_23';
} else if (taxClassification === 'VAT 13.5%' || taxClassification === 'Service VAT 13.5%' || taxClassification === 'SERVICE_VAT_13_5') {
  taxClassification = 'SERVICE_VAT_13_5';
} else if (taxClassification === 'VAT 0%' || taxClassification === 'Margin VAT' || taxClassification === 'MARGIN_VAT_0') {
  taxClassification = 'MARGIN_VAT_0';
} else {
  taxClassification = 'VAT_23';
}
```

#### Margin VAT 计算（已存在，但需要标准化的税分类）
```javascript
case 'MARGIN_VAT_0':
  // Margin VAT = (销售额 - 成本) × 23/123
  const margin = itemTotal - (costPrice * item.quantity);
  taxAmount = margin * 23 / 123;
  break;
```

## 修复现有数据

### 1. 仓库订单
运行脚本: `node fix-warehouse-order-tax.js`

修复结果:
```
WO-20260202-1061: 税额 €46.75 → €11.22 ✅
WO-20260202-7228: 税额 €0 → €5.61 ✅
WO-20260202-9112: 税额 €0 → €5.61 ✅
```

### 2. 零售销售
运行脚本: `node fix-retail-sales-tax.js`

修复结果:
```
销售记录 1: 税额 €37.21 → €19.45 ✅
销售记录 2: 税额 €37.21 → €19.45 ✅
销售记录 3: 税额 €37.21 → €13.84 ✅
```

## 税务分类映射表

### vatRate → taxClassification
```
"VAT 23%" → VAT_23
"VAT 13.5%" → SERVICE_VAT_13_5
"Service VAT 13.5%" → SERVICE_VAT_13_5
"VAT 0%" → MARGIN_VAT_0
"Margin VAT" → MARGIN_VAT_0
```

### 前端传递值 → 标准化值
```
"VAT 23%" → VAT_23
"VAT_23" → VAT_23
"VAT 13.5%" → SERVICE_VAT_13_5
"Service VAT 13.5%" → SERVICE_VAT_13_5
"SERVICE_VAT_13_5" → SERVICE_VAT_13_5
"VAT 0%" → MARGIN_VAT_0
"Margin VAT" → MARGIN_VAT_0
"MARGIN_VAT_0" → MARGIN_VAT_0
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

### 1. 仓库订单
- ✅ 创建新订单时正确计算税额
- ✅ 现有订单已修复
- ✅ Financial Reports 显示正确

### 2. 零售销售
- ✅ 新销售记录正确计算税额
- ✅ 现有销售记录已修复
- ✅ 销售记录查询显示正确

### 3. Financial Reports
- ✅ 仓库订单税额正确
- ✅ 零售销售税额正确
- ✅ 税务汇总正确

## 验证

### 仓库订单
```
订单号: WO-20260202-9112
产品: galaxy A53 × 1
卖价: €125
成本: €95
利润: €30
税额: €5.61 ✅
```

### 零售销售
```
产品: galaxy A53 × 1
卖价: €199
成本: €95
利润: €104
税额: €19.45 ✅
```

## 相关文件
- `StockControl-main/app.js` - 仓库订单和零售销售 API
- `StockControl-main/fix-warehouse-order-tax.js` - 仓库订单修复脚本
- `StockControl-main/fix-retail-sales-tax.js` - 零售销售修复脚本

## 服务器状态
- ✅ 服务器运行中 (Process ID: 56)
- ✅ http://localhost:3000

## 测试
1. 刷新 Financial Reports 页面
2. 查看仓库订单和零售销售的税额
3. 验证 Margin VAT 产品的税额正确计算
4. 创建新的订单/销售，验证税额自动正确计算
