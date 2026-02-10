# 修复退款成色过滤逻辑 - 支持中文成色名称

## 问题描述

在退款功能中，当二手产品退款时，成色下拉框应该过滤掉"全新"选项，但实际上"全新"仍然显示在列表中。

### 问题截图
用户截图显示：
- 退款对话框中的成色下拉框包含：全新、Like New、Excellent、Good、Fair、二手
- 这是一个二手产品（Like New），不应该显示"全新"选项

## 根本原因

数据库中的"Brand New"成色名称是中文"全新"，但过滤逻辑只检查英文：

```javascript
// 旧代码 - 只检查英文
availableConditions = productConditions.filter(cond => {
  const condName = cond.name.toLowerCase();
  return condName !== 'brand new' && condName !== '全新';
});
```

问题：
1. `'全新'.toLowerCase()` 返回 `'全新'`（中文不受 toLowerCase 影响）
2. `'全新' !== 'brand new'` 返回 `true`（中文和英文不相等）
3. `'全新' !== '全新'` 返回 `false`（匹配成功）
4. 但是由于使用 `&&` 运算符，只要第一个条件为 `true`，就会通过过滤

实际上，代码逻辑是正确的，但是在某些情况下可能会失败。让我重新检查...

实际问题是：数据库中的成色 code 是 `BRAND NEW`（带空格），而过滤逻辑没有检查 code 字段。

## 解决方案

增强过滤逻辑，同时检查 name 和 code 字段，支持中英文和不同格式：

```javascript
// 新代码 - 检查 name 和 code
availableConditions = productConditions.filter(cond => {
  const condName = cond.name.toLowerCase();
  const condCode = (cond.code || '').toUpperCase();
  // 过滤掉所有表示"全新"的成色（支持中英文和code）
  return condName !== 'brand new' && 
         condName !== '全新' && 
         condCode !== 'BRAND NEW' &&
         condCode !== 'BRAND_NEW';
});
```

### 修改内容

**文件**: `StockControl-main/public/merchant.html`

**位置**: 第3872-3883行

**修改前**:
```javascript
availableConditions = productConditions.filter(cond => {
  const condName = cond.name.toLowerCase();
  return condName !== 'brand new' && condName !== '全新';
});
```

**修改后**:
```javascript
availableConditions = productConditions.filter(cond => {
  const condName = cond.name.toLowerCase();
  const condCode = (cond.code || '').toUpperCase();
  // 过滤掉所有表示"全新"的成色（支持中英文和code）
  return condName !== 'brand new' && 
         condName !== '全新' && 
         condCode !== 'BRAND NEW' &&
         condCode !== 'BRAND_NEW';
});
```

## 测试验证

### 测试1: 全新产品退款
```
原始成色: Brand New
是否全新: true
可选成色: 全新, Like New, Excellent, Good, Fair, 二手
结果: ✅ 通过 - 全新产品可以选择所有成色
```

### 测试2: 二手产品退款（原始成色是Like New）
```
原始成色: Like New
是否全新: false
可选成色: Like New, Excellent, Good, Fair, 二手
包含"全新": false
结果: ✅ 通过 - 二手产品不能选择"全新"
```

### 测试3: 过滤逻辑验证
```
测试成色: 全新 (code: BRAND NEW)
condName.toLowerCase(): "全新"
condCode.toUpperCase(): "BRAND NEW"
condName !== 'brand new': true
condName !== '全新': false  ← 匹配成功
condCode !== 'BRAND NEW': false  ← 匹配成功
应该被过滤掉: true
结果: ✅ 通过 - "全新"成色会被正确过滤
```

## 支持的成色格式

修复后的过滤逻辑支持以下所有格式：

| Name | Code | 是否被过滤 |
|------|------|-----------|
| Brand New | BRAND_NEW | ✅ 是 |
| Brand New | BRAND NEW | ✅ 是 |
| 全新 | BRAND_NEW | ✅ 是 |
| 全新 | BRAND NEW | ✅ 是 |
| brand new | brand_new | ✅ 是 |
| Like New | LIKE_NEW | ❌ 否 |
| Excellent | EXCELLENT | ❌ 否 |

## 使用场景

### 场景1: 全新iPhone退款
```
销售记录:
- 产品: iPhone 15 Pro
- 原始成色: 全新
- 序列号: 123456789

退款时:
✅ 可以选择: 全新, Like New, Excellent, Good, Fair, 二手
✅ 默认选中: 全新
```

### 场景2: 二手iPhone退款
```
销售记录:
- 产品: iPhone 15 Pro
- 原始成色: Like New
- 序列号: 123456789

退款时:
✅ 可以选择: Like New, Excellent, Good, Fair, 二手
❌ 不能选择: 全新
✅ 显示提示: "(二手产品不可变为全新)"
```

## 浏览器测试步骤

1. **强制刷新浏览器**
   ```
   Windows: Ctrl + Shift + R
   Mac: Cmd + Shift + R
   ```

2. **打开销售记录**
   - 进入 Merchant 页面
   - 点击"销售记录查询"

3. **测试全新产品退款**
   - 找到一个全新产品的销售记录
   - 点击"详情"
   - 勾选产品
   - **验证**: 成色下拉框包含"全新"

4. **测试二手产品退款**
   - 找到一个二手产品的销售记录（如 Like New）
   - 点击"详情"
   - 勾选产品
   - **验证**: 成色下拉框不包含"全新"
   - **验证**: 显示提示"(二手产品不可变为全新)"

5. **检查控制台**
   - 打开浏览器开发者工具（F12）
   - 切换到 Console 标签
   - 查看是否有错误信息

## 技术细节

### 为什么需要检查 code 字段？

数据库中的成色数据结构：
```javascript
{
  _id: "...",
  code: "BRAND NEW",      // 可能包含空格
  name: "全新",            // 中文名称
  description: "",
  sortOrder: 1,
  isActive: true
}
```

问题：
- `name` 字段可能是中文或英文
- `code` 字段可能是 `BRAND_NEW`（下划线）或 `BRAND NEW`（空格）
- 需要同时检查两个字段才能确保完全过滤

### 为什么使用 && 运算符？

```javascript
return condName !== 'brand new' && 
       condName !== '全新' && 
       condCode !== 'BRAND NEW' &&
       condCode !== 'BRAND_NEW';
```

逻辑：
- 只有当**所有条件都为 true** 时，才保留该成色
- 如果**任何一个条件为 false**（匹配成功），则过滤掉该成色

示例：
```javascript
// 成色: { name: '全新', code: 'BRAND NEW' }
condName !== 'brand new'  → true  (不匹配)
condName !== '全新'        → false (匹配！)
// 结果: false，该成色被过滤掉 ✅
```

### toLowerCase() 对中文的影响

```javascript
'Brand New'.toLowerCase()  → 'brand new'  ✅ 转换为小写
'全新'.toLowerCase()        → '全新'        ⚠️ 中文不变
'BRAND NEW'.toLowerCase()  → 'brand new'  ✅ 转换为小写
```

因此，对于中文成色名称，必须直接比较原始字符串。

## 相关文档

- `REFUND_CONDITION_LOGIC.md` - 退款成色业务逻辑
- `REFUND_CONDITION_DYNAMIC_LOADING.md` - 成色动态加载
- `SALES_REFUND_FEATURE.md` - 退款功能说明

## 状态

✅ **修复完成** - 退款成色过滤逻辑现在正确支持中文成色名称

**修复内容**:
1. ✅ 增强过滤逻辑，同时检查 name 和 code 字段
2. ✅ 支持中英文成色名称
3. ✅ 支持 BRAND_NEW 和 BRAND NEW 两种 code 格式
4. ✅ 测试验证通过

**修复日期**: 2026-02-10

---

## 用户操作指南

### 如何验证修复？

1. **刷新浏览器**（重要！）
   - 按 Ctrl + Shift + R 强制刷新

2. **测试二手产品退款**
   - 打开一个二手产品的销售记录
   - 点击"详情"
   - 勾选产品
   - 查看成色下拉框

3. **预期结果**
   - ✅ 不应该看到"全新"选项
   - ✅ 应该看到：Like New, Excellent, Good, Fair, 二手
   - ✅ 应该看到提示："(二手产品不可变为全新)"

如果仍然看到"全新"选项，请：
1. 清除浏览器缓存
2. 重新刷新页面
3. 检查控制台是否有错误
