# 测试群组库存功能

## 快速测试

### 1. 登录 MurrayDundrum 账号
- 访问: http://localhost:3000
- 用户名: `MurrayDundrum`
- 密码: `merchant123`

### 2. 查看群组库存
- 点击"群组库存"标签页
- 应该能看到 MurrayRanelagh 的库存

### 3. 预期结果
应该显示 6 条库存记录：

| 产品名称 | 数量 | 序列号 | 商户 |
|---------|------|--------|------|
| Lightning Cable | 98 | - | MurrayRanelagh |
| iPhone 12 128GB AB Grade Vat margin | 1 | 111333 | MurrayRanelagh |
| iPhone 14 128GB AB Grade Vat margin | 1 | 222222 | MurrayRanelagh |
| iPhone 14 128GB AB Grade Vat margin | 1 | 222333 | MurrayRanelagh |
| iPhone 14 128GB AB Grade Vat margin | 1 | 222555 | MurrayRanelagh |
| iPhone 14 128GB AB Grade Vat margin | 1 | 222666 | MurrayRanelagh |

### 4. 功能测试
- ✅ 可以看到其他商户的库存
- ✅ 可以搜索产品
- ✅ 可以按分类筛选
- ✅ 可以查看产品详情
- ✅ 可以从群组调货（如果有权限）

## 问题排查

如果看不到库存：

1. **检查用户群组**
```bash
node check-user-storegroup.js
```

2. **检查群组库存**
```bash
node check-group-inventory.js
```

3. **查看服务器日志**
服务器会输出：
```
✅ 用户 MurrayDundrum 查看组 69834c8de75caaea2d676f6d 的群组数据
群组库存查询条件: {...}
群组库存查询结果数量: 6
```

## 修复完成
✅ 已修复现有库存的 storeGroup 字段
✅ 已修复代码，将来创建的库存会自动设置 storeGroup
✅ 服务器已重启，更改已生效

## 相关文档
- `FIX_GROUP_INVENTORY_COMPLETE.md` - 完整修复文档
- `FIX_GROUP_INVENTORY_STOREGROUP.md` - 详细技术分析
