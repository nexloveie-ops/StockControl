# 测试用户群组与库存同步功能

## 快速测试

### 准备工作
服务器已启动：http://localhost:3000

### 测试步骤

#### 1. 登录管理员账号
- 访问: http://localhost:3000
- 用户名: `admin`
- 密码: `admin123`

#### 2. 测试场景 A：将用户从群组中移除

**操作**:
1. 进入"用户管理"
2. 找到 MurrayRanelagh 用户，点击"编辑"
3. 当前应该显示"所属群组: Murray Mobile (MURRAY)"
4. 修改"所属群组"为"无群组（独立用户）"
5. 点击"保存"

**预期结果**:
- 保存成功提示
- 服务器日志显示：
  ```
  群组发生变化，更新库存记录的 storeGroup
  旧群组: 69834c8de75caaea2d676f6d
  新群组: null
  ✅ 更新了 7 条库存记录的 storeGroup
  ```

**验证**:
1. 登出管理员
2. 使用 MurrayDundrum 账号登录（密码: merchant123）
3. 点击"群组库存"标签页
4. 应该看不到任何库存（因为 MurrayRanelagh 已经不在群组中）

---

#### 3. 测试场景 B：将用户重新添加到群组

**操作**:
1. 重新登录管理员账号
2. 进入"用户管理"
3. 找到 MurrayRanelagh 用户，点击"编辑"
4. 修改"所属群组"为"Murray Mobile (MURRAY)"
5. 点击"保存"

**预期结果**:
- 保存成功提示
- 服务器日志显示：
  ```
  群组发生变化，更新库存记录的 storeGroup
  旧群组: null
  新群组: 69834c8de75caaea2d676f6d
  ✅ 更新了 7 条库存记录的 storeGroup
  ```

**验证**:
1. 登出管理员
2. 使用 MurrayDundrum 账号登录
3. 点击"群组库存"标签页
4. 应该能看到 MurrayRanelagh 的 6 条库存（数量 > 0 的）

---

## 自动化测试

如果不想手动测试，可以运行自动化测试脚本：

```bash
node test-user-group-inventory-sync.js
```

这个脚本会：
1. 将 MurrayRanelagh 从群组中移除
2. 验证所有库存的 storeGroup 被清除
3. 将 MurrayRanelagh 重新添加到群组
4. 验证所有库存的 storeGroup 被恢复

---

## 验证数据库

### 检查用户群组
```bash
node check-user-storegroup.js
```

### 检查群组库存
```bash
node check-group-inventory.js
```

---

## 预期的库存列表

MurrayRanelagh 的库存（应该在群组库存中显示）：

| 产品名称 | 数量 | 序列号 |
|---------|------|--------|
| Lightning Cable | 98 | - |
| iPhone 12 128GB AB Grade Vat margin | 1 | 111333 |
| iPhone 14 128GB AB Grade Vat margin | 1 | 222222 |
| iPhone 14 128GB AB Grade Vat margin | 1 | 222333 |
| iPhone 14 128GB AB Grade Vat margin | 1 | 222555 |
| iPhone 14 128GB AB Grade Vat margin | 1 | 222666 |

---

## 功能说明

### 自动同步
当管理员修改用户的群组设置时：
- ✅ 添加到群组 → 所有库存自动设置 storeGroup
- ✅ 从群组移除 → 所有库存自动清除 storeGroup
- ✅ 转移到新群组 → 所有库存自动更新为新的 storeGroup

### 数据一致性
- 用户的群组设置和库存的 storeGroup 始终保持一致
- 群组库存查询只显示有 storeGroup 的库存
- 确保群组成员只能看到同组成员的库存

---

## 问题排查

### 如果看不到库存更新

1. **检查服务器日志**
   - 应该显示"群组发生变化，更新库存记录的 storeGroup"
   - 应该显示更新的库存数量

2. **运行诊断脚本**
   ```bash
   node check-group-inventory.js
   ```

3. **手动修复数据**
   如果数据不一致，运行：
   ```bash
   node fix-merchant-inventory-storegroup.js
   ```

---

## 状态
✅ 功能已实现
✅ 自动化测试通过
✅ 服务器已重启

## 相关文档
- `USER_GROUP_INVENTORY_SYNC.md` - 完整功能文档
- `FIX_GROUP_INVENTORY_COMPLETE.md` - 群组库存修复文档
