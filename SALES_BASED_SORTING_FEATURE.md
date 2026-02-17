# 产品销量排序功能 ✅

## 实施日期
2026-02-17

## 功能概述

在销售业务模块中，产品现在按照最近8周的销量降序排列，热销产品优先显示，帮助商户快速找到畅销商品。

## 核心功能

### 1. 智能排序
- **排序依据**：最近8周（56天）的销售数量
- **排序方式**：销量从高到低（降序）
- **适用范围**：
  - 分类产品列表
  - 全局搜索结果

### 2. 销量显示
- **位置**：产品卡片中，库存数量旁边
- **样式**：与库存标签一致的蓝色标签
- **格式**：`8周: X` （X为销售数量）
- **显示逻辑**：始终显示（包括0销量）

### 3. 数据缓存
- **缓存时长**：5分钟
- **缓存策略**：首次加载后缓存，5分钟内重复使用
- **手动清除**：控制台执行 `clearSalesCache()`
- **自动刷新**：5分钟后自动重新获取

## 技术实现

### 数据获取
```javascript
async function getRecentSalesCount(weeks = 8) {
  // 检查缓存
  if (salesDataCache && salesDataCacheTime && 
      (Date.now() - salesDataCacheTime < CACHE_DURATION)) {
    return salesDataCache;
  }
  
  // 计算日期范围
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));
  
  // 获取销售记录
  const response = await fetch(
    `${API_BASE}/merchant/sales?merchantId=${merchantId}&startDate=${startDate}&endDate=${endDate}`
  );
  
  // 统计销量（提取基础产品名）
  const salesCount = {};
  result.data.forEach(sale => {
    sale.items.forEach(item => {
      // 去掉括号中的变体信息
      const baseProductName = (item.productName || item.name).split('(')[0].trim();
      salesCount[baseProductName] = (salesCount[baseProductName] || 0) + (item.quantity || 1);
    });
  });
  
  return salesCount;
}
```

### 产品名称匹配

**问题**：销售记录中的产品名称包含变体信息
- 库存：`iPhone Magnetic Case`
- 销售：`iPhone Magnetic Case (iPhone 17 Air - Red)`

**解决方案**：提取基础产品名称
```javascript
const baseProductName = productName.split('(')[0].trim();
// "iPhone Magnetic Case (iPhone 17 Air - Red)" → "iPhone Magnetic Case"
```

### 排序逻辑
```javascript
// 为每个产品添加销量信息
allCategoryProducts.forEach(product => {
  product.recentSalesCount = salesData[product.productName] || 0;
});

// 按销量降序排序
allCategoryProducts.sort((a, b) => b.recentSalesCount - a.recentSalesCount);
```

### 显示实现
```javascript
// 产品卡片中显示库存和销量
<div style="display: flex; gap: 8px;">
  <span style="background: #dbeafe; color: #1e40af; ...">
    库存: ${product.totalQuantity}
  </span>
  <span style="background: #dbeafe; color: #1e40af; ...">
    8周: ${product.recentSalesCount}
  </span>
</div>
```

## 使用场景

### 1. 快速补货决策
- 查看热销产品的库存情况
- 优先补充高销量产品
- 避免畅销品缺货

### 2. 销售策略调整
- 识别滞销产品（销量为0或很低）
- 调整产品定价或促销策略
- 优化库存结构

### 3. 产品推荐
- 向客户推荐热销产品
- 提高成交率
- 增加客户满意度

## 性能优化

### 1. 数据缓存
- 避免频繁请求销售数据
- 减少服务器负载
- 提升页面响应速度

### 2. 异步加载
- 不阻塞产品列表显示
- 先显示产品，再加载销量
- 平滑的用户体验

### 3. 智能匹配
- 自动处理产品名称变体
- 准确统计所有变体的总销量
- 避免数据遗漏

## 调试功能

### 查看销量数据
打开浏览器控制台，查看详细日志：
```
获取销量数据: 2025-12-23 到 2026-02-17
销量统计完成，共 7 个产品有销售记录
销量详情: {
  "iPhone Magnetic Case": 5,
  "iPhone Clear Case": 3,
  ...
}
```

### 清除缓存
在控制台执行：
```javascript
clearSalesCache()
```

### 查看匹配情况
控制台会显示产品名称匹配的调试信息：
```
产品: "iPhone Magnetic Case", 销量: 5, 销量数据中的键: [...]
```

## 注意事项

### 1. 数据准确性
- 销量统计基于销售记录
- 不包括已退款的订单（如果有退款逻辑）
- 统计周期固定为8周

### 2. 性能考虑
- 首次加载会请求销售数据
- 大量销售记录可能影响加载速度
- 建议在后端添加索引优化查询

### 3. 产品名称
- 必须保持产品名称一致性
- 变体产品会自动合并统计
- 修改产品名称会影响历史销量统计

## 后续优化建议

1. **可配置周期**
   - 允许用户选择统计周期（4周、8周、12周）
   - 提供多个时间段对比

2. **销量趋势**
   - 显示销量增长/下降趋势
   - 添加图表可视化

3. **库存预警**
   - 根据销量预测库存需求
   - 自动提醒补货

4. **后端优化**
   - 在后端预计算销量数据
   - 减少前端计算负担
   - 提供专门的销量统计API

## 相关文件
- `StockControl-main/public/merchant.html` - 主实现文件
- `StockControl-main/SIDEBAR_LAYOUT_COMPLETE.md` - 侧边栏文档
- `StockControl-main/AUTO_TRANSLATE_GUIDE.md` - 翻译功能文档

## 版本信息
- 当前版本：v2.6.4
- 更新内容：修复变体产品销量统计
- 备份：`StockControl-main-backup-20260217-205229`
