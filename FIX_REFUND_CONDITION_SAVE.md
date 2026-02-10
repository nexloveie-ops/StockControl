# 修复退款成色保存问题

## 问题描述

序列号 1115555 的产品退款时选择的成色是"二手"，但在时间线中显示的是"BRAND NEW"。

## 问题分析

### 数据库查询结果（序列号 1115555）

```
库存记录:
  - 当前成色: 二手
  - 当前分类: Pre-Owned Devices

销售记录:
  - refundCondition: ❌ 未设置
  - condition: ❌ 未设置
  - originalCondition: ✅ BRAND NEW
```

### 根本原因

退款API虽然更新了库存的成色，但**没有保存用户选择的退回成色到销售记录的 `refundCondition` 字段**。

时间线显示逻辑：
```javascript
退回成色: ${saleItem.refundCondition || saleItem.condition || saleItem.originalCondition || '未知'}
```

因为 `refundCondition` 未设置，所以显示了 `originalCondition`（BRAND NEW）。

## 解决方案

### 1. 修改退款API (app.js 第6615-6625行)

在保存销售记录之前，更新每个商品的 `refundCondition` 字段。

**修改前：**
```javascript
// 更新销售记录状态
sale.status = 'refunded';
sale.refundDate = new Date();
sale.refundAmount = refundTotal;
sale.refundItems = refundItems;

await sale.save();
```

**修改后：**
```javascript
// 更新销售记录状态
sale.status = 'refunded';
sale.refundDate = new Date();
sale.refundAmount = refundTotal;
sale.refundItems = refundItems;

// 更新销售记录中每个商品的退回成色
refundItems.forEach(refundItem => {
  if (refundItem.type === 'device' && refundItem.serialNumber) {
    // 查找销售记录中对应的商品
    const saleItem = sale.items.find(item => item.serialNumber === refundItem.serialNumber);
    if (saleItem) {
      // 保存退回成色
      saleItem.refundCondition = refundItem.deviceCondition;
      console.log(`    📝 保存退回成色: ${refundItem.productName} → ${refundItem.deviceCondition}`);
    }
  }
});

await sale.save();
```

### 2. 修复已有的退款记录

使用脚本 `fix-refund-condition-1115555.js` 修复序列号 1115555 的退款记录：

```javascript
// 从库存记录获取当前成色
saleItem.refundCondition = inventory.condition; // "二手"
await sale.save();
```

## 测试验证

### 测试步骤

1. **重启服务器**（已完成）

2. **刷新浏览器** (Ctrl + Shift + R)

3. **查看已修复的记录**
   - 搜索序列号 1115555
   - 点击"📊 时间线"
   - 查看退款记录

4. **测试新的退款**
   - 销售一个全新设备
   - 退款时选择"二手"
   - 查看时间线，应该显示"二手"

### 预期结果

#### 序列号 1115555（已修复）
```
↩️ 产品退款
   退款金额: €599.00
   退款原因: 未填写
   退回成色: 二手  ← 应该显示"二手"，不是"BRAND NEW"
```

#### 新的退款（测试）
```
1. 销售全新 iPhone 15
2. 退款时选择"二手"
3. 时间线应该显示：
   - 销售记录：成色 BRAND NEW
   - 退款记录：退回成色 二手
```

## 数据流程

### 退款前
```
库存记录:
  condition: BRAND NEW
  category: Brand New Devices

销售记录:
  items[0].originalCondition: BRAND NEW
  items[0].condition: (未设置)
  items[0].refundCondition: (未设置)
```

### 退款时（用户选择"二手"）
```
前端发送:
  refundItems[0].deviceCondition: "二手"

后端处理:
  1. 更新库存:
     inventory.condition = "二手"
     inventory.category = "Pre-Owned Devices"
  
  2. 更新销售记录:
     sale.status = "refunded"
     sale.items[0].refundCondition = "二手"  ← 新增
```

### 退款后
```
库存记录:
  condition: 二手
  category: Pre-Owned Devices

销售记录:
  items[0].originalCondition: BRAND NEW
  items[0].condition: (未设置)
  items[0].refundCondition: 二手  ← 已保存

时间线显示:
  退回成色: 二手  ← 正确显示
```

## 相关字段说明

### MerchantSale.items 中的成色字段

| 字段 | 说明 | 何时设置 | 优先级 |
|------|------|----------|--------|
| `refundCondition` | 退回成色 | 退款时保存 | 1（最高） |
| `condition` | 销售时成色 | 销售时设置 | 2 |
| `originalCondition` | 原始成色 | 销售时从库存复制 | 3 |

### 时间线显示逻辑

```javascript
// 优先级：refundCondition > condition > originalCondition > '未知'
const displayCondition = saleItem.refundCondition || 
                        saleItem.condition || 
                        saleItem.originalCondition || 
                        '未知';
```

## 修改的文件

1. **StockControl-main/app.js** (第6615-6625行)
   - 添加了保存 `refundCondition` 的逻辑

2. **StockControl-main/fix-refund-condition-1115555.js**
   - 修复已有退款记录的脚本

## 完成时间

2026-02-10

## 相关文档

- `FIX_TIMELINE_REFUND_CONDITION_DISPLAY.md` - 时间线退款成色显示修复
- `FIX_REFUND_ORIGINAL_CONDITION_SAVE.md` - 退款原始成色保存问题
- `REFUND_CONDITION_DYNAMIC_LOADING.md` - 退款成色动态加载
- `INVENTORY_EDIT_STATUS_AND_TIMELINE_REFUND.md` - 时间线退款功能文档
