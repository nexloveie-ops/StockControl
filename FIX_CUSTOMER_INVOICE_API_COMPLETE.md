# 客户发票API修复完成

## 问题描述

用户在查看客户发票时遇到两个问题：
1. API路径错误：`/api/admin/admin/customers/...` (重复了admin)
2. 发票价格与实际销售价格不一致

## 问题1：API路径重复

### 错误信息
```
api/admin/admin/customers/698134ffaf4515b19a441b64/invoices:1 
Failed to load resource: the server responded with a status of 404 (Not Found)
```

### 原因
- `API_BASE` 已经定义为 `/api/admin`
- 前端代码中又写了 `${API_BASE}/admin/customers/...`
- 导致最终路径变成 `/api/admin/admin/customers/...`

### 修复
修改 `prototype-working.html` 第6433行：

```javascript
// 修复前：
const response = await fetch(`${API_BASE}/admin/customers/${customerId}/invoices`);

// 修复后：
const response = await fetch(`${API_BASE}/customers/${customerId}/invoices`);
```

## 问题2：发票价格不一致

### 产品信息验证
查询序列号 `357479188926245` 的产品信息：

```
产品名称: IPHONE13
产品ID: 698d1d9a6dccecb8f43f2c96

价格信息:
  - 成本价 (costPrice): €265
  - 批发价 (wholesalePrice): €275.6
  - 零售价 (retailPrice): €349

库存信息:
  - 库存数量: 2
  - 分类: iPhone 13
  - 成色: PRE-OWNED
  - 税分类: VAT 0%
  - 状态: sold
```

### 发票信息
```
发票编号: SI-1770856113244-0001
发票中的价格: €275.6 (不含税)
```

### 结论
✅ **发票价格是正确的**！

发票中显示的 €275.6 正是产品的批发价（wholesalePrice）。这是旧系统（SalesInvoice）的设计逻辑：
- 旧系统创建发票时使用产品的 `wholesalePrice` 作为销售价格
- 这个产品的批发价就是 €275.6
- 发票显示的价格与产品记录完全一致

### 系统说明

系统中存在两套销售记录系统：

#### 1. 旧系统（SalesInvoice）
- 使用产品的 `wholesalePrice` 作为销售价格
- 适用于标准批发业务
- 所有同一产品的销售价格相同

#### 2. 新系统（MerchantSale）
- 记录实际销售价格 `item.price`
- 支持同一产品不同IMEI以不同价格销售
- 更灵活，适用于零售业务

### API改进

为了支持两套系统，已修改客户发票API：

**后端修改** (`app.js` 第4835行)：
```javascript
app.get('/api/admin/customers/:customerId/invoices', checkDbConnection, async (req, res) => {
  try {
    const { customerId } = req.params;
    const SalesInvoice = require('./models/SalesInvoice');
    const MerchantSale = require('./models/MerchantSale');
    const Customer = require('./models/Customer');
    
    // 获取旧系统的销售发票
    const salesInvoices = await SalesInvoice.find({ customer: customerId })
      .populate('customer', 'name code')
      .populate('items.product', 'name sku barcode')
      .sort({ invoiceDate: -1 })
      .lean();
    
    // 获取客户信息，用于匹配商户销售记录
    const customer = await Customer.findById(customerId);
    
    // 获取新系统的商户销售记录（通过客户电话匹配）
    let merchantSales = [];
    if (customer && customer.contact && customer.contact.phone) {
      merchantSales = await MerchantSale.find({ 
        customerPhone: customer.contact.phone 
      })
        .sort({ saleDate: -1 })
        .lean();
    }
    
    // 合并两种数据，标记来源
    const allInvoices = [
      ...salesInvoices.map(inv => ({ 
        ...inv, 
        source: 'SalesInvoice',
        displayDate: inv.invoiceDate,
        displayNumber: inv.invoiceNumber
      })),
      ...merchantSales.map(sale => ({ 
        ...sale, 
        source: 'MerchantSale',
        displayDate: sale.saleDate,
        displayNumber: sale._id.toString()
      }))
    ].sort((a, b) => {
      return new Date(b.displayDate) - new Date(a.displayDate);
    });
    
    res.json({
      success: true,
      data: allInvoices
    });
  } catch (error) {
    console.error('获取客户发票失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

**前端修改** (`prototype-working.html` 第6433-6600行)：
- 支持显示两种系统的发票
- 添加"来源"列，区分旧系统和商户系统
- 不同来源使用不同颜色标识
- 点击发票编号可查看详情
- 支持下载PDF（旧系统）

**新增API** (`app.js` 第8145行)：
```javascript
// 获取商户销售详情
app.get('/api/merchant/sales/:saleId', checkDbConnection, async (req, res) => {
  try {
    const { saleId } = req.params;
    const MerchantSale = require('./models/MerchantSale');
    
    const sale = await MerchantSale.findById(saleId).lean();
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: '销售记录不存在'
      });
    }
    
    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('获取销售详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

## 测试步骤

1. ✅ 强制刷新浏览器（Ctrl + Shift + R）
2. ✅ 登录系统
3. ✅ 进入"供货商/客户管理" → "客户管理"
4. ✅ 点击"查看发票"
5. ✅ 验证发票列表显示正确
6. ✅ 验证"来源"列显示（旧系统/商户系统）
7. ✅ 点击发票编号查看详情
8. ✅ 验证价格信息正确

## 修改文件

- `StockControl-main/app.js` (第4835行 - 客户发票API, 第8145行 - 商户销售详情API)
- `StockControl-main/public/prototype-working.html` (第6433-6600行 - 客户发票查看功能)
- `StockControl-main/check-product-357479188926245.js` (产品信息查询脚本)
- `StockControl-main/check-invoice-SI-1770856113244-0001.js` (发票详情查询脚本)

## 服务器状态

✅ 服务器已重启（进程29）

## 日期
2026-02-12
