# 商户报表日期选择器功能完成

## 完成时间
2026-02-12 04:00

## 功能说明
在merchant.html的报表中心添加了年份和月份选择器，允许用户查看不同时间段的报表数据。

## 修改内容

### 1. merchant.html - 添加日期选择器UI
**位置**: 报表中心标签页顶部

**新增内容**:
```html
<!-- 日期选择器 -->
<div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
  <h2 style="color: white;">📅 报表日期范围</h2>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
    <div class="form-group">
      <label style="color: white;">年份</label>
      <select id="reportYear">
        <!-- 动态生成年份选项（当前年份往前5年）-->
      </select>
    </div>
    <div class="form-group">
      <label style="color: white;">月份</label>
      <select id="reportMonth">
        <option value="1">1月</option>
        <option value="2">2月</option>
        ...
        <option value="12">12月</option>
      </select>
    </div>
    <div>
      <button onclick="loadReportsWithDateRange()">🔄 刷新报表</button>
    </div>
  </div>
</div>
```

### 2. JavaScript函数更新

#### initializeDateSelectors()
- 动态生成年份选项（当前年份往前5年）
- 默认选中当前年份和月份

#### loadReports()
- 初始化日期选择器
- 加载默认当月报表

#### loadReportsWithDateRange()
- 读取选择的年份和月份
- 计算日期范围（月初到月末）
- 调用报表加载函数并传递日期参数

#### loadPurchaseReport(startDate, endDate)
- 接收日期范围参数
- 构建包含日期参数的API URL
- 调用API获取指定时间段的采购报表

#### loadInventoryReport(startDate, endDate)
- 接收日期范围参数
- 构建包含日期参数的API URL
- 调用API获取指定时间段的库存报表

## 功能特点

1. **默认显示当月**: 页面加载时自动显示当前月份的报表数据
2. **年份选择**: 支持选择当前年份及往前5年
3. **月份选择**: 支持选择1-12月
4. **一键刷新**: 点击"刷新报表"按钮立即加载选择时间段的数据
5. **美观UI**: 使用渐变色背景，视觉效果良好

## 使用方法

1. 打开merchant.html，切换到"报表中心"标签页
2. 在顶部看到日期选择器卡片
3. 选择想要查看的年份和月份
4. 点击"🔄 刷新报表"按钮
5. 下方的库存报表和采购报表会自动更新为选择时间段的数据

## 注意事项

1. **API支持**: 后端API需要支持startDate和endDate参数
2. **日期格式**: 传递给API的是ISO格式的日期字符串
3. **默认行为**: 如果不传递日期参数，API应返回当月数据
4. **兼容性**: 修改保持向后兼容，不影响现有功能

## 测试建议

1. 测试默认加载（应显示当月数据）
2. 测试选择不同年份和月份
3. 测试刷新按钮功能
4. 测试跨年份选择
5. 验证API是否正确接收和处理日期参数

## 文件修改
- `StockControl-main/public/merchant.html`
  - 添加日期选择器UI（约第1517行）
  - 更新loadReports函数（约第7610行）
  - 更新loadPurchaseReport函数（约第7616行）
  - 更新loadInventoryReport函数（约第8061行）
  - 添加initializeDateSelectors函数
  - 添加loadReportsWithDateRange函数
