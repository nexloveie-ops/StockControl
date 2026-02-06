# 修复仓库订货重复库存记录问题

## 问题描述

在merchant.html的"我的库存"页面，同一个产品（如Data Cable）显示了多次，每条记录的所有信息都完全相同，数量都是1。

## 问题原因

**根本原因：** 仓库订货确认收货API（`app.js` 第2745-2762行）在处理配件时，使用了错误的循环逻辑：

```javascript
// ❌ 错误的代码
for (let j = 0; j < quantity; j++) {
  const merchantInventory = new MerchantInventory({
    ...
    quantity: 1,  // 每条记录quantity=1
    ...
  });
  await merchantInventory.save();
}
```

**问题分析：**
- 如果订单quantity=10，会创建10条独立的库存记录
- 每条记录的quantity=1
- 所有记录的信息完全相同（产品名、品牌、型号、颜色、价格等）
- 导致库存列表显示大量重复记录

**实际案例：**
- 订单号：WO-20260206-5728
- 产品：Data Cable (USB-A TO MICRO)
- 订单数量：10
- 创建了10条记录，每条quantity=1
- 创建时间：2026-02-06 00:30:17（同一时间）

## 修复方案

### 1. 修复API代码

**文件：** `app.js` 第2745-2762行

**修改前：**
```javascript
// 创建商户库存记录
for (let j = 0; j < quantity; j++) {
  const merchantInventory = new MerchantInventory({
    ...
    quantity: 1,
    ...
  });
  await merchantInventory.save();
}
```

**修改后：**
```javascript
// 创建商户库存记录（一条记录，数量为订单数量）
const merchantInventory = new MerchantInventory({
  ...
  quantity: quantity, // 使用订单数量，不是1
  ...
});
await merchantInventory.save();
```

**修复逻辑：**
- 配件应该创建**一条记录**，quantity=订单数量
- 不需要循环创建多条记录
- 只有设备（有序列号/IMEI）才需要为每个序列号创建独立记录

### 2. 合并现有重复记录

**脚本：** `merge-duplicate-inventory.js`

**执行结果：**
```
总共找到 61 条库存记录
发现 12 组重复记录
需要合并 47 条重复记录

✅ 合并完成！共处理 12 组重复记录
```

**合并逻辑：**
1. 按关键字段分组（商户+产品名+品牌+型号+颜色+成色+价格+来源订单）
2. 计算每组的总数量
3. 保留第一条记录，更新为总数量
4. 删除其他重复记录

**合并示例：**
- Data Cable: 10条记录 → 1条记录（quantity=7）
- iPhone Screen Saver (iPhone 11): 10条记录 → 1条记录（quantity=10）
- iPhone Screen Saver (iPhone 13): 10条记录 → 1条记录（quantity=10）
- iPhone Screen Saver (iPhone 14): 10条记录 → 1条记录（quantity=9）

### 3. 优化前端显示

**文件：** `public/merchant.html` v2.3.0

**新增功能：**
- 自动合并相同产品显示（相同名称、品牌、型号、颜色、成色）
- 显示总数量和记录数
- 如果有多条记录，显示"查看详情"按钮
- 点击可查看所有库存记录的详细信息

**显示逻辑：**
```javascript
// 合并相同产品
const productMap = {};
products.forEach(item => {
  const key = `${item.productName}_${item.brand}_${item.model}_${item.color}_${item.condition}`;
  if (!productMap[key]) {
    productMap[key] = {
      ...item,
      totalQuantity: 0,
      records: []
    };
  }
  productMap[key].totalQuantity += item.quantity;
  productMap[key].records.push(item);
});
```

## 数据存储设计说明

### 为什么会有多条记录？

**正确的场景（应该有多条记录）：**

1. **设备（Device）：** 每个设备有唯一的序列号/IMEI
   - iPhone 14 - SN: 350032738439198 → 1条记录
   - iPhone 14 - SN: 350032738439199 → 1条记录
   - 每条记录quantity=1

2. **不同批次的配件：** 成本价不同
   - Data Cable - 成本€1.50 → 1条记录
   - Data Cable - 成本€1.70 → 1条记录

3. **不同来源的配件：**
   - Data Cable - 来源：仓库订货 → 1条记录
   - Data Cable - 来源：手动入库 → 1条记录

4. **不同成色的产品：**
   - iPhone 13 - BRAND_NEW → 1条记录
   - iPhone 13 - USED_A_GRADE → 1条记录

**错误的场景（不应该有多条记录）：**
- 相同产品、相同价格、相同来源、相同成色 → 应该是1条记录，quantity=总数量

## 测试验证

### 测试步骤

1. **清除浏览器缓存**（Ctrl+Shift+Delete）
2. **强制刷新页面**（Ctrl+F5）
3. **登录 MurrayDundrum**
4. **进入"我的库存"**
5. **点击 Cable 分类**

### 预期结果

- Data Cable 只显示1条记录
- 数量显示为7（不是7条记录每条1个）
- 其他配件也应该合并显示

### 新订单测试

1. **创建新的仓库订单**
2. **订购配件（如Data Cable x 5）**
3. **确认收货**
4. **检查库存**

**预期：**
- 只创建1条新记录，quantity=5
- 或者更新现有记录，quantity增加5

## 影响范围

### 修复的功能
- ✅ 仓库订货确认收货（配件）
- ✅ 库存列表显示（自动合并）
- ✅ 历史数据清理（合并重复记录）

### 不受影响的功能
- ✅ 设备订货（每个序列号独立记录）
- ✅ 手动入库
- ✅ 调货功能
- ✅ 销售功能

## 文件修改清单

1. **app.js** - 修复仓库订货确认收货API
2. **public/merchant.html** - 优化库存显示（v2.3.0）
3. **merge-duplicate-inventory.js** - 合并重复记录脚本（新增）
4. **check-duplicate-creation.js** - 检查重复记录脚本（新增）

## 版本信息

- **页面版本：** v2.3.0
- **修复日期：** 2026-02-06
- **服务器进程：** 54（已重启）

## 总结

这个bug是由于对配件库存的存储逻辑理解错误导致的。配件不需要像设备那样为每个单位创建独立记录，应该使用quantity字段来表示数量。修复后，系统的库存管理更加清晰和高效。
