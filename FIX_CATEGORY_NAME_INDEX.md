# 修复产品分类 name 索引错误

## 📅 日期
2026-02-02

## 问题描述

在管理员页面添加产品分类时报错：
```
E11000 duplicate key error collection: stockcontrol.productcategories index: name_1 dup key: { name: null }
```

### 错误原因
1. 数据库中存在一个 `name` 字段为 `null` 的旧记录
2. 数据库中存在一个旧的 `name_1` 唯一索引
3. 但当前的 ProductCategory 模型中没有 `name` 字段，只有 `type` 字段

---

## 解决方案

### 1. 删除 name 为 null 的记录

运行脚本：
```bash
node fix-null-category-name.js
```

**结果**:
- 找到 1 个 name 为 undefined 的记录
- 已删除该记录

### 2. 删除旧的 name_1 索引

运行脚本：
```bash
node drop-old-category-index.js
```

**结果**:
- 找到 `name_1` 唯一索引
- 成功删除该索引

---

## 修改的文件

### 脚本文件
- `StockControl-main/fix-null-category-name.js` - 清理 null name 记录
- `StockControl-main/drop-old-category-index.js` - 删除旧索引

---

## 数据库索引状态

### 修复前
```
1. _id_
2. name_1 (unique) ❌ 旧索引
3. type_1_isActive_1
4. sortOrder_1
5. type_1 (unique)
```

### 修复后
```
1. _id_
2. type_1_isActive_1
3. sortOrder_1
4. type_1 (unique) ✅
```

---

## ProductCategory 模型字段

当前模型中的字段：
- `type` (String, required, unique) - 分类类型名称
- `description` (String) - 分类描述
- `defaultVatRate` (String) - 默认税率
- `defaultCondition` (String) - 默认成色
- `isActive` (Boolean) - 是否活跃
- `sortOrder` (Number) - 排序权重

**注意**: 模型中没有 `name` 字段，只有 `type` 字段作为唯一标识。

---

## 测试结果

### 修复前
- ❌ 添加分类失败：E11000 duplicate key error

### 修复后
- ✅ 可以正常添加产品分类
- ✅ `type` 字段作为唯一标识
- ✅ 没有 `name` 字段冲突

---

## 注意事项

### 为什么会有 name_1 索引？
可能是因为：
1. 早期版本的模型中有 `name` 字段
2. 后来模型更新为使用 `type` 字段
3. 但旧的索引没有被自动删除

### 如何避免类似问题？
1. 修改模型时，确保删除旧的索引
2. 使用 MongoDB 的 `dropIndexes()` 清理不需要的索引
3. 定期检查数据库索引与模型的一致性

---

## 相关命令

### 查看集合索引
```javascript
db.productcategories.getIndexes()
```

### 删除特定索引
```javascript
db.productcategories.dropIndex("name_1")
```

### 删除所有索引（除了 _id）
```javascript
db.productcategories.dropIndexes()
```

---

## 总结

### 完成情况
- ✅ 删除 null name 记录
- ✅ 删除旧的 name_1 索引
- ✅ 产品分类功能恢复正常

### 当前状态
- ✅ 数据库索引与模型一致
- ✅ 可以正常添加产品分类
- ✅ 使用 `type` 字段作为唯一标识

---

**产品分类功能已修复！** 🎊

现在可以正常添加产品分类了。
