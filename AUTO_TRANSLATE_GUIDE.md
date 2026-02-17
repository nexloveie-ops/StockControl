# 自动翻译功能使用指南

## 功能介绍

类似 Chrome 浏览器的自动翻译功能，可以将页面上的中文自动翻译成英文。

## 特点

✅ **一键翻译** - 点击按钮即可翻译整个页面
✅ **智能识别** - 自动识别需要翻译的文本，跳过代码、数字等
✅ **翻译缓存** - 已翻译的内容会被缓存，提高速度
✅ **免费使用** - 使用免费的 MyMemory Translation API
✅ **进度显示** - 实时显示翻译进度
✅ **恢复原文** - 可以随时恢复到原始中文

## 使用方法

### 1. 启动翻译

1. 打开任何页面（如 merchant.html）
2. 在页面右下角找到 **🌍 自动翻译** 按钮（在语言切换按钮上方）
3. 点击按钮开始翻译
4. 等待翻译完成（会显示进度百分比）

### 2. 恢复原文

- 再次点击翻译按钮
- 或者刷新页面（Ctrl + R）

## 按钮状态

| 状态 | 显示 | 颜色 | 说明 |
|------|------|------|------|
| 待翻译 | 🌍 自动翻译 | 白色 | 初始状态，可以点击开始翻译 |
| 翻译中 | 🌍 翻译中... X% | 蓝色 | 正在翻译，显示进度 |
| 已完成 | 🌍 已翻译 ✓ | 绿色 | 翻译完成 |
| 失败 | 🌍 翻译失败 ✗ | 红色 | 翻译出错 |

## 翻译范围

### 会翻译的内容
- ✅ 页面标题和标签
- ✅ 按钮文本
- ✅ 表单标签
- ✅ 表格内容
- ✅ 提示信息
- ✅ 菜单项
- ✅ 所有可见的中文文本

### 不会翻译的内容
- ❌ 代码块（`<code>`, `<pre>`）
- ❌ 脚本和样式（`<script>`, `<style>`）
- ❌ 纯数字和符号
- ❌ 已经是英文的文本
- ❌ 标记为 `data-no-translate` 的元素

## 技术细节

### 翻译 API

使用 **MyMemory Translation API**：
- 免费服务
- 每天限制：1000 次请求
- 支持多种语言对
- 无需 API 密钥

### 翻译缓存

- 已翻译的文本会保存在浏览器 localStorage 中
- 下次翻译相同文本时直接使用缓存
- 可以手动清除缓存：
  ```javascript
  AutoTranslate.clearCache();
  ```

### 性能优化

- 批量翻译：每批处理 10 个文本节点
- 智能过滤：跳过不需要翻译的内容
- 请求限速：避免 API 请求过快

## 高级用法

### 在 JavaScript 中使用

```javascript
// 翻译单个文本
const translated = await AutoTranslate.translate('你好');
console.log(translated); // "Hello"

// 清除缓存
AutoTranslate.clearCache();

// 检查翻译状态
if (AutoTranslate.isTranslating) {
  console.log('正在翻译...');
}
```

### 排除特定元素

在 HTML 中添加 `data-no-translate` 属性：

```html
<!-- 不会被翻译 -->
<div data-no-translate>
  这段文字不会被翻译
</div>

<!-- 或者使用 class -->
<div class="no-translate">
  这段文字也不会被翻译
</div>
```

### 自定义排除规则

修改 `auto-translate.js` 中的 `excludeSelectors`：

```javascript
excludeSelectors: [
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  'path',
  'code',
  'pre',
  '[data-no-translate]',
  '.no-translate',
  '.my-custom-class'  // 添加自定义类
]
```

## 限制和注意事项

### API 限制
- MyMemory API 每天限制 1000 次请求
- 如果超过限制，需要等待第二天或使用其他 API

### 翻译质量
- 机器翻译可能不够准确
- 专业术语可能翻译不当
- 建议用于快速理解，不用于正式场合

### 性能影响
- 大页面翻译可能需要较长时间
- 首次翻译会比较慢，后续使用缓存会快很多
- 翻译过程中页面可能会有轻微卡顿

## 备用方案

如果 MyMemory API 不可用，可以切换到其他翻译服务：

### 1. LibreTranslate（开源）

修改 `auto-translate.js` 中的 `translate` 方法：

```javascript
async translate(text) {
  return await this.translateLibre(text);
}
```

### 2. Google Translate API（付费）

需要申请 API 密钥，然后修改翻译方法。

### 3. 百度翻译 API（免费额度）

需要注册百度开发者账号。

## 故障排除

### 问题：翻译按钮不显示
- 检查 `auto-translate.js` 是否正确加载
- 查看浏览器控制台是否有错误

### 问题：翻译失败
- 检查网络连接
- 查看是否超过 API 限制
- 查看控制台错误信息

### 问题：部分内容没有翻译
- 检查是否被排除规则过滤
- 查看是否有 `data-no-translate` 属性
- 检查文本是否符合翻译条件

### 问题：翻译质量不好
- 机器翻译的固有限制
- 可以考虑使用更好的翻译 API
- 或者使用手动翻译（i18n.js）

## 与 i18n.js 的区别

| 特性 | i18n.js | auto-translate.js |
|------|---------|-------------------|
| 翻译方式 | 手动定义翻译键 | 自动机器翻译 |
| 翻译质量 | 高（人工翻译） | 中（机器翻译） |
| 覆盖范围 | 需要手动添加 | 自动全页面 |
| 性能 | 快（本地） | 慢（API 请求） |
| 维护成本 | 高 | 低 |
| 适用场景 | 正式产品 | 快速预览 |

## 建议

1. **开发阶段**：使用 auto-translate.js 快速查看英文效果
2. **生产环境**：使用 i18n.js 提供高质量翻译
3. **混合使用**：重要文本用 i18n.js，次要文本用 auto-translate.js

## 文件位置

- 插件文件：`public/auto-translate.js`
- 引入位置：`public/merchant.html` (第11行)
- 按钮位置：页面右下角，语言切换按钮上方

## 更新日志

### v1.0.0 (2026-02-17)
- ✅ 初始版本
- ✅ 支持中文到英文翻译
- ✅ 翻译缓存功能
- ✅ 进度显示
- ✅ 智能文本识别
