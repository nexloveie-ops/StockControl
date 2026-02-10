# 手动录入IMEI字段显示修复

## 问题描述
用户反馈：在 `prototype-working.html` 的"入库管理 > 手动录入产品信息"功能中，录入设备时没有地方填写IMEI。

## 问题分析

### 原有逻辑
系统已经实现了设备产品的IMEI/SN输入功能，但是**只有当分类名称包含"device"关键字时才会显示**。

原代码（第3932行）：
```javascript
const isDevice = product?.productType?.toLowerCase().includes('device');
```

### 问题原因
1. 检测逻辑过于简单，只检查"device"一个关键字
2. 如果用户选择的分类名称是中文（如"手机"、"设备"）或其他品牌名称（如"iPhone"、"Samsung"），系统无法识别
3. 用户不知道需要选择包含"device"的分类才能看到IMEI输入框

## 解决方案

### 1. 改进设备检测逻辑
扩展关键字列表，支持中英文和常见品牌名称：

```javascript
// 更新手动录入产品行（处理设备类产品的序列号输入）
function updateManualProductRow(index) {
  const product = window.manualProducts[index];
  // 检查分类名称中是否包含设备相关关键字（不区分大小写）
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
  // ... 后续逻辑
}
```

### 2. 更新表格列标题
将"条码/序列号"改为"条码/IMEI/SN"，让用户更清楚这一列的用途：

```html
<th style="padding: 12px; text-align: left;">条码/IMEI/SN</th>
```

### 3. 添加用户提示
在手动录入表单顶部添加明确的说明：

```html
<div style="background: #e7f3ff; border-left: 4px solid #2196f3; padding: 12px; margin: 15px 0; border-radius: 4px;">
  <div style="display: flex; align-items: start; gap: 8px;">
    <span style="font-size: 18px;">💡</span>
    <div style="flex: 1;">
      <strong style="color: #1976d2; font-size: 14px;">产品录入说明</strong>
      <p style="margin: 6px 0 0 0; color: #555; font-size: 13px; line-height: 1.5;">
        <strong>• 设备产品（手机/平板/手表）：</strong>选择包含"设备"、"手机"、"Phone"等关键字的分类后，系统会自动显示IMEI/SN输入框<br>
        <strong>• 配件产品（手机壳/保护膜/数据线）：</strong>填写品牌、型号/规格和颜色/类型字段，用于区分不同变体
      </p>
    </div>
  </div>
</div>
```

## 功能说明

### 设备产品识别关键字
系统现在支持以下关键字（不区分大小写）：
- **英文**: device, phone, iphone, samsung, tablet, watch
- **中文**: 设备, 手机, 平板, 手表

### 自动切换输入模式

#### 设备产品模式
当选择的分类包含上述关键字时：
1. "条码/IMEI/SN"列显示多个IMEI/SN输入框（根据数量）
2. "颜色/类型"列显示多个颜色输入框（对应每个设备）
3. 每个设备可以单独填写IMEI/SN和颜色

示例：
```
数量: 3
IMEI/SN输入框:
  - SN/IMEI 1 (必填) [输入框]
  - SN/IMEI 2 (必填) [输入框]
  - SN/IMEI 3 (必填) [输入框]

颜色输入框:
  - 颜色 1 [输入框]
  - 颜色 2 [输入框]
  - 颜色 3 [输入框]
```

#### 配件产品模式
当选择的分类不包含设备关键字时：
1. "条码/IMEI/SN"列显示单个条码输入框（可选）
2. "颜色/类型"列显示单个颜色输入框
3. 适用于批量录入相同配件

## 使用流程

### 录入设备产品（如iPhone）
1. 点击"➕ 添加产品"
2. 填写产品名称：iPhone 15 Pro
3. 填写品牌：Apple
4. 填写型号：15 Pro
5. **选择分类**：选择包含"手机"、"Phone"或"设备"的分类
6. 填写数量：3
7. 系统自动显示3个IMEI/SN输入框和3个颜色输入框
8. 分别填写每个设备的IMEI和颜色
9. 填写价格和其他信息
10. 点击"✅ 确认入库"

### 录入配件产品（如手机壳）
1. 点击"➕ 添加产品"
2. 填写产品名称：iPhone Clear Case
3. 填写品牌：Generic
4. 填写型号：iPhone 13
5. 填写颜色：Clear
6. **选择分类**：选择"配件"或其他非设备分类
7. 填写数量：10
8. 系统显示单个条码输入框（可选）
9. 填写价格和其他信息
10. 点击"✅ 确认入库"

## 支持的分类示例

### 会触发IMEI输入的分类
- ✅ "全新设备"
- ✅ "二手设备"
- ✅ "手机"
- ✅ "New Phones"
- ✅ "iPhone"
- ✅ "Samsung Devices"
- ✅ "平板电脑"
- ✅ "Tablets"
- ✅ "智能手表"
- ✅ "Smart Watches"

### 不会触发IMEI输入的分类
- ❌ "配件"
- ❌ "Accessories"
- ❌ "手机壳"
- ❌ "Phone Cases"
- ❌ "屏幕保护膜"
- ❌ "Screen Protectors"
- ❌ "数据线"
- ❌ "Cables"

## 数据存储

### 设备产品数据结构
```javascript
{
  name: "iPhone 15 Pro",
  brand: "Apple",
  model: "15 Pro",
  quantity: 3,
  productType: "全新手机",
  serialNumbers: [
    { serialNumber: "IMEI123456789", color: "Natural Titanium" },
    { serialNumber: "IMEI987654321", color: "Blue Titanium" },
    { serialNumber: "IMEI456789123", color: "Black Titanium" }
  ],
  // ... 其他字段
}
```

### 配件产品数据结构
```javascript
{
  name: "iPhone Clear Case",
  brand: "Generic",
  model: "iPhone 13",
  color: "Clear",
  quantity: 10,
  productType: "配件",
  barcode: "1234567890123",
  serialNumbers: [],
  // ... 其他字段
}
```

## 验证逻辑

### 设备产品验证
- IMEI/SN字段为必填（红色边框提示）
- 必须填写所有设备的IMEI/SN
- 颜色字段为可选

### 配件产品验证
- 条码字段为可选
- 颜色字段为可选

## 技术细节

### 文件修改
- **文件**: `StockControl-main/public/prototype-working.html`
- **修改位置**:
  1. 第680行：更新产品录入说明
  2. 第713行：更新表格列标题
  3. 第3932行：改进设备检测逻辑

### 关键函数
1. `updateManualProductRow(index)` - 根据分类动态切换输入模式
2. `updateManualSerialNumber(productIndex, serialIndex, serialNumber, color)` - 保存IMEI和颜色数据
3. `addManualProduct()` - 添加新产品行

### 触发时机
- 选择分类时：`onchange="updateManualProduct(${index}, 'productType', this.value); updateManualVatRate(${index}); updateManualProductRow(${index})"`
- 修改数量时：`onchange="updateManualProduct(${index}, 'quantity', this.value); updateManualProductRow(${index})"`

## 测试场景

### 测试1: 录入单个iPhone
1. 添加产品
2. 产品名称: iPhone 15
3. 分类: 全新手机
4. 数量: 1
5. 验证: 显示1个IMEI输入框
6. 填写IMEI: 123456789012345
7. 确认入库
8. 验证: 产品成功入库，IMEI正确保存

### 测试2: 录入多个Samsung设备
1. 添加产品
2. 产品名称: Samsung Galaxy S24
3. 分类: Samsung Devices
4. 数量: 5
5. 验证: 显示5个IMEI输入框和5个颜色输入框
6. 填写所有IMEI和颜色
7. 确认入库
8. 验证: 5个设备分别入库，IMEI和颜色正确

### 测试3: 录入配件产品
1. 添加产品
2. 产品名称: iPhone 13 Clear Case
3. 分类: 配件
4. 数量: 20
5. 验证: 显示单个条码输入框
6. 填写条码（可选）
7. 确认入库
8. 验证: 配件批量入库

### 测试4: 切换分类类型
1. 添加产品
2. 分类: 配件（显示条码输入框）
3. 修改分类: 手机（自动切换为IMEI输入框）
4. 修改数量: 3（显示3个IMEI输入框）
5. 验证: 输入框正确切换

## 注意事项

1. **分类命名规范**: 建议在创建分类时，设备类分类包含"设备"、"手机"、"Phone"等关键字
2. **IMEI必填**: 设备产品的IMEI/SN为必填项，未填写会有红色边框提示
3. **数量变更**: 修改数量后，IMEI输入框数量会自动调整
4. **数据保存**: 每个设备的IMEI和颜色单独保存，支持同一型号不同颜色的设备

## 相关文档
- `ADMIN_MANUAL_RECEIVING_VARIANT_SUPPORT.md` - 手动录入变体支持
- `WAREHOUSE_SHIPMENT_IMEI_SELECTION.md` - 仓库发货IMEI选择
- `ADMIN_INVENTORY_MODEL_COMPLETE.md` - 库存模型说明

## 状态
✅ **已修复** - 手动录入设备时可以正确显示IMEI/SN输入框

---

**修复日期**: 2026-02-10
**修复人**: Kiro AI Assistant
