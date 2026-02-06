# 修复：库存编辑身份验证错误

## 问题描述
更新产品信息时报错：`更新失败: 用户未登录`

## 根本原因
`applyDataIsolation` 中间件从以下来源获取用户名：
1. `req.session.username`
2. `req.user.username`
3. `req.query.merchantId`
4. `req.body.merchantId`

前端在PUT请求中没有包含 `merchantId`，导致中间件无法识别用户身份。

## 解决方案

### 修改文件
`StockControl-main/public/merchant.html`

### 修改内容
在 `saveInventoryEdit` 函数中，添加 `merchantId` 到请求体：

**修改前**：
```javascript
const updateData = {
  productName: document.getElementById('editProductName').value,
  brand: document.getElementById('editBrand').value,
  // ... 其他字段
};
```

**修改后**：
```javascript
const updateData = {
  merchantId: merchantId, // 添加merchantId用于身份验证
  productName: document.getElementById('editProductName').value,
  brand: document.getElementById('editBrand').value,
  // ... 其他字段
};
```

## 工作原理

### 身份验证流程
1. 前端发送PUT请求，包含 `merchantId` 在请求体中
2. `applyDataIsolation` 中间件从 `req.body.merchantId` 获取用户名
3. 中间件设置 `req.dataFilter` 和 `req.currentUsername`
4. API查询时使用 `req.dataFilter` 确保只能访问自己的数据

### 数据隔离
```javascript
const inventory = await MerchantInventory.findOne({
  _id: inventoryId,
  ...req.dataFilter // 例如：{ merchantId: 'MurrayDundrum' }
});
```

## 测试步骤

1. **清除浏览器缓存**（Ctrl+F5）
2. 登录 MurrayDundrum 账号
3. 进入"我的库存"
4. 选择一个分类
5. 点击任意产品的"✏️ 编辑"按钮
6. 修改任意字段（如批发价）
7. 点击"💾 保存修改"
8. ✅ 验证：显示"✅ 产品信息已更新"
9. ✅ 验证：列表刷新，显示更新后的信息

## 版本历史
- v2.2.0: 添加库存产品编辑功能
- v2.2.1: 修复库存编辑身份验证 ✅

## 完成时间
2026年2月6日
