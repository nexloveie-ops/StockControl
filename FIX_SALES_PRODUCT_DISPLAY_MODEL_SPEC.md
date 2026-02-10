# 销售业务产品卡片显示型号/规格

## 功能描述

在销售业务中点击大分类后，产品卡片中显示可用的型号和颜色信息。

## 修改内容

### 修改前

设备产品（如 iPhone）的卡片只显示：
```
┌─────────────────────┐
│ iPhone 11           │
│ Pre-Owned Devices   │
│                     │
│ 库存: 3  €349.00    │
│ 📱 选择设备         │
└─────────────────────┘
```

**问题：** 用户不知道有哪些型号和颜色可选。

### 修改后

设备产品的卡片显示所有可用的型号和颜色：
```
┌─────────────────────┐
│ iPhone 11           │
│ Pre-Owned Devices   │
│                     │
│ 📱 可选设备         │
│ 型号: 64GB, 128GB   │
│ 颜色: 黑色, 白色, 红色│
│                     │
│ 库存: 3  €349.00    │
│ 📱 选择设备         │
└─────────────────────┘
```

## 代码修改

### 位置
`StockControl-main/public/merchant.html` (第2510-2550行)

### 修改前代码

```javascript
: product.isDevice ? `
  <div style="color: #666; font-size: 13px; margin-bottom: 12px; flex-grow: 1;">
    ${product.model ? `<div>型号: ${product.model}</div>` : ''}
    ${product.color ? `<div>颜色: ${product.color}</div>` : ''}
  </div>
` : `
  <div style="flex-grow: 1;"></div>
`
```

**问题：** 只显示单一的 `product.model` 和 `product.color`，但现在设备按产品名称分组后，这些字段是 `null`。

### 修改后代码

```javascript
: product.isDevice && product.items.length > 0 ? `
  <div style="color: #666; font-size: 12px; margin-bottom: 12px; background: #f0f9ff; padding: 10px; border-radius: 8px; border-left: 3px solid #3b82f6; flex-grow: 1;">
    <div style="font-weight: 600; color: #1e40af; margin-bottom: 6px; font-size: 13px;">📱 可选设备</div>
    ${(() => {
      const models = new Set();
      const colors = new Set();
      product.items.forEach(item => {
        if (item.model) models.add(item.model);
        if (item.color) colors.add(item.color);
      });
      const modelList = Array.from(models);
      const colorList = Array.from(colors);
      
      let html = '';
      if (modelList.length > 0) {
        html += `<div style="margin-bottom: 4px; line-height: 1.5;">
          <span style="color: #1e40af; font-weight: 600;">型号:</span> 
          <span style="color: #374151;">${modelList.join(', ')}</span>
        </div>`;
      }
      if (colorList.length > 0) {
        html += `<div style="line-height: 1.5;">
          <span style="color: #1e40af; font-weight: 600;">颜色:</span> 
          <span style="color: #374151;">${colorList.join(', ')}</span>
        </div>`;
      }
      return html;
    })()}
  </div>
` : `
  <div style="flex-grow: 1;"></div>
`
```

**改进：**
1. 遍历 `product.items` 收集所有不同的型号和颜色
2. 使用 `Set` 去重
3. 显示所有可用的型号和颜色
4. 添加蓝色背景和边框，与配件变体样式一致

## 显示效果

### Pre-Owned Devices 分类

```
┌─────────────────────────┐  ┌─────────────────────────┐
│ iPhone 11               │  │ iPhone 13               │
│ Pre-Owned Devices       │  │ Pre-Owned Devices       │
│                         │  │                         │
│ 📱 可选设备             │  │ 📱 可选设备             │
│ 型号: 64GB, 128GB       │  │ 型号: 128GB, 256GB      │
│ 颜色: 黑色, 白色, 红色  │  │ 颜色: 黑色, 白色        │
│                         │  │                         │
│ 库存: 3    €349.00      │  │ 库存: 3    €450.00      │
│ 📱 选择设备             │  │ 📱 选择设备             │
└─────────────────────────┘  └─────────────────────────┘
```

### Brand New Devices 分类

```
┌─────────────────────────┐  ┌─────────────────────────┐
│ iPhone 14               │  │ iPhone 15               │
│ Brand New Devices       │  │ Brand New Devices       │
│                         │  │                         │
│ 📱 可选设备             │  │ 📱 可选设备             │
│ 型号: 128GB, 256GB      │  │ 型号: 128GB, 256GB, 512GB│
│ 颜色: 黑色, 蓝色, 紫色  │  │ 颜色: 黑色, 蓝色, 粉色  │
│                         │  │                         │
│ 库存: 2    €599.00      │  │ 库存: 1    €699.00      │
│ 📱 选择设备             │  │ 📱 选择设备             │
└─────────────────────────┘  └─────────────────────────┘
```

### Accessories 分类（配件）

```
┌─────────────────────────┐  ┌─────────────────────────┐
│ iPhone Case             │  │ Screen Protector        │
│ Accessories             │  │ Accessories             │
│                         │  │                         │
│ 📦 可选变体             │  │ 📦 可选变体             │
│ 型号: MagSafe, Regular  │  │ 型号: Tempered Glass    │
│ 颜色: 黑色, 透明        │  │ 颜色: 透明              │
│                         │  │                         │
│ 库存: 10   €15.00       │  │ 库存: 20   €10.00       │
│ 🎨 选择型号和颜色       │  │ 🎨 选择型号和颜色       │
└─────────────────────────┘  └─────────────────────────┘
```

## 样式说明

### 设备产品（有序列号）
- 背景色: `#f0f9ff` (浅蓝色)
- 边框: 左侧 3px 蓝色 (`#3b82f6`)
- 标题: "📱 可选设备" (蓝色)
- 按钮: "📱 选择设备" (蓝色)

### 配件产品（有变体）
- 背景色: `#f0f9ff` (浅蓝色)
- 边框: 左侧 3px 蓝色 (`#3b82f6`)
- 标题: "📦 可选变体" (蓝色)
- 按钮: "🎨 选择型号和颜色" (紫色)

### 配件产品（无变体）
- 背景色: `#f9fafb` (浅灰色)
- 边框: 左侧 3px 灰色 (`#9ca3af`)
- 显示型号和颜色（如果有）
- 按钮: "➕ 加入购物车" (绿色)

## 测试验证

### 测试步骤

1. **刷新浏览器** (Ctrl + Shift + R)

2. **进入销售业务**
   - 登录 merchant.html
   - 点击"销售业务"标签

3. **测试 Pre-Owned Devices**
   - 点击"Pre-Owned Devices"分类
   - 查看产品卡片

4. **验证显示内容**
   - ✅ 显示"📱 可选设备"标题
   - ✅ 显示所有可用的型号
   - ✅ 显示所有可用的颜色
   - ✅ 蓝色背景和边框
   - ✅ 显示总库存数量
   - ✅ 显示价格

5. **测试 Brand New Devices**
   - 点击"Brand New Devices"分类
   - 验证同样的显示效果

6. **测试 Accessories**
   - 点击"Accessories"分类
   - 验证配件产品的变体显示

### 预期结果

#### 设备产品（iPhone, Samsung等）
- ✅ 显示"📱 可选设备"
- ✅ 列出所有型号（如：64GB, 128GB, 256GB）
- ✅ 列出所有颜色（如：黑色, 白色, 红色）
- ✅ 蓝色背景框
- ✅ 按钮显示"📱 选择设备"

#### 配件产品（有变体）
- ✅ 显示"📦 可选变体"
- ✅ 列出所有型号
- ✅ 列出所有颜色
- ✅ 蓝色背景框
- ✅ 按钮显示"🎨 选择型号和颜色"

#### 配件产品（无变体）
- ✅ 显示型号和颜色（如果有）
- ✅ 灰色背景框
- ✅ 按钮显示"➕ 加入购物车"

## 用户体验改进

### 改进前
- ❌ 用户不知道有哪些型号和颜色
- ❌ 需要点击"选择设备"才能看到选项
- ❌ 信息不够直观

### 改进后
- ✅ 一眼就能看到所有可用的型号和颜色
- ✅ 用户可以快速判断是否有需要的规格
- ✅ 减少不必要的点击
- ✅ 提升购物体验

## 修改的文件

- `StockControl-main/public/merchant.html` (第2510-2550行)
  - 修改产品卡片的显示逻辑
  - 添加设备产品的型号/颜色显示

## 完成时间

2026-02-10

## 相关功能

- 销售业务产品显示
- 设备选择功能
- 变体选择功能
- 产品分组显示

## 注意事项

1. **浏览器刷新**
   - 修改 HTML 文件后需要刷新浏览器
   - 使用 Ctrl + Shift + R 强制刷新

2. **型号和颜色来源**
   - 从 `product.items` 数组中收集
   - 使用 `Set` 自动去重
   - 按逗号分隔显示

3. **显示条件**
   - 只有当 `product.isDevice` 为 true 时显示
   - 只有当 `product.items.length > 0` 时显示
   - 如果没有型号或颜色，对应行不显示
