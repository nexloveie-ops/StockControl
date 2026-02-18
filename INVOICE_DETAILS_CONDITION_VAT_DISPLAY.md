# 采购发票详情 - 添加成色和税务分类显示

## 改进说明

在采购发票详情页面的产品明细表格中，添加了"成色"和"税务分类"两列，使发票信息更加完整。

## 修改内容

### 表格列调整

**修改前的列：**
1. 产品描述
2. 数量
3. 单价（含税）
4. 总价（含税）
5. 税额
6. 序列号

**修改后的列：**
1. 产品
2. 数量
3. 单价
4. 总价
5. 成色
6. 税务分类
7. 序列号

### 显示逻辑

#### 成色（Condition）
- 显示产品的成色状态
- 支持的成色类型：
  - `BRAND_NEW` / `Brand New` → 显示为"全新"（绿色背景）
  - `PRE-OWNED` / `Pre-Owned` → 显示为"二手"（黄色背景）
  - `REFURBISHED` / `Refurbished` → 显示为"翻新"（黄色背景）
  - 其他值 → 直接显示原值
- 如果没有成色信息，显示"-"

#### 税务分类（VAT Rate）
- 显示产品的税率
- 常见税率：
  - `VAT 23%` → 标准税率
  - `VAT 13.5%` → 服务税率
  - `VAT 0%` → 零税率
  - `Margin VAT` → 二手商品边际税
- 显示为紫色徽章样式
- 如果没有税率信息，显示"-"

## 数据来源

成色和税率信息来自发票项目（invoice.items）中的字段：
- `item.condition`：产品成色
- `item.vatRate`：税务分类

这些字段在手动录入入库时会被保存到数据库中。

## 修改的文件

`StockControl-main/public/prototype-working.html` (lines 2530-2590)

## 代码示例

### 成色显示
```javascript
${item.condition ? `
  <span style="padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; 
               background: ${item.condition.includes('NEW') || item.condition.includes('Brand New') ? '#dcfce7' : '#fef3c7'}; 
               color: ${item.condition.includes('NEW') || item.condition.includes('Brand New') ? '#166534' : '#92400e'};">
    ${item.condition === 'BRAND_NEW' ? '全新' : 
      item.condition === 'Brand New' ? '全新' :
      item.condition === 'PRE-OWNED' ? '二手' :
      item.condition === 'Pre-Owned' ? '二手' :
      item.condition === 'REFURBISHED' ? '翻新' :
      item.condition === 'Refurbished' ? '翻新' :
      item.condition}
  </span>
` : '<span style="color: #9ca3af;">-</span>'}
```

### 税务分类显示
```javascript
${item.vatRate ? `
  <span style="padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; 
               background: #ede9fe; color: #7c3aed;">
    ${item.vatRate}
  </span>
` : '<span style="color: #9ca3af;">-</span>'}
```

## 视觉效果

### 成色徽章
- 全新产品：绿色背景（#dcfce7），深绿色文字（#166534）
- 二手/翻新产品：黄色背景（#fef3c7），深黄色文字（#92400e）

### 税务分类徽章
- 统一样式：紫色背景（#ede9fe），紫色文字（#7c3aed）

## 测试步骤

1. 打开仓库管理员页面：http://localhost:3000/prototype-working.html
2. 点击"Pre-Owned Devices"分类
3. 点击"iPhone 17"产品名称
4. 在采购发票记录中点击发票号"SI-0016"
5. 查看产品明细表格，应该能看到：
   - "成色"列显示产品的成色（如"二手"）
   - "税务分类"列显示税率（如"Margin VAT"）

## 预期结果

采购发票详情页面的产品明细表格现在包含完整的产品信息：
- 产品名称
- 数量
- 单价和总价
- 成色（新增）
- 税务分类（新增）
- 序列号

这使得发票信息更加完整和清晰，便于查看和核对。

## 注意事项

1. **数据完整性**：成色和税率信息依赖于入库时的数据录入
2. **历史数据**：旧的发票记录可能没有这些字段，会显示为"-"
3. **多语言支持**：成色名称已经转换为中文显示
4. **样式一致性**：徽章样式与系统其他部分保持一致

## 相关功能

- 手动录入入库（Manual Receiving）
- 采购发票管理（Purchase Invoice Management）
- 产品进货历史（Product Purchase History）

## 修改日期

2026-02-18
