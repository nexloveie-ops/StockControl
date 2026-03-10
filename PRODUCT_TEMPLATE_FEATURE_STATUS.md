# 产品模板功能 - 当前状态

**更新时间**: 2026-03-10  
**状态**: ✅ 已完成 - 包含批量配置功能

---

## 功能概述

产品模板管理系统允许用户创建支持多维度变体的产品模板，并通过批量设置功能快速配置所有变体的价格和库存。

---

## 已实现功能

### 1. 系统信息管理 (Tab 2)
- ✅ 创建系统信息（名称 + 值列表）
- ✅ 编辑系统信息
- ✅ 删除系统信息
- ✅ 用户数据隔离（每个用户只能看到自己的数据）
- ✅ 简化界面（移除了"信息类型"选择）

### 2. 产品模板管理 (Tab 3)
- ✅ 创建产品模板
  - 输入模板名称
  - 选择产品分类
  - 选择是否跟踪库存
  - 添加多个变体维度（从系统信息中选择）
- ✅ 自动生成变体组合
  - 支持多维度笛卡尔积组合
  - 自动生成变体标签
- ✅ **批量配置功能**（用户请求的核心功能）
  - 一次性为所有变体设置相同的成本价、批发价、零售价
  - 一次性为所有变体设置相同的库存数量
  - 应用后可单独修改特殊变体
- ✅ 查看模板列表
- ✅ 删除模板

---

## 批量配置功能详解

### 使用流程
1. 创建模板 → 填写基本信息 → 添加变体维度
2. 点击"下一步：配置变体" → 进入变体矩阵配置页面
3. 在顶部"批量设置"区域填写统一的价格和库存：
   - 成本价 (€)
   - 批发价 (€)
   - 零售价 (€)
   - 库存数量（仅当"跟踪库存"开启时显示）
4. 点击"✅ 应用到所有变体"按钮
5. 系统自动将这些值填充到下方所有变体的输入框中
6. 如果某些变体需要特殊价格或库存，可以单独修改
7. 点击"保存模板"完成创建

### 界面设计
- 批量设置区域使用蓝色背景高亮显示
- 应用按钮占满整行，醒目易用
- 变体列表使用表格形式，清晰展示所有组合
- 支持滚动查看大量变体

---

## 数据模型

### UserSystemInfo (系统信息)
```javascript
{
  userId: String,           // 用户ID
  type: String,             // 类型（默认 "OTHER"）
  name: String,             // 名称（如 "iPhone Models"）
  values: [String],         // 值列表（如 ["iPhone 17", "iPhone 17 Pro"]）
  isActive: Boolean,        // 是否激活
  createdAt: Date,
  updatedAt: Date
}
```

### ProductTemplate (产品模板)
```javascript
{
  userId: String,           // 用户ID
  name: String,             // 模板名称
  category: String,         // 产品分类
  trackInventory: Boolean,  // 是否跟踪库存
  variantDimensions: [{     // 变体维度
    systemInfoId: ObjectId,
    name: String
  }],
  variants: [{              // 变体列表
    values: Map,            // 变体值组合
    costPrice: Number,      // 成本价
    wholesalePrice: Number, // 批发价
    retailPrice: Number,    // 零售价
    quantity: Number        // 库存数量
  }],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## API 端点

### 系统信息管理
- `GET /api/user-system-info?userId={userId}` - 获取用户的系统信息列表
- `POST /api/user-system-info` - 创建系统信息
- `PUT /api/user-system-info/:id` - 更新系统信息
- `DELETE /api/user-system-info/:id` - 删除系统信息

### 产品模板管理
- `GET /api/product-templates?userId={userId}` - 获取用户的产品模板列表
- `POST /api/product-templates` - 创建产品模板
- `PUT /api/product-templates/:id` - 更新产品模板
- `DELETE /api/product-templates/:id` - 删除产品模板

---

## 文件清单

### 前端文件
- `StockControl-main/public/test-receiving.html` - 主页面（包含3个Tab）

### 后端文件
- `StockControl-main/models/UserSystemInfo.js` - 系统信息数据模型
- `StockControl-main/models/ProductTemplate.js` - 产品模板数据模型
- `StockControl-main/app.js` - API 端点实现（行号 12447-12590）

### 备份文件
- `StockControl-main/MERCHANT_CATEGORY_DISPLAY_BACKUP.md` - 商户销售业务产品分类显示代码备份

---

## 使用示例

### 示例1: 创建 iPhone 手机壳模板

1. **系统信息管理** - 创建两个系统信息：
   - 名称: "iPhone Models"
     - 值: iPhone 17, iPhone 17 Pro, iPhone 17 Pro Max
   - 名称: "Colors"
     - 值: Black, White, Blue, Red

2. **产品模板** - 创建模板：
   - 模板名称: "iPhone Case with Ring Holder"
   - 产品分类: Accessories
   - 跟踪库存: ✓
   - 变体维度: 
     - 维度1: iPhone Models
     - 维度2: Colors
   - 自动生成: 3 × 4 = 12 个变体组合

3. **批量配置**:
   - 成本价: 5.00€
   - 批发价: 8.00€
   - 零售价: 12.00€
   - 库存数量: 10
   - 点击"应用到所有变体"

4. **特殊调整**（可选）:
   - iPhone 17 Pro Max - Red: 零售价改为 15.00€
   - iPhone 17 - Black: 库存数量改为 20

5. 保存模板

---

## 待开发功能

- ⏳ 编辑已有模板（目前显示"编辑功能开发中..."）
- ⏳ 从模板快速创建产品到库存
- ⏳ 模板导入/导出功能
- ⏳ 模板复制功能

---

## 技术亮点

1. **多维度变体生成**: 使用递归算法生成笛卡尔积组合
2. **批量配置**: 一键应用到所有变体，大幅提升配置效率
3. **灵活性**: 批量应用后仍可单独修改特殊变体
4. **用户体验**: 
   - 清晰的步骤指引
   - 实时预览变体数量
   - 响应式表格设计
5. **数据隔离**: 每个用户只能访问自己的数据

---

## 测试建议

1. 创建不同数量的变体维度（1维、2维、3维）
2. 测试大量变体组合（如 10×10 = 100个变体）
3. 测试批量应用功能
4. 测试单独修改特殊变体
5. 测试"跟踪库存"开关的影响
6. 测试删除功能

---

**备注**: 此功能已完全实现用户请求的批量配置需求，避免了为每个变体重复输入相同的价格和库存数据。
