# Margin VAT税额计算修复

## 修复时间
2026-02-12

## 问题描述
采购订单详情和PDF中，Margin VAT产品的税额计算错误。Margin VAT产品在采购时不应该产生进项税，税额应该为0。

## Margin VAT税务规则

### 什么是Margin VAT（差额征税）？
Margin VAT是一种特殊的增值税计算方式，主要用于二手商品交易：

1. **采购时**：不产生进项税（Input VAT = 0）
2. **销售时**：只对利润部分征税
3. **税基**：销售价格 - 采购成本（差额）
4. **税率**：通常是23%或13.5%，但只对差额征税

### 与普通VAT的区别

| 项目 | 普通VAT | Margin VAT |
|-----|---------|-----------|
| 采购进项税 | 可抵扣 | 不可抵扣（为0） |
| 销售税基 | 全额销售价 | 销售价 - 采购价 |
| 适用商品 | 新商品 | 二手商品 |

## 问题原因

代码在计算采购订单税额时，没有排除Margin VAT的情况，导致：
- Margin VAT产品也被计算了进项税
- 税额显示错误
- PDF中的税额不正确

## 修复位置

### 1. 后端API修复 (app.js)

#### 1.1 调货订单PDF生成 (第8020-8030行)
```javascript
// 修复前
if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
  taxAmount += itemTotal - (itemTotal / 1.23);
} else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
  taxAmount += itemTotal - (itemTotal / 1.135);
}

// 修复后
// 只有VAT_23和VAT_13_5才计算税额，Margin VAT不计算
if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
  taxAmount += itemTotal - (itemTotal / 1.23);
} else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
  taxAmount += itemTotal - (itemTotal / 1.135);
}
// MARGIN_VAT_0 和 VAT_0 不计算税额（税额为0）
```

#### 1.2 采购发票PDF生成 (第8190-8200行)
同样的修复逻辑

#### 1.3 采购报表API - 调货记录 (第7750-7760行)
同样的修复逻辑

#### 1.4 采购报表API - 发票记录 (第7850-7860行)
同样的修复逻辑

### 2. 前端修复 (merchant.html)

#### 2.1 调货订单详情显示 (第7780-7790行)
```javascript
// 修复前
if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
  taxAmount += itemTotal - (itemTotal / 1.23);
} else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
  taxAmount += itemTotal - (itemTotal / 1.135);
}

// 修复后
// 只有VAT_23和VAT_13_5才计算税额，Margin VAT不计算
if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
  taxAmount += itemTotal - (itemTotal / 1.23);
} else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
  taxAmount += itemTotal - (itemTotal / 1.135);
}
// MARGIN_VAT_0 和 VAT_0 不计算税额（税额为0）
```

#### 2.2 发票订单详情显示 (第7815-7825行)
同样的修复逻辑

## 税分类说明

系统中的税分类：

1. **VAT_23** / **VAT 23%**
   - 普通增值税23%
   - 采购时：进项税 = 总价 - (总价 / 1.23)
   - 销售时：销项税 = 总价 - (总价 / 1.23)

2. **VAT_13_5** / **VAT 13.5%**
   - 普通增值税13.5%
   - 采购时：进项税 = 总价 - (总价 / 1.135)
   - 销售时：销项税 = 总价 - (总价 / 1.135)

3. **MARGIN_VAT_0**
   - 差额征税
   - 采购时：进项税 = 0 ✅
   - 销售时：税基 = 销售价 - 采购价

4. **VAT_0**
   - 免税
   - 采购时：进项税 = 0 ✅
   - 销售时：销项税 = 0

## 修复效果

### 修复前
```
产品: Samsung Galaxy A53 (MARGIN_VAT_0)
采购价: €250.00
数量: 2
小计: €500.00
税额: €93.50  ❌ 错误！不应该有税额
```

### 修复后
```
产品: Samsung Galaxy A53 (MARGIN_VAT_0)
采购价: €250.00
数量: 2
小计: €500.00
税额: €0.00  ✅ 正确！
```

## 测试步骤

1. 登录商户系统
2. 进入"报表中心" → "采购报表"
3. 找到包含Margin VAT产品的订单
4. 点击订单号查看详情
5. 验证：
   - Margin VAT产品的税额为€0.00
   - 订单总税额不包含Margin VAT产品
6. 下载PDF验证：
   - PDF中Margin VAT产品税额为€0.00
   - 总税额正确

## 相关文件
- `StockControl-main/app.js` (第7750-8200行)
- `StockControl-main/public/merchant.html` (第7780-7825行)

## 服务器状态
- 服务器已重启（进程40）
- 所有修复已生效
- 前端需要强制刷新浏览器（Ctrl + Shift + R）

## 注意事项
1. Margin VAT只在销售时对差额征税
2. 采购时不产生进项税，税额为0
3. 这是爱尔兰税法对二手商品的特殊规定
4. 系统中所有涉及采购税额计算的地方都已修复
