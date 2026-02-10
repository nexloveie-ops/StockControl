# 仓库订货设备产品分组修复

## 问题描述
在 `merchant.html` 仓库订货页面，Pre-Owned Devices 分类中的产品分组不正确：
- IPHONE15 的不同型号（128GB、256GB、512GB）被分成了多个独立的产品组
- 应该将同一款设备的所有型号归为一个产品组，显示为变体

## 问题根源
后端API `/api/merchant/warehouse-products` 的分组逻辑过于细致：
```javascript
// 旧代码 - 问题所在
const key = `${product.category?.type}_${product.brand}_${product.model}_${product.color}_${product.condition}`;
```

这导致：
- IPHONE15_128GB_Black_Good
- IPHONE15_256GB_Black_Good
- IPHONE15_512GB_White_Good

被分成3个独立的组。

## 解决方案

### 1. 修改后端分组逻辑 (app.js 第7047-7080行)

**设备产品**：提取纯产品名称（去掉容量信息）
```javascript
// 判断是否是设备类型
const isDevice = product.category?.type?.toLowerCase().includes('device');

let key;
if (isDevice) {
  // 设备产品：提取纯产品名称（去掉容量信息）
  // 例如：IPHONE15128GB -> IPHONE15, IPHONE15PROMAX256GB -> IPHONE15PROMAX
  const productName = (product.name || '').replace(/\d+(GB|TB)/gi, '').trim().replace(/\s+/g, '');
  key = `${product.category?.type || 'Unknown'}_${productName}_${product.condition}`;
} else {
  // 配件产品：按品牌+型号+颜色分组
  key = `${product.category?.type || 'Unknown'}_${product.brand || ''}_${product.model || ''}_${product.color || ''}_${product.condition}`;
}
```

**配件产品**：保持原有的细致分组（品牌+型号+颜色）

### 2. AdminInventory 同样处理 (app.js 第7084-7120行)

对 AdminInventory 中的产品应用相同的分组逻辑。

## 修改文件
- `StockControl-main/app.js` (第7047-7120行)

## 测试步骤
1. **重启服务器**（app.js 修改需要重启）
   ```bash
   # 停止当前服务器 (Ctrl+C)
   node app.js
   ```

2. **清除浏览器缓存并刷新**
   - 按 `Ctrl + Shift + R` 强制刷新

3. **测试仓库订货**
   - 登录 merchant 账户
   - 进入"仓库订货"
   - 点击"Pre-Owned Devices"分类
   - 验证：
     - ✅ IPHONE15 的所有型号（128GB、256GB、512GB）应该归为一个产品组
     - ✅ 点击产品后，应该显示所有变体（不同型号、颜色）
     - ✅ 每个变体显示具体的型号、颜色、库存、价格

4. **查看控制台日志**
   ```
   📦 API 返回数据: 应该看到更少的产品组
   📊 产品数量: 应该减少（因为同款设备合并了）
   📦 最终分组结果: 应该看到合理的分组数量
   ```

## 预期结果
- **设备产品**：按产品名称分组（IPHONE15、IPHONE16PROMAX等）
- **配件产品**：按品牌+型号+颜色分组（保持细致分类）
- **变体显示**：点击产品后显示所有型号、颜色的变体列表

## 修复日期
2026-02-10

## 状态
✅ 已修复 - 等待测试验证
