# 采购发票详情查看功能

## 修改日期
2026-02-02 00:30

## 备份信息
- 备份文件夹：`StockControl-main-backup-20260202-003030`
- 备份内容：完整项目文件

## 功能概述

在供货商管理的采购发票记录中，添加了点击发票编号查看详情的功能。

## 新增功能

### 1. 发票编号可点击
- 发票编号显示为蓝色链接
- 点击发票编号可查看完整发票详情
- 新增"📄 查看详情"按钮

### 2. 发票详情模态框
显示完整的发票信息，包括：
- 发票基本信息（供货商、日期、状态等）
- 产品明细表格
- 税额分解（按税率分组）
- 金额汇总
- 备注信息

## 重要逻辑说明

### Invoice 税额计算逻辑

**关键理解：**
- Invoice 本身**没有单一税率**
- Invoice 的总税额 = 所有产品项目的税额之和
- 一张 Invoice 可能包含不同税率的产品

**示例：**
```
Invoice #INV-001
├─ 产品A (VAT 23%)
│  ├─ 不含税价格: €100
│  ├─ 税额: €23
│  └─ 含税价格: €123
│
├─ 产品B (VAT 13.5%)
│  ├─ 不含税价格: €200
│  ├─ 税额: €27
│  └─ 含税价格: €227
│
└─ 产品C (VAT 0%)
   ├─ 不含税价格: €50
   ├─ 税额: €0
   └─ 含税价格: €50

Invoice 汇总：
├─ 小计（不含税）: €350 (100+200+50)
├─ 税额合计: €50 (23+27+0)
└─ 总金额（含税）: €400 (123+227+50)
```

### 税额分解显示

发票详情中的"税额分解"部分会按税率分组显示：

```
💰 税额分解

VAT 23%
小计: €100.00 + 税额: €23.00
€123.00

VAT 13.5%
小计: €200.00 + 税额: €27.00
€227.00

VAT 0%
小计: €50.00 + 税额: €0.00
€50.00
```

这样用户可以清楚地看到每个税率的金额构成。

## 代码实现

### 前端修改 (prototype-working.html)

#### 1. 修改发票列表显示

**修改前：**
```html
<td><strong>${invoice.invoiceNumber}</strong></td>
```

**修改后：**
```html
<td>
  <a href="javascript:void(0)" 
     onclick="viewInvoiceDetails('${invoice._id}')" 
     style="color: #3b82f6; text-decoration: none; font-weight: bold;">
    ${invoice.invoiceNumber}
  </a>
</td>
```

并添加操作列：
```html
<th>操作</th>
...
<td>
  <button onclick="viewInvoiceDetails('${invoice._id}')" class="btn btn-sm btn-info">
    📄 查看详情
  </button>
</td>
```

#### 2. 新增函数

##### viewInvoiceDetails(invoiceId)
```javascript
async function viewInvoiceDetails(invoiceId) {
  // 调用 API 获取发票详情
  const response = await fetch(`${API_BASE}/purchase-orders/${invoiceId}`);
  const result = await response.json();
  
  if (result.success && result.data) {
    showInvoiceDetailsModal(result.data);
  }
}
```

##### showInvoiceDetailsModal(invoice)
```javascript
function showInvoiceDetailsModal(invoice) {
  // 计算各税率的小计
  const taxBreakdown = {};
  invoice.items.forEach(item => {
    const vatRate = item.vatRate || 'VAT 23%';
    if (!taxBreakdown[vatRate]) {
      taxBreakdown[vatRate] = {
        subtotal: 0,
        taxAmount: 0,
        total: 0
      };
    }
    taxBreakdown[vatRate].subtotal += item.totalCostExcludingTax || 0;
    taxBreakdown[vatRate].taxAmount += item.taxAmount || 0;
    taxBreakdown[vatRate].total += item.totalCost || 0;
  });
  
  // 显示详情模态框
  showUniversalModal(title, content);
}
```

### 后端 API (已存在)

**端点：** `GET /api/admin/purchase-orders/:invoiceId`

**返回数据结构：**
```javascript
{
  success: true,
  data: {
    _id: "...",
    invoiceNumber: "INV-001",
    supplier: {
      name: "供货商名称",
      email: "...",
      phone: "...",
      address: "..."
    },
    invoiceDate: "2026-02-01",
    dueDate: "2026-03-01",
    status: "confirmed",
    paymentStatus: "pending",
    subtotal: 350.00,      // 不含税小计
    taxAmount: 50.00,      // 税额合计
    totalAmount: 400.00,   // 含税总额
    paidAmount: 0.00,
    items: [
      {
        productName: "产品A",
        quantity: 1,
        unitCost: 123.00,              // 含税单价
        totalCost: 123.00,             // 含税总价
        unitCostExcludingTax: 100.00,  // 不含税单价
        totalCostExcludingTax: 100.00, // 不含税总价
        vatRate: "VAT 23%",
        taxAmount: 23.00,
        serialNumbers: [...]
      },
      // ... 更多产品
    ]
  }
}
```

## 发票详情模态框布局

### 1. 发票基本信息
```
┌─────────────────────────────────────────┐
│ 供货商: ABC公司                          │
│ 发票日期: 2026-02-01                     │
│ 到期日期: 2026-03-01                     │
│ 状态: 已确认                             │
│ 付款状态: 待付款                         │
└─────────────────────────────────────────┘
```

### 2. 产品明细
```
┌──────────────────────────────────────────────────────┐
│ 产品名称 │ 数量 │ 单价(含税) │ 总价(含税) │ 税率 │ 税额 │
├──────────────────────────────────────────────────────┤
│ 产品A    │  1   │ €123.00   │ €123.00   │ 23%  │ €23 │
│ 产品B    │  1   │ €227.00   │ €227.00   │13.5% │ €27 │
│ 产品C    │  1   │ €50.00    │ €50.00    │  0%  │ €0  │
└──────────────────────────────────────────────────────┘
```

### 3. 税额分解
```
┌─────────────────────────────────────┐
│ VAT 23%                             │
│ 小计: €100.00 + 税额: €23.00        │
│ €123.00                             │
├─────────────────────────────────────┤
│ VAT 13.5%                           │
│ 小计: €200.00 + 税额: €27.00        │
│ €227.00                             │
├─────────────────────────────────────┤
│ VAT 0%                              │
│ 小计: €50.00 + 税额: €0.00          │
│ €50.00                              │
└─────────────────────────────────────┘
```

### 4. 金额汇总
```
┌─────────────────────────────────────┐
│ 小计（不含税）:        €350.00      │
│ 税额合计:              €50.00       │
│ ─────────────────────────────────   │
│ 总金额（含税）:        €400.00      │
│                                     │
│ 已付金额:              €0.00        │
│ 待付金额:              €400.00      │
└─────────────────────────────────────┘
```

## 使用流程

### 查看发票详情
1. 进入"供货商/客户管理"
2. 点击"📦 供货商管理"
3. 点击任意供货商的"📋 查看发票"
4. 在发票列表中：
   - **方式1：** 点击蓝色的发票编号链接
   - **方式2：** 点击"📄 查看详情"按钮
5. 弹出发票详情模态框

### 发票详情内容
- ✅ 供货商信息
- ✅ 发票日期和状态
- ✅ 产品明细（含税价格）
- ✅ 按税率分组的税额分解
- ✅ 金额汇总（小计、税额、总额）
- ✅ 付款信息（已付、待付）
- ✅ 备注信息

## 特性说明

### 1. 多税率支持
- 一张发票可以包含不同税率的产品
- 税额分解清晰显示每个税率的金额
- 自动计算各税率的小计和税额

### 2. 价格显示
- 产品明细显示含税价格
- 同时保留不含税价格（用于税额分解）
- 金额汇总显示完整的价格构成

### 3. 序列号显示
- 如果产品有序列号，显示在表格中
- 长序列号自动截断，鼠标悬停显示完整内容
- 没有序列号显示"-"

### 4. 付款信息
- 显示已付金额和待付金额
- 如果未付款，不显示付款信息
- 清晰的视觉区分（绿色=已付，红色=待付）

## 测试建议

### 测试场景 1: 单一税率发票
1. 查看只包含一种税率产品的发票
2. 验证税额分解只显示一个税率
3. 验证金额计算正确

### 测试场景 2: 多税率发票
1. 查看包含多种税率产品的发票
2. 验证税额分解显示所有税率
3. 验证每个税率的小计和税额正确
4. 验证总金额 = 所有税率的总和

### 测试场景 3: 付款状态
1. 查看未付款的发票
2. 查看部分付款的发票
3. 查看已付款的发票
4. 验证付款信息显示正确

### 测试场景 4: 序列号
1. 查看有序列号的产品
2. 查看没有序列号的产品
3. 验证序列号显示正确

## 技术要点

### 1. 税额分解算法
```javascript
const taxBreakdown = {};
invoice.items.forEach(item => {
  const vatRate = item.vatRate || 'VAT 23%';
  if (!taxBreakdown[vatRate]) {
    taxBreakdown[vatRate] = {
      subtotal: 0,
      taxAmount: 0,
      total: 0
    };
  }
  taxBreakdown[vatRate].subtotal += item.totalCostExcludingTax || 0;
  taxBreakdown[vatRate].taxAmount += item.taxAmount || 0;
  taxBreakdown[vatRate].total += item.totalCost || 0;
});
```

### 2. 动态内容生成
使用模板字符串动态生成HTML内容，支持：
- 条件渲染（如付款信息）
- 循环渲染（产品列表、税额分解）
- 数据格式化（日期、金额）

### 3. 模态框复用
使用通用模态框 `showUniversalModal(title, content)`：
- 统一的样式和交互
- 易于维护
- 支持任意HTML内容

## 数据流程

```
用户点击发票编号
    ↓
viewInvoiceDetails(invoiceId)
    ↓
GET /api/admin/purchase-orders/:invoiceId
    ↓
后端查询数据库
    ↓
计算含税价格
    ↓
返回完整发票数据
    ↓
showInvoiceDetailsModal(invoice)
    ↓
计算税额分解
    ↓
生成HTML内容
    ↓
显示模态框
```

## 注意事项

### 1. 价格一致性
- 产品明细显示含税价格
- 税额分解使用不含税价格计算
- 金额汇总显示完整构成

### 2. 税率处理
- 支持 VAT 23%, VAT 13.5%, VAT 0%
- 如果产品没有税率，默认 VAT 23%
- 税额分解按实际税率分组

### 3. 数据完整性
- 处理缺失的供货商信息
- 处理缺失的产品信息
- 处理缺失的序列号

### 4. 用户体验
- 发票编号蓝色高亮，明显可点击
- 提供两种方式查看详情（链接+按钮）
- 模态框内容清晰，层次分明
- 金额显示醒目，易于阅读

## 下一步优化

### 1. 打印功能
- 添加"打印发票"按钮
- 生成适合打印的格式
- 包含公司信息和Logo

### 2. 导出功能
- 导出为PDF
- 导出为Excel
- 发送邮件

### 3. 编辑功能
- 修改发票信息
- 添加/删除产品
- 更新付款状态

### 4. 历史记录
- 显示发票修改历史
- 显示付款历史
- 显示状态变更历史

## 总结

✅ **功能完成：**
- 发票编号可点击查看详情
- 完整的发票详情模态框
- 税额分解按税率分组显示
- 清晰的金额汇总

✅ **逻辑正确：**
- Invoice 税额 = 所有产品税额之和
- 支持一张发票多种税率
- 价格显示一致（含税）

✅ **用户体验：**
- 两种方式查看详情
- 清晰的视觉层次
- 完整的信息展示

✅ **备份完成：**
- `StockControl-main-backup-20260202-003030`
