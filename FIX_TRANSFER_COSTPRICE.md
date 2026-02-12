# 修复调货确认收货时的成本价设置

## 问题描述

在确认收货时，公司间销售的成本价设置错误：
- **错误逻辑**: `costPrice = fromInventory.wholesalePrice`（使用原产品的批发价）
- **正确逻辑**: `costPrice = item.transferPrice`（使用调货价格）

### 实际案例

**IPHONE11 (IMEI: 352928114188457)**

调货记录 TRF20260211001:
- 调货价格（transferPrice）: €195
- MurrayRanelagh的批发价: €195
- Mobile123设置的批发价: €200

**错误的成本价**:
- 系统使用了 `fromInventory.wholesalePrice` = €195（碰巧相同）
- 但如果原产品批发价不同，就会出错

**正确的成本价**:
- 应该使用 `item.transferPrice` = €195（调货价格）
- 这才是Mobile123的真实采购成本

## 修复内容

### 文件: app.js

**位置**: 第8633行

**修改前**:
```javascript
} else {
  // 公司间销售：使用自定义价格
  const customPrice = customPrices && customPrices[i];
  if (!customPrice) {
    throw new Error(`缺少产品 ${item.productName} 的价格设置`);
  }
  
  costPrice = fromInventory.wholesalePrice; // 成本价 = 原产品的批发价
  wholesalePrice = parseFloat(customPrice.wholesalePrice);
  retailPrice = parseFloat(customPrice.retailPrice);
  
  // 验证价格
  if (isNaN(wholesalePrice) || wholesalePrice < 0) {
    throw new Error(`产品 ${item.productName} 的批发价无效`);
  }
  if (isNaN(retailPrice) || retailPrice < 0) {
    throw new Error(`产品 ${item.productName} 的零售价无效`);
  }
}
```

**修改后**:
```javascript
} else {
  // 公司间销售：使用自定义价格
  const customPrice = customPrices && customPrices[i];
  if (!customPrice) {
    throw new Error(`缺少产品 ${item.productName} 的价格设置`);
  }
  
  // 成本价 = 调货价格（真实的采购成本）
  costPrice = item.transferPrice;
  wholesalePrice = parseFloat(customPrice.wholesalePrice);
  retailPrice = parseFloat(customPrice.retailPrice);
  
  // 验证价格
  if (isNaN(wholesalePrice) || wholesalePrice < 0) {
    throw new Error(`产品 ${item.productName} 的批发价无效`);
  }
  if (isNaN(retailPrice) || retailPrice < 0) {
    throw new Error(`产品 ${item.productName} 的零售价无效`);
  }
}
```

## 价格字段说明

### 调货记录中的价格
- `transferPrice`: 调货价格（公司间销售的交易价格）

### 库存记录中的价格
- `costPrice`: 采购成本（真实的进货成本）
- `wholesalePrice`: 批发价（对外销售的批发价格）
- `retailPrice`: 零售价（对外销售的零售价格）

### 正确的价格流转

#### 内部调拨 (INTERNAL_TRANSFER)
```
调出方库存 → 调入方库存
costPrice: 完全继承
wholesalePrice: 完全继承
retailPrice: 完全继承
```

#### 公司间销售 (INTER_COMPANY_SALE)
```
调出方库存 → 调货记录 → 调入方库存

调货记录:
  transferPrice: €195 (交易价格)

调入方库存:
  costPrice: €195 (= transferPrice，真实采购成本)
  wholesalePrice: €200 (用户手动设置)
  retailPrice: €249 (用户手动设置)
```

## 影响范围

### 已修复
1. ✅ 确认收货API - 使用transferPrice作为costPrice
2. ✅ 销售API - 优先使用costPrice计算利润
3. ✅ 前端利润计算 - 扣除应缴税额

### 历史数据
- 已经保存的库存记录不会自动更新
- 新的确认收货会使用正确的成本价
- 历史销售记录保持不变（财务一致性）

## 测试验证

### 测试场景

1. **创建新的调货订单**
   - 从MurrayRanelagh调货到Mobile123
   - 调货价格: €195
   - 确认收货时设置批发价: €200

2. **验证库存记录**
   - 检查Mobile123的库存
   - costPrice应该是€195（调货价格）
   - wholesalePrice应该是€200（用户设置）

3. **销售产品**
   - 销售价格: €249
   - 成本价: €195（从库存读取）
   - 利润计算: €249 - €195 - 税额

### 预期结果

**IPHONE11 利润计算**:
```
销售价格: €249
成本价: €195 (使用transferPrice)
税额: €9.16
毛利润: €249 - €195 = €54
净利润: €54 - €9.16 = €44.84
```

**Mobile123 2月11日总利润**:
```
IPHONE11: €44.84
iPhone Screen Saver: €6.13
总净利润: €50.97
```

## 版本信息

- 修复日期: 2026年2月11日
- 版本: v2.4.2
- 服务器进程: 24
- 状态: ✅ 已重启并运行

## 相关文档

- `FIX_PROFIT_CALCULATION.md` - 利润计算修复
- `PROFIT_CALCULATION_FIX_SUMMARY.md` - 利润计算总结
- `check-imei-352928114188457.js` - IMEI追踪脚本
- `calculate-mobile123-profit-feb11.js` - 利润计算脚本
