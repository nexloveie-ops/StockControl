# Prototype手动录入功能改进

## 完成时间
2026-02-09

## 改进内容

### 1. 移除价格输入框联动

#### 问题
手动录入产品信息时，进货价、批发价、零售价之间存在自动计算联动：
- 输入进货价 → 自动计算批发价（进货价 × 1.2）
- 输入批发价 → 自动计算零售价（批发价 × 1.3）

这种联动限制了用户的灵活性，不适合所有产品的定价策略。

#### 解决方案
移除所有价格输入框之间的联动关系，让用户可以独立设置每个价格。

#### 修改内容

**1. 移除输入框的联动事件**

修改前：
```javascript
<input type="number" onchange="updateManualProduct(${index}, 'purchasePrice', this.value); calculateWholesalePrice(${index})">
<input type="number" onchange="updateManualProduct(${index}, 'wholesalePrice', this.value); calculateRetailPrice(${index})">
```

修改后：
```javascript
<input type="number" onchange="updateManualProduct(${index}, 'purchasePrice', this.value)">
<input type="number" onchange="updateManualProduct(${index}, 'wholesalePrice', this.value)">
```

**2. 删除价格计算函数**

删除了以下函数：
- `calculateWholesalePrice(index)` - 自动计算批发价
- `calculateRetailPrice(index)` - 自动计算零售价

### 2. 批量录入变体添加供货商和位置信息

#### 问题
批量创建产品变体时，缺少供货商和位置信息，导致创建的产品缺少重要的库存管理信息。

#### 解决方案
在批量创建变体表单中添加供货商和位置字段。

#### 修改内容

**1. 表单UI修改**

在"其他设置"部分添加了两个新字段：

```html
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
  <div>
    <label>供货商 *</label>
    <select id="batchSupplier" required>
      <option value="">请选择供货商</option>
    </select>
  </div>
  <div>
    <label>位置 *</label>
    <input type="text" id="batchLocation" required placeholder="例如: A1-01">
  </div>
</div>
```

**2. 加载供货商列表**

修改 `showBatchCreateVariantsModal()` 函数，添加供货商加载逻辑：

```javascript
// 填充供货商下拉框
const supplierSelect = document.getElementById('batchSupplier');
supplierSelect.innerHTML = '<option value="">请选择供货商</option>';

try {
  const suppliers = await loadSuppliers();
  suppliers.forEach(supplier => {
    const option = document.createElement('option');
    option.value = supplier.name;
    option.textContent = supplier.name;
    supplierSelect.appendChild(option);
  });
} catch (error) {
  debugLog(`加载供货商失败: ${error.message}`);
}
```

**3. 表单验证**

在 `createBatchVariants()` 函数中添加验证：

```javascript
const supplier = document.getElementById('batchSupplier').value;
const location = document.getElementById('batchLocation').value.trim();

if (!supplier || !location) {
  alert('请选择供货商并填写位置');
  return;
}
```

**4. API调用**

在API请求body中添加supplier和location字段：

```javascript
body: JSON.stringify({
  merchantId: 'admin',
  productName,
  brand,
  category,
  supplier,        // 新增
  location,        // 新增
  dimension1Label,
  dimension1Values,
  dimension2Label,
  dimension2Values,
  costPrice,
  wholesalePrice,
  retailPrice,
  taxClassification,
  condition,
  initialQuantity,
  notes
})
```

**5. 确认对话框**

更新确认对话框，显示供货商和位置信息：

```javascript
if (!confirm(`确认创建 ${totalVariants} 个产品变体吗？

产品名称: ${productName}
供货商: ${supplier}
位置: ${location}
${dimension1Label}: ${dimension1Values.length} 个
${dimension2Label}: ${dimension2Values.length} 个`)) {
  return;
}
```

## 用户体验改进

### 价格输入
- ✅ 用户可以自由设置任意价格
- ✅ 不受自动计算限制
- ✅ 适合不同的定价策略
- ✅ 更灵活的价格管理

### 批量创建变体
- ✅ 必须选择供货商
- ✅ 必须填写位置信息
- ✅ 创建的产品包含完整的库存管理信息
- ✅ 便于后续的库存追踪和管理

## 测试步骤

### 测试价格输入独立性
1. 登录 warehouse1 账号
2. 进入"入库管理" → "手动录入入库"
3. 点击"➕ 添加产品"
4. 输入进货价（例如：10.00）
5. 确认批发价和零售价不会自动填充
6. 手动输入批发价（例如：15.00）
7. 确认零售价不会自动填充
8. 手动输入零售价（例如：20.00）
9. 所有价格应该保持用户输入的值

### 测试批量创建变体
1. 登录 warehouse1 账号
2. 进入"入库管理" → "手动录入入库"
3. 点击"📦 批量创建变体"
4. 填写产品名称、品牌、分类
5. **检查供货商下拉框**：应该显示可用的供货商列表
6. **选择供货商**（必填）
7. **填写位置**（必填，例如：A1-01）
8. 填写维度1和维度2的选项
9. 填写价格信息
10. 选择税务分类和成色
11. 点击"批量创建所有变体"
12. 确认对话框应该显示供货商和位置信息
13. 确认创建
14. 检查创建的产品是否包含供货商和位置信息

## 注意事项
- 使用 **Ctrl + Shift + R** 强制刷新浏览器
- 服务器不需要重启（只修改了HTML文件）
- 供货商列表从数据库动态加载
- 位置信息支持任意格式（建议使用货架编号，如：A1-01）

## 文件修改
- `StockControl-main/public/prototype-working.html`
  - 移除价格输入框的联动事件
  - 删除 `calculateWholesalePrice()` 函数
  - 删除 `calculateRetailPrice()` 函数
  - 在批量创建变体表单中添加供货商和位置字段
  - 修改 `showBatchCreateVariantsModal()` 函数加载供货商
  - 修改 `createBatchVariants()` 函数包含供货商和位置

## 状态
✅ 已完成并可以测试
