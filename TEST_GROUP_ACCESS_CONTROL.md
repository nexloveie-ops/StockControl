# 测试群组访问控制

## 测试目标
验证用户只有在有群组且有权限时才能查看群组库存。

## 测试场景

### 场景 1: 无群组用户不能查看群组库存 ✅

**当前状态**: MurrayDundrum 已被移除群组

**测试步骤**:
1. 访问 http://localhost:3000
2. 使用 MurrayDundrum 登录
   - 用户名: `MurrayDundrum`
   - 密码: `merchant123`
3. 点击"群组库存"标签页

**预期结果**:
- 显示空列表或提示"暂无群组库存"
- 不显示任何其他商户的库存

**服务器日志**:
```
⚠️  用户 MurrayDundrum 没有群组或无权限，只能查看自己的数据
群组库存请求 - 数据过滤: { merchantId: 'MurrayDundrum' }
⚠️  用户没有群组或无权限，返回空结果
```

---

### 场景 2: 有群组且有权限的用户可以查看群组库存

**准备工作**: 将 MurrayDundrum 重新添加到群组

1. 登录管理员账号（admin / admin123）
2. 进入"用户管理"
3. 编辑 MurrayDundrum 用户
4. 设置"所属群组"为"Murray Mobile (MURRAY)"
5. 勾选"可查看群组库存"
6. 保存

**测试步骤**:
1. 登出管理员
2. 使用 MurrayDundrum 登录
3. 点击"群组库存"标签页

**预期结果**:
- 显示 MurrayRanelagh 的 6 条库存
- 不显示自己的库存

**服务器日志**:
```
✅ 用户 MurrayDundrum 查看组 69834c8de75caaea2d676f6d 的群组数据
群组库存请求 - 数据过滤: { storeGroup: ObjectId('...') }
群组库存查询结果数量: 6
```

---

### 场景 3: 有群组但无权限的用户不能查看群组库存

**准备工作**: 移除查看权限

1. 登录管理员账号
2. 编辑 MurrayDundrum 用户
3. 保持"所属群组"为"Murray Mobile (MURRAY)"
4. **取消勾选**"可查看群组库存"
5. 保存

**测试步骤**:
1. 登出管理员
2. 使用 MurrayDundrum 登录
3. 点击"群组库存"标签页

**预期结果**:
- 显示空列表
- 不显示任何群组库存

**服务器日志**:
```
⚠️  用户 MurrayDundrum 没有群组或无权限，只能查看自己的数据
⚠️  用户没有群组或无权限，返回空结果
```

---

## 权限矩阵

| 有群组 | 有权限 | 群组库存显示 |
|-------|-------|-------------|
| ❌ | - | 空列表 |
| ✅ | ❌ | 空列表 |
| ✅ | ✅ | 显示同群组其他商户的库存 |

## 快速验证脚本

### 检查用户群组状态
```bash
node check-murraydundrum-group.js
```

输出示例：
```
=== MurrayDundrum 用户信息 ===
用户名: MurrayDundrum
群组: null  (或 Murray Mobile)
群组ID: null  (或 ObjectId)
canViewGroupInventory: false  (或 true)
```

### 检查群组库存数据
```bash
node check-group-inventory.js
```

---

## 测试清单

- [ ] 场景 1: 无群组用户 → 空列表
- [ ] 场景 2: 有群组有权限 → 显示群组库存
- [ ] 场景 3: 有群组无权限 → 空列表
- [ ] 服务器日志正确显示权限检查信息
- [ ] 前端正确处理空列表情况

---

## 问题排查

### 如果无群组用户仍能看到库存

1. **检查服务器日志**
   - 应该显示"用户没有群组或无权限，返回空结果"
   - 如果没有这条日志，说明代码没有生效

2. **确认服务器已重启**
   ```bash
   # 检查进程
   # 应该看到最新的进程
   ```

3. **检查用户数据**
   ```bash
   node check-murraydundrum-group.js
   ```
   - 确认 storeGroup 为 null
   - 确认 canViewGroupInventory 为 false

4. **清除浏览器缓存**
   - 按 Ctrl+Shift+Delete
   - 清除缓存和 Cookie
   - 重新登录

---

## 相关文档
- `FIX_GROUP_INVENTORY_NO_GROUP_ACCESS.md` - 详细修复文档
- `USER_GROUP_INVENTORY_SYNC.md` - 群组同步功能
- `FIX_GROUP_INVENTORY_COMPLETE.md` - 群组库存修复总结

---

## 状态
✅ 修复已完成
✅ 服务器已重启（进程ID: 8）
⏳ 等待用户测试验证
