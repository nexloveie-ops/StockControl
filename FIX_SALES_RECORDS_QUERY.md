# 修复：销售记录查询功能

## 修复日期
2026-02-02

## 问题描述
销售记录查询功能无法显示销售记录，查询后显示"该时间段内无销售记录"。

## 问题原因
1. **后端API未实现**：`GET /api/merchant/sales` 只返回空数组，没有查询数据库
2. **数据结构不匹配**：前端期望的数据结构与新的 MerchantSale 模型不一致

## 解决方案

### 1. 后端API更新

**文件**: `StockControl-main/app.js` (约3316-3380行)

#### 更新内容：
- 引入 `MerchantSale` 模型
- 实现数据库查询逻辑
- 支持日期范围过滤
- 格式化返回数据

#### 查询逻辑：
```javascript
// 构建查询条件
const query = { merchantId };

// 添加日期过滤
if (startDate || endDate) {
  query.saleDate = {};
  if (startDate) {
    query.saleDate.$gte = new Date(startDate);
  }
  if (endDate) {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    query.saleDate.$lte = endDateTime;
  }
}

// 查询并排序
const sales = await MerchantSale.find(query)
  .sort({ saleDate: -1 })
  .limit(100)
  .lean();
```

### 2. 前端显示更新

**文件**: `StockControl-main/public/merchant.html`

#### 更新内容：
- 适配新的数据结构（MerchantSale模型）
- 展开销售记录中的所有商品项
- 显示更详细的信息（序列号、客户电话等）
- 添加统计摘要（销售记录数、商品总数、总利润）
- 支持混合支付显示

#### 新增显示字段：
- 日期时间（精确到分钟）
- 产品名称
- 序列号（设备）
- 数量
- 单价
- 销售额
- 成本
- 税额
- 税务分类
- 支付方式（含混合支付详情）
- 客户电话

### 3. 支付方式显示增强

**文件**: `StockControl-main/public/merchant.html`

#### 更新 `getPaymentBadge` 函数：
```javascript
function getPaymentBadge(method, cashAmount, cardAmount) {
  if (method === 'MIXED' && cashAmount !== undefined && cardAmount !== undefined) {
    return `<span class="badge badge-warning">混合</span><br>
            <small style="color: #666;">
              现金€${cashAmount.toFixed(2)}<br>
              刷卡€${cardAmount.toFixed(2)}
            </small>`;
  }
  // ... 其他支付方式
}
```

## 功能特点

### 1. 详细的销售记录
- 每笔销售的所有商品都单独显示
- 包含完整的产品信息和财务数据
- 支持序列号追踪（设备）

### 2. 统计摘要
显示在表格下方的蓝色卡片中：
- **销售记录数**：总共多少笔销售
- **商品总数**：销售的商品总件数
- **总利润**：销售额 - 成本

### 3. 混合支付详情
混合支付时显示：
- 混合标签（黄色）
- 现金金额
- 刷卡金额

### 4. 日期范围查询
- 支持自定义日期范围
- 包含结束日期的全天（23:59:59）
- 按销售日期倒序排列

## 数据示例

### API响应格式
```json
{
  "success": true,
  "data": [
    {
      "_id": "65xyz...",
      "date": "2026-02-02T10:30:00.000Z",
      "customerPhone": "0851234567",
      "paymentMethod": "MIXED",
      "cashAmount": 50.00,
      "cardAmount": 50.00,
      "totalAmount": 100.00,
      "totalTax": 18.70,
      "items": [
        {
          "productName": "Type-C Cable 1M",
          "quantity": 2,
          "price": 5.00,
          "costPrice": 2.00,
          "taxClassification": "VAT_23",
          "taxAmount": 1.87,
          "serialNumber": null
        },
        {
          "productName": "iPhone 13",
          "quantity": 1,
          "price": 800.00,
          "costPrice": 600.00,
          "taxClassification": "MARGIN_VAT_0",
          "taxAmount": 37.40,
          "serialNumber": "IMEI123456789"
        }
      ],
      "status": "completed"
    }
  ]
}
```

### 前端显示表格
```
┌──────────────┬─────────────┬──────────┬────┬──────┬────────┬──────┬──────┬──────────┬────────┬────────┐
│ 日期         │ 产品        │ 序列号   │ 数量│ 单价 │ 销售额 │ 成本 │ 税额 │ 税务分类 │ 支付   │ 客户   │
├──────────────┼─────────────┼──────────┼────┼──────┼────────┼──────┼──────┼──────────┼────────┼────────┤
│ 2/2 10:30   │ Type-C Cable│ -        │ 2  │ €5.00│ €10.00 │ €4.00│ €1.87│ VAT 23%  │ 混合   │ 085... │
│ 2/2 10:30   │ iPhone 13   │ IMEI123..│ 1  │€800  │ €800   │ €600 │€37.40│ Margin   │ 现金€50│        │
│             │             │          │    │      │        │      │      │          │ 刷卡€50│        │
└──────────────┴─────────────┴──────────┴────┴──────┴────────┴──────┴──────┴──────────┴────────┴────────┘

统计摘要：
┌─────────────┬─────────────┬─────────────┐
│ 销售记录数  │ 商品总数    │ 总利润      │
│     1       │      3      │   €204.00   │
└─────────────┴─────────────┴─────────────┘
```

## 测试步骤

### 步骤 1：完成一笔销售
1. 登录商户账号：merchant_001 / merchant123
2. 进入"销售业务"标签
3. 添加产品到购物车
4. 完成支付

### 步骤 2：查询销售记录
1. 在"销售业务"标签页向下滚动
2. 找到"销售记录查询"部分
3. 选择日期范围（包含刚才的销售日期）
4. 点击"查询销售记录"

### 步骤 3：验证显示
**预期结果**：
- ✅ 显示销售记录表格
- ✅ 包含所有销售的商品
- ✅ 显示详细信息（日期、产品、数量、金额等）
- ✅ 显示统计摘要（记录数、商品数、利润）
- ✅ 混合支付显示现金和刷卡金额
- ✅ 合计行正确计算总额

### 步骤 4：测试不同场景
- 查询无销售的日期范围 → 显示"该时间段内无销售记录"
- 查询包含多笔销售的日期 → 显示所有记录
- 查询混合支付的销售 → 正确显示支付详情

## 技术细节

### 日期处理
```javascript
// 包含结束日期的全天
const endDateTime = new Date(endDate);
endDateTime.setHours(23, 59, 59, 999);
```

### 数据展开
```javascript
// 将销售记录中的商品项展开为独立行
const allItems = [];
result.data.forEach(sale => {
  sale.items.forEach(item => {
    allItems.push({
      date: sale.date,
      ...item,
      paymentMethod: sale.paymentMethod,
      cashAmount: sale.cashAmount,
      cardAmount: sale.cardAmount
    });
  });
});
```

### 利润计算
```javascript
// 单个商品利润
const profit = (item.price - item.costPrice) * item.quantity;

// 总利润
const totalProfit = allItems.reduce((sum, item) => 
  sum + ((item.price - item.costPrice) * item.quantity), 0
);
```

## 相关文件

- `StockControl-main/app.js` - 销售记录查询API（约3316-3380行）
- `StockControl-main/public/merchant.html` - 前端查询和显示逻辑
- `StockControl-main/models/MerchantSale.js` - 销售记录模型

## 注意事项

1. **查询限制**：默认最多返回100条记录，防止数据量过大
2. **日期范围**：必须选择开始和结束日期
3. **数据展开**：每个商品项单独显示一行，便于详细查看
4. **混合支付**：需要传递 cashAmount 和 cardAmount 才能显示详情
5. **性能考虑**：大量数据时可能需要分页

## 未来优化

1. 添加分页功能
2. 支持按产品名称搜索
3. 支持按客户电话搜索
4. 支持导出为Excel
5. 添加销售趋势图表
6. 支持退货/退款记录显示

## 总结

本次修复成功实现了销售记录查询功能，现在商户可以：
- 查询指定日期范围的销售记录
- 查看详细的销售信息（产品、数量、金额、税额等）
- 查看统计摘要（记录数、商品数、利润）
- 查看混合支付的详细金额分配

所有销售数据都从新的 MerchantSale 模型中查询，确保数据准确完整。
