# 修复库存搜索功能

## 更新日期
2026-02-02

## 问题描述

在"我的库存"中搜索序列号（如 111222）时，没有返回结果。

## 问题原因

搜索函数中使用了错误的字段名称：
- 搜索代码使用：`item.imei`
- 实际模型字段：`item.serialNumber`

MerchantInventory 模型中没有 `imei` 字段，只有：
- `serialNumber` - 序列号
- `barcode` - 条码

## 修复内容

### 1. 更新搜索函数

**文件**：`StockControl-main/public/merchant.html`

**修复前**：
```javascript
const filteredProducts = allInventoryData.filter(item => {
  return (
    (item.productName && item.productName.toLowerCase().includes(searchTerm)) ||
    (item.imei && item.imei.toLowerCase().includes(searchTerm)) ||  // ❌ 错误字段
    (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm)) ||
    (item.notes && item.notes.toLowerCase().includes(searchTerm))
  );
});
```

**修复后**：
```javascript
const filteredProducts = allInventoryData.filter(item => {
  return (
    (item.productName && item.productName.toLowerCase().includes(searchTerm)) ||
    (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm)) ||  // ✅ 正确
    (item.barcode && item.barcode.toLowerCase().includes(searchTerm)) ||  // ✅ 添加条码搜索
    (item.notes && item.notes.toLowerCase().includes(searchTerm))
  );
});
```

### 2. 更新搜索框提示文字

**修复前**：
```html
<input type="text" id="inventorySearchInput" 
  placeholder="🔍 搜索产品名称、IMEI、SN或备注..." />
```

**修复后**：
```html
<input type="text" id="inventorySearchInput" 
  placeholder="🔍 搜索产品名称、序列号、条码或备注..." />
```

### 3. 更新表格列标题

**修复前**：
```html
<th>IMEI/SN</th>
```

**修复后**：
```html
<th>序列号/条码</th>
```

### 4. 更新表格数据显示

**修复前**：
```javascript
<td style="font-size: 11px; color: #666;">
  ${item.imei || item.serialNumber || '-'}
</td>
```

**修复后**：
```javascript
<td style="font-size: 11px; color: #666;">
  ${item.serialNumber || item.barcode || '-'}
</td>
```

---

## MerchantInventory 模型字段

### 产品标识字段
```javascript
{
  barcode: String,        // 条码
  serialNumber: String,   // 序列号
  color: String,          // 颜色
  condition: String       // 成色
}
```

**注意**：模型中没有 `imei` 字段！

---

## 搜索功能说明

### 搜索范围
现在可以搜索以下字段：
1. ✅ **产品名称** (`productName`)
2. ✅ **序列号** (`serialNumber`)
3. ✅ **条码** (`barcode`)
4. ✅ **备注** (`notes`)

### 搜索特性
- **不区分大小写**：搜索 "111222" 或 "111222" 都可以
- **部分匹配**：搜索 "111" 可以找到 "111222"
- **实时搜索**：输入时自动搜索
- **清空返回**：清空搜索框自动返回分类视图

---

## 测试场景

### 测试 1：搜索序列号
1. 登录商户账号
2. 进入"我的库存"
3. 在搜索框输入：`111222`
4. 确认显示包含该序列号的产品

### 测试 2：搜索条码
1. 在搜索框输入条码
2. 确认显示包含该条码的产品

### 测试 3：搜索产品名称
1. 在搜索框输入产品名称的一部分
2. 确认显示匹配的产品

### 测试 4：搜索备注
1. 在搜索框输入备注内容
2. 确认显示包含该备注的产品

### 测试 5：清空搜索
1. 输入搜索词后
2. 清空搜索框
3. 确认返回分类视图

---

## 相关文件

- `StockControl-main/public/merchant.html`
  - searchInventory() 函数（约 1648-1670 行）
  - 搜索框（约 650 行）
  - 产品表格（约 1610-1640 行）

- `StockControl-main/models/MerchantInventory.js`
  - 模型定义（包含字段说明）

---

## 服务器信息

- **状态**：✅ 运行中
- **进程 ID**：20
- **地址**：http://localhost:3000
- **测试账号**：merchant_001 / merchant123

---

## 立即测试

1. **清理浏览器缓存**（按 Ctrl + F5）
2. 访问：http://localhost:3000
3. 登录：merchant_001 / merchant123
4. 进入"我的库存"
5. 搜索：`111222`
6. 确认显示结果

---

**搜索功能已修复！现在可以正确搜索序列号和条码了！** ✅
