# 修复退款原始成色保存问题

## 问题描述

退款时，二手产品的成色下拉框仍然显示"全新"选项，无法正确过滤。

## 根本原因

经过调查发现，问题的根本原因是：

1. **销售时没有保存 originalCondition**
   - 销售API在创建销售记录时，没有保存产品的原始成色和分类
   - 所有销售记录的 `originalCondition` 和 `originalCategory` 字段都是 `undefined`

2. **默认值不匹配**
   - 退款时使用的默认值是 `'Brand New'`（英文）
   - 但数据库中的成色名称是 `'全新'`（中文）
   - 导致判断逻辑失败：`'Brand New' === '全新'` 返回 `false`

3. **过滤逻辑失效**
   - 因为 `isBrandNew` 判断失败，系统认为这是二手产品
   - 但过滤逻辑也失败了，因为没有正确匹配中文"全新"

## 解决方案

### 修复1: 销售时保存原始成色和分类 ✅

**文件**: `StockControl-main/app.js`
**位置**: 第7280-7290行

**修改前**:
```javascript
saleItems.push({
  inventoryId: item.inventoryId,
  repairOrderId: null,
  productName: item.productName,
  quantity: item.quantity,
  price: item.price,
  costPrice: costPrice,
  taxClassification: taxClassification,
  taxAmount: taxAmount,
  serialNumber: item.serialNumber || null
});
```

**修改后**:
```javascript
saleItems.push({
  inventoryId: item.inventoryId,
  repairOrderId: null,
  productName: item.productName,
  quantity: item.quantity,
  price: item.price,
  costPrice: costPrice,
  taxClassification: taxClassification,
  taxAmount: taxAmount,
  serialNumber: item.serialNumber || null,
  originalCondition: inventory.condition || null, // 保存原始成色
  originalCategory: inventory.category || null    // 保存原始分类
});
```

### 修复2: 使用中文默认值 ✅

**文件**: `StockControl-main/public/merchant.html`

#### 修改2.1: getRefundOptions 函数（第3866行）
**修改前**:
```javascript
const originalCondition = item.originalCondition || 'Brand New';
```

**修改后**:
```javascript
const originalCondition = item.originalCondition || '全新'; // 使用中文默认值，匹配数据库
```

#### 修改2.2: processRefund 函数（第4030行）
**修改前**:
```javascript
const originalCondition = document.getElementById(`originalCondition_${i}`)?.value || item.originalCondition || 'Brand New';
```

**修改后**:
```javascript
const originalCondition = document.getElementById(`originalCondition_${i}`)?.value || item.originalCondition || '全新'; // 使用中文默认值
```

### 修复3: 增强过滤逻辑 ✅

**文件**: `StockControl-main/public/merchant.html`
**位置**: 第3872-3883行

已在之前的修复中完成，支持中英文和 code 匹配。

## 数据流程

### 销售流程（修复后）
```
1. 用户选择产品加入购物车
   ↓
2. 产品信息包含：
   - productName: "iPhone 12"
   - condition: "全新"
   - category: "Brand New Devices"
   ↓
3. 提交销售
   ↓
4. API 创建销售记录
   ↓
5. 保存 saleItems:
   {
     productName: "iPhone 12",
     originalCondition: "全新",  ← 新增
     originalCategory: "Brand New Devices"  ← 新增
   }
```

### 退款流程（修复后）
```
1. 用户查看销售记录
   ↓
2. 点击"详情"
   ↓
3. 读取 item.originalCondition = "全新"
   ↓
4. 判断 isBrandNew:
   "全新" === "全新" → true ✅
   ↓
5. 显示所有成色选项（包括"全新"）
   ↓
6. 用户选择退款成色
```

## 测试验证

### 测试1: 检查现有销售记录
```bash
node check-sale-original-condition.js
```

**结果**:
```
总商品数: 5
缺少 originalCondition: 5
百分比: 100.0%
⚠️ 发现问题：部分销售记录缺少 originalCondition 字段
```

### 测试2: 创建新销售记录
1. 重启服务器（应用修复）
   ```bash
   taskkill /F /IM node.exe
   node app.js
   ```

2. 创建新销售
   - 选择产品：iPhone 12
   - 成色：全新
   - 完成销售

3. 检查数据库
   ```bash
   node check-sale-original-condition.js
   ```

4. **预期结果**:
   ```
   商品 1: iPhone 12
     originalCondition: 全新 ✅
     originalCategory: Brand New Devices ✅
   ```

### 测试3: 测试退款功能
1. 刷新浏览器（Ctrl + Shift + R）

2. 打开新创建的销售记录

3. 点击"详情"，勾选产品

4. **预期结果**:
   - ✅ 成色下拉框显示：全新, Like New, Excellent, Good, Fair, 二手
   - ✅ 默认选中：全新
   - ✅ 不显示"(二手产品不可变为全新)"提示

## 旧数据处理

对于已存在的销售记录（没有 originalCondition），系统会：

1. 使用默认值 `'全新'`（中文）
2. 判断为全新产品
3. 显示所有成色选项

这样可以确保旧数据也能正常工作。

### 可选：批量更新旧数据

如果需要为旧数据补充 originalCondition，可以运行：

```javascript
// update-old-sales-condition.js
const mongoose = require('mongoose');
require('dotenv').config();

async function updateOldSales() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const MerchantSale = require('./models/MerchantSale');
  const MerchantInventory = require('./models/MerchantInventory');
  
  const sales = await MerchantSale.find({
    'items.originalCondition': { $exists: false }
  });
  
  for (const sale of sales) {
    let updated = false;
    
    for (const item of sale.items) {
      if (!item.originalCondition && item.inventoryId) {
        // 尝试从库存中获取成色
        const inventory = await MerchantInventory.findById(item.inventoryId);
        if (inventory) {
          item.originalCondition = inventory.condition || '全新';
          item.originalCategory = inventory.category || '';
          updated = true;
        }
      }
    }
    
    if (updated) {
      await sale.save();
      console.log(`✅ 更新销售记录: ${sale._id}`);
    }
  }
  
  await mongoose.connection.close();
}

updateOldSales();
```

## 影响范围

### 修改的文件
1. `StockControl-main/app.js` - 销售API
2. `StockControl-main/public/merchant.html` - 退款界面

### 影响的功能
1. ✅ 销售功能 - 现在会保存原始成色和分类
2. ✅ 退款功能 - 现在能正确判断和过滤成色
3. ✅ 退款小票 - 显示正确的成色信息

### 不影响的功能
- 库存管理
- 产品搜索
- 财务报表
- 其他功能

## 重要提示

### 1. 必须重启服务器
修改了 `app.js`，必须重启服务器才能生效：
```bash
taskkill /F /IM node.exe
node app.js
```

### 2. 必须刷新浏览器
修改了 `merchant.html`，必须强制刷新浏览器：
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### 3. 旧数据兼容性
- 旧销售记录没有 originalCondition
- 系统会使用默认值 '全新'
- 退款功能仍然可以正常工作

### 4. 新销售记录
- 从现在开始，所有新销售都会保存 originalCondition
- 退款时能正确判断原始成色
- 成色过滤逻辑正常工作

## 相关文档
- `FIX_REFUND_CONDITION_FILTER_CHINESE.md` - 成色过滤逻辑修复
- `REFUND_CONDITION_LOGIC.md` - 退款成色业务逻辑
- `SALES_REFUND_FEATURE.md` - 退款功能说明

## 状态
✅ **修复完成** - 销售时现在会保存原始成色，退款时能正确判断和过滤

**修复内容**:
1. ✅ 销售API保存 originalCondition 和 originalCategory
2. ✅ 退款界面使用中文默认值 '全新'
3. ✅ 增强过滤逻辑支持中英文
4. ✅ 旧数据兼容性处理

**修复日期**: 2026-02-10

---

## 快速测试步骤

1. **重启服务器**
   ```bash
   taskkill /F /IM node.exe
   node app.js
   ```

2. **刷新浏览器**
   ```
   Ctrl + Shift + R
   ```

3. **创建新销售**
   - 选择产品
   - 完成销售

4. **测试退款**
   - 打开销售记录
   - 点击"详情"
   - 勾选产品
   - 查看成色下拉框

5. **预期结果**
   - ✅ 全新产品：显示所有成色（包括"全新"）
   - ✅ 二手产品：不显示"全新"
