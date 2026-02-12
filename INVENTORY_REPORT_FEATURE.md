# 库存报表功能 - Top 20热销产品

## 功能概述
在merchant.html的报表中心添加了库存报表功能，显示本月Top 20热销产品，帮助商户进行库存管理和订货决策。

## 功能特点

### 1. 数据统计
- 自动统计本月（当前月份）的销售数据
- 按销售量排序，显示Top 20热销产品
- 排除已退款的订单

### 2. 显示信息
每个产品显示以下信息：
- **排名**: 前3名显示金银铜牌徽章
- **产品名称**: 产品的完整名称
- **型号**: 产品型号和颜色
- **销售量**: 本月实际销售数量
- **平均售价**: 本月该产品的平均销售价格
- **当前库存**: 当前可用库存数量（带颜色预警）
- **预计销售时间**: 按当前销售速度，库存预计可销售的天数
- **建议订货量**: 建议补货数量（按1个月销售量计算）
- **本月营收**: 该产品本月的总销售额

### 3. 智能预警
- **库存预警**:
  - 🔴 红色: 库存紧张（预计7天内售完）
  - 🟠 橙色: 库存偏低（预计7-15天售完）
  - 🟢 绿色: 库存充足（预计15天以上）
  - ⚫ 灰色: 已缺货或无销售

### 4. 计算逻辑
- **预计销售时间** = (当前库存 / 月销售量) × 30天
- **建议订货量** = 1个月的销售量
- **平均售价** = 总销售额 / 总销售量

## 技术实现

### 后端API
**路径**: `/api/merchant/inventory-report`

**参数**:
- `merchantId`: 商户ID（必需）

**返回数据**:
```json
{
  "success": true,
  "data": {
    "reportDate": "2026-02-12T...",
    "monthStart": "2026-02-01T00:00:00.000Z",
    "monthEnd": "2026-02-28T23:59:59.000Z",
    "totalProducts": 15,
    "top20": [
      {
        "productName": "iPhone 15 Pro",
        "model": "A2848",
        "color": "Natural Titanium",
        "salesQuantity": 25,
        "avgSalePrice": 1199.99,
        "currentStock": 10,
        "estimatedDays": 12,
        "suggestedOrderQty": 25,
        "totalRevenue": 29999.75
      }
    ],
    "summary": {
      "totalSalesRecords": 50,
      "totalInventoryItems": 88,
      "totalProductTypes": 15
    }
  }
}
```

### 前端实现
**文件**: `StockControl-main/public/merchant.html`

**函数**:
- `loadReports()`: 加载报表中心
- `loadInventoryReport()`: 加载库存报表数据并渲染

**特点**:
- 响应式表格设计
- 颜色编码的状态指示
- 排名徽章（金银铜牌）
- 汇总行显示总计
- 详细的说明文档

## 使用方法

1. 登录商户系统（merchant.html）
2. 点击顶部导航栏的"报表中心"标签
3. 系统自动加载本月Top 20热销产品报表
4. 查看各产品的销售情况和库存状态
5. 根据"建议订货量"进行补货决策

## 数据来源

- **销售数据**: MerchantSale表（本月销售记录）
- **库存数据**: MerchantInventory表（当前可用库存）
- **统计周期**: 当前月份（从1号到月末）

## 修改的文件

1. `StockControl-main/app.js` (第7490-7660行)
   - 添加了`/api/merchant/inventory-report` API

2. `StockControl-main/public/merchant.html` (第7610-7780行)
   - 修改了`loadReports()`函数
   - 添加了`loadInventoryReport()`函数

## 服务器状态
- 服务器已重启（进程32）
- API已生效
- 前端已更新

## 测试步骤

1. 打开 http://localhost:3000/merchant.html
2. 登录商户账户（如mobile123）
3. 点击"报表中心"标签
4. 查看Top 20热销产品报表
5. 验证数据准确性：
   - 销售量是否正确
   - 库存数量是否准确
   - 预计销售时间计算是否合理
   - 建议订货量是否合理

## 注意事项

1. 报表只统计本月数据（当前月份）
2. 排除已退款的订单
3. 如果本月无销售数据，显示提示信息
4. 预计销售时间基于本月销售速度计算
5. 建议订货量 = 1个月的销售量（可根据实际情况调整）
