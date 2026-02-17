# 税务分类显示格式更新

## 修改内容

在商户手动录入产品入库时，税务分类下拉框的显示格式已更新为只显示税率代码。

### 修改前：
```
显示：Vat 0% (0%)
显示：VAT 13.5% (13.5%)
显示：VAT 23% (23%)
```

### 修改后：
```
显示：VAT_0
显示：VAT_13_5
显示：VAT_23
```

## 代码修改

**文件**：`StockControl-main/public/merchant.html`

**位置**：第11886行

**修改前**：
```javascript
result.data.forEach(vatRate => {
  // 显示：名称 (税率%)，值：code
  const displayText = `${vatRate.name} (${vatRate.rate}%)`;
  const option = new Option(displayText, vatRate.code);
  select.add(option);
});
```

**修改后**：
```javascript
result.data.forEach(vatRate => {
  // 显示：税率代码，值：code
  const displayText = vatRate.code;
  const option = new Option(displayText, vatRate.code);
  select.add(option);
});
```

## 数据来源

税率代码从VatRate数据库表读取：

```javascript
// API: GET /api/vat-rates
const vatRates = await VatRate.find({ isActive: true })
  .sort({ rate: 1 })
  .lean();
```

**VatRate表字段**：
- `code`: 税率代码（如：VAT_0, VAT_13_5, VAT_23）
- `name`: 税率名称（如：Vat 0%, VAT 13.5%, VAT 23%）
- `rate`: 税率百分比（如：0, 13.5, 23）
- `isActive`: 是否激活

## 显示效果

**下拉框选项**：
- VAT_0
- VAT_13_5
- VAT_23
- MARGIN_VAT_0
- （其他激活的税率代码）

**优势**：
- ✅ 显示更简洁
- ✅ 代码格式统一
- ✅ 便于识别和选择
- ✅ 与系统内部使用的代码一致

## 测试步骤

1. 刷新浏览器（Ctrl + Shift + R）
2. 进入"入库管理 > 产品入库 > 手动录入"
3. 点击"➕ 添加产品"
4. 查看"税务分类"下拉框
5. 应该显示税率代码（如：VAT_0, VAT_13_5, VAT_23）

## 修改日期

2026-02-17

## 相关文件

- `StockControl-main/public/merchant.html` - 前端显示逻辑（第11886行）
- `StockControl-main/app.js` - 税率API（第9680行）
- `StockControl-main/models/VatRate.js` - 税率数据模型
