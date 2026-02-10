# 修复销售小票中维修单显示中文问题

## 问题
在销售业务中，将维修订单加入购物车并结账打印小票时，维修单的产品名称显示为中文："🔧 设备名称 (维修)"。

## 原因
`addRepairToCart()` 函数中，维修订单的产品名称使用了中文"(维修)"。

## 解决方案
将维修订单的产品名称改为英文。

### 修改内容

#### 修改 `addRepairToCart()` 函数

**修改前**：
```javascript
cart.push({
  repairId: repairId,
  productName: `🔧 ${deviceName} (维修)`,
  price: price,
  quantity: 1,
  maxQty: 1,
  taxClassification: 'SERVICE_VAT_13_5',
  isRepair: true,
  customerPhone: customerPhone
});
```

**修改后**：
```javascript
cart.push({
  repairId: repairId,
  productName: `🔧 ${deviceName} (Repair Service)`,
  price: price,
  quantity: 1,
  maxQty: 1,
  taxClassification: 'SERVICE_VAT_13_5',
  isRepair: true,
  customerPhone: customerPhone
});
```

## 显示效果

### 修改前
```
🔧 iPhone 13 Pro (维修)
1 x €50.00                €50.00
```

### 修改后
```
🔧 iPhone 13 Pro (Repair Service)
1 x €50.00                €50.00
```

## 影响范围
- 销售购物车显示
- 销售小票打印
- 销售记录查询
- 销售发票

所有显示维修订单的地方都会使用英文"(Repair Service)"。

## 测试步骤
1. 使用 **Ctrl + Shift + R** 强制刷新浏览器
2. 进入"销售业务"页面
3. 从"等待销售的维修订单"中选择一个维修单
4. 点击"+ 加入购物车"
5. 检查购物车中的产品名称应显示为："🔧 设备名称 (Repair Service)"
6. 完成结账并打印小票
7. 检查小票上的维修单名称应为英文

## 文件修改
- `StockControl-main/public/merchant.html` - 修改 `addRepairToCart()` 函数

## 状态
✅ 已修复
