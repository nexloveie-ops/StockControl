# Device 分类检测功能

## 概述
修改了入库管理功能，使系统能够检测分类名称中是否包含 "Device" 关键字，并根据检测结果动态生成相应的输入框。

## 问题
之前的逻辑使用 `includes('设备')` 检测中文关键字，但数据库中的分类是英文的（如 "Brand New Devices", "Pre-Owned Devices"），导致无法正确识别设备类产品。

## 解决方案

### 1. 修改检测逻辑

**修改前：**
```javascript
const isDevice = product.productType?.includes('设备');
```

**修改后：**
```javascript
// 检查分类名称中是否包含 "Device" 关键字（不区分大小写）
const isDevice = product.productType?.toLowerCase().includes('device');
```

### 2. 影响的功能

#### A. 发票识别功能
**函数：** `generateIdentifierInputs(product, index)`

**行为：**
- **配件类产品**（不包含 "device"）：显示单个条码输入框（可选）
- **设备类产品**（包含 "device"）：根据数量生成多个 IMEI/SN 和颜色输入框

**示例：**
- `Phone Accessories` → 条码输入框
- `Brand New Devices` → IMEI/SN + 颜色输入框（根据数量）
- `Pre-Owned Devices` → IMEI/SN + 颜色输入框（根据数量）

#### B. 手动录入功能
**函数：** `updateManualProductRow(index)`

**修改内容：**
1. 使用 `toLowerCase().includes('device')` 检测
2. 为设备类产品添加颜色输入框（之前没有）
3. 序列号和颜色存储为对象格式

**行为：**
- **配件类产品**：
  - 条码输入框（可选）
  - 单个颜色输入框
  
- **设备类产品**：
  - 根据数量生成多个 IMEI/SN 输入框（必填，红色边框提示）
  - 根据数量生成多个颜色输入框（对应每个设备）

**数据存储格式：**
```javascript
// 设备类产品
serialNumbers: [
  { serialNumber: 'IMEI123456', color: 'Black' },
  { serialNumber: 'IMEI789012', color: 'White' }
]

// 配件类产品
barcode: 'BAR123456',
color: 'Black'
```

### 3. 修改的函数

#### `generateIdentifierInputs(product, index)`
- 位置：发票识别结果显示
- 修改：检测逻辑从 `includes('设备')` 改为 `toLowerCase().includes('device')`

#### `updateManualProductRow(index)`
- 位置：手动录入产品行更新
- 修改：
  1. 检测逻辑从 `includes('设备')` 改为 `toLowerCase().includes('device')`
  2. 为设备类产品添加颜色输入框
  3. 修改数据存储格式为对象

#### `updateManualSerialNumber(productIndex, serialIndex, serialNumber, color)`
- 位置：手动录入序列号更新
- 修改：
  1. 函数签名增加 `color` 参数
  2. 存储格式改为对象 `{ serialNumber, color }`

## 测试场景

### 场景 1：发票识别 - 配件类产品
1. 上传发票，识别出 "Phone Accessories" 产品
2. **预期结果**：显示单个条码输入框（可选）

### 场景 2：发票识别 - 设备类产品
1. 上传发票，识别出 "Brand New Devices" 产品，数量 2
2. **预期结果**：
   - 显示 2 个 IMEI/SN 输入框（必填，红色边框）
   - 显示 2 个颜色输入框

### 场景 3：手动录入 - 配件类产品
1. 手动录入，选择 "Cable" 分类
2. **预期结果**：
   - 显示单个条码输入框（可选）
   - 显示单个颜色输入框

### 场景 4：手动录入 - 设备类产品
1. 手动录入，选择 "Pre-Owned Devices" 分类
2. 设置数量为 3
3. **预期结果**：
   - 显示 3 个 IMEI/SN 输入框（必填，红色边框）
   - 显示 3 个颜色输入框

### 场景 5：手动录入 - 修改数量
1. 选择 "Brand New Devices" 分类，数量 2
2. 修改数量为 4
3. **预期结果**：
   - IMEI/SN 输入框从 2 个增加到 4 个
   - 颜色输入框从 2 个增加到 4 个
   - 之前填写的数据保留

## 支持的分类关键字

系统会检测分类名称中是否包含以下关键字（不区分大小写）：
- `device`
- `Device`
- `DEVICE`
- `devices`
- `Devices`
- `DEVICES`

**匹配示例：**
- ✅ "Brand New Devices"
- ✅ "Pre-Owned Devices"
- ✅ "Mobile Device"
- ✅ "DEVICE ACCESSORIES"（虽然是配件，但包含 device 关键字）
- ❌ "Phone Accessories"
- ❌ "Cable"
- ❌ "Power Supply"

## 注意事项

1. **大小写不敏感**：使用 `toLowerCase()` 确保不区分大小写
2. **部分匹配**：只要分类名称中包含 "device" 即可，不需要完全匹配
3. **数据兼容性**：新的对象格式向后兼容旧的字符串格式
4. **必填验证**：设备类产品的 IMEI/SN 输入框为必填，使用红色边框提示

## 修改文件
- `StockControl-main/public/prototype-working.html`
  - 修改 `generateIdentifierInputs()` 函数
  - 修改 `updateManualProductRow()` 函数
  - 修改 `updateManualSerialNumber()` 函数

## 完成时间
2026-02-02
