# 退款成色保存问题完整修复

## 问题总结

序列号 1116666 和其他已退款产品的时间线显示错误的退回成色（显示 BRAND NEW 而不是实际的"二手"）。

## 根本原因

1. **Schema 缺少字段**: MerchantSale 模型的 items 数组中没有定义 `refundCondition` 字段
2. **API 未保存**: 退款API虽然更新了库存成色，但没有保存用户选择的退回成色到销售记录

## 完整修复方案

### 1. 添加 Schema 字段 (models/MerchantSale.js)

在 `items` 数组的 schema 中添加 `refundCondition` 字段：

```javascript
// 退回成色（退款时保存）
refundCondition: {
  type: String,
  default: null
}
```

### 2. 修改退款API (app.js 第6615-6625行)

在保存销售记录之前，更新每个商品的 `refundCondition` 字段：

```javascript
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

### 3. 修复已有数据

使用批量修复脚本 `fix-all-refund-conditions.js` 修复所有已退款的记录：

```bash
node fix-all-refund-conditions.js
```

**修复结果:**
- ✅ 已修复: 4 条记录
- ⏭️  已跳过: 1 条记录（已有退回成色）

**修复的记录:**
1. iPhone 14 (1115555) - 退回成色: 二手
2. iPhone 13 (1113333) - 退回成色: 二手（2条记录）
3. iPhone 11 (111999) - 退回成色: 二手

## 测试验证

### 测试1: 验证已修复的记录

```bash
node check-sale-1116666.js
```

**预期结果:**
```
退款记录中的成色字段:
  1. refundCondition: ✅ 二手
  2. condition: 未设置
  3. originalCondition: BRAND NEW

时间线显示逻辑:
  显示的成色: 二手

✅ refundCondition 已设置: 二手
✅ 退回成色与库存成色一致
✅ 时间线会正确显示: 二手
```

### 测试2: 测试新的退款

1. 销售一个全新设备
2. 退款时选择"二手"
3. 查看时间线

**预期结果:**
- 销售记录: 原始成色 BRAND NEW
- 退款记录: 退回成色 二手
- 时间线正确显示"二手"

### 测试3: 刷新浏览器查看时间线

1. 刷新浏览器 (Ctrl + Shift + R)
2. 搜索 1116666
3. 打开时间线
4. 查看退款记录

**预期结果:**
```
↩️ 产品退款
   退款金额: €600.00
   退款原因: 未填写
   退回成色: 二手  ← 正确显示
```

## 数据流程

### 完整的退款流程

```
1. 用户发起退款
   ├─ 选择退回成色: "二手"
   └─ 前端发送: refundItems[0].deviceCondition = "二手"

2. 后端处理退款
   ├─ 更新库存:
   │  ├─ inventory.condition = "二手"
   │  └─ inventory.category = "Pre-Owned Devices"
   │
   └─ 更新销售记录:
      ├─ sale.status = "refunded"
      ├─ sale.refundDate = new Date()
      └─ sale.items[0].refundCondition = "二手"  ← 新增

3. 时间线显示
   └─ 优先级: refundCondition > condition > originalCondition
      └─ 显示: "二手" ✅
```

## 成色字段说明

### MerchantSale.items 中的成色字段

| 字段 | 说明 | 何时设置 | 优先级 | 示例 |
|------|------|----------|--------|------|
| `refundCondition` | 退回成色 | 退款时保存 | 1（最高） | "二手" |
| `condition` | 销售时成色 | 销售时设置 | 2 | "BRAND NEW" |
| `originalCondition` | 原始成色 | 销售时从库存复制 | 3 | "BRAND NEW" |

### 时间线显示逻辑

```javascript
// app.js 第6357行
退回成色: ${saleItem.refundCondition || saleItem.condition || saleItem.originalCondition || '未知'}
```

## 修改的文件

1. **StockControl-main/models/MerchantSale.js**
   - 添加 `refundCondition` 字段到 items schema

2. **StockControl-main/app.js** (第6615-6625行)
   - 添加保存 `refundCondition` 的逻辑

3. **修复脚本**
   - `fix-refund-condition-1115555.js` - 单个修复
   - `fix-refund-condition-1116666.js` - 单个修复
   - `fix-all-refund-conditions.js` - 批量修复

## 相关问题修复

### 问题1: 时间线显示"未知"
- **原因**: 没有检查 `originalCondition` 字段
- **修复**: 添加 `originalCondition` 到显示逻辑
- **文档**: `FIX_TIMELINE_REFUND_CONDITION_DISPLAY.md`

### 问题2: 退回成色显示错误
- **原因**: `refundCondition` 字段未保存
- **修复**: 添加 schema 字段 + API 保存逻辑
- **文档**: `FIX_REFUND_CONDITION_SAVE.md`（本文档）

## 完成时间

2026-02-10

## 相关文档

- `FIX_TIMELINE_REFUND_CONDITION_DISPLAY.md` - 时间线退款成色显示修复
- `FIX_REFUND_ORIGINAL_CONDITION_SAVE.md` - 退款原始成色保存问题
- `REFUND_CONDITION_DYNAMIC_LOADING.md` - 退款成色动态加载
- `INVENTORY_EDIT_STATUS_AND_TIMELINE_REFUND.md` - 时间线退款功能文档

## 测试清单

- [x] Schema 添加 refundCondition 字段
- [x] 退款API保存 refundCondition
- [x] 修复已有退款记录（5条）
- [x] 验证时间线显示正确
- [x] 服务器重启
- [ ] 浏览器刷新测试
- [ ] 新退款测试
