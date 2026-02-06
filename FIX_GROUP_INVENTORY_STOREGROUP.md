# 修复群组库存 storeGroup 字段问题

## 问题描述
MurrayDundrum 用户在"群组库存"页面看不到群组内其他商户（MurrayRanelagh）的库存。

## 问题诊断

### 1. 用户群组检查
- ✅ MurrayDundrum 和 MurrayRanelagh 都在同一个群组：**Murray Mobile (MURRAY)**
- ✅ MurrayDundrum 有查看群组库存的权限：`canViewGroupInventory: true`

### 2. 库存数据检查
运行 `check-group-inventory.js` 发现：
- MurrayRanelagh 有 7 条库存记录
- **但所有记录的 storeGroup 字段都是 null 或不存在**

```
=== 群组成员的所有库存（不限 storeGroup）===
总记录数: 7

按商户统计:
- MurrayRanelagh:
  总数: 7
  有群组: 0    ← 问题所在！
  无群组: 7
```

### 3. 根本原因
库存记录创建时没有正确设置 `storeGroup` 字段，导致群组库存查询无法找到这些记录。

## 修复方案

### 创建修复脚本
`fix-merchant-inventory-storegroup.js` - 自动为所有库存记录设置正确的 storeGroup

脚本功能：
1. 查找所有没有 storeGroup 的库存记录
2. 根据 merchantId 查找对应用户的群组
3. 批量更新库存记录的 storeGroup 字段
4. 验证修复结果

### 执行修复
```bash
node fix-merchant-inventory-storegroup.js
```

### 修复结果
```
找到 7 条没有 storeGroup 的库存记录

按商户统计:
- MurrayRanelagh: 7 条

处理用户 MurrayRanelagh:
  群组: Murray Mobile (MURRAY)
  库存记录数: 7
  ✅ 更新了 7 条记录

=== 修复完成 ===
总共更新了 7 条库存记录

✅ 所有库存记录都已正确设置 storeGroup

=== 各群组库存统计 ===
Murray Mobile (MURRAY): 7 条库存记录
  - MurrayRanelagh: 7 条记录, 总数量: 103
```

## 验证修复

运行 `check-group-inventory.js` 再次检查：

```
=== MurrayDundrum 应该能看到的库存 ===
记录数: 6

前5条记录:
1. Lightning Cable (数量: 98)
2. iPhone 12 128GB AB Grade Vat margin (序列号: 111333)
3. iPhone 14 128GB AB Grade Vat margin (序列号: 222222)
4. iPhone 14 128GB AB Grade Vat margin (序列号: 222333)
5. iPhone 14 128GB AB Grade Vat margin (序列号: 222555)
```

✅ MurrayDundrum 现在可以看到 MurrayRanelagh 的 6 条有库存的记录（排除了数量为0的记录）

## 测试步骤

1. 使用 MurrayDundrum 账号登录：http://localhost:3000
   - 用户名: MurrayDundrum
   - 密码: merchant123

2. 点击"群组库存"标签页

3. 应该能看到 MurrayRanelagh 的库存：
   - Lightning Cable (98个)
   - iPhone 12 128GB AB Grade Vat margin (序列号: 111333)
   - iPhone 14 128GB AB Grade Vat margin (序列号: 222222, 222333, 222555)
   - 等等

## 预防措施

### 需要修复的代码位置

为了防止将来创建库存时再次出现这个问题，需要在以下位置添加 storeGroup 设置：

1. **手动添加库存** - `POST /api/merchant/inventory`
2. **从仓库订单接收** - 确认收货时创建库存
3. **库存调拨** - 从其他商户调货时创建库存

### 修复建议

在创建 MerchantInventory 记录时，自动从用户信息中获取 storeGroup：

```javascript
// 获取用户的群组信息
const user = await UserNew.findOne({ username: merchantId })
  .populate('retailInfo.storeGroup');

// 创建库存记录时包含 storeGroup
const inventory = new MerchantInventory({
  merchantId,
  merchantName,
  storeGroup: user.retailInfo?.storeGroup?._id || null,  // 添加这一行
  // ... 其他字段
});
```

## 相关文件

- `check-group-inventory.js` - 诊断脚本
- `fix-merchant-inventory-storegroup.js` - 修复脚本
- `models/MerchantInventory.js` - 库存模型
- `middleware/dataIsolation.js` - 数据隔离中间件
- `app.js` - 库存创建 API

## 状态
✅ 已修复 - 2026-02-05

## 下一步
需要修改库存创建的代码，确保将来创建的库存记录都正确设置 storeGroup 字段。
