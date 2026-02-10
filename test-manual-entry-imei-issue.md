# 测试：手动录入IMEI数量问题

## 问题描述
用户反馈：录入设备时，如果数量是2，条码/IMEI/SN只有1个输入框。

## 可能的原因

### 原因1: 操作顺序问题
如果用户的操作顺序是：
1. 先修改数量为2
2. 再选择设备分类

那么在步骤1时，`updateManualProductRow(index)` 会被调用，但此时 `productType` 还是空的，所以 `isDevice` 为 `false`，不会生成多个IMEI输入框。

在步骤2时，虽然选择了设备分类，但是数量已经是2了，应该会生成2个IMEI输入框。

### 原因2: 列索引错误（已修复）
之前代码中使用的列索引不正确：
- 旧代码：`row.cells[7]` 和 `row.cells[8]`
- 新代码：`row.cells[10]` 和 `row.cells[3]`

## 测试步骤

### 测试场景1: 先选分类，后改数量
1. 添加产品
2. 选择分类：全新手机
3. 修改数量：2
4. **预期结果**：显示2个IMEI输入框
5. **实际结果**：？

### 测试场景2: 先改数量，后选分类
1. 添加产品
2. 修改数量：2
3. 选择分类：全新手机
4. **预期结果**：显示2个IMEI输入框
5. **实际结果**：？

### 测试场景3: 修改数量多次
1. 添加产品
2. 选择分类：全新手机
3. 修改数量：2 → 显示2个IMEI输入框
4. 修改数量：3 → 显示3个IMEI输入框
5. 修改数量：1 → 显示1个IMEI输入框
6. **预期结果**：每次修改数量后，IMEI输入框数量正确更新
7. **实际结果**：？

## 调试方法

### 1. 检查列索引
在浏览器控制台输入：
```javascript
const row = document.getElementById('manualProductsTable').children[0];
console.log('总列数:', row.cells.length);
for (let i = 0; i < row.cells.length; i++) {
  console.log(`列${i}:`, row.cells[i].innerText || row.cells[i].innerHTML.substring(0, 50));
}
```

### 2. 检查产品数据
```javascript
console.log('产品数据:', window.manualProducts);
console.log('产品0:', window.manualProducts[0]);
console.log('分类:', window.manualProducts[0]?.productType);
console.log('数量:', window.manualProducts[0]?.quantity);
```

### 3. 手动触发更新
```javascript
updateManualProductRow(0);
```

### 4. 检查是否识别为设备
```javascript
const product = window.manualProducts[0];
const categoryLower = (product?.productType || '').toLowerCase();
const isDevice = categoryLower.includes('device') || 
                categoryLower.includes('设备') || 
                categoryLower.includes('手机') || 
                categoryLower.includes('phone');
console.log('分类:', product?.productType);
console.log('小写:', categoryLower);
console.log('是否设备:', isDevice);
```

## 已修复的问题

### 修复1: 列索引错误
**文件**: `StockControl-main/public/prototype-working.html`
**位置**: 第3948-3950行

**修改前**:
```javascript
const identifierCell = row.cells[7];
const colorCell = row.cells[8];
```

**修改后**:
```javascript
const identifierCell = row.cells[10];  // 条码/IMEI/SN列（第11列，索引10）
const colorCell = row.cells[3];  // 颜色/类型列（第4列，索引3）
```

## 表格列索引参考

### prototype-working.html (13列)
```
0: 产品名称
1: 品牌
2: 型号/规格
3: 颜色/类型 ← colorCell
4: 数量
5: 进货价
6: 批发价
7: 零售价
8: 分类
9: 税务分类
10: 条码/IMEI/SN ← identifierCell
11: 成色
12: 操作
```

### admin.html (11列)
```
0: 产品名称
1: 数量
2: 进货价
3: 批发价
4: 零售价
5: 分类
6: 税务分类
7: 条码/IMEI/SN ← identifierCell (包含颜色)
8: 颜色
9: 成色
10: 操作
```

## 下一步

请用户按照测试步骤进行测试，并反馈实际结果。

如果问题仍然存在，可能需要：
1. 检查浏览器控制台是否有JavaScript错误
2. 确认是否已经刷新浏览器（Ctrl + Shift + R）
3. 检查是否选择了正确的分类（包含设备关键字）
