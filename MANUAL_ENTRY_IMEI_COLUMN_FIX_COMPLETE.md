# 手动录入IMEI列索引修复完成

## 问题
用户反馈：`prototype-working.html` 入库管理 > 手动录入产品信息，录入设备时如果数量是2，条码/IMEI/SN只有1个输入框。

## 根本原因
在 `updateManualProductRow` 函数中使用了错误的列索引：
- 旧代码使用 `row.cells[7]` 和 `row.cells[8]`
- 但实际上"条码/IMEI/SN"列是第11列（索引10），"颜色/类型"列是第4列（索引3）

## 修复内容

### 文件：`StockControl-main/public/prototype-working.html`

#### 修复位置：第3948-3950行

**修改前**：
```javascript
const identifierCell = row.cells[7];
const colorCell = row.cells[8];
```

**修改后**：
```javascript
const identifierCell = row.cells[10];  // 条码/IMEI/SN列（第11列，索引10）
const colorCell = row.cells[3];        // 颜色/类型列（第4列，索引3）
```

## 表格列索引说明

### prototype-working.html 表格结构（13列）
```
列索引  列名称
------  ----------------
0       产品名称
1       品牌
2       型号/规格
3       颜色/类型        ← colorCell (设备模式下显示多个颜色输入框)
4       数量
5       进货价
6       批发价
7       零售价
8       分类
9       税务分类
10      条码/IMEI/SN     ← identifierCell (设备模式下显示多个IMEI输入框)
11      成色
12      操作
```

## 功能说明

### 设备产品模式（数量=2）
当选择设备分类（如"手机"、"设备"）并设置数量为2时：

**条码/IMEI/SN列（第11列）**：
```
├─ SN/IMEI 1 (必填) [红色边框输入框]
└─ SN/IMEI 2 (必填) [红色边框输入框]
```

**颜色/类型列（第4列）**：
```
├─ 颜色 1 [输入框]
└─ 颜色 2 [输入框]
```

### 配件产品模式
当选择配件分类时：

**条码/IMEI/SN列（第11列）**：
```
└─ 条码（可选）[灰色边框输入框]
```

**颜色/类型列（第4列）**：
```
└─ 颜色 [输入框]
```

## 测试步骤

### 测试1: 录入2个iPhone
1. 打开 `prototype-working.html`
2. 登录管理员或仓库账户
3. 进入"入库管理" > 点击"手动录入"
4. 点击"➕ 添加产品"
5. 填写信息：
   - 产品名称：iPhone 15 Pro
   - 品牌：Apple
   - 型号：15 Pro
   - **分类：选择"全新手机"或包含"手机"的分类**
   - **数量：2**
6. **验证**：
   - ✅ 第11列（条码/IMEI/SN）显示2个IMEI输入框
   - ✅ 第4列（颜色/类型）显示2个颜色输入框
7. 填写IMEI和颜色：
   ```
   IMEI 1: 123456789012345  颜色: Natural Titanium
   IMEI 2: 987654321098765  颜色: Blue Titanium
   ```
8. 点击"✅ 确认入库"
9. 验证2个设备分别入库

### 测试2: 修改数量
1. 添加产品
2. 选择分类：全新手机
3. 数量：1 → 验证显示1个IMEI输入框
4. 数量：3 → 验证显示3个IMEI输入框
5. 数量：5 → 验证显示5个IMEI输入框

### 测试3: 配件产品
1. 添加产品
2. 选择分类：配件
3. 数量：20
4. **验证**：
   - ✅ 第11列显示单个条码输入框
   - ✅ 第4列显示单个颜色输入框

## 数据结构

### 设备产品（数量=2）
```javascript
{
  name: "iPhone 15 Pro",
  brand: "Apple",
  model: "15 Pro",
  quantity: 2,
  productType: "全新手机",
  serialNumbers: [
    { serialNumber: "123456789012345", color: "Natural Titanium" },
    { serialNumber: "987654321098765", color: "Blue Titanium" }
  ],
  purchasePrice: 800,
  wholesalePrice: 900,
  retailPrice: 1000,
  vatRate: "VAT 23%",
  condition: "BRAND NEW"
}
```

## 相关修复

### 同时修复的问题
1. ✅ 扩展设备检测关键字（支持中英文）
2. ✅ 更新表格列标题（条码/序列号 → 条码/IMEI/SN）
3. ✅ 添加产品录入说明
4. ✅ 修复列索引错误

### 相关文档
- `FIX_MANUAL_ENTRY_IMEI_DETECTION.md` - 设备检测关键字扩展
- `FIX_MANUAL_ENTRY_COLUMN_INDEX.md` - 列索引修复详情
- `MANUAL_ENTRY_IMEI_COMPLETE.md` - 完整功能说明
- `QUICK_TEST_MANUAL_ENTRY_IMEI.md` - 快速测试指南

## 技术细节

### 触发时机
`updateManualProductRow(index)` 在以下情况被调用：
1. 选择分类时
2. 修改数量时

### 关键代码
```javascript
function updateManualProductRow(index) {
  const product = window.manualProducts[index];
  const categoryLower = (product?.productType || '').toLowerCase();
  const isDevice = categoryLower.includes('device') || 
                  categoryLower.includes('设备') || 
                  categoryLower.includes('手机') || 
                  categoryLower.includes('phone') || 
                  categoryLower.includes('iphone') || 
                  categoryLower.includes('samsung') || 
                  categoryLower.includes('tablet') || 
                  categoryLower.includes('平板') || 
                  categoryLower.includes('watch') || 
                  categoryLower.includes('手表');
  const quantity = parseInt(product?.quantity) || 1;
  
  const row = document.getElementById('manualProductsTable').children[index];
  const identifierCell = row.cells[10];  // 正确的列索引
  const colorCell = row.cells[3];        // 正确的列索引
  const identifierContainer = identifierCell.querySelector(`#manualIdentifier_${index}`);
  
  if (isDevice) {
    // 生成多个IMEI和颜色输入框
    for (let i = 0; i < quantity; i++) {
      // ... 生成输入框
    }
  } else {
    // 生成单个条码和颜色输入框
  }
}
```

## 注意事项

### 刷新浏览器
修改了HTML文件后，需要强制刷新浏览器：
- **Windows**: Ctrl + Shift + R
- **Mac**: Cmd + Shift + R

### 分类命名
确保设备类分类包含以下关键字之一：
- device, 设备
- phone, 手机
- iphone, samsung
- tablet, 平板
- watch, 手表

### admin.html
`admin.html` 使用不同的表格结构（11列），列索引是正确的，无需修改。

## 状态
✅ **修复完成** - 手动录入设备时，IMEI输入框数量正确显示

---

**修复日期**: 2026-02-10
**修复人**: Kiro AI Assistant
**测试状态**: 待用户验证
