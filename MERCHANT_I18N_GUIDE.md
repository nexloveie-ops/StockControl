# Merchant.html 多语言整理指南

## 完成时间
2026-02-17

## 状态
🔄 进行中 - 已添加翻译键，需要逐步添加 HTML 标记

## 已完成

### 1. i18n.js 翻译键已添加 ✅

已在 i18n.js 中添加了以下商户页面翻译键：

#### 页面标题和欢迎信息
- `merchant.title` - 批发商户中心 / Wholesale Merchant Center
- `merchant.welcome` - 欢迎 / Welcome
- `merchant.company` - 公司 / Company

#### 统计卡片
- `merchant.stats.todaySales` - 本日销售 / Today Sales
- `merchant.stats.todayRevenue` - 本日收入 / Today Revenue
- `merchant.stats.todayRepairs` - 本日维修 / Today Repairs
- `merchant.stats.todayTax` - 本日应缴税额 / Today Tax Due
- `merchant.stats.clickDetails` - 点击查看明细 / Click for details
- `merchant.stats.clickCalculation` - 点击查看计算过程 / Click for calculation

#### 标签页
- `merchant.tab.sales` - 销售业务 / Sales
- `merchant.tab.repairs` - 维修业务 / Repairs
- `merchant.tab.myInventory` - 我的库存 / My Inventory
- `merchant.tab.groupInventory` - 群组库存 / Group Inventory
- `merchant.tab.transfer` - 调货管理 / Transfer
- `merchant.tab.warehouseOrder` - 仓库订货 / Warehouse Order
- `merchant.tab.receiving` - 入库管理 / Receiving
- `merchant.tab.reports` - 报表中心 / Reports
- `merchant.tab.taxReport` - 税务报表 / Tax Report

#### 销售业务
- `merchant.sales.title` - 销售业务 / Sales
- `merchant.sales.cart` - 购物车 / Cart
- `merchant.sales.items` - 件商品 / items
- `merchant.sales.total` - 总计 / Total
- `merchant.sales.checkout` - 结账 / Checkout
- `merchant.sales.clear` - 清空 / Clear
- `merchant.sales.cartEmpty` - 购物车为空 / Cart is empty
- `merchant.sales.searchPlaceholder` - 搜索产品名称、IMEI、序列号、条形码或备注... / Search product name, IMEI, serial number, barcode or notes...
- `merchant.sales.quickSale` - 快速销售 / Quick Sale
- `merchant.sales.selectCategory` - 选择分类 / Select Category
- `merchant.sales.allCategories` - 所有分类 / All Categories

#### 维修业务
- `merchant.repairs.title` - 维修业务 / Repairs
- `merchant.repairs.new` - 新增维修订单 / New Repair Order
- `merchant.repairs.all` - 全部 / All
- `merchant.repairs.pending` - 待维修 / Pending
- `merchant.repairs.sentOut` - 已送出 / Sent Out
- `merchant.repairs.retrieved` - 已取回 / Retrieved
- `merchant.repairs.completed` - 已完成 / Completed
- `merchant.repairs.readyForSale` - 等待销售 / Ready for Sale
- `merchant.repairs.searchPlaceholder` - 搜索：客户、设备、IMEI、问题描述、维修地点... / Search: customer, device, IMEI, problem, location...

#### 我的库存
- `merchant.inventory.title` - 我的库存 / My Inventory
- `merchant.inventory.searchPlaceholder` - 搜索产品名称、品牌、型号、颜色... / Search product name, brand, model, color...
- `merchant.inventory.productName` - 产品名称 / Product Name
- `merchant.inventory.brandModel` - 品牌/型号 / Brand/Model
- `merchant.inventory.stock` - 库存数量 / Stock
- `merchant.inventory.costRange` - 成本价范围 / Cost Range
- `merchant.inventory.retailPrice` - 零售价 / Retail Price
- `merchant.inventory.taxClass` - 税务分类 / Tax Class
- `merchant.inventory.location` - 位置 / Location
- `merchant.inventory.actions` - 操作 / Actions

#### 按钮和操作
- `merchant.button.save` - 保存 / Save
- `merchant.button.cancel` - 取消 / Cancel
- `merchant.button.confirm` - 确认 / Confirm
- `merchant.button.delete` - 删除 / Delete
- `merchant.button.edit` - 编辑 / Edit
- `merchant.button.close` - 关闭 / Close
- `merchant.button.back` - 返回 / Back
- `merchant.button.search` - 搜索 / Search
- `merchant.button.export` - 导出 / Export
- `merchant.button.print` - 打印 / Print
- `merchant.button.download` - 下载 / Download

### 2. HTML 标记已添加 ✅

已添加 data-i18n 属性的部分：
- ✅ 页面标题 (title标签)
- ✅ 标签页按钮 (tabs)

## 待完成

### 需要添加 data-i18n 属性的部分

#### 1. 统计卡片 (约第330-350行)
```html
<!-- 当前 -->
<h3>本日销售 💰</h3>

<!-- 修改为 -->
<h3 data-i18n="merchant.stats.todaySales">本日销售 💰</h3>
```

#### 2. 销售业务标题和按钮 (约第370-400行)
```html
<!-- 当前 -->
<h2>🛒 销售业务</h2>
<button>💳 结账</button>
<button>清空</button>

<!-- 修改为 -->
<h2 data-i18n="merchant.sales.title">🛒 销售业务</h2>
<button data-i18n="merchant.sales.checkout">💳 结账</button>
<button data-i18n="merchant.sales.clear">清空</button>
```

#### 3. 搜索框占位符 (约第390行)
```html
<!-- 当前 -->
<input type="text" id="globalProductSearchInput" 
  placeholder="🔍 搜索产品名称、IMEI、序列号、条形码或备注...">

<!-- 修改为 -->
<input type="text" id="globalProductSearchInput" 
  data-i18n-placeholder="merchant.sales.searchPlaceholder"
  placeholder="🔍 搜索产品名称、IMEI、序列号、条形码或备注...">
```

#### 4. 维修业务部分 (约第700-730行)
```html
<!-- 当前 -->
<h2>🔧 维修业务</h2>
<button>+ 新增维修订单</button>
<button>全部</button>
<button>待维修</button>

<!-- 修改为 -->
<h2 data-i18n="merchant.repairs.title">🔧 维修业务</h2>
<button data-i18n="merchant.repairs.new">+ 新增维修订单</button>
<button data-i18n="merchant.repairs.all">全部</button>
<button data-i18n="merchant.repairs.pending">待维修</button>
```

#### 5. 我的库存部分 (约第5000-5100行)
表格表头需要添加翻译：
```html
<!-- 当前 -->
<th>产品名称</th>
<th>品牌/型号</th>
<th>库存数量</th>

<!-- 修改为 -->
<th data-i18n="merchant.inventory.productName">产品名称</th>
<th data-i18n="merchant.inventory.brandModel">品牌/型号</th>
<th data-i18n="merchant.inventory.stock">库存数量</th>
```

## 实施建议

由于 merchant.html 文件非常大（超过11000行），建议分阶段实施：

### 阶段1：关键静态文本 (优先级：高)
- ✅ 页面标题
- ✅ 标签页
- ⏳ 统计卡片
- ⏳ 主要按钮（保存、取消、确认、删除等）

### 阶段2：表单和输入框 (优先级：中)
- ⏳ 搜索框占位符
- ⏳ 表单标签
- ⏳ 下拉选项

### 阶段3：表格和列表 (优先级：中)
- ⏳ 表格表头
- ⏳ 列表标题

### 阶段4：动态内容 (优先级：低)
- ⏳ JavaScript 生成的内容
- ⏳ 模态框内容
- ⏳ 提示消息

## 使用方法

### 添加静态文本翻译
```html
<h2 data-i18n="merchant.sales.title">销售业务</h2>
```

### 添加占位符翻译
```html
<input type="text" 
  data-i18n-placeholder="merchant.sales.searchPlaceholder"
  placeholder="搜索...">
```

### 添加按钮翻译
```html
<button data-i18n="merchant.button.save">保存</button>
```

### 在 JavaScript 中使用翻译
```javascript
// 获取翻译文本
const title = i18n.t('merchant.sales.title');

// 设置元素文本
element.textContent = i18n.t('merchant.button.save');

// 设置占位符
input.placeholder = i18n.t('merchant.sales.searchPlaceholder');
```

## 测试

1. 打开 merchant.html 页面
2. 点击右下角的语言切换按钮（🌐）
3. 验证已添加翻译的部分是否正确切换
4. 检查控制台是否有缺失翻译的警告

## 注意事项

1. **保持一致性**：使用统一的命名规范（merchant.section.item）
2. **避免硬编码**：所有用户可见的文本都应该使用翻译键
3. **测试完整性**：添加翻译后务必测试中英文切换
4. **动态内容**：JavaScript 生成的内容需要调用 `i18n.t()` 方法
5. **占位符**：输入框占位符使用 `data-i18n-placeholder` 属性

## 下一步

建议按以下顺序继续：
1. 完成统计卡片的翻译标记
2. 完成销售业务部分的主要按钮和标题
3. 完成维修业务部分的筛选按钮
4. 完成我的库存部分的表格表头
5. 逐步完善其他部分

## 相关文件

- `public/i18n.js` - 翻译字典
- `public/merchant.html` - 商户页面
- `LOGIN_PAGE_I18N_COMPLETE.md` - 登录页面多语言完成文档（参考）
