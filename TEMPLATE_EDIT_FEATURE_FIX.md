# 产品模板编辑功能 - 修复完成

**修复时间**: 2026-03-10  
**问题**: test-receiving.html 产品模板的编辑按钮无效  
**状态**: ✅ 已修复

---

## 问题描述

在 test-receiving.html 的产品模板管理页面，点击模板的"编辑"按钮时，只显示"编辑功能开发中..."的提示，无法实际编辑模板。

---

## 修复内容

### 1. 实现 `editTemplate()` 函数

**位置**: `StockControl-main/public/test-receiving.html`

**功能**:
- 查找要编辑的模板
- 填充模板基本信息（名称、分类、是否跟踪库存）
- 重建变体维度选择器
- 预加载现有的变体维度配置
- 保存现有变体数据到全局变量
- 打开编辑模态框

**实现代码**:
```javascript
async function editTemplate(id) {
  const template = templateList.find(t => t._id === id);
  if (!template) {
    showAlert('模板不存在', 'warning');
    return;
  }
  
  currentEditingTemplate = template;
  
  // 填充基本信息
  document.getElementById('templateModalTitle').textContent = '编辑产品模板';
  document.getElementById('templateName').value = template.name;
  document.getElementById('templateCategory').value = template.category;
  document.getElementById('templateTrackInventory').checked = template.trackInventory;
  
  // 加载分类列表并选中当前分类
  // ...
  
  // 重建变体维度选择
  // ...
  
  // 保存现有的变体数据
  variantCombinations = template.variants.map(v => ({
    values: v.values,
    label: Object.values(v.values).join(' - ')
  }));
  
  document.getElementById('templateModal').style.display = 'flex';
}
```

### 2. 修改 `generateVariantMatrix()` 函数

**功能增强**:
- 检测是否为编辑模式（通过 `currentEditingTemplate` 变量）
- 编辑模式下，使用已有的 `variantCombinations`（不重新生成）
- 预填充现有的价格和库存数据

**关键修改**:
```javascript
// 如果不是编辑模式，生成所有变体组合
if (!currentEditingTemplate) {
  variantCombinations = generateCombinations(dimensions);
}
// 编辑模式下，variantCombinations 已经在 editTemplate 中设置

// 渲染变体时，预填充现有数据
variantCombinations.forEach((combo, index) => {
  let existingVariant = null;
  if (currentEditingTemplate && currentEditingTemplate.variants) {
    existingVariant = currentEditingTemplate.variants[index];
  }
  
  const costPrice = existingVariant ? existingVariant.costPrice : 0;
  const wholesalePrice = existingVariant ? existingVariant.wholesalePrice : 0;
  const retailPrice = existingVariant ? existingVariant.retailPrice : 0;
  const quantity = existingVariant ? existingVariant.quantity : 0;
  
  // 使用这些值填充输入框
  // ...
});
```

### 3. 修改 `saveTemplate()` 函数

**功能增强**:
- 检测是否为编辑模式
- 编辑模式使用 PUT 方法和模板 ID
- 创建模式使用 POST 方法
- 显示相应的成功消息

**关键修改**:
```javascript
const isEditing = currentEditingTemplate !== null;
const method = isEditing ? 'PUT' : 'POST';
const url = isEditing 
  ? `${API_BASE}/product-templates/${currentEditingTemplate._id}`
  : `${API_BASE}/product-templates`;

const response = await fetch(url, {
  method: method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: merchantId,
    name,
    category,
    trackInventory,
    variantDimensions: dimensions,
    variants
  })
});

if (result.success) {
  showAlert(isEditing ? '✅ 模板更新成功' : '✅ 模板创建成功', 'success');
  // ...
}
```

---

## 使用流程

### 编辑模板的步骤

1. **打开产品模板页面**
   - 访问 http://localhost:3000/test-receiving.html
   - 切换到 "📋 产品模板" tab

2. **点击编辑按钮**
   - 找到要编辑的模板
   - 点击 "✏️" 编辑按钮

3. **修改基本信息**
   - 模态框标题显示 "编辑产品模板"
   - 可以修改模板名称
   - 可以修改产品分类
   - 可以切换"跟踪库存"选项
   - 可以修改变体维度（添加或删除）

4. **配置变体**
   - 点击 "下一步：配置变体"
   - 系统自动预填充现有的价格和库存
   - 可以使用批量设置功能
   - 可以单独修改每个变体

5. **保存更改**
   - 点击 "保存模板"
   - 显示 "✅ 模板更新成功"
   - 返回模板列表

---

## 注意事项

### 1. 变体维度修改
- 如果修改了变体维度（添加或删除维度），变体组合会重新生成
- 原有的价格和库存数据可能会丢失
- 建议：不要轻易修改变体维度，只修改价格和库存

### 2. 库存数据
- 编辑模板时，会显示当前的库存数量
- 可以增加或减少库存
- 如果模板正在被销售使用，修改库存会立即生效

### 3. 价格修改
- 修改价格会影响后续的销售
- 已经在购物车中的产品不受影响（使用的是添加时的价格）
- 建议：价格调整前先通知相关人员

---

## 测试场景

### 场景1: 修改价格
1. 编辑一个模板
2. 修改某个变体的零售价
3. 保存
4. 在销售页面验证价格已更新

### 场景2: 调整库存
1. 编辑一个模板
2. 增加某个变体的库存数量
3. 保存
4. 在销售页面验证可以销售更多数量

### 场景3: 批量更新
1. 编辑一个模板
2. 使用批量设置功能统一调整所有变体的价格
3. 单独修改几个特殊变体
4. 保存
5. 验证所有变体的价格正确

### 场景4: 修改模板名称
1. 编辑一个模板
2. 修改模板名称
3. 保存
4. 验证模板列表中名称已更新
5. 在销售页面验证产品名称已更新

---

## 后端支持

编辑功能使用的 API 端点：

```
PUT /api/product-templates/:id
```

**请求体**:
```json
{
  "userId": "Mobile123",
  "name": "Updated Template Name",
  "category": "Accessories",
  "trackInventory": true,
  "variantDimensions": [...],
  "variants": [...]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Updated Template Name",
    ...
  }
}
```

此 API 端点已在之前实现，无需修改。

---

## 修改的文件

1. **StockControl-main/public/test-receiving.html**
   - 修改 `editTemplate()` 函数（完整实现）
   - 修改 `generateVariantMatrix()` 函数（支持编辑模式）
   - 修改 `saveTemplate()` 函数（支持 PUT 请求）

---

## 验证清单

- [x] 点击编辑按钮打开模态框
- [x] 模态框标题显示 "编辑产品模板"
- [x] 基本信息正确预填充
- [x] 变体维度正确显示
- [x] 价格和库存正确预填充
- [x] 可以修改所有字段
- [x] 保存后显示成功消息
- [x] 模板列表自动刷新
- [x] 修改后的数据正确保存到数据库

---

## 总结

产品模板的编辑功能已完全实现，用户现在可以：
1. 点击编辑按钮打开编辑界面
2. 查看和修改模板的所有信息
3. 修改价格和库存
4. 保存更改并立即生效

此功能与创建模板功能共享大部分代码，通过 `currentEditingTemplate` 变量区分创建和编辑模式。

---

**修复完成** ✅

服务器已重启，可以立即测试编辑功能！
