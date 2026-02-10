# 修复：手动录入IMEI列索引错误

## 问题
用户反馈：录入设备时，如果数量是2，条码/IMEI/SN只有1个输入框。

## 根本原因
在 `updateManualProductRow` 函数中，使用了错误的列索引来定位"条码/IMEI/SN"列和"颜色/类型"列。

### 错误的代码
```javascript
const identifierCell = row.cells[7];  // 错误：第8列是"零售价"
const colorCell = row.cells[8];       // 错误：第9列是"分类"
```

### 表格实际结构（13列）
```
索引0:  产品名称
索引1:  品牌
索引2:  型号/规格
索引3:  颜色/类型      ← 应该是 colorCell
索引4:  数量
索引5:  进货价
索引6:  批发价
索引7:  零售价         ← 旧代码错误地认为这是 identifierCell
索引8:  分类           ← 旧代码错误地认为这是 colorCell
索引9:  税务分类
索引10: 条码/IMEI/SN   ← 应该是 identifierCell
索引11: 成色
索引12: 操作
```

## 解决方案

### 修复代码
**文件**: `StockControl-main/public/prototype-working.html`
**位置**: 第3948-3950行

```javascript
const identifierCell = row.cells[10];  // 条码/IMEI/SN列（第11列，索引10）
const colorCell = row.cells[3];        // 颜色/类型列（第4列，索引3）
```

## 影响
修复后，当用户：
1. 选择设备分类（如"手机"、"设备"）
2. 设置数量为2或更多

系统会正确地：
- 在第11列（条码/IMEI/SN）显示多个IMEI输入框
- 在第4列（颜色/类型）显示多个颜色输入框

## 测试验证

### 测试步骤
1. 打开 `prototype-working.html`
2. 进入"入库管理" > "手动录入"
3. 点击"➕ 添加产品"
4. 选择分类：全新手机
5. 修改数量：2
6. **验证**：应该看到2个IMEI输入框和2个颜色输入框

### 预期结果
```
条码/IMEI/SN列：
├─ SN/IMEI 1 (必填) [输入框]
└─ SN/IMEI 2 (必填) [输入框]

颜色/类型列：
├─ 颜色 1 [输入框]
└─ 颜色 2 [输入框]
```

## 相关文件

### prototype-working.html
- 13列表格
- IMEI和颜色分别在不同列
- 列索引：identifierCell = 10, colorCell = 3

### admin.html
- 11列表格
- IMEI和颜色在同一列（第7列）
- 列索引：identifierCell = 7（包含颜色输入框）
- **admin.html 的列索引是正确的，无需修改**

## 修复状态
✅ **已修复** - `prototype-working.html` 列索引已更正

---

**修复日期**: 2026-02-10
**修复人**: Kiro AI Assistant
