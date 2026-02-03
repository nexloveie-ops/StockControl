# 修复：从仓库订货检索不出产品

## 问题描述
用户反馈"从仓库订货 检索不出仓库的产品"

## 问题诊断

### 1. 检查数据库中的产品
运行检查脚本：
```bash
node check-warehouse-products.js
```

结果显示：
- ✅ 数据库中有 7 个产品
- ✅ 有 1 个产品有库存（galaxy A53，库存 5 件）
- ✅ 该产品是激活状态

### 2. 检查 API 端点
测试 API：
```bash
curl "http://localhost:3000/api/merchant/warehouse-products"
```

结果：
- ✅ API 返回 200 状态码
- ✅ 返回了 1 个产品组
- ✅ 数据结构正确

### 3. 前端代码检查
- ✅ API_BASE 配置正确：`/api`
- ✅ 请求 URL 正确：`/api/merchant/warehouse-products`
- ✅ 错误处理完整

## 解决方案

### 已实施的修复

1. **添加详细的调试日志**
   - 在 `loadWarehouseProducts()` 函数中添加了 console.log
   - 可以在浏览器控制台查看详细的加载过程

2. **日志输出内容**：
   - 🔍 开始加载仓库产品
   - 📡 请求 URL
   - 📥 响应状态
   - 📦 API 返回数据
   - 📊 产品数量
   - ✅ 可订购产品数量
   - 📂 分类列表

## 测试步骤

### 1. 打开浏览器开发者工具
1. 访问 http://localhost:3000
2. 登录商户账号（MurrayRanelagh / 123456）
3. 按 F12 打开开发者工具
4. 切换到 Console 标签页

### 2. 点击"从仓库订货"标签
观察控制台输出，应该看到：
```
🔍 开始加载仓库产品...
📡 请求 URL: /api/merchant/warehouse-products
📥 响应状态: 200 OK
📦 API 返回数据: {success: true, data: Array(1)}
📊 产品数量: 1
✅ 可订购产品数量: 1
📂 分类: ['Pre-Owned']
✅ 仓库产品加载完成
```

### 3. 检查页面显示
应该看到：
- 蓝色提示框："🏭 从仓库订货"
- 一个分类卡片："Pre-Owned"
- 显示："1 种产品 · 5 件可订"

## 可能的问题和解决方法

### 问题 1：控制台显示 404 错误
**原因**：服务器未运行或 API 路由不存在
**解决**：
```bash
# 检查服务器状态
npm start
```

### 问题 2：控制台显示 "产品数量: 0"
**原因**：数据库中没有有库存的产品
**解决**：
1. 运行 `node check-warehouse-products.js` 确认
2. 在仓库管理页面添加产品并设置库存

### 问题 3：显示 "仓库暂无可订购产品"
**原因**：产品的 `totalAvailable` 为 0 或未激活
**解决**：
1. 检查产品的 `isActive` 字段是否为 true
2. 检查产品的 `stockQuantity` 是否大于 0

### 问题 4：分类显示为乱码
**原因**：数据库中的中文字段编码问题
**解决**：这不影响功能，只是显示问题

## 数据要求

要在"从仓库订货"中显示产品，产品必须满足：
1. ✅ `isActive: true` - 产品已激活
2. ✅ `stockQuantity > 0` - 有库存
3. ✅ 有 `wholesalePrice` - 批发价
4. ✅ 有 `category` - 分类信息

## 当前数据状态

根据检查脚本的结果：
- **可订购产品**：1 个
- **产品名称**：galaxy A53
- **SKU**：GALA9659
- **库存**：5 件
- **批发价**：€125
- **零售价**：€199
- **成色**：Pre-Owned
- **分类**：二手设备

## 下一步

1. **测试前端显示**
   - 打开浏览器控制台
   - 点击"从仓库订货"
   - 查看日志输出
   - 确认产品显示

2. **如果仍然看不到产品**
   - 截图控制台日志
   - 截图页面显示
   - 检查网络请求（Network 标签）

3. **添加更多测试数据**
   - 在仓库管理页面添加更多产品
   - 确保产品有库存
   - 刷新"从仓库订货"页面

## 文件修改

- ✅ `StockControl-main/public/merchant.html` - 添加调试日志
- ✅ `StockControl-main/check-warehouse-products.js` - 创建检查脚本
- ✅ `StockControl-main/FIX_WAREHOUSE_PRODUCTS_LOADING.md` - 本文档

## 测试命令

```bash
# 1. 检查数据库产品
node check-warehouse-products.js

# 2. 测试 API
curl "http://localhost:3000/api/merchant/warehouse-products"

# 3. 格式化 JSON 输出（PowerShell）
curl "http://localhost:3000/api/merchant/warehouse-products" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

---

**状态**：✅ 已添加调试日志，等待用户测试反馈
**日期**：2026-02-02
