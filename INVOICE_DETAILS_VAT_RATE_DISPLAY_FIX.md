# 发票详情税率显示修复

## 实现日期
2026-02-18

## 问题描述
在"供货商/客户管理 > 供货商管理 > 查看发票"中，发票详情显示的税率不正确。产品入库时选择的税率没有正确显示在发票详情中。

## 问题原因

### 数据格式不一致
系统中存在两种税率数据格式：

1. **前端显示格式**（用户友好）：
   - `'VAT 23%'`
   - `'VAT 13.5%'`
   - `'VAT 0%'`
   - `'Margin VAT'`

2. **数据库存储格式**（AdminInventory模型）：
   - `'VAT_23'`
   - `'VAT_13_5'` 或 `'SERVICE_VAT_13_5'`
   - `'VAT_0'`
   - `'MARGIN_VAT_0'` 或 `'MARGIN_VAT'`

### API转换逻辑不完整
在 `/api/purchase-orders/:id` API中，从 `AdminInventory` 读取产品时，税率转换逻辑只处理了下划线格式，没有处理已经是正确格式的情况：

```javascript
// 旧代码（有问题）
vatRate: product.taxClassification === 'VAT_23' ? 'VAT 23%' : 
         product.taxClassification === 'VAT_13_5' ? 'VAT 13.5%' : 'VAT 0%',
```

这个逻辑的问题：
1. 只处理了 `VAT_23`、`VAT_13_5` 两种情况
2. 其他所有情况都默认为 `'VAT 0%'`
3. 没有处理 `Margin VAT`
4. 没有处理已经是正确格式的情况（如 `'VAT 23%'`）

## 解决方案

### 修改API税率转换逻辑
在 `app.js` 的 `/api/purchase-orders/:id` API中，改进税率转换逻辑：

```javascript
// 格式化AdminInventory产品为发票items格式
const adminItems = adminProducts.map(product => {
  // 智能转换税率格式
  let vatRate = 'VAT 23%'; // 默认值
  
  if (product.taxClassification) {
    const taxClass = product.taxClassification;
    
    // 处理下划线格式（VAT_23, VAT_13_5, VAT_0）
    if (taxClass === 'VAT_23') {
      vatRate = 'VAT 23%';
    } else if (taxClass === 'VAT_13_5') {
      vatRate = 'VAT 13.5%';
    } else if (taxClass === 'VAT_0') {
      vatRate = 'VAT 0%';
    } else if (taxClass === 'MARGIN_VAT_0' || taxClass === 'MARGIN_VAT') {
      vatRate = 'Margin VAT';
    } else if (taxClass.includes('VAT') && taxClass.includes('%')) {
      // 已经是正确格式（VAT 23%, VAT 13.5%, VAT 0%）
      vatRate = taxClass;
    } else if (taxClass.toLowerCase().includes('margin')) {
      vatRate = 'Margin VAT';
    }
  }
  
  return {
    _id: product._id,
    description: `${product.productName} - ${product.model} - ${product.color}`,
    product: product._id,
    productName: product.productName,
    model: product.model,
    color: product.color,
    quantity: product.quantity,
    unitCost: product.costPrice,
    totalCost: product.costPrice * product.quantity,
    vatRate: vatRate,
    taxAmount: 0, // AdminInventory价格已含税
    serialNumbers: product.serialNumber ? [product.serialNumber] : [],
    location: product.location,
    condition: product.condition,
    source: 'AdminInventory'
  };
});
```

### 转换逻辑说明

新的转换逻辑支持以下所有格式：

1. **下划线格式** → **显示格式**
   - `'VAT_23'` → `'VAT 23%'`
   - `'VAT_13_5'` → `'VAT 13.5%'`
   - `'VAT_0'` → `'VAT 0%'`
   - `'MARGIN_VAT_0'` → `'Margin VAT'`
   - `'MARGIN_VAT'` → `'Margin VAT'`

2. **已经是正确格式** → **保持不变**
   - `'VAT 23%'` → `'VAT 23%'`
   - `'VAT 13.5%'` → `'VAT 13.5%'`
   - `'VAT 0%'` → `'VAT 0%'`
   - `'Margin VAT'` → `'Margin VAT'`

3. **模糊匹配**
   - 包含 "VAT" 和 "%" → 保持原值
   - 包含 "margin"（不区分大小写）→ `'Margin VAT'`

4. **默认值**
   - 如果无法识别 → `'VAT 23%'`

## 数据流程

### 手动录入入库
1. 用户在前端选择税率：`'VAT 23%'`
2. 前端发送到后端：`vatRate: 'VAT 23%'`
3. 后端保存到 `AdminInventory`：`taxClassification: 'VAT 23%'` 或 `'VAT_23'`（取决于API实现）
4. 读取时转换回显示格式：`vatRate: 'VAT 23%'`

### 发票识别入库
1. AI识别发票，提取税率信息
2. 后端保存到 `AdminInventory`：`taxClassification: 'VAT_23'`（下划线格式）
3. 读取时转换为显示格式：`vatRate: 'VAT 23%'`

## 测试步骤

1. 打开 `prototype-working.html` 页面
2. 登录为仓库管理员
3. 进入"供货商/客户管理" > "供货商管理"
4. 点击任意供货商的"查看发票"
5. 在发票详情中，检查产品列表的税率显示
6. 应该看到正确的税率（如 `VAT 23%`、`VAT 13.5%`、`Margin VAT` 等）

## 相关文件

- `StockControl-main/app.js` - 后端API（已修改 `/api/purchase-orders/:id` 端点）
- `StockControl-main/public/prototype-working.html` - 前端页面（发票详情显示）
- `StockControl-main/models/AdminInventory.js` - AdminInventory数据模型

## 注意事项

1. 数据库中可能同时存在两种格式的数据（历史数据）
2. 新的转换逻辑兼容两种格式
3. 建议统一使用下划线格式存储，显示时转换为用户友好格式
4. 如果需要数据迁移，可以运行脚本统一格式

## 未来改进

1. 统一数据库中的税率格式（建议使用下划线格式）
2. 在保存时添加格式验证和转换
3. 创建税率枚举常量，避免硬编码
4. 添加税率配置管理功能，支持动态添加新税率

## 相关问题

这个问题与以下功能相关：
- 手动录入入库税率动态加载（`MANUAL_RECEIVING_VAT_RATE_DYNAMIC_LOADING.md`）
- 发票详情Margin VAT显示（之前的修复）
- 采购订单PDF生成（税率显示）
