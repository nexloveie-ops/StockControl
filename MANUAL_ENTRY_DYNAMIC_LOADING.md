# 手动录入动态加载功能

## 概述
为仓库管理员的"手动录入入库"功能添加了分类和成色的动态加载支持。

## 修改内容

### 1. 修改 `addManualProduct()` 函数
- 使用 `window.categoriesData` 和 `window.conditionsData` 全局变量
- 调用 `generateCategoryOptions()` 和 `generateConditionOptions()` 生成动态选项
- 如果数据未加载，会显示硬编码的默认选项（容错机制）

### 2. 修改 `switchReceivingMode()` 函数
- 在切换到手动录入模式时，自动检查并加载分类和成色数据
- 只在数据未加载时才发起 API 请求（避免重复加载）
- 使用 Promise 异步加载，不阻塞界面

## 工作流程

```
用户点击"手动录入入库"
    ↓
switchReceivingMode('manual')
    ↓
检查 window.categoriesData 是否存在
    ↓ (不存在)
调用 loadCategories() → 保存到 window.categoriesData
    ↓
检查 window.conditionsData 是否存在
    ↓ (不存在)
调用 loadConditions() → 保存到 window.conditionsData
    ↓
用户点击"添加产品"
    ↓
addManualProduct()
    ↓
使用 window.categoriesData 和 window.conditionsData
    ↓
调用 generateCategoryOptions() 和 generateConditionOptions()
    ↓
生成包含动态选项的产品行
```

## 数据缓存

- 分类和成色数据加载后保存在全局变量中
- 在同一会话中切换模式时不会重复加载
- 刷新页面后需要重新加载

## 容错处理

1. **API 失败**：返回空数组，使用默认选项
2. **数据为空**：使用硬编码的默认选项
3. **异步加载**：不阻塞界面，数据加载完成后自动可用

## 测试方法

1. 登录仓库管理员账号
2. 点击"入库管理" → "手动录入入库"
3. 点击"添加产品"
4. 检查分类和成色下拉框是否显示数据库中的选项

## 相关文件

- `prototype-working.html` - 主要修改文件
- `ADMIN_INVOICE_RECOGNITION_COMPLETE.md` - 完整功能文档
- `QUICK_TEST_INVOICE_RECOGNITION.md` - 测试指南

## 完成时间
2026-02-02
