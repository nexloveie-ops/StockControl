# 手动录入入库 - 成色选择功能

## 功能描述

在商户手动录入产品入库时，成色（Condition）字段从ProductCondition数据库表动态加载，支持灵活管理成色选项。

## 数据流程

```
数据库 (ProductCondition表)
    ↓
后端API (/api/merchant/conditions)
    ↓
前端函数 (loadConditionsForMerchantManual)
    ↓
下拉框 (merchantManualCondition)
```

### 数据库查询逻辑

```javascript
// app.js 第7013行
const conditions = await ProductCondition.find({ isActive: true })
  .sort({ sortOrder: 1, name: 1 })
  .lean();
```

**查询条件**：
- 只查询激活的成色（`isActive: true`）
- 按 `sortOrder` 升序排序
- 如果 `sortOrder` 相同，按 `name` 排序

**返回字段**：
- `code`: 成色代码（用作选项值）
- `name`: 成色名称（用作显示文本）
- `description`: 描述（可选）
- `sortOrder`: 排序顺序
- `isActive`: 是否激活

## 修改内容

### 1. 前端表单修改（merchant.html）

#### 成色下拉框（第11795行）

修改前（硬编码选项）：
```html
<select id="merchantManualCondition${index}">
  <option value="new">全新</option>
  <option value="like-new">99新</option>
  <option value="excellent">95新</option>
  <option value="good">90新</option>
  <option value="fair">85新</option>
</select>
```

修改后（动态加载）：
```html
<select id="merchantManualCondition${index}">
  <option value="">选择成色...</option>
</select>
```

#### 添加加载函数调用（第11810行）

```javascript
// 加载成色列表
loadConditionsForMerchantManual(index);
```

#### 新增加载函数（第11895行）

```javascript
async function loadConditionsForMerchantManual(index) {
  try {
    console.log(`🔄 加载成色列表 for index ${index}`);
    const response = await fetch(`${API_BASE}/merchant/conditions`);
    const result = await response.json();
    
    console.log('🎨 成色API响应:', result);
    
    if (result.success && result.data) {
      const select = document.getElementById(`merchantManualCondition${index}`);
      if (!select) {
        console.error(`❌ 找不到元素: merchantManualCondition${index}`);
        return;
      }
      
      select.innerHTML = '<option value="">选择成色...</option>';
      
      result.data.forEach(condition => {
        // 显示：名称，值：code
        const option = new Option(condition.name, condition.code);
        select.add(option);
      });
      
      console.log(`✅ 已加载 ${result.data.length} 个成色选项`);
    } else {
      console.error('❌ 成色数据为空或API失败');
    }
  } catch (error) {
    console.error('❌ 加载成色失败:', error);
  }
}
```

### 2. 后端API（已存在）

API端点：`GET /api/merchant/conditions`

位置：`StockControl-main/app.js` 第7013行

功能：
- 查询所有激活的成色（isActive: true）
- 按sortOrder和name排序
- 返回成色列表

### 3. 数据模型（ProductCondition.js）

字段：
- `code`: 成色代码（唯一，大写）
- `name`: 成色名称
- `description`: 描述
- `isActive`: 是否激活
- `sortOrder`: 排序顺序

### 4. 数据库初始化

当前激活的成色选项（6个）：

| 排序 | 名称 | 代码 | 描述 |
|------|------|------|------|
| 1 | 全新 | BRAND NEW | 全新未拆封 |
| 2 | Like New | LIKE_NEW | 99新 |
| 3 | Excellent | EXCELLENT | 95新 |
| 4 | Good | GOOD | 90新 |
| 5 | Fair | FAIR | 85新 |
| 6 | 二手 | PRE-OWNED | 二手产品 |

## 使用说明

### 手动录入产品

1. 进入"入库管理 > 产品入库 > 手动录入"
2. 点击"➕ 添加产品"
3. **重要：表格较宽，需要横向滚动查看所有列**
4. 向右滚动表格，找到"成色 ⭐"列（黄色背景高亮）
5. 在"成色"下拉框中选择（选项从数据库动态加载）
6. 填写其他必填字段
7. 点击"✅ 确认入库"

### 如何查看成色列：

**方法1：横向滚动表格**
1. 进入"入库管理 > 产品入库 > 手动录入"
2. 点击"➕ 添加产品"
3. 看到蓝色提示框："👉 表格较宽，请横向滚动查看所有列"
4. 向右滚动表格
5. 找到黄色背景的"成色 ⭐"列
6. 下拉框中的选项从数据库动态加载

**方法2：使用测试页面**
- 访问：http://localhost:3000/test-conditions-api.html
- 点击"🔄 测试API"按钮
- 查看从数据库加载的成色选项

**方法3：浏览器控制台**
- 按F12打开开发者工具
- 切换到Console标签
- 添加产品后查看日志：
  ```
  🔄 加载成色列表 for index 0
  🎨 成色API响应: {success: true, data: Array(N)}
  ✅ 已加载 N 个成色选项
  ```
  其中N是数据库中激活的成色数量

### 成色选项来源

**重要**：成色选项完全从数据库读取，不是硬编码的。

- 数据表：`productconditions`
- 查询条件：`isActive: true`
- 排序方式：`sortOrder ASC, name ASC`

要查看当前可用的成色选项，请：
1. 使用测试页面查看
2. 或查询数据库：
   ```javascript
   db.productconditions.find({ isActive: true }).sort({ sortOrder: 1 })
   ```

### 管理成色选项

成色选项完全由数据库管理，可以灵活添加、修改、启用或禁用。

**添加新成色**：
```javascript
const newCondition = new ProductCondition({
  code: 'REFURBISHED',
  name: 'Refurbished',
  description: '官方翻新',
  isActive: true,
  sortOrder: 7
});
await newCondition.save();
```

**修改成色**：
```javascript
await ProductCondition.updateOne(
  { code: 'LIKE_NEW' },
  { $set: { name: '99新', sortOrder: 2 } }
);
```

**启用/禁用成色**：
```javascript
// 启用
await ProductCondition.updateOne(
  { code: 'EXCELLENT' },
  { $set: { isActive: true } }
);

// 禁用
await ProductCondition.updateOne(
  { code: 'FAIR' },
  { $set: { isActive: false } }
);
```

**查看所有成色**：
```javascript
const conditions = await ProductCondition.find()
  .sort({ sortOrder: 1 })
  .lean();
```

## 优势

### 修改前（硬编码）：
- ❌ 选项固定，无法修改
- ❌ 需要修改代码才能添加新选项
- ❌ 不同页面可能有不同的选项

### 修改后（数据库驱动）：
- ✅ 选项可以在数据库中管理
- ✅ 添加新选项不需要修改代码
- ✅ 所有页面使用统一的成色选项
- ✅ 支持多语言（可以添加不同语言的成色名称）
- ✅ 可以控制显示顺序（sortOrder）
- ✅ 可以启用/禁用选项（isActive）

## 测试步骤

1. 刷新浏览器（Ctrl + Shift + R）
2. 进入"入库管理 > 产品入库 > 手动录入"
3. 点击"➕ 添加产品"
4. 查看"成色"下拉框
5. 应该显示6个选项（从数据库加载）
6. 选择一个成色
7. 填写其他信息并确认入库
8. 检查入库的产品是否保存了正确的成色代码

## 浏览器控制台日志

成功加载时会显示：
```
🔄 加载成色列表 for index 0
🎨 成色API响应: {success: true, data: Array(6)}
✅ 已加载 6 个成色选项
```

## 数据库查询

查看所有激活的成色：
```javascript
db.productconditions.find({ isActive: true }).sort({ sortOrder: 1 })
```

激活所有成色：
```javascript
db.productconditions.updateMany(
  { isActive: false },
  { $set: { isActive: true } }
)
```

## 修改日期

2026-02-17

## 相关文件

- `StockControl-main/public/merchant.html` - 前端UI和逻辑
  - 第11795行：成色下拉框
  - 第11810行：加载函数调用
  - 第11895行：loadConditionsForMerchantManual函数
- `StockControl-main/app.js` - 后端API（第7013行）
- `StockControl-main/models/ProductCondition.js` - 数据模型
- `StockControl-main/check-conditions.js` - 检查成色数据脚本
- `StockControl-main/activate-conditions.js` - 激活成色选项脚本

## 注意事项

1. **成色代码格式**：
   - 使用大写字母和下划线
   - 例如：BRAND_NEW, LIKE_NEW, EXCELLENT

2. **数据一致性**：
   - 确保所有需要的成色选项都已激活（isActive: true）
   - 使用sortOrder控制显示顺序

3. **向后兼容**：
   - 旧的硬编码值（如"new", "like-new"）可能需要映射到新的代码
   - 建议统一使用新的代码格式（BRAND_NEW, LIKE_NEW等）
