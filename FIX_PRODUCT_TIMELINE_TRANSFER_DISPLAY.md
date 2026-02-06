# 产品时间线调货显示优化 ✅

## 修改内容

优化产品时间线中调货入库的显示信息：
1. **调货价格**：从显示成本价改为显示批发价
2. **调出商户**：从显示商户名称改为显示用户名

## 问题描述

在"我的库存 → 选择产品 → 产品时间线"中，调货入库记录显示不正确：

### 问题 1: 调货价格显示成本价
```
调货入库
调货价格: €500.00  ❌（显示的是成本价）
```

**应该显示**：批发价（实际调货价格）

### 问题 2: 调出商户显示商户名称
```
调货入库
调出商户: Murray Ranelagh Store  ❌（显示的是商户名称）
```

**应该显示**：用户名（merchantId）

## 修复方案

### 1. 调货价格显示批发价

**之前（错误）**：
```javascript
details: `调货单号: ${transferIn.transferNumber}<br>
          调出商户: ${transferIn.fromMerchantName}<br>
          调货价格: €${inventory.costPrice.toFixed(2)}`  // ❌ 显示成本价
```

**现在（正确）**：
```javascript
// 查找对应的调货项目以获取批发价
const transferItem = transferIn.items.find(item => 
  item.serialNumber === inventory.serialNumber || 
  item.productName === inventory.productName
);
const transferPrice = transferItem ? transferItem.transferPrice : inventory.wholesalePrice;

details: `调货单号: ${transferIn.transferNumber}<br>
          调出商户: ${transferIn.fromMerchant}<br>
          调货价格: €${transferPrice.toFixed(2)}`  // ✅ 显示批发价
```

### 2. 调出商户显示用户名

**之前（错误）**：
```javascript
调出商户: ${transferIn.fromMerchantName}  // ❌ 商户名称
```

**现在（正确）**：
```javascript
调出商户: ${transferIn.fromMerchant}  // ✅ 用户名
```

## 价格逻辑说明

### 为什么显示批发价？

调货价格（transferPrice）就是批发价：
- **内部调拨**：transferPrice = 成本价
- **公司间销售**：transferPrice = 批发价

所以显示 `transferPrice` 就是显示实际的调货价格。

### 价格对比

**示例产品**：
```
成本价: €500
批发价: €600
零售价: €700
```

**内部调拨**：
```
调货价格: €500（成本价）
时间线显示: €500 ✅
```

**公司间销售**：
```
调货价格: €600（批发价）
时间线显示: €600 ✅
```

## 显示效果

### 修复前

```
📥 调货入库
从其他商户调入

调货单号: TF-1738761234567-0001
调出商户: Murray Ranelagh Store  ❌
调货价格: €500.00  ❌（成本价）
```

### 修复后

```
📥 调货入库
从其他商户调入

调货单号: TF-1738761234567-0001
调出商户: MurrayRanelagh  ✅（用户名）
调货价格: €600.00  ✅（批发价）
```

## 代码位置

**文件**: `StockControl-main/app.js`

**API**: `GET /api/merchant/inventory/:id/timeline`

**行数**: 约 4820-4840

## 完整的时间线显示

### 1. 产品入库
```
📥 产品入库
产品入库到商户库存

来源: 商户调货
成本价: €500.00
零售价: €700.00
数量: 1
```

### 2. 调货入库
```
📥 调货入库
从其他商户调入

调货单号: TF-1738761234567-0001
调出商户: MurrayRanelagh  ✅
调货价格: €600.00  ✅
```

### 3. 调货出库
```
📤 调货出库
产品调出到其他商户

调货单号: TF-1738761234567-0002
调入商户: MurrayDundrum
数量: 1
调货价格: €600.00
```

### 4. 产品销售
```
💰 产品销售
产品已售出

销售价格: €700.00
数量: 1
支付方式: 刷卡
客户电话: 0851234567
```

## 字段对比

| 字段 | 之前 | 现在 | 说明 |
|------|------|------|------|
| **调出商户** | `fromMerchantName` | `fromMerchant` | 用户名更清晰 |
| **调货价格** | `inventory.costPrice` | `transferItem.transferPrice` | 实际调货价格 |

## 为什么用户名更好？

### 1. 一致性
- 系统其他地方都显示用户名（merchantId）
- 调货管理页面显示用户名
- 群组库存显示用户名

### 2. 唯一性
- 用户名是唯一的
- 商户名称可能重复或很长

### 3. 简洁性
- 用户名简短：`MurrayRanelagh`
- 商户名称冗长：`Murray Ranelagh Store`

## 测试验证

### 测试步骤

1. **登录商户账号**
   ```
   http://localhost:3000/merchant.html
   用户名: MurrayDundrum
   密码: password123
   ```

2. **进入我的库存**
   - 点击"我的库存"标签

3. **选择调货入库的产品**
   - 找到来源为"商户调货"的产品
   - 点击产品行

4. **查看产品时间线**
   - 自动弹出时间线模态框

5. **验证调货入库信息**
   - 调出商户：应该显示用户名（如 `MurrayRanelagh`）✅
   - 调货价格：应该显示批发价（如 `€600.00`）✅

### 预期结果

**调货入库记录**：
```
📥 调货入库
从其他商户调入

调货单号: TF-1738761234567-0001
调出商户: MurrayRanelagh  ✅
调货价格: €600.00  ✅
```

## 注意事项

1. **价格匹配**
   - 通过序列号或产品名称匹配调货项目
   - 如果找不到，使用库存的批发价作为后备

2. **用户名显示**
   - 使用 `fromMerchant`（用户名）
   - 不使用 `fromMerchantName`（商户名称）

3. **时间线顺序**
   - 按时间倒序排列
   - 最新的事件在最上面

## 相关功能

- 产品时间线：显示产品的完整历史
- 调货管理：管理调货申请和审批
- 群组库存：查看和调货其他商户的产品

## 相关文档

- `PRODUCT_TIMELINE_COMPLETE.md` - 产品时间线功能
- `TRANSFER_MANAGEMENT_COMPLETE.md` - 调货管理功能
- `FIX_TRANSFER_PRICE_STRATEGY.md` - 调货价格策略

---
**完成日期**: 2026-02-05
**状态**: ✅ 已修复
**需要重启服务器**: 是（已重启）
