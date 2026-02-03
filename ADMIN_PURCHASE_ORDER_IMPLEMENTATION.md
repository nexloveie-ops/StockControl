# 管理员采购订单功能实施指南

## 📋 任务说明

将仓管员页面的"入库管理"功能完整照搬到管理员页面的"采购订单"功能中。

---

## ✅ 已完成的工作

### 1. HTML结构 - 已添加
- ✅ 入库方式选择按钮（发票上传/手动录入）
- ✅ 发票上传区域
- ✅ 手动录入表单（供应商、发票号、产品表格）
- ✅ 识别结果显示区域

### 2. CSS样式 - 已添加
- ✅ upload-area样式
- ✅ empty-state样式
- ✅ data-table样式
- ✅ 按钮尺寸变体（btn-sm, btn-info, btn-danger）

---

## 🔧 需要添加的JavaScript函数

由于函数非常多且复杂，建议采用以下方式：

### 方法1：直接复制完整的JavaScript部分（推荐）

从 `prototype-working.html` 的以下行复制到 `admin.html`：
- 起始行：2764（`async function loadSuppliers()`）
- 结束行：3800（入库管理相关函数结束）

### 方法2：逐个添加核心函数

**必需的核心函数**：
1. `switchReceivingMode(mode)` - 切换入库模式
2. `loadSuppliersForManual()` - 加载供应商列表
3. `addManualProduct()` - 添加产品行
4. `updateManualProduct(index, field, value)` - 更新产品数据
5. `calculateWholesalePrice(index)` - 计算批发价
6. `calculateRetailPrice(index)` - 计算零售价
7. `updateManualVatRate(index)` - 更新税率
8. `updateManualProductRow(index)` - 更新产品行（处理序列号）
9. `updateManualSerialNumber(productIndex, serialIndex, value)` - 更新序列号
10. `removeManualProduct(index)` - 移除产品行
11. `clearManualForm()` - 清空表单
12. `confirmManualReceiving()` - 确认入库
13. `getDefaultVatRate(productType)` - 获取默认税率
14. `handleFileUpload(event)` - 处理文件上传
15. `displayRecognitionResult(data)` - 显示识别结果
16. `confirmReceiving()` - 确认入库（发票上传模式）

---

## 📝 实施步骤

### 步骤1：添加辅助函数

在 `admin.html` 的 `<script>` 标签中添加：

```javascript
// 调试日志函数
function debugLog(message, data = null) {
  console.log(`[Admin] ${message}`, data || '');
}

// 加载供应商（简化版）
async function loadSuppliers() {
  try {
    const response = await fetch('/api/suppliers');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    debugLog(`加载供应商失败: ${error.message}`);
    return [];
  }
}
```

### 步骤2：复制入库管理函数

从 `prototype-working.html` 复制以下函数到 `admin.html`：

```javascript
// 从第2841行开始复制
function switchReceivingMode(mode) { ... }
async function loadSuppliersForManual() { ... }
function addManualProduct() { ... }
// ... 等等
```

### 步骤3：修改API_BASE常量

确保 `admin.html` 中有：
```javascript
const API_BASE = '/api';
```

### 步骤4：初始化函数

在页面加载时初始化：
```javascript
document.addEventListener('DOMContentLoaded', function() {
  // 默认添加一个产品行
  if (document.getElementById('manualProductsTable')) {
    addManualProduct();
  }
});
```

---

## 🎯 快速实施方案

### 完整复制方案（最简单）

1. 打开 `prototype-working.html`
2. 找到第2764行到第3800行之间的所有JavaScript代码
3. 复制这些代码
4. 打开 `admin.html`
5. 在 `<script>` 标签的末尾（`</script>` 之前）粘贴
6. 保存文件

### 验证步骤

1. 访问 http://localhost:3000/admin.html
2. 点击"采购订单"标签
3. 测试"发票上传入库"按钮
4. 测试"手动录入入库"按钮
5. 在手动录入模式下：
   - 选择供应商
   - 输入发票号
   - 添加产品
   - 填写产品信息
   - 点击"确认入库"

---

## 🔍 关键代码位置

### prototype-working.html中的关键部分

| 功能 | 起始行 | 结束行 | 说明 |
|------|--------|--------|------|
| 入库管理HTML | 590 | 750 | HTML结构 |
| 切换入库模式 | 2841 | 2873 | switchReceivingMode |
| 加载供应商 | 2875 | 2893 | loadSuppliersForManual |
| 添加产品行 | 2895 | 2999 | addManualProduct |
| 更新产品数据 | 3001 | 3037 | updateManualProduct |
| 确认入库 | 3143 | 3350 | confirmManualReceiving |
| 文件上传处理 | 2790 | 2838 | handleFileUpload |

---

## ⚠️ 注意事项

1. **API端点**：确保后端API `/api/receiving/confirm` 存在并正常工作
2. **供应商数据**：需要先有供应商数据才能进行入库
3. **产品分类**：确保产品分类选项与数据库一致
4. **税率计算**：VAT税率根据产品分类自动设置
5. **序列号验证**：设备类产品必须填写序列号

---

## 🚀 下一步

完成采购订单功能后，可以继续实施：
1. 供应商管理功能优化
2. 报表分析功能
3. 用户管理功能

---

**创建时间**: 2026-02-03
**状态**: 进行中
**优先级**: 高
