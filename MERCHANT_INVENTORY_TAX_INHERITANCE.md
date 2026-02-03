# 商户库存税率继承功能

## 修复日期
2026-02-02

## 问题描述
商户在手动入库时，产品的税务分类没有自动继承分类的默认税率，导致库存列表中税务分类显示为空。

## 解决方案

### 1. 模型更新
在 `MerchantInventory` 模型中添加 `taxClassification` 字段：

```javascript
// 税务分类 - 继承自产品分类的默认税率
taxClassification: {
  type: String,
  default: 'VAT_23'
}
```

### 2. 入库API更新
在 `POST /api/merchant/inventory/add` API中：

1. 引入 `ProductCategory` 模型
2. 根据产品分类查询对应的分类配置
3. 从分类配置中获取 `defaultVatRate`
4. 将税率格式转换为税务分类代码：
   - "VAT 23%" → `VAT_23`
   - "Service VAT 13.5%" → `SERVICE_VAT_13_5`
   - "Margin VAT" → `MARGIN_VAT_0`
5. 保存库存时自动设置 `taxClassification` 字段

### 3. 税率转换逻辑

```javascript
const vatRate = categoryDoc.defaultVatRate;
if (vatRate.includes('23')) {
  taxClassification = 'VAT_23';
} else if (vatRate.includes('13.5')) {
  taxClassification = 'SERVICE_VAT_13_5';
} else if (vatRate.toLowerCase().includes('margin')) {
  taxClassification = 'MARGIN_VAT_0';
}
```

## 功能特点

1. **自动继承**：入库时自动从分类获取默认税率
2. **容错处理**：如果分类不存在或获取失败，使用默认值 `VAT_23`
3. **格式转换**：自动将人类可读的税率格式转换为系统代码
4. **向后兼容**：已有库存数据会使用默认值 `VAT_23`

## 测试步骤

1. 在"系统设置 > 产品分类管理"中配置分类的默认税率
2. 在商户页面点击"+ 手动入库"
3. 选择一个已配置税率的分类
4. 填写其他必填信息并提交
5. 在"我的库存"中查看，税务分类应该显示正确的税率标签

## 示例

假设在系统设置中配置：
- 分类类型：`Type-C Cable 1M`
- 默认税率：`VAT 23%`

当商户入库该分类的产品时：
- 系统自动查询分类配置
- 获取默认税率 "VAT 23%"
- 转换为税务分类代码 "VAT_23"
- 保存到库存记录中
- 在库存列表中显示为 "VAT 23%" 标签

## 相关文件

- `StockControl-main/models/MerchantInventory.js` - 添加 taxClassification 字段
- `StockControl-main/app.js` - 更新入库API逻辑（约3498-3600行）
- `StockControl-main/public/merchant.html` - 前端显示税务分类

## 注意事项

1. 税率继承发生在入库时，修改分类的默认税率不会影响已入库的产品
2. 如果需要修改已入库产品的税率，需要单独更新库存记录
3. 确保在系统设置中正确配置各分类的默认税率
