# 修复时间线退款成色显示问题

## 问题描述

在产品时间线的退款记录中，退回成色显示为"未知"，即使销售记录中有 `originalCondition` 字段。

## 问题分析

### 数据库查询结果（序列号 111999）

```
销售记录:
  - refundCondition: ❌ 未设置
  - condition: ❌ 未设置
  - originalCondition: ✅ BRAND NEW
```

### 原代码逻辑

```javascript
退回成色: ${saleItem.refundCondition || saleItem.condition || '未知'}
```

**问题：** 代码只检查了 `refundCondition` 和 `condition`，没有检查 `originalCondition`。

## 解决方案

### 修改时间线API (app.js 第6357行)

**修改前：**
```javascript
退回成色: ${saleItem.refundCondition || saleItem.condition || '未知'}
```

**修改后：**
```javascript
退回成色: ${saleItem.refundCondition || saleItem.condition || saleItem.originalCondition || '未知'}
```

### 成色字段优先级

1. **refundCondition** - 退款时选择的成色（最优先）
2. **condition** - 销售时的成色
3. **originalCondition** - 原始成色（从库存记录复制）
4. **'未知'** - 如果以上都没有

## 测试验证

### 测试步骤

1. 重启服务器
2. 刷新浏览器 (Ctrl + Shift + R)
3. 登录 merchant.html
4. 搜索序列号 111999
5. 点击"📊 时间线"
6. 查看退款记录

### 预期结果

退款记录应该显示：
```
↩️ 产品退款
   退款金额: €349.00
   退款原因: 未填写
   退回成色: BRAND NEW  ← 应该显示这个，而不是"未知"
```

## 相关字段说明

### MerchantSale.items 中的成色字段

| 字段 | 说明 | 何时设置 |
|------|------|----------|
| `originalCondition` | 原始成色 | 销售时从库存记录复制 |
| `condition` | 销售时成色 | 销售时设置（可能与原始成色相同） |
| `refundCondition` | 退回成色 | 退款时用户选择 |

### 为什么需要三个字段？

1. **originalCondition**: 记录产品入库时的原始成色
2. **condition**: 记录销售时的成色（可能在销售前被修改）
3. **refundCondition**: 记录退款时的成色（可能因使用而降级）

例如：
- 入库时：BRAND NEW (originalCondition)
- 销售时：BRAND NEW (condition)
- 退款时：Pre-Owned (refundCondition) - 客户使用后退货

## 修改的文件

- `StockControl-main/app.js` (第6357行)

## 完成时间

2026-02-10

## 相关文档

- `INVENTORY_EDIT_STATUS_AND_TIMELINE_REFUND.md` - 时间线退款功能文档
- `FIX_REFUND_ORIGINAL_CONDITION_SAVE.md` - 退款原始成色保存问题
- `REFUND_CONDITION_DYNAMIC_LOADING.md` - 退款成色动态加载
