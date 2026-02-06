# 调货价格策略优化 ✅

## 需求
根据交易类型（内部调拨 vs 公司间销售）采用不同的价格继承策略。

## 价格策略

### 1. 内部调拨（INTERNAL_TRANSFER）
**同一家公司内部调货**

调入方收到货物后的价格：
- **成本价**：继承原始产品的成本价 ✅
- **批发价**：继承原始产品的批发价 ✅
- **零售价**：继承原始产品的零售价 ✅

**原因**：
- 同一公司内部，价格体系应该保持一致
- 不应该因为内部调拨改变产品定价
- 完全继承原始价格，保持价格统一

### 2. 公司间销售（INTER_COMPANY_SALE）
**不同公司之间的调货**

调入方收到货物后的价格：
- **成本价**：使用调货价格（批发价）✅
- **批发价**：调货价格 × 1.1 ✅
- **零售价**：继承原始产品的零售价 ✅

**原因**：
- 不同公司，调货价格成为新的成本
- 批发价基于新成本计算
- 零售价保持品牌统一定价

## 代码实现

```javascript
// 根据交易类型决定价格策略
let costPrice, wholesalePrice, retailPrice;

if (transfer.transferType === 'INTERNAL_TRANSFER') {
  // 内部调拨：完全继承原始产品的所有价格
  costPrice = fromInventory.costPrice;
  wholesalePrice = fromInventory.wholesalePrice;
  retailPrice = fromInventory.retailPrice;
} else {
  // 公司间销售：使用调货价格作为成本价，零售价继承
  costPrice = item.transferPrice;
  wholesalePrice = item.transferPrice * 1.1;
  retailPrice = fromInventory.retailPrice;
}

// 增加调入方库存
const toInventory = new MerchantInventory({
  // ...
  costPrice: costPrice,
  wholesalePrice: wholesalePrice,
  retailPrice: retailPrice,
  // ...
});
```

## 示例对比

### 场景 1: 内部调拨（同一公司）

**原始产品（MurrayRanelagh）**：
```
产品: iPhone 14
成本价: €500
批发价: €600
零售价: €700
公司: Murray Electronics Limited
```

**调货申请**：
```
类型: INTERNAL_TRANSFER（内部调拨）
调货价格: €500（成本价）
```

**调入方库存（MurrayDundrum）**：
```
产品: iPhone 14
成本价: €500 ✅（继承原始成本价）
批发价: €600 ✅（继承原始批发价）
零售价: €700 ✅（继承原始零售价）
公司: Murray Electronics Limited
```

**利润分析**：
```
利润 = 零售价 - 成本价
     = €700 - €500
     = €200
```

### 场景 2: 公司间销售（不同公司）

**原始产品（CompanyA）**：
```
产品: iPhone 14
成本价: €500
批发价: €600
零售价: €700
公司: Company A Ltd
```

**调货申请**：
```
类型: INTER_COMPANY_SALE（公司间销售）
调货价格: €600（批发价）
```

**调入方库存（CompanyB）**：
```
产品: iPhone 14
成本价: €600 ✅（调货价格）
批发价: €660 ✅（€600 × 1.1）
零售价: €700 ✅（继承原始零售价）
公司: Company B Ltd
```

**利润分析**：
```
利润 = 零售价 - 成本价
     = €700 - €600
     = €100
```

## 价格对比表

| 项目 | 原始产品 | 内部调拨 | 公司间销售 |
|------|---------|---------|-----------|
| **成本价** | €500 | €500（继承）✅ | €600（调货价）✅ |
| **批发价** | €600 | €600（继承）✅ | €660（计算）✅ |
| **零售价** | €700 | €700（继承）✅ | €700（继承）✅ |
| **利润** | €200 | €200 | €100 |

## 业务逻辑

### 内部调拨
```
同一公司内部
├─ 价格体系统一
├─ 完全继承所有价格
├─ 利润保持不变
└─ 不产生销售记录
```

### 公司间销售
```
不同公司之间
├─ 调货价格成为新成本
├─ 批发价基于新成本计算
├─ 零售价保持品牌统一
├─ 利润会减少
└─ 生成销售发票
```

## 优势

### 内部调拨
- ✅ 价格体系统一
- ✅ 利润保持一致
- ✅ 简化管理
- ✅ 符合实际业务

### 公司间销售
- ✅ 反映真实成本
- ✅ 利润计算准确
- ✅ 零售价统一
- ✅ 符合会计准则

## 测试验证

### 测试 1: 内部调拨

1. **准备数据**
   ```
   MurrayRanelagh 和 MurrayDundrum
   都属于 Murray Electronics Limited
   ```

2. **查看原始产品**
   ```
   登录: MurrayRanelagh
   进入: 我的库存
   产品: iPhone 14
   成本价: €500
   批发价: €600
   零售价: €700
   ```

3. **发起调货**
   ```
   登录: MurrayDundrum
   进入: 群组库存
   添加 iPhone 14 到购物车
   提交调货申请
   ```

4. **审批并确认收货**
   ```
   MurrayRanelagh 批准
   MurrayDundrum 确认收货
   ```

5. **验证价格**
   ```
   登录: MurrayDundrum
   进入: 我的库存
   产品: iPhone 14
   成本价: €500 ✅（应该继承）
   批发价: €600 ✅（应该继承）
   零售价: €700 ✅（应该继承）
   ```

### 测试 2: 公司间销售

1. **准备数据**
   ```
   设置 MurrayRanelagh 为 Company A
   设置 MurrayDundrum 为 Company B
   ```

2. **查看原始产品**
   ```
   登录: MurrayRanelagh
   产品: iPhone 14
   成本价: €500
   批发价: €600
   零售价: €700
   ```

3. **发起调货**
   ```
   登录: MurrayDundrum
   发起调货申请
   ```

4. **审批并确认收货**
   ```
   MurrayRanelagh 批准
   MurrayDundrum 确认收货
   ```

5. **验证价格**
   ```
   登录: MurrayDundrum
   进入: 我的库存
   产品: iPhone 14
   成本价: €600 ✅（调货价格）
   批发价: €660 ✅（€600 × 1.1）
   零售价: €700 ✅（继承）
   ```

## 利润分析

### 内部调拨
```
原始商户利润: €700 - €500 = €200
调入商户利润: €700 - €500 = €200
利润保持一致 ✅
```

### 公司间销售
```
原始商户利润: €700 - €500 = €200
调入商户利润: €700 - €600 = €100
利润减少是正常的（因为成本增加）✅
```

## 注意事项

1. **交易类型判断**
   - 基于 `transfer.transferType` 字段
   - `INTERNAL_TRANSFER` = 内部调拨
   - `INTER_COMPANY_SALE` = 公司间销售

2. **价格来源**
   - 内部调拨：从 `fromInventory` 继承所有价格
   - 公司间销售：成本价用 `item.transferPrice`，零售价继承

3. **利润变化**
   - 内部调拨：利润不变
   - 公司间销售：利润减少（正常）

4. **零售价统一**
   - 无论哪种类型，零售价都继承
   - 保持品牌定价一致性

## 代码位置

**文件**: `StockControl-main/app.js`

**函数**: `POST /api/merchant/inventory/transfer/complete`

**行数**: 约 6190-6240

## 相关文档

- `FIX_TRANSFER_RETAIL_PRICE_INHERITANCE.md` - 零售价继承修复
- `TRANSFER_MANAGEMENT_COMPLETE.md` - 调货管理功能
- `COMPANY_BASED_TRANSFER_DESIGN.md` - 公司信息调货设计

---
**完成日期**: 2026-02-05
**状态**: ✅ 已优化
**需要重启服务器**: 是
