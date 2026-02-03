# 🔄 采购订单管理 - 分类动态加载更新

## 更新时间
2026-02-02

## 问题描述

admin.html 中的采购订单管理部分使用硬编码的产品分类选项，导致：
- ❌ 在系统设置中新添加的分类不会出现在采购订单的下拉列表中
- ❌ 用户无法选择新创建的分类
- ❌ 分类列表与数据库不同步

## 解决方案

将硬编码的分类选项改为从 API 动态加载，确保：
- ✅ 分类列表与数据库同步
- ✅ 新添加的分类立即可用
- ✅ 手动录入和图片识别都使用动态分类

---

## 📋 需要更新的位置

### 1. 手动录入产品表格
**位置**: `addManualProduct()` 函数（约第 1260 行）
**当前代码**:
```html
<select onchange="updateManualProduct(${index}, 'productType', this.value); ...">
  <option value="">选择分类...</option>
  <option value="手机配件">手机配件</option>
  <option value="电脑配件">电脑配件</option>
  <!-- 更多硬编码选项 -->
</select>
```

**更新为**:
```html
<select onchange="updateManualProduct(${index}, 'productType', this.value); ..."
        id="manualProductType_${index}">
  ${generateCategoryOptions('')}
</select>
```

### 2. 图片识别产品表格
**位置**: `displayRecognitionResult()` 函数（约第 1836 行）
**当前代码**:
```html
<select onchange="updateProductField(${index}, 'productType', this.value); ...">
  <option value="手机配件" ${product.productType === '手机配件' ? 'selected' : ''}>手机配件</option>
  <option value="电脑配件" ${product.productType === '电脑配件' ? 'selected' : ''}>电脑配件</option>
  <!-- 更多硬编码选项 -->
</select>
```

**更新为**:
```html
<select onchange="updateProductField(${index}, 'productType', this.value); ...">
  ${generateCategoryOptions(product.productType || '')}
</select>
```

---

## 🔧 实现步骤

### 步骤 1: 添加全局变量存储分类
```javascript
let allCategories = []; // 存储所有分类
```

### 步骤 2: 创建加载分类函数
```javascript
// 加载产品分类
async function loadCategories() {
  try {
    const response = await fetch('/api/admin/categories');
    const result = await response.json();
    
    if (result.success && result.data) {
      allCategories = result.data;
      debugLog(`加载了 ${allCategories.length} 个产品分类`);
      return allCategories;
    } else {
      // 使用默认分类
      allCategories = [
        { type: '手机配件', _id: 'default1' },
        { type: '电脑配件', _id: 'default2' },
        { type: '车载配件', _id: 'default3' }
      ];
      debugLog('使用默认分类列表');
      return allCategories;
    }
  } catch (error) {
    debugLog(`加载分类失败: ${error.message}`);
    // 使用默认分类
    allCategories = [
      { type: '手机配件', _id: 'default1' },
      { type: '电脑配件', _id: 'default2' },
      { type: '车载配件', _id: 'default3' }
    ];
    return allCategories;
  }
}
```

### 步骤 3: 创建生成分类选项函数
```javascript
// 生成分类选项
function generateCategoryOptions(selectedValue = '') {
  if (!allCategories || allCategories.length === 0) {
    // 如果分类未加载，返回默认选项
    return `
      <option value="">选择分类...</option>
      <option value="手机配件" ${selectedValue === '手机配件' ? 'selected' : ''}>手机配件</option>
      <option value="电脑配件" ${selectedValue === '电脑配件' ? 'selected' : ''}>电脑配件</option>
      <option value="车载配件" ${selectedValue === '车载配件' ? 'selected' : ''}>车载配件</option>
    `;
  }
  
  let options = '<option value="">选择分类...</option>';
  allCategories.forEach(category => {
    const selected = selectedValue === category.type ? 'selected' : '';
    options += `<option value="${category.type}" ${selected}>${category.type}</option>`;
  });
  
  return options;
}
```

### 步骤 4: 在页面加载时调用
```javascript
// 在 DOMContentLoaded 事件中添加
window.addEventListener('DOMContentLoaded', async () => {
  // ... 其他初始化代码 ...
  
  // 加载分类
  await loadCategories();
  
  debugLog('页面初始化完成');
});
```

### 步骤 5: 更新 getDefaultVatRate 函数
```javascript
// 获取默认税率（从分类中获取）
function getDefaultVatRate(productType) {
  // 先从分类中查找
  const category = allCategories.find(cat => cat.type === productType);
  if (category && category.defaultVatRate) {
    return category.defaultVatRate;
  }
  
  // 如果没找到，使用默认值
  return 'VAT 23%';
}
```

---

## 📝 完整代码更新

### 在 `<script>` 标签开始处添加
```javascript
// 全局变量
let allCategories = []; // 存储所有分类
```

### 在 loadVatRates() 函数后添加
```javascript
// 加载产品分类
async function loadCategories() {
  try {
    const response = await fetch('/api/admin/categories');
    const result = await response.json();
    
    if (result.success && result.data) {
      allCategories = result.data;
      debugLog(`加载了 ${allCategories.length} 个产品分类`);
      return allCategories;
    } else {
      // 使用默认分类
      allCategories = [
        { type: '手机配件', _id: 'default1', defaultVatRate: 'VAT 23%' },
        { type: '电脑配件', _id: 'default2', defaultVatRate: 'VAT 23%' },
        { type: '车载配件', _id: 'default3', defaultVatRate: 'VAT 23%' },
        { type: 'audio', _id: 'default4', defaultVatRate: 'VAT 23%' },
        { type: '数据线', _id: 'default5', defaultVatRate: 'VAT 23%' },
        { type: 'power supply', _id: 'default6', defaultVatRate: 'VAT 23%' },
        { type: '全新设备', _id: 'default7', defaultVatRate: 'VAT 23%' },
        { type: '二手设备', _id: 'default8', defaultVatRate: 'VAT 23%' },
        { type: '维修', _id: 'default9', defaultVatRate: 'VAT 13.5%' }
      ];
      debugLog('使用默认分类列表');
      return allCategories;
    }
  } catch (error) {
    debugLog(`加载分类失败: ${error.message}`);
    // 使用默认分类
    allCategories = [
      { type: '手机配件', _id: 'default1', defaultVatRate: 'VAT 23%' },
      { type: '电脑配件', _id: 'default2', defaultVatRate: 'VAT 23%' },
      { type: '车载配件', _id: 'default3', defaultVatRate: 'VAT 23%' },
      { type: 'audio', _id: 'default4', defaultVatRate: 'VAT 23%' },
      { type: '数据线', _id: 'default5', defaultVatRate: 'VAT 23%' },
      { type: 'power supply', _id: 'default6', defaultVatRate: 'VAT 23%' },
      { type: '全新设备', _id: 'default7', defaultVatRate: 'VAT 23%' },
      { type: '二手设备', _id: 'default8', defaultVatRate: 'VAT 23%' },
      { type: '维修', _id: 'default9', defaultVatRate: 'VAT 13.5%' }
    ];
    return allCategories;
  }
}

// 生成分类选项
function generateCategoryOptions(selectedValue = '') {
  if (!allCategories || allCategories.length === 0) {
    // 如果分类未加载，返回默认选项
    return `
      <option value="">选择分类...</option>
      <option value="手机配件" ${selectedValue === '手机配件' ? 'selected' : ''}>手机配件</option>
      <option value="电脑配件" ${selectedValue === '电脑配件' ? 'selected' : ''}>电脑配件</option>
      <option value="车载配件" ${selectedValue === '车载配件' ? 'selected' : ''}>车载配件</option>
    `;
  }
  
  let options = '<option value="">选择分类...</option>';
  allCategories.forEach(category => {
    const selected = selectedValue === category.type ? 'selected' : '';
    options += `<option value="${category.type}" ${selected}>${category.type}</option>`;
  });
  
  return options;
}
```

### 更新 getDefaultVatRate 函数
```javascript
// 获取默认税率
function getDefaultVatRate(productType) {
  // 先从分类中查找
  const category = allCategories.find(cat => cat.type === productType);
  if (category && category.defaultVatRate) {
    return category.defaultVatRate;
  }
  
  // 如果没找到，使用旧的硬编码逻辑作为后备
  const vatRates = {
    '手机配件': 'VAT 23%',
    '电脑配件': 'VAT 23%',
    '车载配件': 'VAT 23%',
    'audio': 'VAT 23%',
    '数据线': 'VAT 23%',
    'power supply': 'VAT 23%',
    '全新设备': 'VAT 23%',
    '二手设备': 'VAT 23%',
    '维修': 'VAT 13.5%'
  };
  return vatRates[productType] || 'VAT 23%';
}
```

### 在 DOMContentLoaded 中添加
```javascript
window.addEventListener('DOMContentLoaded', async () => {
  debugLog('页面加载完成，开始初始化...');
  
  // 加载税率
  await loadVatRates();
  
  // 加载分类
  await loadCategories();
  
  // ... 其他初始化代码 ...
});
```

---

## 🧪 测试步骤

### 测试 1: 验证分类加载
1. 打开浏览器开发者工具（F12）
2. 访问 admin.html
3. 查看控制台日志
4. ✅ 应该看到"加载了 X 个产品分类"

### 测试 2: 手动录入使用动态分类
1. 切换到"手动录入"标签
2. 点击"添加产品行"
3. 查看"产品分类"下拉框
4. ✅ 应该显示数据库中的所有分类

### 测试 3: 图片识别使用动态分类
1. 切换到"图片识别"标签
2. 上传发票图片
3. 识别完成后查看产品列表
4. 查看"产品分类"下拉框
5. ✅ 应该显示数据库中的所有分类

### 测试 4: 新分类立即可用
1. 打开系统设置
2. 添加新分类"测试分类X"
3. 返回采购订单管理
4. 刷新页面
5. 查看分类下拉框
6. ✅ 应该显示新添加的"测试分类X"

### 测试 5: 默认税率从分类获取
1. 在系统设置中设置"手机配件"的默认税率为"VAT 13.5%"
2. 返回采购订单管理
3. 刷新页面
4. 添加产品行，选择"手机配件"
5. ✅ 税率应该自动变为"VAT 13.5%"

---

## ⚠️ 注意事项

### 1. 向后兼容
- 如果 API 调用失败，使用默认分类列表
- 确保旧数据仍然可以正常显示

### 2. 性能优化
- 分类只在页面加载时加载一次
- 存储在全局变量中，避免重复请求

### 3. 错误处理
- API 失败时使用默认分类
- 在控制台输出调试信息

### 4. 用户体验
- 分类按排序权重排序
- 保持"选择分类..."作为第一个选项

---

## 📊 影响范围

### 修改的文件
- `StockControl-main/public/admin.html`

### 修改的函数
- `addManualProduct()` - 添加手动录入产品行
- `displayRecognitionResult()` - 显示图片识别结果
- `getDefaultVatRate()` - 获取默认税率
- 新增 `loadCategories()` - 加载分类
- 新增 `generateCategoryOptions()` - 生成分类选项

### 影响的功能
- ✅ 手动录入产品
- ✅ 图片识别产品
- ✅ 默认税率选择
- ✅ 产品分类管理

---

## 📚 相关文档

- [产品分类管理简化说明](CATEGORY_MANAGEMENT_SIMPLIFIED.md)
- [产品分类管理测试指南](CATEGORY_MANAGEMENT_TEST.md)
- [系统设置功能说明](ADMIN_SYSTEM_SETTINGS_FEATURE.md)

---

**状态**: 📝 待实施
**优先级**: 🔴 高
**预计工作量**: 30分钟
**版本**: v2.3.0
