# 修复仓库订单税务计算

## 问题描述
仓库订单 PDF 中的税务计算有误：
1. Margin VAT 产品的税额应该显示为 0
2. VAT 23% 产品的税额计算不正确
3. 某些产品（如 iPhone Clear Case）税额显示为 0

## 税务逻辑说明

### 1. VAT 23% (标准增值税)
- **含税价格**：批发价已包含 23% VAT
- **税额计算**：税额 = 总价 × 23/123
- **不含税价格**：不含税价 = 总价 - 税额
- **显示税额**：显示实际税额

**示例**：
- 批发价（含税）：€123.00
- 税额：€123.00 × 23/123 = €23.00
- 不含税价：€123.00 - €23.00 = €100.00

### 2. Service VAT 13.5% (服务增值税)
- **含税价格**：批发价已包含 13.5% VAT
- **税额计算**：税额 = 总价 × 13.5/113.5
- **不含税价格**：不含税价 = 总价 - 税额
- **显示税额**：显示实际税额

**示例**：
- 批发价（含税）：€113.50
- 税额：€113.50 × 13.5/113.5 = €13.50
- 不含税价：€113.50 - €13.50 = €100.00

### 3. Margin VAT (差价增值税)
- **含税价格**：批发价已包含税
- **税额计算**：税额 = (卖价 - 成本价) × 23/123（内部计算）
- **显示税额**：**显示为 0**（Margin VAT 是基于利润的内部税务处理，不向客户展示）
- **原因**：Margin VAT 适用于二手商品，税务只针对利润部分，不是整个销售额

**示例**：
- 批发价（含税）：€100.00
- 成本价：€80.00
- 利润：€20.00
- 内部税额：€20.00 × 23/123 = €3.74（内部记录）
- **显示税额：€0.00**（对外不显示）

### 4. VAT 0% (免税)
- **税额**：0
- **显示税额**：0

## 修复内容

### 1. 订单创建 API (`app.js`)
- 添加 `displayTaxAmount` 变量，用于区分内部税额和显示税额
- VAT 23% 和 Service VAT：displayTaxAmount = 实际税额
- Margin VAT：displayTaxAmount = 0（内部税额仍然计算，但不显示）
- 订单项保存 displayTaxAmount 而不是 itemTaxAmount
- 总税额累计使用 displayTaxAmount

### 2. PDF 生成
- 显示每个产品的税务分类和税额
- Margin VAT 产品的税额列显示 €0.00
- 总税额只包含 VAT 23% 和 Service VAT 的税额

## 测试步骤

1. **创建新订单**（旧订单可能仍有错误的税额）：
   - 访问 http://localhost:3000/merchant.html
   - 登录批发商账号（merchant001 / merchant123）
   - 从仓库订货，选择不同税务分类的产品：
     - VAT 23% 产品（如配件）
     - Margin VAT 产品（如二手手机）
   - 提交订单

2. **查看订单详情**：
   - 访问 http://localhost:3000/prototype-working.html
   - 登录仓库管理员账号（admin / admin123）
   - 进入"订单管理" > "仓库订单管理"
   - 点击"查看详情"

3. **下载 PDF**：
   - 点击"📄 下载 PDF"
   - 检查 PDF 中的税务信息：
     - VAT 23% 产品：税额应该正确显示（约为价格的 18.7%）
     - Margin VAT 产品：税额应该显示为 €0.00
     - 总税额应该只包含 VAT 23% 和 Service VAT 的税额

## 预期结果

**VAT 23% 产品示例**：
- Product: iPhone Clear Case
- Price: €10.00
- Tax Classification: VAT 23%
- Tax Amount: €1.87
- Subtotal: €10.00

**Margin VAT 产品示例**：
- Product: iPhone 15 Pro (Used)
- Price: €800.00
- Tax Classification: Margin VAT
- Tax Amount: €0.00
- Subtotal: €800.00

**订单总计**：
- Subtotal (excl. tax): €808.13
- Total Tax: €1.87
- TOTAL (incl. tax): €810.00

## 完成时间
2026-02-06

## 状态
✅ 已修复
