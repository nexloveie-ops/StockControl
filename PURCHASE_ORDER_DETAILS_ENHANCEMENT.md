# 采购订单详情增强 - 成色、税务分类、税额显示

## 功能概述
在采购报表的订单详情和PDF中添加产品的成色(Condition)、税务分类(Tax Classification)和税额(Tax Amount)信息。

## 实施日期
2026-02-17

## 修改内容

### 1. 前端订单详情表格 (merchant.html)

#### 表头修改 (第8860-8867行)
添加了3个新列：
- 成色 (Condition) - 居中对齐，宽度80px
- 税分类 (Tax Classification) - 居中对齐，宽度100px  
- 税额 (Tax Amount) - 右对齐，宽度100px

#### 表格行修改 (第8868-8925行)
- 成色显示为蓝色标签样式
- 税分类显示为彩色标签（VAT 23%黄色，VAT 13.5%蓝色）
- 税额自动计算：
  - 如果后端提供了taxAmount，直接使用
  - 否则根据税分类计算：
    - VAT 23%: 税额 = 总价 - (总价 / 1.23)
    - VAT 13.5%: 税额 = 总价 - (总价 / 1.135)
  - 显示为绿色加粗文字

#### 表尾修改 (第8926-8938行)
- 调整colspan以适应新增的列
- 合计行跨4列
- 税额总计显示在最右侧税额列

### 2. PDF生成增强 (app.js)

#### 表格列调整 (第8862-8869行)
添加了3个新列：
- Cond (成色) - 位置280
- Tax (税分类) - 位置480
- Tax Amt (税额) - 位置530

#### 产品行显示 (第8876-8915行)
- 显示产品成色
- 显示税务分类代码
- 计算并显示每个产品的税额
- 字体大小调整为8pt以适应更多列

#### 总计部分 (第8917-8929行)
- Subtotal显示在Total列
- Tax显示在Tax Amt列
- Total显示在Total列

## 数据字段

### 产品数据结构
```javascript
{
  productName: String,      // 产品名称
  model: String,           // 型号
  color: String,           // 颜色
  quantity: Number,        // 数量
  condition: String,       // 成色 (新增)
  taxClassification: String, // 税务分类 (新增)
  costPrice: Number,       // 单价
  totalCost: Number,       // 总价
  taxAmount: Number        // 税额 (新增)
}
```

## 税额计算逻辑

### VAT 23%
```javascript
税额 = 总价 - (总价 / 1.23)
```

### VAT 13.5%
```javascript
税额 = 总价 - (总价 / 1.135)
```

### VAT 0% / MARGIN_VAT_0
```javascript
税额 = 0
```

## 视觉样式

### 成色标签
- 背景色: #e0f2fe (浅蓝色)
- 文字色: #0c4a6e (深蓝色)
- 圆角: 4px
- 内边距: 3px 8px

### 税分类标签
- VAT 23%: 背景 #fef3c7 (黄色)
- VAT 13.5%: 背景 #dbeafe (蓝色)
- 其他: 背景 #f3f4f6 (灰色)
- 圆角: 4px
- 内边距: 2px 8px

### 税额显示
- 颜色: #059669 (绿色)
- 加粗显示
- 右对齐

## 测试要点

1. 订单详情显示
   - 成色列正确显示
   - 税分类列正确显示
   - 税额列正确计算和显示
   - 表格对齐正确

2. PDF生成
   - 所有列都显示在PDF中
   - 列宽合适，内容不重叠
   - 税额计算正确
   - 总计行对齐正确

3. 不同订单类型
   - 发票订单 (invoice)
   - 仓库订单 (warehouse)
   - 调拨订单 (transfer)

## 相关文件
- `StockControl-main/public/merchant.html` (第8860-8950行)
- `StockControl-main/app.js` (第8729-8950行)

## 服务器状态
- 进程ID: 16
- 端口: 3000
- 状态: 运行中

## 注意事项
1. HTML修改需要强制刷新浏览器 (Ctrl + Shift + R)
2. 服务器修改已重启生效
3. 税额计算考虑了不同的税率类型
4. PDF布局已优化以适应更多列
