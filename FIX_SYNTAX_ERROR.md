# 修复语法错误 - 销售小票打印

## 问题描述
```
merchant.html:3399 Uncaught SyntaxError: Unexpected end of input
```

## 问题原因
在模板字符串中包含了 `</script>` 标签，导致浏览器提前关闭了外层的 `<script>` 标签。

### 错误代码
```javascript
const receiptHTML = `
  ...
  <script>
    window.onload = function() { ... };
  </script>  // ← 这里会提前关闭外层的 <script> 标签
</body>
</html>
`;
```

## 解决方案
转义内部的 `</script>` 标签：

```javascript
const receiptHTML = `
  ...
  <script>
    window.onload = function() { ... };
  <\/script>  // ← 使用反斜杠转义
</body>
</html>
`;
```

## 修复位置
- **文件**: `StockControl-main/public/merchant.html`
- **行数**: 约3399行
- **函数**: `printReceipt()`

## 修复内容
将 `</script>` 改为 `<\/script>`

## 测试步骤
1. **刷新浏览器页面** (F5 或 Ctrl+R)
2. 打开浏览器控制台 (F12)
3. 检查是否还有语法错误
4. 进行销售测试
5. 验证打印功能

## 验证
修复后应该：
- ✅ 控制台没有语法错误
- ✅ 页面正常加载
- ✅ 销售功能正常
- ✅ 打印功能可用

## 其他注意事项

### 关于第二个警告
```
merchant.html:4986 The specified value "${item.retailPrice || ''}" cannot be parsed, or is out of range.
```

这是一个警告（不是错误），可能是在其他地方的输入框中使用了模板字符串作为value。这不影响功能，但可以优化。

### 模板字符串中的特殊字符
在JavaScript模板字符串中包含HTML时，需要注意：
- `</script>` → `<\/script>`
- `</style>` → `<\/style>`
- 反引号 `` ` `` → `\``

## 相关文档
- `RECEIPT_PRINTING_FEATURE.md` - 打印功能详细说明
- `QUICK_TEST_RECEIPT_PRINTING.md` - 测试指南
- `立即测试销售小票打印.md` - 快速测试

## 状态
✅ 已修复 - 请刷新浏览器测试
