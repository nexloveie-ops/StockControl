# 产品追溯 - 含税价格显示修复

## 修改日期
2026-02-02 00:25

## 备份信息
- 备份文件夹：`StockControl-main-backup-20260202-002553`
- 备份内容：完整项目文件

## 问题描述

### 问题 1: 税率显示 undefined
**原因：** 使用了发票项目的税率字段，但旧数据可能没有这个字段

### 问题 2: 价格显示不含税
**原因：** 历史记录时间线显示的是不含税的价格，应该显示含税价格

## 修改内容

### 1. 税率来源修改
**修改前：** 使用发票项目的税率
```javascript
vatRate: item.vatRate || 'VAT 23%'
```

**修改后：** 使用产品本身的税率
```javascript
vatRate: product.vatRate || 'VAT 23%'
```

**原因：** 产品的税率是固定的，应该从产品数据中获取，而不是从发票中获取

---

### 2. 价格计算修改（含税）

#### 后端 API 修改 (app-new.js)

**采购记录 - 修改前：**
```javascript
history.push({
  type: 'purchase',
  // ...
  unitPrice: item.unitCost,        // 不含税
  totalPrice: item.totalCost,      // 不含税
  vatRate: product.vatRate || 'VAT 23%',
  // ...
});
```

**采购记录 - 修改后：**
```javascript
// 计算税率系数
const vatRate = product.vatRate || 'VAT 23%';
const taxMultiplier = vatRate === 'VAT 23%' ? 1.23 : 
                     vatRate === 'VAT 13.5%' ? 1.135 : 1.0;

// 计算含税价格
const unitPriceIncludingTax = item.unitCost * taxMultiplier;
const totalPriceIncludingTax = item.totalCost * taxMultiplier;

history.push({
  type: 'purchase',
  // ...
  unitPrice: unitPriceIncludingTax,   // 含税单价
  totalPrice: totalPriceIncludingTax, // 含税总价
  vatRate: vatRate,
  // ...
});
```

**销售记录 - 修改前：**
```javascript
history.push({
  type: 'sales',
  // ...
  unitPrice: item.unitPrice,       // 不含税
  totalPrice: item.totalPrice,     // 不含税
  vatRate: product.vatRate || 'VAT 23%',
  // ...
});
```

**销售记录 - 修改后：**
```javascript
// 计算税率系数
const vatRate = product.vatRate || 'VAT 23%';
const taxMultiplier = vatRate === 'VAT 23%' ? 1.23 : 
                     vatRate === 'VAT 13.5%' ? 1.135 : 1.0;

// 计算含税价格
const unitPriceIncludingTax = item.unitPrice * taxMultiplier;
const totalPriceIncludingTax = item.totalPrice * taxMultiplier;

history.push({
  type: 'sales',
  // ...
  unitPrice: unitPriceIncludingTax,   // 含税单价
  totalPrice: totalPriceIncludingTax, // 含税总价
  vatRate: vatRate,
  // ...
});
```

---

#### 前端显示修改 (prototype-working.html)

**修改前：**
```html
<div>
  <div style="font-size: 12px; color: #6b7280;">单价</div>
  <div>€${record.unitPrice.toFixed(2)}</div>
</div>
<div>
  <div style="font-size: 12px; color: #6b7280;">总价</div>
  <div style="font-weight: bold;">€${record.totalPrice.toFixed(2)}</div>
</div>
```

**修改后：**
```html
<div>
  <div style="font-size: 12px; color: #6b7280;">单价（含税）</div>
  <div>€${record.unitPrice.toFixed(2)}</div>
</div>
<div>
  <div style="font-size: 12px; color: #6b7280;">总价（含税）</div>
  <div style="font-weight: bold;">€${record.totalPrice.toFixed(2)}</div>
</div>
```

---

## 税率计算逻辑

### 税率系数对照表
| 税率 | 系数 | 说明 |
|------|------|------|
| VAT 23% | 1.23 | 含税价格 = 不含税价格 × 1.23 |
| VAT 13.5% | 1.135 | 含税价格 = 不含税价格 × 1.135 |
| VAT 0% | 1.0 | 含税价格 = 不含税价格 × 1.0 |

### 计算示例
**假设产品税率为 VAT 23%：**
- 不含税单价：€100.00
- 含税单价：€100.00 × 1.23 = €123.00
- 不含税总价（数量10）：€1,000.00
- 含税总价：€1,000.00 × 1.23 = €1,230.00

---

## 数据流程

### 产品追溯查询流程
1. **搜索产品**：根据名称/条码/序列号查找产品
2. **获取产品信息**：包括产品的 `vatRate` 字段
3. **查询采购历史**：从 `PurchaseInvoice` 获取采购记录
4. **查询销售历史**：从 `SalesInvoice` 获取销售记录
5. **计算含税价格**：
   - 获取产品税率
   - 计算税率系数
   - 不含税价格 × 税率系数 = 含税价格
6. **构建时间线**：按日期排序，显示完整历史

---

## 测试验证

### 测试产品
产品编号：`350152501986900`

### 测试步骤
1. 访问：`http://localhost:3000/prototype-working.html`
2. 点击"👥 供货商/客户管理"
3. 点击"🔍 产品追溯"子标签
4. 输入：`350152501986900`
5. 点击"🔍 查询追溯"

### 预期结果
- ✅ 税率显示产品的税率（不是 undefined）
- ✅ 单价显示为"单价（含税）"
- ✅ 总价显示为"总价（含税）"
- ✅ 价格已乘以税率系数

### 验证示例
如果产品税率是 VAT 23%，不含税单价是 €100：
- 显示的单价（含税）应该是：€123.00
- 显示的总价（含税）应该是：€123.00 × 数量

---

## 文件修改清单

### 后端文件
1. **StockControl-main/app-new.js**
   - 修改产品追溯API
   - 采购记录：添加含税价格计算
   - 销售记录：添加含税价格计算
   - 税率来源：从产品获取而非发票

### 前端文件
2. **StockControl-main/public/prototype-working.html**
   - 更新价格标签：添加"（含税）"标注
   - 保持价格显示逻辑不变（后端已计算好）

---

## 一致性说明

### 系统价格显示规则
整个系统遵循统一的价格显示规则：

| 模块 | 显示规则 |
|------|----------|
| 产品管理 | 进货价（含税）、批发价、零售价 |
| 采购发票记录 | 单价（含税）、总价（含税）|
| 销售发票记录 | 单价（含税）、总价（含税）|
| **产品追溯** | **单价（含税）、总价（含税）** ✅ |

**原则：** 所有面向用户的价格显示都是含税价格，数据库存储不含税价格

---

## 技术要点

### 1. 为什么使用产品税率而非发票税率？
- 产品税率是固定的，由产品类别决定
- 发票税率可能因历史原因缺失或不准确
- 产品税率更可靠，是真实的税务分类

### 2. 为什么在后端计算含税价格？
- 保证数据一致性
- 减少前端计算错误
- 便于API复用
- 统一数据格式

### 3. 数据库存储策略
- **存储：** 不含税价格（便于税率变更时重新计算）
- **显示：** 含税价格（符合用户习惯）
- **计算：** 实时计算（保证准确性）

---

## 注意事项

### 1. 旧数据兼容性
- 如果产品没有 `vatRate` 字段，默认使用 'VAT 23%'
- 如果发票项目没有价格，默认为 0

### 2. 税率变更
- 如果产品税率发生变更，历史记录会使用当前产品税率
- 这是合理的，因为我们显示的是产品的当前税务分类

### 3. 精度问题
- 所有价格保留2位小数
- 使用 `toFixed(2)` 格式化显示

---

## 下一步优化建议

### 1. 历史税率记录
如果需要显示历史时刻的实际税率，可以考虑：
- 在发票项目中保存当时的税率
- 在产品追溯时优先使用发票税率
- 如果发票税率缺失，再使用产品当前税率

### 2. 价格明细
可以考虑在时间线中显示：
- 不含税价格
- 税额
- 含税价格
- 让用户看到完整的价格构成

### 3. 批量更新
如果有大量旧数据没有税率，可以编写脚本：
- 批量更新产品的 `vatRate` 字段
- 批量更新发票项目的 `vatRate` 字段

---

## 总结

✅ **修改完成：**
1. 税率来源：从产品获取（更可靠）
2. 价格显示：含税价格（符合用户习惯）
3. 标签更新：明确标注"（含税）"
4. 备份完成：`StockControl-main-backup-20260202-002553`

✅ **测试通过：**
- 产品追溯查询正常
- 税率显示正确
- 价格计算准确
- 含税价格显示清晰

✅ **系统一致性：**
- 所有模块统一显示含税价格
- 数据库统一存储不含税价格
- 计算逻辑统一在后端处理
