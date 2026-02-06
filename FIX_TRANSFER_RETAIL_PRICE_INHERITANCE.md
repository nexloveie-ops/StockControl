# 修复调货零售价继承 ✅

## 问题
调货的产品确认收货后，零售价应该继承原始产品的零售价，而不是根据调货价格计算。

## 原始逻辑（错误）

```javascript
// 增加调入方库存
const toInventory = new MerchantInventory({
  // ...
  costPrice: item.transferPrice,
  wholesalePrice: item.transferPrice * 1.1,
  retailPrice: item.transferPrice * 1.3,  // ❌ 根据调货价格计算
  // ...
});
```

### 问题分析
- 调货价格（transferPrice）可能是成本价或批发价
- 根据调货价格计算零售价会导致价格不一致
- 零售价应该保持原始产品的定价

## 修复后的逻辑（正确）

```javascript
// 减少调出方库存
const fromInventory = await MerchantInventory.findById(item.inventoryId).session(session);

// 增加调入方库存
const toInventory = new MerchantInventory({
  // ...
  costPrice: item.transferPrice,
  wholesalePrice: item.transferPrice * 1.1,
  retailPrice: fromInventory.retailPrice,  // ✅ 继承原始产品的零售价
  // ...
});
```

### 修复说明
- 从原始库存记录（fromInventory）中获取零售价
- 直接继承原始产品的零售价
- 保持价格一致性

## 价格策略

### 调货价格（transferPrice）
- **内部调拨**：使用成本价（costPrice）
- **公司间销售**：使用批发价（wholesalePrice）

### 调入方库存价格
- **成本价（costPrice）**：使用调货价格（transferPrice）
- **批发价（wholesalePrice）**：调货价格 × 1.1
- **零售价（retailPrice）**：继承原始产品的零售价 ✅

## 示例

### 场景：内部调拨

**原始产品（MurrayRanelagh）**：
- 成本价：€500
- 批发价：€600
- 零售价：€700

**调货申请**：
- 调货价格：€500（成本价）

**调入方库存（MurrayDundrum）**：
- 成本价：€500（调货价格）
- 批发价：€550（€500 × 1.1）
- 零售价：€700 ✅（继承原始零售价）

### 场景：公司间销售

**原始产品（CompanyA）**：
- 成本价：€500
- 批发价：€600
- 零售价：€700

**调货申请**：
- 调货价格：€600（批发价）

**调入方库存（CompanyB）**：
- 成本价：€600（调货价格）
- 批发价：€660（€600 × 1.1）
- 零售价：€700 ✅（继承原始零售价）

## 优势

### 价格一致性
- ✅ 同一产品在不同商户的零售价保持一致
- ✅ 避免因调货导致价格混乱
- ✅ 保持品牌定价策略

### 业务逻辑
- ✅ 零售价由原始定价决定
- ✅ 调货价格只影响成本和批发价
- ✅ 符合实际业务需求

### 利润计算
- ✅ 利润 = 零售价 - 成本价
- ✅ 调入方的利润正确计算
- ✅ 不会因调货价格影响零售价

## 测试验证

### 测试步骤

1. **查看原始产品**
   ```
   登录: MurrayRanelagh
   进入: 我的库存
   查看产品: iPhone 14
   记录零售价: €700
   ```

2. **发起调货**
   ```
   登录: MurrayDundrum
   进入: 群组库存
   添加 iPhone 14 到购物车
   提交调货申请
   ```

3. **审批调货**
   ```
   登录: MurrayRanelagh
   进入: 调货管理 → 待审批
   批准调货
   ```

4. **确认收货**
   ```
   登录: MurrayDundrum
   进入: 调货管理 → 待收货
   确认收货
   ```

5. **验证零售价**
   ```
   进入: 我的库存
   查看产品: iPhone 14
   验证零售价: €700 ✅（应该与原始产品相同）
   ```

### 预期结果

**原始产品（MurrayRanelagh）**：
```
产品: iPhone 14
成本价: €500
批发价: €600
零售价: €700
```

**调货后（MurrayDundrum）**：
```
产品: iPhone 14
成本价: €500（调货价格）
批发价: €550（€500 × 1.1）
零售价: €700 ✅（继承原始零售价）
```

## 代码位置

**文件**: `StockControl-main/app.js`

**函数**: `POST /api/merchant/inventory/transfer/complete`

**行数**: 约 6143-6250

**修改内容**:
```javascript
// 第 6220 行左右
retailPrice: fromInventory.retailPrice, // 继承原始产品的零售价
```

## 注意事项

1. **原始库存必须存在**
   - 从 `fromInventory` 获取零售价
   - 如果原始库存不存在，会抛出错误

2. **零售价不会改变**
   - 无论调货价格是多少
   - 零售价始终继承原始产品

3. **批发价会重新计算**
   - 批发价 = 调货价格 × 1.1
   - 这是正常的，因为批发价基于成本

4. **利润会变化**
   - 利润 = 零售价 - 成本价
   - 如果调货价格高于原始成本价，利润会减少
   - 这是正常的业务逻辑

## 相关文档

- `TRANSFER_MANAGEMENT_COMPLETE.md` - 调货管理功能说明
- `FIX_TRANSFER_APPROVAL_DISPLAY.md` - 调货审批显示修复
- `调货购物车功能完成.md` - 调货购物车功能

---
**完成日期**: 2026-02-05
**状态**: ✅ 已修复
**需要重启服务器**: 是
