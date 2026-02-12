# 利润计算修复总结

## 修复完成 ✅

已成功修复利润计算逻辑，现在系统会：
1. 使用真实的采购成本（`costPrice`）而不是批发价（`wholesalePrice`）
2. 从利润中扣除应缴税额

## 修改内容

### 1. 后端修改 (app.js)

**位置**: 第7759行

**修改**: 优先使用`costPrice`作为成本价
```javascript
// 修改前
const costPrice = inventory.wholesalePrice || inventory.costPrice;

// 修改后
const costPrice = inventory.costPrice || inventory.wholesalePrice;
```

### 2. 前端修改 (merchant.html)

**位置**: 第1679-1683行

**修改**: 利润计算扣除税额
```javascript
// 修改前
sale.items.forEach(item => {
  totalProfit += (item.price - item.costPrice) * item.quantity;
});

// 修改后
sale.items.forEach(item => {
  const itemProfit = (item.price - item.costPrice) * item.quantity;
  const itemTax = item.taxAmount || 0;
  totalProfit += itemProfit - itemTax;
});
```

## 测试结果

### Mobile123 销售数据对比

**订单1: IPHONE11**
- 销售价: €249
- 成本价: €200（历史数据）
- 税额: €9.16
- 旧算法利润: €49.00
- 新算法利润: €39.84
- 差异: €9.16

**订单2: iPhone Screen Saver**
- 销售价: €10
- 成本价: €2
- 税额: €1.87
- 旧算法利润: €8.00
- 新算法利润: €6.13
- 差异: €1.87

**总计（不含退款）**:
- 旧算法总利润: €57.00
- 新算法总利润: €45.97
- 差异: €11.03

## 新的利润计算公式

```
净利润 = (销售价格 - 采购成本) × 数量 - 应缴税额
```

### 详细说明

1. **毛利润** = (销售价格 - 采购成本) × 数量
2. **应缴税额** = 根据税务分类计算
   - VAT_23: 销售额 × 23/123
   - SERVICE_VAT_13_5: 销售额 × 13.5/113.5
   - MARGIN_VAT_0: (销售额 - 成本) × 23/123
3. **净利润** = 毛利润 - 应缴税额

## 关于历史数据

### 重要说明

**历史销售记录中的成本价不会自动更新**，因为：
1. 销售时已经记录了当时的成本价
2. 修改历史数据可能导致财务记录不一致
3. 新的销售会使用正确的成本价

### IPHONE11 成本价问题

**IMEI 352928114188457 的成本追踪**:
- 原始采购成本（MurrayRanelagh）: €195
- 调货价格: €195
- Mobile123设置的批发价: €200
- 销售时记录的成本价: €200

**为什么是€200而不是€195？**

销售时，系统从`MerchantInventory`中读取成本价。在确认收货时，如果用户修改了批发价为€200，系统可能也更新了成本价。

**解决方案**:

从现在开始，新的销售会：
1. 优先使用`costPrice`（真实采购成本）
2. 如果`costPrice`不存在，才使用`wholesalePrice`
3. 确认收货时，不应该修改`costPrice`，只修改`wholesalePrice`

## 下一步操作

### 1. 强制刷新浏览器
按 `Ctrl + Shift + R` 清除缓存

### 2. 查看本日销售明细
- 登录Mobile123账户
- 点击"本日销售明细"
- 查看利润是否已扣除税额

### 3. 创建新的销售订单测试
- 销售一个产品
- 查看利润计算是否正确
- 验证成本价是否使用真实采购成本

## 需要注意的问题

### 确认收货时的价格设置

当前在确认收货时，用户可以设置批发价和零售价。需要确保：
1. **批发价**: 用户可以修改（用于对外销售）
2. **零售价**: 用户可以修改（用于零售）
3. **成本价**: 不应该被修改，应该保持为调货价格（transferPrice）

这个问题需要在确认收货的逻辑中进一步检查和修复。

## 文件清单

### 已修改
- `app.js` - 销售API成本价逻辑
- `merchant.html` - 利润计算公式

### 新创建
- `FIX_PROFIT_CALCULATION.md` - 详细修复文档
- `test-profit-calculation.js` - 测试脚本
- `PROFIT_CALCULATION_FIX_SUMMARY.md` - 本文档

## 版本信息

- 修复日期: 2026年2月11日
- 版本: v2.4.1
- 服务器进程: 23
- 状态: ✅ 已重启并运行
