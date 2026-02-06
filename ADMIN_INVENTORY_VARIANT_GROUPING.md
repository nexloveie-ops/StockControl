# 管理员库存页面 - 变体产品分组显示

## 问题描述
在 `prototype-working.html` 的库存管理页面中，65个 iPhone Clear Case 变体每个都显示为单独的一行，导致列表过长，不便于管理。

## 用户需求
只显示一条 "iPhone Clear Case"，点击后展开查看所有型号和颜色的详细信息和数量。

## 解决方案

### 1. 产品分组逻辑
修改了 `loadCategoryProductDetails` 函数，实现智能分组：

**配件产品（AdminInventory）**:
- 按产品名称分组
- 识别标准：`source === 'AdminInventory'` 且有 `model` 或 `color` 字段
- 显示为可展开的汇总行

**普通产品（ProductNew）**:
- 单独显示
- 保持原有的详细信息展示

### 2. 显示格式

#### 汇总行（折叠状态）
```
▶ iPhone Clear Case
  65 个变体
  
总数量: 3,250
平均进货价: €2.00
平均批发价: €2.75
平均零售价: €15.00
状态: ✅ 有库存
操作: [📋 查看变体]
```

#### 展开后的变体列表
```
▼ iPhone Clear Case
  65 个变体

┌─────────────────┬────────┬──────┬─────────┬─────────┬─────────┬────────┐
│ 型号            │ 颜色   │ 数量 │ 进货价  │ 批发价  │ 零售价  │ 操作   │
├─────────────────┼────────┼──────┼─────────┼─────────┼─────────┼────────┤
│ iPhone 12       │ Clear  │  50  │ €2.00   │ €2.75   │ €15.00  │ 💰📊  │
│ iPhone 12       │ Black  │  50  │ €2.00   │ €2.75   │ €15.00  │ 💰📊  │
│ iPhone 12       │ Yellow │  50  │ €2.00   │ €2.75   │ €15.00  │ 💰📊  │
│ ...             │ ...    │ ...  │ ...     │ ...     │ ...     │ ...    │
└─────────────────┴────────┴──────┴─────────┴─────────┴─────────┴────────┘
```

### 3. 交互功能

#### 点击汇总行
- 展开/折叠变体列表
- 箭头图标变化：▶ ↔ ▼

#### 变体操作
每个变体支持：
- 💰 调价 - 修改价格
- 📊 调量 - 调整数量

### 4. 代码实现

```javascript
// 按产品名称分组
const productGroups = {};
products.forEach(product => {
  const productName = product.name;
  const hasVariants = product.source === 'AdminInventory' && (product.model || product.color);
  
  if (hasVariants) {
    // 配件产品：按名称分组
    if (!productGroups[productName]) {
      productGroups[productName] = {
        name: productName,
        variants: [],
        totalQuantity: 0,
        isVariantGroup: true
      };
    }
    productGroups[productName].variants.push(product);
    productGroups[productName].totalQuantity += (product.stockQuantity || product.quantity || 0);
  } else {
    // 普通产品：单独显示
    const key = `${productName}_${product._id}`;
    productGroups[key] = {
      name: productName,
      product: product,
      isVariantGroup: false
    };
  }
});

// 计算平均价格
Object.values(productGroups).forEach(group => {
  if (group.isVariantGroup && group.variants.length > 0) {
    group.avgCostPrice = group.variants.reduce((sum, v) => sum + (v.costPrice || 0), 0) / group.variants.length;
    group.avgWholesalePrice = group.variants.reduce((sum, v) => sum + (v.wholesalePrice || 0), 0) / group.variants.length;
    group.avgRetailPrice = group.variants.reduce((sum, v) => sum + (v.retailPrice || 0), 0) / group.variants.length;
  }
});
```

### 5. 切换函数

```javascript
function toggleVariants(groupId) {
  const variantsRow = document.getElementById(`variants-${groupId}`);
  const mainRow = variantsRow.previousElementSibling;
  const arrow = mainRow.querySelector('span');
  
  if (variantsRow.style.display === 'none') {
    variantsRow.style.display = 'table-row';
    arrow.textContent = arrow.textContent.replace('▶', '▼');
  } else {
    variantsRow.style.display = 'none';
    arrow.textContent = arrow.textContent.replace('▼', '▶');
  }
}
```

## 显示效果

### Phone Case 分类
现在只显示 **1 行**：
- ▶ iPhone Clear Case (65 个变体) - 总数量 3,250

点击后展开显示所有 65 个变体的详细信息。

### Pre-Owned Devices 分类
保持原样，每个产品单独显示：
- iPhone 14 128GB AB Grade Vat margin
- iPhone 13 128GB AB Grade Vat margin

## 优势

### 1. 界面简洁
- ✅ 从 65 行减少到 1 行
- ✅ 一目了然的产品概览
- ✅ 减少滚动需求

### 2. 信息完整
- ✅ 汇总行显示总数量和平均价格
- ✅ 展开后显示每个变体的详细信息
- ✅ 支持单独管理每个变体

### 3. 灵活操作
- ✅ 快速查看总体情况
- ✅ 按需展开查看详情
- ✅ 独立调整每个变体

### 4. 兼容性好
- ✅ 普通产品保持原有显示方式
- ✅ 不影响现有功能
- ✅ 支持混合显示

## 测试步骤

### 1. 访问页面
1. 登录管理员账号（admin / admin123）
2. 打开 prototype-working.html
3. 点击"库存管理"标签

### 2. 查看 Phone Case 分类
1. 点击 Phone Case 分类卡片
2. 应该只看到 1 行：▶ iPhone Clear Case (65 个变体)
3. 显示总数量：3,250

### 3. 展开变体
1. 点击 iPhone Clear Case 行
2. 箭头变为 ▼
3. 显示所有 65 个变体的表格
4. 每个变体显示型号、颜色、数量、价格

### 4. 操作变体
1. 点击任意变体的"💰 调价"按钮
2. 修改价格
3. 点击任意变体的"📊 调量"按钮
4. 调整数量

### 5. 折叠变体
1. 再次点击 iPhone Clear Case 行
2. 变体列表隐藏
3. 箭头变回 ▶

## 数据示例

### iPhone Clear Case 变体列表
```
型号              颜色    数量
─────────────────────────────
iPhone 12         Clear    50
iPhone 12         Black    50
iPhone 12         Yellow   50
iPhone 12         Pink     50
iPhone 12         Blue     50
iPhone 13         Clear    50
iPhone 13         Black    50
iPhone 13         Yellow   50
iPhone 13         Pink     50
iPhone 13         Blue     50
iPhone 14         Clear    50
iPhone 14         Black    50
iPhone 14         Yellow   50
iPhone 14         Pink     50
iPhone 14         Blue     50
iPhone 14 Pro     Clear     0
iPhone 14 Pro     Black     0
iPhone 14 Pro     Blue      0
iPhone 15         Clear    50
iPhone 15         Black    50
iPhone 15         Yellow   50
iPhone 15         Pink     50
iPhone 15         Blue     50
iPhone 15 Pro     Clear    50
iPhone 15 Pro     Black    50
iPhone 15 Pro     Yellow   50
iPhone 15 Pro     Pink     50
iPhone 15 Pro     Blue     50
iPhone 15 Pro Max Clear    50
iPhone 15 Pro Max Black    50
iPhone 15 Pro Max Yellow   50
iPhone 15 Pro Max Pink     50
iPhone 15 Pro Max Blue     50
iPhone 16         Clear    50
iPhone 16         Black    50
iPhone 16         Yellow   50
iPhone 16         Pink     50
iPhone 16         Blue     50
iPhone 16 Pro     Clear    50
iPhone 16 Pro     Black    50
iPhone 16 Pro     Yellow   50
iPhone 16 Pro     Pink     50
iPhone 16 Pro     Blue     50
iPhone 16 Pro Max Clear    50
iPhone 16 Pro Max Black    50
iPhone 16 Pro Max Yellow   50
iPhone 16 Pro Max Pink     50
iPhone 16 Pro Max Blue     50
iPhone 17         Clear    50
iPhone 17         Black    50
iPhone 17         Yellow   50
iPhone 17         Pink     50
iPhone 17         Blue     50
iPhone 17 Pro     Clear    50
iPhone 17 Pro     Black    50
iPhone 17 Pro     Yellow   50
iPhone 17 Pro     Pink     50
iPhone 17 Pro     Blue     50
iPhone 17 Pro Max Clear    50
iPhone 17 Pro Max Black    50
iPhone 17 Pro Max Yellow   50
iPhone 17 Pro Max Pink     50
iPhone 17 Pro Max Blue     50
iPhone 17 Air     Clear    50
iPhone 17 Air     Black    50
iPhone 17 Air     Yellow   50
iPhone 17 Air     Pink     50
iPhone 17 Air     Blue     50
─────────────────────────────
总计：65 个变体，3,250 件库存
```

## 相关文件

### 修改文件
- ✅ `public/prototype-working.html` - 添加变体分组逻辑

### 新增文件
- ✅ `ADMIN_INVENTORY_VARIANT_GROUPING.md` - 本文档

### 相关文档
- `FIX_PROTOTYPE_WORKING_ADMIN_INVENTORY.md` - API集成文档
- `ADMIN_INVENTORY_MODEL_COMPLETE.md` - AdminInventory模型文档
- `ACCESSORY_VARIANT_PHASE3_COMPLETE.md` - 商户端变体显示

## 总结

✅ **问题已解决**: 变体产品现在分组显示
✅ **界面优化**: 从65行减少到1行
✅ **功能完整**: 支持展开查看和独立操作
✅ **用户体验**: 清晰、简洁、易用

---
**完成时间**: 2026-02-05
**状态**: ✅ 完成
