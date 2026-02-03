# 修复：税务分类逻辑（二手设备）

## 修复日期
2026-02-02

## 问题描述
序列号为 111222 的产品（ipad 8 128GB）是二手设备，但税务分类被设置为 `VAT_23`（标准税率），而不是正确的 `MARGIN_VAT_0`（差价税制）。

## 问题分析

### 产品信息
```json
{
  "productName": "ipad 8 128GB",
  "category": "二手设备",
  "condition": "PRE_OWNED",
  "taxClassification": "VAT_23",  // ❌ 错误！应该是 MARGIN_VAT_0
  "serialNumber": "111222"
}
```

### 分类配置
```json
{
  "type": "二手设备",
  "defaultVatRate": "VAT 0%"
}
```

### 问题根源
入库时的税率转换逻辑有缺陷：

**原逻辑**：
```javascript
const vatRate = categoryDoc.defaultVatRate;
if (vatRate.includes('23')) {
  taxClassification = 'VAT_23';
} else if (vatRate.includes('13.5')) {
  taxClassification = 'SERVICE_VAT_13_5';
} else if (vatRate.toLowerCase().includes('margin')) {
  taxClassification = 'MARGIN_VAT_0';
}
// 如果都不匹配，使用默认值 VAT_23
```

**问题**：
- `VAT 0%` 不包含 "23"、"13.5" 或 "margin"
- 因此使用默认值 `VAT_23`
- 但 `VAT 0%` 实际上应该被识别为 Margin VAT（二手商品差价税制）

## 解决方案

### 1. 改进税率转换逻辑

**文件**：`StockControl-main/app.js` (约3730-3760行)

**新逻辑**：
```javascript
// 从分类获取默认税率
let taxClassification = 'VAT_23'; // 默认值
try {
  const categoryDoc = await ProductCategory.findOne({ type: category, isActive: true });
  if (categoryDoc && categoryDoc.defaultVatRate) {
    const vatRate = categoryDoc.defaultVatRate.toLowerCase();
    
    if (vatRate.includes('margin') || vatRate.includes('0%')) {
      // Margin VAT 或 VAT 0% (二手商品差价税制)
      taxClassification = 'MARGIN_VAT_0';
    } else if (vatRate.includes('23')) {
      // VAT 23% (标准税率)
      taxClassification = 'VAT_23';
    } else if (vatRate.includes('13.5')) {
      // Service VAT 13.5% (服务税率)
      taxClassification = 'SERVICE_VAT_13_5';
    } else {
      // 其他情况，根据成色判断
      if (condition === 'PRE_OWNED' || condition === 'REFURBISHED') {
        taxClassification = 'MARGIN_VAT_0';
      }
    }
  } else {
    // 如果没有找到分类配置，根据成色判断
    if (condition === 'PRE_OWNED' || condition === 'REFURBISHED') {
      taxClassification = 'MARGIN_VAT_0';
    }
  }
} catch (categoryError) {
  console.log('获取分类税率失败，使用默认值:', categoryError.message);
  // 根据成色判断
  if (condition === 'PRE_OWNED' || condition === 'REFURBISHED') {
    taxClassification = 'MARGIN_VAT_0';
  }
}
```

### 2. 更新已有数据

**文件**：`StockControl-main/update-tax-classification.js`

批量更新所有二手和翻新设备的税务分类：
```javascript
await MerchantInventory.updateMany(
  {
    $or: [
      { condition: 'PRE_OWNED' },
      { condition: 'REFURBISHED' },
      { category: '二手设备' }
    ],
    taxClassification: 'VAT_23'
  },
  {
    taxClassification: 'MARGIN_VAT_0'
  }
);
```

## 改进要点

### 1. 识别 VAT 0%
- `VAT 0%` 现在被正确识别为 Margin VAT
- 适用于二手商品差价税制

### 2. 成色判断后备机制
如果分类配置不存在或无法识别税率，根据产品成色判断：
- `PRE_OWNED`（二手）→ `MARGIN_VAT_0`
- `REFURBISHED`（翻新）→ `MARGIN_VAT_0`
- `BRAND_NEW`（全新）→ `VAT_23`（默认）

### 3. 优先级
```
1. 分类配置的 defaultVatRate
   ├─ "margin" 或 "0%" → MARGIN_VAT_0
   ├─ "23" → VAT_23
   └─ "13.5" → SERVICE_VAT_13_5
   
2. 如果无法识别，根据成色判断
   ├─ PRE_OWNED/REFURBISHED → MARGIN_VAT_0
   └─ 其他 → VAT_23
```

## 税制说明

### Margin VAT（差价税制）
适用于：
- 二手商品
- 翻新商品
- 艺术品、收藏品、古董

计算方式：
```
应缴税额 = (销售价 - 采购成本) × 23/123
```

示例：
```
采购成本：€120
销售价格：€199
差价：€79
应缴税额：€79 × 23/123 = €14.78
```

### VAT 23%（标准税率）
适用于：
- 全新商品
- 一般商品和服务

计算方式：
```
销项税 = 销售额 × 23/123
进项税 = 成本 × 23/123
应缴税额 = 销项税 - 进项税
```

## 验证结果

### 更新前
```json
{
  "productName": "ipad 8 128GB",
  "category": "二手设备",
  "condition": "PRE_OWNED",
  "taxClassification": "VAT_23"  // ❌ 错误
}
```

### 更新后
```json
{
  "productName": "ipad 8 128GB",
  "category": "二手设备",
  "condition": "PRE_OWNED",
  "taxClassification": "MARGIN_VAT_0"  // ✅ 正确
}
```

### 税额对比

**使用 VAT 23%（错误）**：
```
销售额：€199
销项税：€199 × 23/123 = €37.21
成本：€120
进项税：€120 × 23/123 = €22.44
应缴税额：€37.21 - €22.44 = €14.77
```

**使用 Margin VAT（正确）**：
```
销售额：€199
成本：€120
差价：€79
应缴税额：€79 × 23/123 = €14.78
```

结果相近，但法律依据不同！二手商品必须使用 Margin VAT。

## 测试步骤

### 步骤 1：验证已有产品
```bash
node -e "const mongoose = require('mongoose'); require('dotenv').config(); mongoose.connect(process.env.MONGODB_URI).then(async () => { const MerchantInventory = require('./models/MerchantInventory'); const product = await MerchantInventory.findOne({ serialNumber: '111222' }); console.log('税务分类:', product.taxClassification); mongoose.connection.close(); });"
```

**预期输出**：`税务分类: MARGIN_VAT_0`

### 步骤 2：测试新入库
1. 登录商户账号
2. 进入"我的库存"
3. 点击"+ 手动入库"
4. 填写信息：
   - 产品名称：iPhone 12
   - 分类：二手设备
   - 成色：二手（PRE_OWNED）
   - 其他必填信息
5. 提交入库

**预期结果**：税务分类自动设置为 `MARGIN_VAT_0`

### 步骤 3：验证销售税额计算
1. 销售一个二手设备
2. 查看销售记录
3. 检查税额计算是否使用 Margin VAT 公式

## 相关文件

- `StockControl-main/app.js` - 入库API税率转换逻辑
- `StockControl-main/update-tax-classification.js` - 批量更新脚本
- `StockControl-main/models/MerchantInventory.js` - 库存模型
- `StockControl-main/models/ProductCategory.js` - 分类模型

## 注意事项

1. **法律合规**：二手商品必须使用 Margin VAT，这是爱尔兰税法要求
2. **成色判断**：PRE_OWNED 和 REFURBISHED 都应使用 Margin VAT
3. **分类配置**：建议将"二手设备"分类的默认税率改为 "Margin VAT" 而不是 "VAT 0%"
4. **已有数据**：运行 `update-tax-classification.js` 更新已有的错误数据
5. **新入库**：新入库的二手/翻新设备会自动使用正确的税务分类

## 建议的分类配置

### 二手设备
```json
{
  "type": "二手设备",
  "defaultVatRate": "Margin VAT",  // 推荐使用这个
  "defaultCondition": "PRE_OWNED"
}
```

### 翻新设备
```json
{
  "type": "翻新设备",
  "defaultVatRate": "Margin VAT",
  "defaultCondition": "REFURBISHED"
}
```

### 全新设备
```json
{
  "type": "全新设备",
  "defaultVatRate": "VAT 23%",
  "defaultCondition": "BRAND_NEW"
}
```

## 总结

本次修复解决了二手设备税务分类错误的问题，确保：
1. ✅ `VAT 0%` 被正确识别为 Margin VAT
2. ✅ 二手和翻新设备自动使用 Margin VAT
3. ✅ 已有错误数据已更新
4. ✅ 新入库产品使用正确的税务分类
5. ✅ 符合爱尔兰税法要求

---

**修复人员**：Kiro AI Assistant  
**审核状态**：✅ 已完成  
**测试状态**：✅ 已验证  
**部署状态**：✅ 已部署（服务器进程 15）
