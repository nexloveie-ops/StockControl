# 修复销售业务设备产品分组显示

## 问题描述

在 merchant.html 的销售业务中，Pre-Owned Devices 分类下的产品没有按名称分类，而是每个不同颜色的设备都显示为单独的卡片。

例如：
- iPhone 11 (黑色)
- iPhone 11 (白色)
- iPhone 11 (红色)

应该显示为：
- iPhone 11 (3个变体)

## 问题分析

### 原代码逻辑 (merchant.html 第2420-2470行)

```javascript
// 设备产品：按完整信息分组（保持原有逻辑）
// 配件产品：只按 productName + brand 分组
const key = isDevice 
  ? `${item.productName}_${item.brand || ''}_${item.model || ''}_${item.color || ''}`
  : `${item.productName}_${item.brand || ''}`;
```

**问题：** 设备产品按 `productName + brand + model + color` 分组，导致每个不同颜色的设备都显示为单独的卡片。

## 解决方案

### 修改分组逻辑

**修改前：**
```javascript
// 设备产品：按完整信息分组
const key = isDevice 
  ? `${item.productName}_${item.brand || ''}_${item.model || ''}_${item.color || ''}`
  : `${item.productName}_${item.brand || ''}`;
```

**修改后：**
```javascript
// 设备产品：只按 productName 分组（不区分型号和颜色）
// 配件产品：按 productName + brand 分组
const key = isDevice 
  ? `${item.productName}`
  : `${item.productName}_${item.brand || ''}`;
```

### 更新变体检测逻辑

**修改前：**
```javascript
Object.values(groupedProducts).forEach(group => {
  if (!group.isDevice) {
    // 只检测配件产品的变体
    // ...
  }
});
```

**修改后：**
```javascript
Object.values(groupedProducts).forEach(group => {
  // 检测所有产品的变体（包括设备）
  const variants = new Set();
  group.items.forEach(item => {
    const variantKey = `${item.model || 'NO_MODEL'}_${item.color || 'NO_COLOR'}`;
    variants.add(variantKey);
  });
  group.hasVariants = variants.size > 1;
  
  // 如果有变体，收集所有不同的型号和颜色用于显示
  if (group.hasVariants || group.isDevice) {
    const models = new Set();
    const colors = new Set();
    group.items.forEach(item => {
      if (item.model) models.add(item.model);
      if (item.color) colors.add(item.color);
    });
    group.variantModels = Array.from(models);
    group.variantColors = Array.from(colors);
  }
});
```

## 效果对比

### 修改前

Pre-Owned Devices 分类显示：
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ iPhone 11       │  │ iPhone 11       │  │ iPhone 11       │
│ 黑色            │  │ 白色            │  │ 红色            │
│ €349            │  │ €349            │  │ €349            │
│ 1 件库存        │  │ 1 件库存        │  │ 1 件库存        │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│ iPhone 13       │  │ iPhone 13       │
│ 黑色            │  │ 白色            │
│ €450            │  │ €450            │
│ 2 件库存        │  │ 1 件库存        │
└─────────────────┘  └─────────────────┘
```

### 修改后

Pre-Owned Devices 分类显示：
```
┌─────────────────┐  ┌─────────────────┐
│ iPhone 11       │  │ iPhone 13       │
│ 多个变体        │  │ 多个变体        │
│ €349起          │  │ €450起          │
│ 3 件库存        │  │ 3 件库存        │
│ 🎨 选择变体     │  │ 🎨 选择变体     │
└─────────────────┘  └─────────────────┘
```

点击"选择变体"后显示：
```
iPhone 11 - 选择变体

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 黑色            │  │ 白色            │  │ 红色            │
│ SN: 111111      │  │ SN: 111222      │  │ SN: 111333      │
│ €349            │  │ €349            │  │ €349            │
│ ➕ 加入购物车   │  │ ➕ 加入购物车   │  │ ➕ 加入购物车   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## 测试验证

### 测试步骤

1. **刷新浏览器** (Ctrl + Shift + R)

2. **进入销售业务**
   - 登录 merchant.html
   - 点击"销售业务"标签

3. **查看 Pre-Owned Devices**
   - 点击"Pre-Owned Devices"分类
   - 查看产品列表

4. **验证分组**
   - 相同名称的设备应该显示为一个卡片
   - 显示总库存数量
   - 显示"选择变体"按钮

5. **选择变体**
   - 点击"选择变体"按钮
   - 应该显示所有不同颜色/型号的设备
   - 每个设备显示序列号

### 预期结果

- ✅ iPhone 11 显示为一个卡片（不是3个）
- ✅ iPhone 13 显示为一个卡片（不是2个）
- ✅ iPhone 14 显示为一个卡片
- ✅ iPhone 15 显示为一个卡片
- ✅ 每个卡片显示总库存数量
- ✅ 点击后可以选择具体的变体（颜色/型号）

## 影响范围

### 受影响的分类
- Pre-Owned Devices（二手设备）
- Brand New Devices（全新设备）
- 所有包含设备产品的分类

### 不受影响的分类
- Accessories（配件）- 保持原有逻辑（按 productName + brand 分组）
- 其他非设备产品

## 修改的文件

- `StockControl-main/public/merchant.html` (第2420-2470行)
  - 修改 `displayProducts` 函数的分组逻辑

## 完成时间

2026-02-10

## 相关功能

- 销售业务产品显示
- 变体选择功能
- 购物车添加功能

## 注意事项

1. **浏览器刷新**
   - 修改 HTML 文件后需要刷新浏览器
   - 使用 Ctrl + Shift + R 强制刷新

2. **变体选择**
   - 设备产品现在会显示"选择变体"按钮
   - 点击后显示所有可用的变体
   - 每个变体显示序列号、颜色、价格

3. **库存数量**
   - 显示的是该产品名称下所有变体的总库存
   - 例如：iPhone 11 (3件) = 黑色1件 + 白色1件 + 红色1件
