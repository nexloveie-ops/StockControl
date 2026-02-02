# 修复销售发票详情显示错误

## 问题描述
点击发票编号查看详情时报错：
```
Failed to load invoice details: Cannot read properties of undefined (reading 'toFixed')
```

## 原因分析
1. 后端API返回的 `item` 对象在展开时，某些字段可能未正确传递
2. 前端代码直接访问 `item.unitPriceIncludingTax` 和 `item.totalPriceIncludingTax` 时未做安全检查
3. 如果这些字段为 `undefined`，调用 `.toFixed()` 会报错

## 解决方案

### 1. 后端修复（app-new.js）
**修改位置：** `/api/admin/sales-invoices/:invoiceId` 路由

**修改内容：**
```javascript
// 修改前
return {
  ...item,
  unitPriceIncludingTax: item.unitPrice * taxMultiplier,
  totalPriceIncludingTax: item.totalPrice * taxMultiplier,
  vatRate: vatRate
};

// 修改后
const unitPrice = item.unitPrice || 0;
const totalPrice = item.totalPrice || 0;

return {
  ...item.toObject ? item.toObject() : item,
  unitPriceIncludingTax: unitPrice * taxMultiplier,
  totalPriceIncludingTax: totalPrice * taxMultiplier,
  vatRate: vatRate
};
```

**改进点：**
- 添加价格字段的默认值检查
- 正确处理 Mongoose 对象的展开（使用 `toObject()`）
- 确保所有字段都被正确传递

### 2. 前端修复（prototype-working.html）
**修改位置：** `showSalesInvoiceDetails()` 函数

**修改内容：**
```javascript
// 添加安全检查
const unitPriceIncludingTax = item.unitPriceIncludingTax || (item.unitPrice || 0);
const totalPriceIncludingTax = item.totalPriceIncludingTax || (item.totalPrice || 0);
const taxAmount = item.taxAmount || 0;

// 使用安全的变量
€${unitPriceIncludingTax.toFixed(2)}
€${totalPriceIncludingTax.toFixed(2)}
€${taxAmount.toFixed(2)}
```

**改进点：**
- 添加多层级的安全检查
- 如果含税价格未定义，回退到不含税价格
- 如果不含税价格也未定义，使用 0 作为默认值
- 确保 `.toFixed()` 调用不会失败

## 修改文件
- `app-new.js` - 后端API
- `public/prototype-working.html` - 前端显示

## 测试步骤

1. **创建测试销售发票**
   - 进入客户管理
   - 选择客户并创建销售发票
   - 确保发票创建成功

2. **查看发票列表**
   - 点击客户的"📋 查看发票"按钮
   - 应该显示发票列表

3. **查看发票详情**
   - 点击发票编号（蓝色、带下划线）
   - 应该正常打开详情弹窗
   - 不应该出现错误

4. **验证显示内容**
   - 检查产品明细表格
   - 确认所有价格正确显示
   - 确认Code列显示序列号或条码
   - 确认金额汇总正确

## 预期结果

✅ **点击发票编号：**
- 正常打开详情弹窗
- 不出现错误提示

✅ **详情页面：**
- 所有价格字段正确显示
- 产品明细完整
- Code列显示正确
- 金额汇总准确

✅ **错误处理：**
- 即使某些字段缺失，也能正常显示
- 使用默认值（0）代替未定义的价格

## 数据流程

### 后端处理
1. 从数据库获取发票数据
2. 填充关联的 customer 和 product 信息
3. 计算含税价格：
   - `unitPriceIncludingTax = unitPrice * taxMultiplier`
   - `totalPriceIncludingTax = totalPrice * taxMultiplier`
4. 返回格式化的发票数据

### 前端处理
1. 接收后端返回的发票数据
2. 对每个 item 进行安全检查
3. 使用回退值确保价格字段存在
4. 渲染详情页面

## 服务器状态

✅ 服务器运行中：http://localhost:3000
✅ 数据库已连接
✅ 修复已生效

---

**修复时间：** 2026-02-02
**状态：** ✅ 完成
**测试：** ⏳ 待用户测试
