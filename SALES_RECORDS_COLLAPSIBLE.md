# 销售记录查询折叠功能 ✅

## 功能描述

将销售业务页面的"销售记录查询"部分改为默认折叠状态，点击标题栏可以展开/折叠内容。

## 改进原因

- 销售记录查询不是最常用的功能
- 默认展开占用较多页面空间
- 折叠后可以让用户更专注于主要的销售功能

## 界面变化

### 修改前

```
🛒 销售业务
[产品分类和搜索区域]

销售记录查询
[开始日期] [结束日期]
[查询销售记录按钮]
[查询结果区域]
```

### 修改后

**默认状态（折叠）**：
```
🛒 销售业务
[产品分类和搜索区域]

销售记录查询                           ▼
```

**展开状态**：
```
🛒 销售业务
[产品分类和搜索区域]

销售记录查询                           ▲
[开始日期] [结束日期]
[查询销售记录按钮]
[查询结果区域]
```

## 功能特点

### 1. 默认折叠
- 页面加载时，销售记录查询区域默认隐藏
- 只显示标题栏和展开图标

### 2. 点击切换
- 点击标题栏任意位置可以展开/折叠
- 鼠标悬停时显示为可点击状态（cursor: pointer）

### 3. 动画效果
- 展开/折叠图标有旋转动画
- 过渡时间：0.3秒
- 折叠时：▼ (向下箭头)
- 展开时：▲ (向上箭头，旋转180度)

### 4. 保持功能
- 折叠不影响查询功能
- 展开后所有功能正常使用
- 日期选择器和查询按钮都在折叠区域内

## 技术实现

### HTML结构

```html
<div class="card">
  <!-- 标题栏（可点击） -->
  <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" 
       onclick="toggleSalesRecordsSection()">
    <h2 style="margin: 0;">销售记录查询</h2>
    <span id="salesRecordsToggleIcon" 
          style="font-size: 24px; color: #6b7280; transition: transform 0.3s;">▼</span>
  </div>
  
  <!-- 可折叠内容（默认隐藏） -->
  <div id="salesRecordsContent" style="display: none; margin-top: 20px;">
    <div class="form-grid" style="margin-bottom: 20px;">
      <div class="form-group">
        <label>开始日期</label>
        <input type="date" id="salesStartDate">
      </div>
      <div class="form-group">
        <label>结束日期</label>
        <input type="date" id="salesEndDate">
      </div>
    </div>
    <button class="btn btn-primary" onclick="querySalesRecords()">查询销售记录</button>
    
    <div id="salesRecordsTable" style="margin-top: 20px;">
      <p style="text-align: center; color: #999; padding: 20px;">请选择日期范围并点击查询</p>
    </div>
  </div>
</div>
```

### JavaScript函数

```javascript
// 切换销售记录查询区域的显示/隐藏
function toggleSalesRecordsSection() {
  const content = document.getElementById('salesRecordsContent');
  const icon = document.getElementById('salesRecordsToggleIcon');
  
  if (content.style.display === 'none') {
    // 展开
    content.style.display = 'block';
    icon.style.transform = 'rotate(180deg)';
    icon.textContent = '▲';
  } else {
    // 折叠
    content.style.display = 'none';
    icon.style.transform = 'rotate(0deg)';
    icon.textContent = '▼';
  }
}
```

## 样式说明

### 标题栏样式

- **display: flex** - 使用弹性布局
- **justify-content: space-between** - 标题和图标分别在两端
- **align-items: center** - 垂直居中对齐
- **cursor: pointer** - 鼠标悬停时显示手型光标

### 图标样式

- **font-size: 24px** - 图标大小
- **color: #6b7280** - 灰色
- **transition: transform 0.3s** - 旋转动画过渡

### 内容区域样式

- **display: none** - 默认隐藏
- **margin-top: 20px** - 展开时与标题的间距

## 用户体验

### 优点

1. **节省空间** - 默认折叠，页面更简洁
2. **按需展开** - 需要时才展开，减少干扰
3. **视觉反馈** - 图标旋转动画提供清晰的状态反馈
4. **易于操作** - 点击标题栏即可切换，操作简单

### 使用流程

1. **查看销售记录**
   - 点击"销售记录查询"标题栏
   - 区域展开，图标变为 ▲
   - 选择日期范围
   - 点击"查询销售记录"按钮

2. **隐藏查询区域**
   - 再次点击标题栏
   - 区域折叠，图标变为 ▼
   - 页面恢复简洁状态

## 测试指南

### 测试步骤

1. **登录系统**
   ```
   用户名: MurrayDundrum
   密码: 123456
   ```

2. **进入销售业务**
   - 点击"销售业务"标签

3. **验证默认状态**
   - 确认"销售记录查询"区域默认折叠
   - 只显示标题和 ▼ 图标
   - 不显示日期选择器和查询按钮

4. **测试展开**
   - 点击"销售记录查询"标题栏
   - 确认区域展开
   - 确认图标变为 ▲ 并旋转
   - 确认显示日期选择器和查询按钮

5. **测试折叠**
   - 再次点击标题栏
   - 确认区域折叠
   - 确认图标变为 ▼ 并旋转回来
   - 确认内容隐藏

6. **测试查询功能**
   - 展开区域
   - 选择日期范围
   - 点击"查询销售记录"
   - 确认查询功能正常工作

### 预期结果

✅ 默认状态为折叠
✅ 点击标题栏可以展开/折叠
✅ 图标有旋转动画
✅ 展开时显示 ▲，折叠时显示 ▼
✅ 查询功能正常工作
✅ 鼠标悬停时显示手型光标

## 浏览器兼容性

- ✅ Chrome/Edge (现代版本)
- ✅ Firefox (现代版本)
- ✅ Safari (现代版本)
- ✅ 移动浏览器

## 未来改进

### 可能的增强功能

1. **记住状态**
   - 使用 localStorage 记住用户的展开/折叠偏好
   - 下次访问时保持上次的状态

2. **平滑动画**
   - 添加高度过渡动画
   - 使展开/折叠更流畅

3. **键盘支持**
   - 支持 Enter 或 Space 键切换
   - 提高可访问性

4. **其他区域折叠**
   - 将类似的功能应用到其他不常用的区域
   - 如维修业务的某些部分

## 相关文件

**修改文件**:
- `StockControl-main/public/merchant.html`

**修改内容**:
1. 添加可点击的标题栏
2. 添加展开/折叠图标
3. 将内容区域包装在可折叠的 div 中
4. 添加 `toggleSalesRecordsSection()` 函数

## 代码位置

**文件**: `StockControl-main/public/merchant.html`

**HTML**: 约第 423 行
**JavaScript**: 约第 2210 行

## 注意事项

### 1. 默认状态

内容区域默认为 `display: none`，确保页面加载时是折叠状态。

### 2. 图标选择

使用 Unicode 字符 ▼ (U+25BC) 和 ▲ (U+25B2)，无需额外的图标库。

### 3. 动画性能

使用 CSS `transform` 而不是直接改变元素属性，性能更好。

### 4. 点击区域

整个标题栏都可以点击，不仅仅是图标，提高可用性。

## 总结

销售记录查询折叠功能已完成！

**主要改进**：
✅ 默认折叠，节省页面空间
✅ 点击标题栏展开/折叠
✅ 图标旋转动画提供视觉反馈
✅ 不影响原有查询功能
✅ 提升页面整洁度

**用户体验**：
- 页面更简洁
- 按需展开
- 操作简单
- 视觉反馈清晰

---
**完成日期**: 2026-02-05
**状态**: ✅ 已完成
**需要重启服务器**: 否（前端修改）
