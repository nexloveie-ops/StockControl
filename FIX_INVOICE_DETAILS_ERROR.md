# 修复发票详情 404 错误

## 📅 日期
2026-02-02

## 问题描述

### 用户反馈
> prototype-working.html Financial Reports Invoice Details 点击 采购清单Invoice Number Failed to load invoice details: HTTP 404

### 问题现象
- 在 Financial Reports 页面点击采购发票的 Invoice Number
- 弹出错误提示：`Failed to load invoice details: HTTP 404`
- 销售发票也有同样的问题

---

## 🔍 根本原因

### API 端点缺失

**前端调用**（原有代码）：
```javascript
// 采购发票
const response = await fetch(`${API_BASE}/purchase-invoices/${invoiceId}`);

// 销售发票
const response = await fetch(`${API_BASE}/sales-invoices/${invoiceId}`);
```

**后端实际端点**：
```javascript
// 采购发票 - 只有 admin 路径
app.get('/api/admin/purchase-orders/:invoiceId', async (req, res) => { ... });

// 销售发票 - 只有 admin 路径
app.get('/api/admin/sales-invoices/:invoiceId', async (req, res) => { ... });
```

### 问题分析
1. 前端调用的路径不包含 `/admin` 前缀
2. 后端没有提供不带 `/admin` 的别名路径
3. 导致 404 错误

---

## 🔧 修复方案

### 添加别名 API 端点

为了保持向后兼容，在后端添加不带 `/admin` 的别名路径。

**文件**：`app.js`

#### 1. 添加采购发票别名 API
**位置**：第 1232 行之后

```javascript
// 别名路径（兼容旧代码）- 采购发票详情
app.get('/api/purchase-invoices/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const invoice = await PurchaseInvoice.findById(invoiceId)
      .populate('supplier', 'name contact.email contact.phone contact.address')
      .populate('items.product', 'name barcode serialNumbers');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: '发票不存在'
      });
    }
    
    // ... 格式化发票数据 ...
    
    res.json({
      success: true,
      data: formattedInvoice
    });
  } catch (error) {
    console.error('获取采购发票详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

#### 2. 添加销售发票别名 API
**位置**：第 3260 行之后

```javascript
// 别名路径（兼容旧代码）
app.get('/api/sales-invoices/:invoiceId', checkDbConnection, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const SalesInvoice = require('./models/SalesInvoice');
    const CompanyInfo = require('./models/CompanyInfo');
    
    const invoice = await SalesInvoice.findById(invoiceId)
      .populate('customer', 'name code contact taxNumber')
      .populate('items.product', 'name sku barcode vatRate');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: '发票不存在'
      });
    }
    
    // ... 格式化发票数据 ...
    
    res.json({
      success: true,
      data: formattedInvoice
    });
  } catch (error) {
    console.error('获取销售发票详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### 前端保持原有路径

**文件**：`public/prototype-working.html`

前端代码保持不变，继续使用原有的 API 路径：
- `/api/purchase-invoices/:id`
- `/api/sales-invoices/:id`

---

## ✅ 验证测试

### 测试步骤

1. **访问 Financial Reports**
   - 登录系统
   - 点击 "Financial Reports" 标签

2. **测试采购发票详情**
   - 在 "Purchase Invoices" 表格中
   - 点击任意发票的 Invoice Number
   - 应该弹出发票详情模态框
   - 显示供应商信息、发票信息、产品列表、总金额

3. **测试销售发票详情**
   - 在 "Sales Invoices" 表格中
   - 点击任意发票的 Invoice Number
   - 应该弹出发票详情模态框
   - 显示客户信息、发票信息、产品列表、总金额、付款按钮

### 预期结果
- ✅ 采购发票详情正常显示
- ✅ 销售发票详情正常显示
- ✅ 不再出现 404 错误
- ✅ 所有数据正确加载

---

## 📊 API 端点总结

### 采购发票详情
```
GET /api/admin/purchase-orders/:invoiceId  (管理员路径)
GET /api/purchase-invoices/:invoiceId      (别名路径，兼容旧代码)
```

### 销售发票详情
```
GET /api/admin/sales-invoices/:invoiceId   (管理员路径)
GET /api/sales-invoices/:invoiceId         (别名路径，兼容旧代码)
```

两个路径返回相同的数据格式。

---

## 🎨 发票详情模态框功能

### 采购发票详情
- **供应商信息**：名称、联系人、电话、邮箱
- **发票信息**：发票号、日期、状态
- **产品列表**：描述、数量、单价、总价、税率
- **金额汇总**：小计（不含税）、税额、总金额（含税）
- **操作按钮**：关闭

### 销售发票详情
- **客户信息**：名称、联系人、电话、邮箱、地址
- **发票信息**：发票号、日期、状态、付款状态
- **产品列表**：描述、数量、单价、总价、税率
- **金额汇总**：小计（不含税）、税额、总金额（含税）
- **操作按钮**：
  - 确认付款（如果未付清）
  - 下载 PDF
  - 关闭

---

## 💡 技术要点

### 向后兼容策略
通过添加别名路径，保持与旧代码的兼容性：
- 新代码可以使用 `/api/admin/...` 路径
- 旧代码继续使用原有路径
- 两个路径指向相同的处理逻辑

### API 路径规范
```javascript
// 管理员 API（推荐）
/api/admin/purchase-orders/:id
/api/admin/sales-invoices/:id

// 别名 API（兼容旧代码）
/api/purchase-invoices/:id
/api/sales-invoices/:id
```

---

## 📁 相关文件

### 前端
- `public/prototype-working.html` - 管理界面
  - `showPurchaseInvoiceDetails()` - 采购发票详情函数（第 2786 行）
  - `showSalesInvoiceDetails()` - 销售发票详情函数（第 5207 行）

### 后端
- `app.js`
  - `/api/admin/purchase-orders/:invoiceId` - 采购发票详情 API（第 1132 行）
  - `/api/purchase-invoices/:invoiceId` - 采购发票别名 API（第 1232 行）
  - `/api/admin/sales-invoices/:invoiceId` - 销售发票详情 API（第 3204 行）
  - `/api/sales-invoices/:invoiceId` - 销售发票别名 API（第 3360 行）

### 模型
- `models/PurchaseInvoice.js` - 采购发票模型
- `models/SalesInvoice.js` - 销售发票模型

---

## 🎉 总结

### 修复内容
- ✅ 添加采购发票别名 API 路径
- ✅ 添加销售发票别名 API 路径
- ✅ 保持前端代码不变
- ✅ 向后兼容旧代码

### 影响范围
- Financial Reports 页面
- 采购发票详情查看
- 销售发票详情查看

### 测试状态
- ✅ 可以正常查看采购发票详情
- ✅ 可以正常查看销售发票详情
- ✅ 404 错误已解决
- ✅ 服务器已重启（进程 ID: 38）

---

## 📞 快速测试

1. 访问：http://localhost:3000
2. 登录管理员账号
3. 点击 "Financial Reports"
4. 点击任意采购发票的 Invoice Number
5. 验证发票详情正常显示
6. 点击任意销售发票的 Invoice Number
7. 验证发票详情正常显示

---

**发票详情 404 错误已修复！** ✅

**修复时间**：2026-02-02  
**状态**：已完成  
**服务器进程**：38
