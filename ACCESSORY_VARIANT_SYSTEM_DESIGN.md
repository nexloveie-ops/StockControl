# 配件产品变体管理系统设计文档

## 概述

为配件类产品（手机壳、屏幕保护膜、数据线等）提供变体管理功能，支持型号和颜色两个维度的组合。

## 核心需求

1. **批量创建** - 管理员可以一次性创建多个变体
2. **统一价格** - 所有变体使用相同价格
3. **独立库存** - 每个变体独立管理库存
4. **灵活维度** - Model 和 Color 字段可以表示任何属性
5. **销售便捷** - 两步选择（维度1 → 维度2）

## 数据结构

### 使用现有字段

```javascript
{
  productName: "iPhone Clear Case",    // 产品名称
  category: "Phone Case",              // 分类
  brand: "Generic",                    // 品牌
  model: "iPhone 13",                  // 维度1（型号/尺寸/容量等）
  color: "Clear",                      // 维度2（颜色/类型/材质等）
  quantity: 20,                        // 库存
  costPrice: 5.00,
  wholesalePrice: 8.00,
  retailPrice: 12.00,
  taxClassification: "VAT_23",
  barcode: "ICC-IP13-CLR"             // 可选
}
```

### 变体示例

**Phone Case**:
- Model = 适配机型 (iPhone 13, iPhone 14)
- Color = 颜色 (Clear, Black, Blue)

**Screen Protector**:
- Model = 适配机型 (iPhone 13, iPhone 14)
- Color = 类型 (Clear, Privacy, Matte)

**USB Cable**:
- Model = 长度 (1m, 2m, 3m)
- Color = 颜色 (White, Black)

**Charger**:
- Model = 功率 (20W, 30W, 65W)
- Color = 颜色 (White, Black)

## 功能模块

### 模块1: 批量创建工具（管理员）

#### 界面位置
管理员 > 库存管理 > 新增按钮旁边添加"批量创建变体"按钮

#### 功能流程
1. 点击"批量创建变体"按钮
2. 填写产品基本信息
3. 输入维度1选项列表（每行一个）
4. 输入维度2选项列表（每行一个）
5. 设置统一价格
6. 预览将创建的变体数量
7. 点击"批量创建"
8. 系统自动创建所有组合

#### API端点
```
POST /api/admin/inventory/batch-create-variants
```

**请求体**:
```json
{
  "productName": "iPhone Clear Case",
  "category": "Phone Case",
  "brand": "Generic",
  "dimension1Label": "Model",
  "dimension1Values": ["iPhone 13", "iPhone 14", "iPhone 14 Pro"],
  "dimension2Label": "Color",
  "dimension2Values": ["Clear", "Black", "Blue"],
  "costPrice": 5.00,
  "wholesalePrice": 8.00,
  "retailPrice": 12.00,
  "taxClassification": "VAT_23",
  "initialQuantity": 0
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "created": 9,
    "variants": [...]
  }
}
```

### 模块2: 销售界面优化（商户）

#### 产品列表分组显示

**当前逻辑**:
```javascript
// 按 productName + brand + model + color 分组
const key = `${item.productName}_${item.brand}_${item.model}_${item.color}`;
```

**新逻辑**:
```javascript
// 按 productName + brand 分组
const key = `${item.productName}_${item.brand}`;
```

#### 变体选择对话框

**步骤1**: 选择维度1（如型号）
**步骤2**: 选择维度2（如颜色）
**步骤3**: 加入购物车

#### 显示逻辑
```javascript
if (product.variants.length === 1) {
  // 只有一个变体，直接显示"加入购物车"按钮
  显示: [加入购物车]
} else {
  // 多个变体，显示"选择变体"按钮
  显示: [选择型号和颜色]
}
```

### 模块3: 库存管理优化（商户）

#### 分组展开/折叠视图

**折叠状态**:
```
iPhone Clear Case                        [展开▼]
总库存: 180件  总价值: €2,160.00
```

**展开状态**:
```
iPhone Clear Case                        [折叠▲]
┌─────────────────────────────────────────────┐
│ 型号          颜色    库存    价格    小计   │
├─────────────────────────────────────────────┤
│ iPhone 13     Clear   20     €12.00  €240   │
│ iPhone 13     Black   15     €12.00  €180   │
│ iPhone 14     Clear   30     €12.00  €360   │
│ ...                                          │
└─────────────────────────────────────────────┘
```

## 实施步骤

### 第1步: 批量创建API（后端）
- [ ] 添加 POST /api/admin/inventory/batch-create-variants
- [ ] 验证输入参数
- [ ] 生成所有变体组合
- [ ] 批量插入数据库
- [ ] 返回创建结果

### 第2步: 批量创建界面（管理员前端）
- [ ] 添加"批量创建变体"按钮
- [ ] 创建批量创建模态框
- [ ] 实现表单验证
- [ ] 实时预览变体数量
- [ ] 调用API创建变体

### 第3步: 销售界面优化（商户前端）
- [ ] 修改产品分组逻辑
- [ ] 创建变体选择对话框
- [ ] 实现两步选择流程
- [ ] 显示库存状态
- [ ] 集成到购物车

### 第4步: 库存管理优化（商户前端）
- [ ] 实现分组展开/折叠
- [ ] 显示汇总统计
- [ ] 支持按变体筛选

## 技术要点

### 1. 批量创建性能优化
```javascript
// 使用 insertMany 而不是循环 save
await AdminInventory.insertMany(variants);
```

### 2. 前端分组算法
```javascript
const grouped = products.reduce((acc, item) => {
  const key = `${item.productName}_${item.brand}`;
  if (!acc[key]) {
    acc[key] = {
      productName: item.productName,
      brand: item.brand,
      variants: [],
      totalQuantity: 0
    };
  }
  acc[key].variants.push(item);
  acc[key].totalQuantity += item.quantity;
  return acc;
}, {});
```

### 3. 变体选择状态管理
```javascript
let selectedVariant = {
  dimension1: null,  // 第一步选择
  dimension2: null,  // 第二步选择
  item: null         // 最终选中的库存记录
};
```

## 测试场景

### 场景1: 批量创建手机壳
```
产品名称: iPhone Clear Case
型号: iPhone 13, iPhone 14, iPhone 14 Pro
颜色: Clear, Black, Blue
预期: 创建 9 个变体 (3×3)
```

### 场景2: 批量创建屏幕保护膜
```
产品名称: Tempered Glass Screen Protector
型号: iPhone 13, iPhone 14
类型: Clear, Privacy
预期: 创建 4 个变体 (2×2)
```

### 场景3: 销售选择变体
```
1. 进入销售业务
2. 选择 Phone Case 分类
3. 点击 "iPhone Clear Case"
4. 选择型号 "iPhone 13"
5. 选择颜色 "Clear"
6. 加入购物车
预期: 正确添加该变体到购物车
```

## 兼容性

### 向后兼容
- ✅ 不影响现有的手机等产品
- ✅ 现有的单一产品仍然正常工作
- ✅ 只有多变体产品才显示选择对话框

### 数据库兼容
- ✅ 使用现有字段，无需迁移
- ✅ 现有数据不受影响

## 未来扩展

### 可选功能
1. **价格矩阵** - 不同变体不同价格
2. **三维变体** - 支持第三个维度
3. **批量编辑** - 批量修改变体价格
4. **库存预警** - 变体库存低于阈值时提醒
5. **销售统计** - 按变体统计销售数据

---
**文档版本**: 1.0
**创建日期**: 2026-02-05
**状态**: 设计完成，准备开发
