# 产品时间线功能实现

## 功能概述
在"我的库存"页面中，用户可以点击搜索结果中的任何产品，查看该产品的完整历史记录时间线。

## 实现日期
2026-02-02

## 功能特性

### 1. 点击查看时间线
- 在"我的库存"搜索结果中，所有产品行都可以点击
- 点击后弹出产品时间线模态框
- 显示产品的完整历史记录

### 2. 时间线内容
产品时间线包含以下事件类型：

#### 📥 产品入库
- 显示产品首次入库时间
- 来源信息（仓库调货/商户调货/手动入库）
- 成本价、零售价、数量

#### 💰 产品销售
- 显示每次销售记录
- 销售价格、数量
- 支付方式（现金/刷卡/混合）
- 客户电话（如有）

#### 📤 调货出库
- 显示调出到其他商户的记录
- 调货单号
- 调入商户名称
- 调货数量和价格

#### 📥 调货入库
- 显示从其他商户调入的记录
- 调货单号
- 调出商户名称
- 调货价格

### 3. 时间线显示特性
- 按时间倒序排列（最新的在最上面）
- 使用不同颜色区分事件类型：
  - 入库：绿色 (#10b981)
  - 销售：蓝色 (#3b82f6)
  - 调货出库：橙色 (#f59e0b)
  - 调货入库：紫色 (#8b5cf6)
- 垂直时间线设计，带圆点标记
- 最新事件有阴影高亮效果

## 技术实现

### 前端实现 (merchant.html)

#### 1. 产品时间线模态框
```html
<div id="productTimelineModal">
  - 模态框容器
  - 产品名称显示区域
  - 时间线内容区域
  - 关闭按钮
</div>
```

#### 2. JavaScript 函数

**showProductTimeline(inventoryId, productName)**
- 显示产品时间线模态框
- 调用后端 API 获取时间线数据
- 渲染时间线事件列表
- 参数：
  - inventoryId: 库存记录ID
  - productName: 产品名称

**closeProductTimeline()**
- 关闭产品时间线模态框

#### 3. 表格行点击事件
在 `displayInventoryProducts()` 函数中，每个产品行都添加了点击事件：
```javascript
onclick="showProductTimeline('${item._id}', '${item.productName}')"
```

### 后端实现 (app.js)

#### API 端点
```
GET /api/merchant/inventory/:id/timeline
```

#### 功能逻辑
1. 根据 inventoryId 查询库存记录
2. 收集以下数据：
   - 库存创建记录（入库时间）
   - 销售记录（MerchantSale）
   - 调货出库记录（InventoryTransfer - fromMerchant）
   - 调货入库记录（InventoryTransfer - toMerchant）
3. 按时间倒序排序
4. 返回格式化的时间线数据

#### 返回数据格式
```json
{
  "success": true,
  "data": [
    {
      "type": "created|sold|transferred_out|transferred_in",
      "icon": "📥|💰|📤|📥",
      "title": "事件标题",
      "date": "ISO日期时间",
      "description": "事件描述",
      "details": "详细信息HTML"
    }
  ]
}
```

## 使用方法

### 1. 进入我的库存页面
- 登录商户账号
- 点击"我的库存"标签

### 2. 搜索产品
- 在搜索框中输入产品名称、序列号、条码或备注
- 系统会显示匹配的产品列表（包括零库存产品）

### 3. 查看时间线
- 点击任意产品行
- 弹出产品时间线模态框
- 查看产品的完整历史记录

### 4. 关闭时间线
- 点击右上角的 × 按钮
- 或点击底部的"关闭"按钮

## 相关文件

### 前端文件
- `StockControl-main/public/merchant.html`
  - 产品时间线模态框 HTML
  - showProductTimeline() 函数
  - closeProductTimeline() 函数
  - displayInventoryProducts() 函数（添加点击事件）

### 后端文件
- `StockControl-main/app.js`
  - GET /api/merchant/inventory/:id/timeline 端点

### 数据模型
- `StockControl-main/models/MerchantInventory.js` - 库存记录
- `StockControl-main/models/MerchantSale.js` - 销售记录
- `StockControl-main/models/InventoryTransfer.js` - 调货记录

## 测试步骤

### 1. 测试基本功能
```
1. 登录商户账号 (merchant_001/merchant123)
2. 进入"我的库存"页面
3. 在搜索框输入 "111222"（序列号）
4. 点击搜索结果中的产品行
5. 验证时间线模态框正确显示
6. 检查是否显示入库记录
```

### 2. 测试销售记录
```
1. 找一个已销售的产品
2. 点击查看时间线
3. 验证是否显示销售记录
4. 检查销售价格、支付方式等信息
```

### 3. 测试调货记录
```
1. 找一个通过调货入库的产品
2. 点击查看时间线
3. 验证是否显示调货入库记录
4. 检查调货单号、调出商户等信息
```

### 4. 测试零库存产品
```
1. 搜索一个已售完的产品（数量为0）
2. 产品行应该有黄色背景标记
3. 点击该产品查看时间线
4. 验证时间线正确显示所有历史记录
```

## 注意事项

1. **权限控制**
   - 商户只能查看自己库存产品的时间线
   - 不能查看其他商户的产品信息

2. **性能优化**
   - 时间线数据按需加载（点击时才请求）
   - 后端查询使用索引优化
   - 前端使用模态框避免页面跳转

3. **数据完整性**
   - 如果某些关联数据不存在（如调货记录被删除），不会影响其他记录显示
   - 使用 try-catch 确保错误不会导致整个时间线加载失败

4. **用户体验**
   - 悬停效果提示产品行可点击
   - 加载状态提示
   - 错误提示友好
   - 时间线使用视觉化设计，易于理解

## 后续优化建议

1. **功能增强**
   - 添加时间线事件筛选（只看销售/只看调货等）
   - 添加导出时间线功能（PDF/Excel）
   - 添加产品图片显示

2. **性能优化**
   - 实现时间线数据缓存
   - 分页加载历史记录（如果记录很多）
   - 使用虚拟滚动优化长列表

3. **数据分析**
   - 添加产品周转率统计
   - 添加利润分析图表
   - 添加库存预警提示

## 相关文档
- [维修业务功能](./REPAIR_BUSINESS_FEATURE.md)
- [商户库存功能](./MERCHANT_INVENTORY_FEATURES.md)
- [销售业务功能](./MERCHANT_SALES_CART_FEATURE.md)
