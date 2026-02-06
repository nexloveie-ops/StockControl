# 修复：调货详情显示优化

## 问题描述
在调货管理页面查看调货详情时（如 TRF20260206001），存在以下问题：
1. 显示 2 条相同产品名称的记录（iPhone Clear Case）
2. 没有显示变体信息（型号和颜色）

**原因**：
- 后端将多条库存记录拆分成多个调货项目（正确的）
- 前端直接显示所有项目，没有合并相同产品
- 没有显示 model 和 color 字段

## 解决方案

### 修改文件
`StockControl-main/public/merchant.html`

### 修改位置
`showTransferDetails` 函数中的产品列表显示部分（约第 5895-5915 行）

### 修改内容

#### 1. 添加变体列
在表头添加"变体"列：
```html
<th>变体</th>
```

#### 2. 合并相同产品
按产品名称、型号、颜色、价格分组：
```javascript
const grouped = {};
transfer.items.forEach(item => {
  const key = `${item.productName}|${item.model || ''}|${item.color || ''}|${item.transferPrice}`;
  if (!grouped[key]) {
    grouped[key] = {
      productName: item.productName,
      model: item.model,
      color: item.color,
      condition: item.condition,
      transferPrice: item.transferPrice,
      quantity: 0,
      serialNumbers: []
    };
  }
  grouped[key].quantity += item.quantity;
  if (item.serialNumber) {
    grouped[key].serialNumbers.push(item.serialNumber);
  }
});
```

#### 3. 显示变体信息
构建变体显示字符串：
```javascript
let variantDisplay = '';
if (item.model || item.color) {
  const parts = [];
  if (item.model && item.model !== 'NO_MODEL') parts.push(item.model);
  if (item.color && item.color !== 'NO_COLOR') parts.push(item.color);
  variantDisplay = parts.join(' - ');
}
```

显示为蓝色标签：
```html
<span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px;">
  ${variantDisplay}
</span>
```

#### 4. 优化序列号显示
- 单个序列号：直接显示
- 多个序列号：显示"X 个序列号"

```javascript
let serialDisplay = '-';
if (item.serialNumbers.length > 0) {
  if (item.serialNumbers.length === 1) {
    serialDisplay = item.serialNumbers[0];
  } else {
    serialDisplay = `${item.serialNumbers.length} 个序列号`;
  }
}
```

## 显示效果对比

### 修改前
```
产品名称              | 序列号 | 成色 | 数量 | 单价   | 小计
iPhone Clear Case    | -      | -    | 1    | €10.00 | €10.00
iPhone Clear Case    | -      | -    | 1    | €10.00 | €10.00
```
❌ 问题：
- 显示 2 条重复记录
- 没有变体信息
- 不清楚是什么型号和颜色

### 修改后
```
产品名称              | 变体              | 序列号      | 成色 | 数量 | 单价   | 小计
iPhone Clear Case    | iPhone 13 - Clear | 2 个序列号  | -    | 2    | €10.00 | €20.00
```
✅ 改进：
- 合并为 1 条记录
- 显示变体信息（蓝色标签）
- 清晰显示总数量
- 序列号数量提示

## 合并逻辑

### 分组键（Key）
```javascript
`${productName}|${model}|${color}|${transferPrice}`
```

**示例**：
```
"iPhone Clear Case|iPhone 13|Clear|10.00"
```

### 合并规则
相同的产品名称、型号、颜色、价格会被合并为一条记录。

### 数量累加
```javascript
grouped[key].quantity += item.quantity;
```

### 序列号收集
```javascript
if (item.serialNumber) {
  grouped[key].serialNumbers.push(item.serialNumber);
}
```

## 特殊情况处理

### 1. 无变体产品
```javascript
if (item.model || item.color) {
  // 显示变体
} else {
  // 显示 "-"
}
```

### 2. 占位符过滤
```javascript
if (item.model && item.model !== 'NO_MODEL') parts.push(item.model);
if (item.color && item.color !== 'NO_COLOR') parts.push(item.color);
```

### 3. 设备 vs 配件
- **设备**（有序列号）：显示具体序列号或数量
- **配件**（无序列号）：显示 "-"

## 测试步骤

### 1. 清除浏览器缓存
按 Ctrl+F5 强制刷新

### 2. 验证页面版本
打开控制台，应该看到：
```
✅ 页面版本: v2.1.5 - 优化调货详情显示（合并相同产品+变体信息）
```

### 3. 查看调货详情
1. 登录 MurrayDundrum 账号
2. 进入"调货管理" → "待审批"或其他标签
3. 找到调货单号：TRF20260206001
4. 点击调货单号或"查看详情"

### 4. 验证显示
✅ 应该看到：
- 产品名称：iPhone Clear Case
- 变体：iPhone 13 - Clear（蓝色标签）
- 序列号：2 个序列号（或具体序列号）
- 数量：2
- 单价和小计正确

### 5. 测试其他调货单
测试不同类型的产品：
- 有变体的配件
- 无变体的配件
- 有序列号的设备
- 混合产品的调货单

## 版本历史
- v2.1.2: 添加群组库存变体选择模态框
- v2.1.3: 修复群组库存变体选择功能
- v2.1.4: 修复群组库存配件数量显示
- v2.1.5: 优化调货详情显示（合并相同产品+变体信息）✅

## 相关文件
- `StockControl-main/public/merchant.html` (v2.1.5)
- `StockControl-main/app.js` (调货申请 API - 已支持多库存记录)

## 注意事项
1. 此修改只影响前端显示，不影响后端数据
2. 后端仍然保存多条调货项目（每条对应一条库存记录）
3. 合并只在显示时进行，便于用户理解
4. 完成调货时，后端会正确处理每条项目的库存扣减

## 完成时间
2026年2月6日
