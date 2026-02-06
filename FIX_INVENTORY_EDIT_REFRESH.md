# 修复库存编辑保存后刷新显示问题

## 问题描述

在merchant.html的"我的库存"页面，编辑产品信息并保存后，页面没有正确刷新显示更新后的数据。

## 问题原因

**原因1：视图状态不匹配**
- 保存后调用`loadMyInventory()`会返回到分类视图
- 但用户可能在产品列表视图
- 导致用户看不到更新效果

**原因2：详情模态框未关闭**
- 从"查看详情"模态框中编辑时
- 保存后模态框仍然打开
- 显示的是旧数据

## 修复方案

### 1. 智能刷新逻辑

**文件：** `public/merchant.html` v2.3.1

**修改位置：** `saveInventoryEdit` 函数

**修复逻辑：**
```javascript
async function saveInventoryEdit(event) {
  // ... 保存数据 ...
  
  if (result.success) {
    alert('✅ 产品信息已更新');
    closeEditInventoryModal();
    
    // 1. 如果是从详情模态框打开的，关闭详情模态框
    if (window.currentDetailsModal) {
      window.currentDetailsModal.remove();
      window.currentDetailsModal = null;
    }
    
    // 2. 重新加载库存数据
    await loadMyInventory();
    
    // 3. 如果当前在产品列表视图，重新显示该分类
    const productListDiv = document.getElementById('inventoryProductList');
    if (productListDiv.style.display !== 'none') {
      const categoryName = document.getElementById('currentInventoryCategoryName')
        .textContent.replace('📦 ', '');
      showInventoryCategory(categoryName);
    }
  }
}
```

**刷新步骤：**
1. 关闭编辑模态框
2. 如果从详情模态框打开，关闭详情模态框
3. 重新加载库存数据（更新全局变量）
4. 如果在产品列表视图，重新显示当前分类

### 2. 详情模态框编辑支持

**新增函数：** `editInventoryItemFromModal`

```javascript
async function editInventoryItemFromModal(inventoryId, buttonElement) {
  // 保存模态框引用
  window.currentDetailsModal = buttonElement.closest('div[style*="position: fixed"]');
  
  // 调用编辑函数
  await editInventoryItem(inventoryId);
}
```

**修改详情模态框按钮：**
```javascript
// 修改前
<button onclick="editInventoryItem('${record._id}'); this.closest('div[style*=fixed]').remove();">

// 修改后
<button onclick="editInventoryItemFromModal('${record._id}', this)">
```

**优势：**
- 保存模态框引用，保存后可以关闭
- 不立即关闭模态框，用户可以看到编辑表单
- 保存成功后自动关闭所有模态框

## 用户体验改进

### 场景1：从产品列表直接编辑

**操作流程：**
1. 我的库存 → Cable 分类 → 点击"编辑"
2. 修改产品信息 → 保存
3. ✅ 自动刷新，停留在Cable分类产品列表
4. ✅ 看到更新后的数据

### 场景2：从详情模态框编辑

**操作流程：**
1. 我的库存 → Cable 分类 → 点击"查看详情"
2. 在详情列表中点击某条记录的"编辑"
3. 修改产品信息 → 保存
4. ✅ 自动关闭详情模态框
5. ✅ 自动刷新，停留在Cable分类产品列表
6. ✅ 看到更新后的数据

### 场景3：从分类视图编辑单条记录

**操作流程：**
1. 我的库存 → Cable 分类
2. 只有1条记录，直接显示"编辑"按钮
3. 修改产品信息 → 保存
4. ✅ 自动刷新，停留在Cable分类产品列表
5. ✅ 看到更新后的数据

## 技术细节

### 视图状态检测

```javascript
const productListDiv = document.getElementById('inventoryProductList');
if (productListDiv.style.display !== 'none') {
  // 当前在产品列表视图
  const categoryName = document.getElementById('currentInventoryCategoryName')
    .textContent.replace('📦 ', '');
  showInventoryCategory(categoryName);
}
```

**检测逻辑：**
- 检查`inventoryProductList`的display属性
- 如果不是'none'，说明在产品列表视图
- 从标题中提取分类名称
- 重新显示该分类

### 模态框引用管理

```javascript
// 保存引用
window.currentDetailsModal = buttonElement.closest('div[style*="position: fixed"]');

// 使用引用
if (window.currentDetailsModal) {
  window.currentDetailsModal.remove();
  window.currentDetailsModal = null;
}
```

**管理策略：**
- 使用全局变量保存模态框DOM引用
- 保存成功后检查并关闭
- 清空引用避免内存泄漏

### 异步加载处理

```javascript
// 使用 await 确保数据加载完成
await loadMyInventory();

// 然后再刷新视图
showInventoryCategory(categoryName);
```

**重要性：**
- 确保数据先加载完成
- 避免显示旧数据
- 保证用户看到最新信息

## 测试验证

### 测试步骤

1. **清除浏览器缓存**（Ctrl+Shift+Delete）
2. **强制刷新页面**（Ctrl+F5）
3. **登录 MurrayDundrum**
4. **进入"我的库存" → Cable 分类**

### 测试场景1：直接编辑

1. 点击Data Cable的"编辑"按钮
2. 修改零售价：€10 → €12
3. 点击"保存"
4. **预期：** 
   - 显示"✅ 产品信息已更新"
   - 停留在Cable分类列表
   - 零售价显示为€12

### 测试场景2：详情编辑

1. 点击"查看详情"按钮
2. 在详情列表中点击某条记录的"编辑"
3. 修改位置：空 → "Shelf A1"
4. 点击"保存"
5. **预期：**
   - 显示"✅ 产品信息已更新"
   - 详情模态框自动关闭
   - 停留在Cable分类列表
   - 可以再次点击"查看详情"验证位置已更新

### 测试场景3：多次编辑

1. 编辑产品A → 保存 → 验证更新
2. 编辑产品B → 保存 → 验证更新
3. 返回分类视图 → 重新进入
4. **预期：** 所有修改都已保存并显示

## 相关功能

### 不受影响的功能
- ✅ 产品时间线查看
- ✅ 库存搜索
- ✅ 分类导航
- ✅ 手动入库
- ✅ 仓库订货

### 协同工作的功能
- ✅ 库存合并显示（v2.3.0）
- ✅ 详情模态框（v2.3.0）
- ✅ 编辑功能（v2.2.0）

## 文件修改清单

1. **public/merchant.html** v2.3.1
   - 修改`saveInventoryEdit`函数（智能刷新）
   - 新增`editInventoryItemFromModal`函数
   - 修改详情模态框编辑按钮

## 版本信息

- **页面版本：** v2.3.1
- **修复日期：** 2026-02-06
- **前置版本：** v2.3.0（库存合并显示）

## 总结

这个修复确保了编辑保存后，用户能够立即看到更新后的数据，无论是从哪个入口进入编辑功能。通过智能检测当前视图状态和模态框状态，自动执行正确的刷新操作，提供了流畅的用户体验。
