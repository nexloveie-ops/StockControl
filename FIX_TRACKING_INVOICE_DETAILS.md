# 产品追溯 - 发票详情功能修复

## 问题描述
1. 采购发票SI-3688的产品名称显示为"未知产品"
2. 发票详情模态框缺少PDF导出功能

## 根本原因
1. 前端代码只查找`item.productName`和`item.product?.name`，但采购发票数据中使用的是`item.description`字段
2. 发票详情模态框没有实现PDF导出功能

## 解决方案

### 1. 后端API添加（已完成）
在`app.js`第3903行添加了两个新的API端点：

```javascript
// 获取单个采购发票详情
app.get('/api/admin/purchase-invoices/:invoiceId', checkDbConnection, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const invoice = await PurchaseInvoice.findById(invoiceId)
      .populate('supplier', 'name code contact')
      .lean();
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        error: '采购发票不存在' 
      });
    }
    
    res.json({ 
      success: true, 
      data: invoice 
    });
  } catch (error) {
    console.error('获取采购发票详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取单个销售发票详情
app.get('/api/admin/sales-invoices/:invoiceId', checkDbConnection, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const invoice = await SalesInvoice.findById(invoiceId)
      .populate('customer', 'name code contact')
      .lean();
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        error: '销售发票不存在' 
      });
    }
    
    res.json({ 
      success: true, 
      data: invoice 
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

### 2. 前端修复产品名称显示
在`prototype-working.html`第7223行，修改产品名称显示逻辑：

**修改前：**
```javascript
<td style="padding: 12px;">${item.productName || item.product?.name || '未知产品'}</td>
```

**修改后：**
```javascript
<td style="padding: 12px;">${item.productName || item.description || item.product?.name || '未知产品'}</td>
```

现在支持三种字段：
- `item.productName` - 销售发票使用
- `item.description` - 采购发票使用
- `item.product?.name` - 关联产品对象

### 3. 添加PDF导出功能
在`prototype-working.html`第7145行，添加PDF导出按钮：

```html
<div style="display: flex; gap: 10px;">
  <button onclick="exportInvoicePDF('${invoice._id}', '${type}')" style="background: #3b82f6; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 14px;">
    📄 导出PDF
  </button>
  <button onclick="closeInvoiceDetailsModal()" style="background: #e5e7eb; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 14px;">
    ✕ 关闭
  </button>
</div>
```

在第7263行添加`exportInvoicePDF()`函数：

```javascript
// 导出发票PDF
async function exportInvoicePDF(invoiceId, type) {
  try {
    debugLog(`导出PDF: ${invoiceId}, 类型: ${type}`);
    
    let endpoint = '';
    if (type === 'purchase') {
      endpoint = `/api/admin/purchase-invoices/${invoiceId}`;
    } else if (type === 'sales') {
      endpoint = `/api/admin/sales-invoices/${invoiceId}`;
    } else if (type === 'transfer') {
      endpoint = `/api/merchant/transfers/${invoiceId}`;
    }
    
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.error || '获取发票数据失败');
    }
    
    const invoice = result.data;
    
    // 使用jsPDF生成PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // ... PDF生成逻辑 ...
    
    // 保存PDF
    const fileName = `${invoice.invoiceNumber || invoice.transferNumber || invoice.orderNumber}_${new Date().getTime()}.pdf`;
    doc.save(fileName);
    
    debugLog(`✅ PDF导出成功: ${fileName}`);
  } catch (error) {
    debugLog(`❌ 导出PDF失败: ${error.message}`);
    alert(`导出PDF失败: ${error.message}`);
  }
}
```

## 测试数据
SI-3688采购发票包含22个产品：
- 3个 IPHONE15PLUS (€445 each)
- 5个 IPHONE14 (€305 each)
- 5个 IPHONE13 (€270 each)
- 5个 IPHONE11 (€185 each)
- 1个 IPHONE16PROMAX (€810)
- 3个 APPLEIPAD11 (€310 each)

总金额：€6,875

## 测试步骤
1. 打开 http://localhost:3000/prototype-working.html
2. 进入"供货商/客户管理"
3. 点击"产品追溯"
4. 搜索序列号：352928114188457
5. 在历史记录时间线中点击发票编号"SI-3688"
6. 验证：
   - ✅ 产品名称正确显示（如"IPHONE11"）
   - ✅ 右上角有"📄 导出PDF"按钮
   - ✅ 点击导出按钮可以下载PDF文件

## 文件修改
- `StockControl-main/app.js` (第3903行，添加两个新API)
- `StockControl-main/public/prototype-working.html` (第7145行、第7223行、第7263行)

## 服务器重启
- 进程27已重启，新API已生效

## 版本
- v2.4.1 - 发票详情功能完善

## 注意事项
- 浏览器需要强制刷新（Ctrl + Shift + R）才能看到前端修改
- PDF导出使用jsPDF库，已在页面中引入
- 支持采购发票、销售发票、调货单三种类型的PDF导出
