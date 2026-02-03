# 快速测试：群组库存功能

## 测试目的
验证 MurrayRanelagh 可以查看 MurrayDundrum 的库存

## 前提条件
✅ 服务器已启动: http://localhost:3000
✅ 两个用户已分配到同一个店面组 (MURRAY)
✅ 数据库已更新

## 测试步骤

### 1. 登录 MurrayRanelagh
- 用户名: `MurrayRanelagh`
- 密码: `123456`

### 2. 点击"群组库存"标签
应该看到分类卡片视图

### 3. 验证分类显示
应该看到以下分类:
- **手机**: 1 种产品 · 1 件库存 · 1 个商户
- **笔记本**: 1 种产品 · 1 件库存 · 1 个商户

### 4. 点击"手机"分类
应该看到产品列表:
- **Samsung Galaxy S22**
  - 商户: MurrayDundrum
  - 数量: 1
  - 零售价: €900.00
  - 序列号: DUN001

### 5. 返回并点击"笔记本"分类
应该看到:
- **MacBook Air M2**
  - 商户: MurrayDundrum
  - 数量: 1
  - 零售价: €1200.00
  - 序列号: DUN002

### 6. 验证不显示自己的库存
群组库存中不应该显示:
- iPhone 13 Pro (MurrayRanelagh 自己的)
- iPad Air (MurrayRanelagh 自己的)

### 7. 验证不显示零库存产品
不应该显示 MurrayDundrum 的 4 个已售出的 galaxy A53 (数量为 0)

## 预期结果
✅ 只显示群组内其他商户的可销售库存
✅ 不显示当前用户自己的库存
✅ 不显示数量为 0 的产品
✅ 显示商户的登录名 (merchantId)
✅ 按分类正确分组

## 测试 MurrayDundrum 账号
可以切换到 MurrayDundrum 账号测试:
- 用户名: `MurrayDundrum`
- 密码: `123456`

应该看到:
- **手机**: 1 种产品 · 1 件库存 · 1 个商户
- **平板**: 1 种产品 · 1 件库存 · 1 个商户

点击后应该看到 MurrayRanelagh 的库存:
- iPhone 13 Pro
- iPad Air

## 搜索功能测试
在群组库存页面:
1. 输入 "Samsung" 搜索
2. 应该只显示 Samsung Galaxy S22
3. 输入 "DUN" 搜索序列号
4. 应该显示所有 DUN 开头的产品

## 故障排查

### 如果看不到群组库存
1. 检查用户是否在同一个店面组:
   ```bash
   node check-user-group.js
   ```

2. 检查库存记录是否有 storeGroup:
   ```bash
   node check-dundrum-inventory.js
   ```

3. 重新运行设置脚本:
   ```bash
   node setup-store-group.js
   ```

### 如果显示自己的库存
检查 API 是否正确排除当前用户:
- 查看 `app.js` 第 4029 行
- 应该有 `merchantId: { $ne: req.currentUsername }`

### 如果显示零库存产品
检查查询条件:
- 应该有 `quantity: { $gt: 0 }`

## 数据库验证
可以直接查询数据库验证:

```javascript
// 查看用户的店面组
db.usernews.find(
  { username: { $in: ['MurrayRanelagh', 'MurrayDundrum'] } },
  { username: 1, 'retailInfo.storeGroup': 1 }
)

// 查看库存的店面组
db.merchantinventories.find(
  { merchantId: { $in: ['MurrayRanelagh', 'MurrayDundrum'] } },
  { merchantId: 1, productName: 1, quantity: 1, storeGroup: 1 }
)
```

## 测试完成标志
- [x] MurrayRanelagh 可以看到 MurrayDundrum 的 2 条库存
- [x] MurrayDundrum 可以看到 MurrayRanelagh 的 2 条库存
- [x] 不显示自己的库存
- [x] 不显示零库存产品
- [x] 分类统计正确
- [x] 搜索功能正常

## 下一步
如果测试通过，可以:
1. 添加更多商户到同一个店面组
2. 测试跨店调货功能
3. 测试群组报表功能
