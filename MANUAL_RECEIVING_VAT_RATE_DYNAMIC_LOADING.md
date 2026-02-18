# 手动录入入库 - 税率动态加载功能

## 实现日期
2026-02-18

## 问题描述
手动录入入库功能中的"税务分类"选择框是硬编码的，只有三个固定选项：
- VAT 23%
- VAT 13.5%
- VAT 0%

没有从数据库读取税率数据，也没有"Margin VAT"等其他税率选项。

## 解决方案

### 1. 添加税率数据加载函数
在 `prototype-working.html` 中添加了 `loadVatRates()` 函数，从 `/api/vat-rates` API 获取所有激活的税率数据。

```javascript
async function loadVatRates() {
  console.log('🔄 开始加载税率数据');
  debugLog('开始加载税率数据');
  
  try {
    const response = await fetch('/api/vat-rates');
    console.log('📥 税率API响应:', response.status, response.statusText);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const result = await response.json();
    console.log('📦 税率数据:', result);
    console.log(`✅ 税率数量: ${result.data?.length || 0}`);
    
    debugLog(`税率API响应: ${result.data?.length || 0} 个税率`);
    
    return result.data || [];
  } catch (error) {
    console.error('❌ 税率数据加载失败:', error);
    debugLog(`❌ 税率数据加载失败: ${error.message}`);
    return [];
  }
}
```

### 2. 在切换到手动录入模式时加载税率数据
修改 `switchReceivingMode()` 函数，在切换到手动录入模式时自动加载税率数据并缓存到 `window.vatRatesData`。

```javascript
// 加载税率数据（如果还没有加载）
if (!window.vatRatesData || window.vatRatesData.length === 0) {
  console.log('🔄 加载税率数据...');
  try {
    const vatRates = await loadVatRates();
    window.vatRatesData = vatRates;
    console.log(`✅ 税率数据已加载: ${vatRates.length} 个税率`);
  } catch (err) {
    console.error('❌ 加载税率数据失败:', err);
    window.vatRatesData = [];
  }
}
```

### 3. 添加税率选择框填充函数
添加 `populateVatRateSelect()` 函数，用于动态填充税率选择框。

```javascript
function populateVatRateSelect(index, selectedValue = '') {
  const selectElement = document.getElementById(`manualVatRate_${index}`);
  if (!selectElement) {
    console.error(`❌ 找不到税率选择框: manualVatRate_${index}`);
    return;
  }
  
  // 使用全局变量中的税率数据
  const vatRates = window.vatRatesData || [];
  
  console.log(`📝 填充税率选择框 ${index}, 税率数量: ${vatRates.length}, 选中值: ${selectedValue}`);
  
  // 清空现有选项
  selectElement.innerHTML = '';
  
  if (vatRates.length === 0) {
    // 如果没有加载到税率数据，使用默认选项
    console.warn('⚠️  没有税率数据，使用默认选项');
    selectElement.innerHTML = `
      <option value="VAT 23%" ${selectedValue === 'VAT 23%' ? 'selected' : ''}>VAT 23%</option>
      <option value="VAT 13.5%" ${selectedValue === 'VAT 13.5%' ? 'selected' : ''}>VAT 13.5%</option>
      <option value="VAT 0%" ${selectedValue === 'VAT 0%' ? 'selected' : ''}>VAT 0%</option>
    `;
  } else {
    // 使用从数据库加载的税率数据
    vatRates.forEach(vat => {
      const option = document.createElement('option');
      // 使用name字段作为显示文本和值
      option.value = vat.name;
      option.textContent = vat.name;
      
      // 设置选中状态
      if (selectedValue && option.value === selectedValue) {
        option.selected = true;
      }
      
      selectElement.appendChild(option);
    });
  }
  
  console.log(`✅ 税率选择框填充完成，当前值: ${selectElement.value}`);
}
```

### 4. 修改添加产品行函数
修改 `addManualProduct()` 函数，在添加新产品行后调用 `populateVatRateSelect()` 填充税率选择框。

```javascript
// 填充税率选择框
populateVatRateSelect(index, 'VAT 23%');
```

### 5. 修改税率更新函数
修改 `updateManualVatRate()` 函数，使用 `populateVatRateSelect()` 重新填充税率选择框并设置默认值。

```javascript
function updateManualVatRate(index) {
  const productType = window.manualProducts[index]?.productType;
  const defaultVatRate = getDefaultVatRate(productType);
  
  // 重新填充税率选择框并设置默认值
  populateVatRateSelect(index, defaultVatRate);
  
  updateManualProduct(index, 'vatRate', defaultVatRate);
}
```

## 数据流程

1. 用户点击"手动录入入库"按钮
2. `switchReceivingMode('manual')` 被调用
3. 检查 `window.vatRatesData` 是否已加载
4. 如果未加载，调用 `loadVatRates()` 从 `/api/vat-rates` 获取数据
5. 将数据缓存到 `window.vatRatesData`
6. 用户点击"添加产品"按钮
7. `addManualProduct()` 创建新产品行
8. 调用 `populateVatRateSelect(index, 'VAT 23%')` 填充税率选择框
9. 如果用户选择产品分类，`updateManualVatRate()` 会根据分类自动选择合适的税率

## 数据库结构

### VatRate 模型
```javascript
{
  code: String,        // 例如: "VAT 23%"
  name: String,        // 例如: "VAT 23%"
  rate: Number,        // 例如: 23
  description: String,
  applicableScope: String,
  isActive: Boolean,
  sortOrder: Number
}
```

### 默认税率数据
```javascript
[
  {
    code: 'VAT 23%',
    name: 'VAT 23%',
    rate: 23,
    description: '标准增值税率',
    applicableScope: '适用于大部分商品',
    sortOrder: 1
  },
  {
    code: 'VAT 13.5%',
    name: 'VAT 13.5%',
    rate: 13.5,
    description: '减免增值税率',
    applicableScope: '适用于维修服务等',
    sortOrder: 2
  },
  {
    code: 'VAT 0%',
    name: 'VAT 0%',
    rate: 0,
    description: '免税',
    applicableScope: '适用于二手商品差价税制',
    sortOrder: 3
  }
]
```

## API 端点

### GET /api/vat-rates
获取所有激活的税率列表

**响应格式:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "code": "VAT 23%",
      "name": "VAT 23%",
      "rate": 23,
      "description": "标准增值税率",
      "applicableScope": "适用于大部分商品",
      "isActive": true,
      "sortOrder": 1,
      "createdAt": "...",
      "updatedAt": "..."
    },
    ...
  ]
}
```

## 降级处理

如果税率数据加载失败（网络错误、API错误等），系统会自动降级到硬编码的默认选项：
- VAT 23%
- VAT 13.5%
- VAT 0%

这确保了即使在数据加载失败的情况下，用户仍然可以正常使用手动录入功能。

## 测试步骤

1. 打开 `prototype-working.html` 页面
2. 登录为仓库管理员
3. 进入"入库管理"
4. 点击"手动录入入库"按钮
5. 检查浏览器控制台，应该看到：
   ```
   🔄 加载税率数据...
   📥 税率API响应: 200 OK
   📦 税率数据: {...}
   ✅ 税率数量: 3 个税率
   ```
6. 点击"添加产品"按钮
7. 检查"税务分类"选择框，应该显示从数据库加载的税率选项
8. 选择不同的产品分类，税率应该自动更新

## 相关文件

- `StockControl-main/public/prototype-working.html` - 前端页面（修改）
- `StockControl-main/app.js` - 后端API（已存在 `/api/vat-rates` 端点）
- `StockControl-main/models/VatRate.js` - 税率数据模型
- `StockControl-main/scripts/init-system-settings.js` - 系统设置初始化脚本

## 注意事项

1. 税率数据在切换到手动录入模式时加载一次，并缓存到 `window.vatRatesData`
2. 如果需要刷新税率数据，需要重新切换到手动录入模式或刷新页面
3. 税率选择框使用 `vat.name` 字段作为显示文本和值
4. 默认税率为 "VAT 23%"
5. 系统会根据产品分类自动选择合适的税率（通过 `getDefaultVatRate()` 函数）

## 未来改进

1. 添加税率数据刷新按钮，允许用户手动刷新税率列表
2. 支持管理员在页面上直接添加/编辑税率
3. 添加税率数据缓存过期机制
4. 支持按产品分类自动匹配税率（从数据库读取分类-税率映射关系）
