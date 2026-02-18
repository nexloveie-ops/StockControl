# 重复产品显示修复

## 问题描述

在仓库管理员页面的产品列表中，iPhone 17显示了两条记录：
1. "iPhone 17 - 1个变体"（来自AdminInventory表）
2. "iPhone 17 - 4个序列号"（来自ProductNew表）

这导致同一个产品被重复显示，造成混淆。

## 根本原因

`/api/products` API同时查询了两个表：
1. **ProductNew表**：产品主表，用于产品管理
2. **AdminInventory表**：库存记录表，用于进货历史

当手动录入产品时，我们的修复代码会同时在两个表中创建记录：
- ProductNew：更新产品信息和序列号
- AdminInventory：创建入库记录（用于进货历史）

但是API会将两个表的数据合并返回，导致同一个产品显示两次。

## 数据库状态

### ProductNew表
```
_id: 69950e771077d6f1ab244259
名称: iPhone 17
品牌: Apple
型号: 128GB
颜色: black
成色: PRE-OWNED
库存数量: 4
序列号: 
  1. 99881122 (black)
  2. 99881133 (black)
  3. 99881144 (White)
  4. 99881155 (red)
```

### AdminInventory表
```
_id: 69951284bb12337b5e0211fc
产品名称: iPhone 17
品牌: Apple
型号: 128GB
颜色: red
成色: PRE-OWNED
数量: 1
序列号: 99881155
来源: manual
供货商: Xtreme Tech Ltd
```

## 解决方案

修改 `/api/products` API，在返回AdminInventory数据时，过滤掉在ProductNew中已存在的产品。

### 修改代码 (app.js, lines 240-280)

```javascript
// 处理 AdminInventory 产品，转换为与 ProductNew 兼容的格式
// 注意：只显示在ProductNew中不存在的产品（避免重复）
const productNewNames = new Set(productNewItems.map(p => p.name.toLowerCase()));

const adminProducts = adminInventoryItems
  .filter(item => {
    // 只包含在ProductNew中不存在的产品
    const productName = item.productName.toLowerCase();
    return !productNewNames.has(productName);
  })
  .map(item => {
    // ... 转换逻辑保持不变
  });
```

### 逻辑说明

1. 创建一个Set，包含所有ProductNew中的产品名称（转换为小写以便不区分大小写比较）
2. 过滤AdminInventory的记录，只保留在ProductNew中不存在的产品
3. 这样可以避免重复显示，同时保留AdminInventory中独有的产品（如纯配件变体）

## 数据表的用途

### ProductNew表
- **用途**：产品主表，用于产品管理和库存统计
- **特点**：
  - 每个产品一条记录
  - 包含序列号数组（设备产品）
  - 用于产品列表显示
  - 用于库存数量统计

### AdminInventory表
- **用途**：库存记录表，用于进货历史追踪
- **特点**：
  - 每次入库创建一条记录
  - 记录入库来源（manual/invoice/transfer）
  - 记录供货商信息
  - 用于进货历史查询
  - 用于配件产品的变体管理

## 为什么需要两个表？

1. **ProductNew**：适合管理有序列号的设备产品
   - 一个产品可以有多个序列号
   - 方便统一管理和定价
   - 适合设备类产品（手机、平板等）

2. **AdminInventory**：适合管理配件产品和进货记录
   - 每个变体（型号+颜色）单独记录
   - 记录详细的入库信息
   - 适合配件类产品（充电器、保护壳等）
   - 提供完整的进货历史

## 测试步骤

1. 打开仓库管理员页面：http://localhost:3000/prototype-working.html
2. 点击"Pre-Owned Devices"分类
3. 应该只看到一条iPhone 17记录（4个序列号）
4. 不应该再看到"1个变体"的重复记录
5. 点击产品名称查看进货历史，应该能看到手动入库记录

## 预期结果

- 产品列表中每个产品只显示一次
- ProductNew中的产品优先显示
- AdminInventory中独有的产品（不在ProductNew中）仍然会显示
- 进货历史功能不受影响

## 注意事项

1. **历史数据**：此修复不会删除AdminInventory中的记录，只是在显示时过滤
2. **进货历史**：AdminInventory的记录仍然用于显示进货历史
3. **配件产品**：纯配件产品（只在AdminInventory中）仍然会正常显示
4. **数据一致性**：手动录入时仍然会同时更新两个表

## 相关文件

- `StockControl-main/app.js` (lines 136-300 - /api/products API)
- `StockControl-main/models/ProductNew.js`
- `StockControl-main/models/AdminInventory.js`
- `StockControl-main/MANUAL_RECEIVING_INVENTORY_FIX.md` (相关修复文档)

## 修复日期

2026-02-18
