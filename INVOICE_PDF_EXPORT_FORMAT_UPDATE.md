# 发票PDF导出格式更新

## 更新时间
2026-02-11

## 问题描述
用户反馈产品追溯功能中的PDF导出格式不正确，需要导出为标准的invoice格式（销售出库格式）。

## 解决方案

### 修改文件
- `StockControl-main/public/prototype-working.html` - `exportInvoicePDF()` 函数

### 更新内容

#### 1. 标准发票格式
将PDF导出从简单的表格格式改为专业的发票格式，包括：

- **页眉部分**
  - 双语标题（英文 + 中文）
  - PURCHASE INVOICE / 采购发票
  - SALES INVOICE / 销售发票
  - TRANSFER ORDER / 调货单

- **发票信息**
  - Invoice Number（发票编号）
  - Date（日期）
  - Status（状态）

- **供应商/客户信息**
  - 采购发票：显示供应商信息（名称、电话、邮箱、地址）
  - 销售发票：显示客户信息（名称、电话）
  - 调货单：显示调出方和调入方

- **产品清单表格**
  - 灰色表头背景
  - 列：Product（产品）、Qty（数量）、Unit Price（单价）、Total（总价）、Serial No.（序列号）
  - 支持多个序列号显示
  - 产品之间有分隔线

- **总计部分**
  - 粗体显示 TOTAL 和金额
  - 上方有分隔线

- **备注部分**
  - 如果有备注，显示在总计下方

- **页脚**
  - 页码（Page X of Y）
  - 生成时间

#### 2. 格式特点

- **专业外观**：使用标准发票布局，清晰的分区和分隔线
- **双语支持**：关键字段使用英文，便于国际业务
- **自动分页**：内容超过一页时自动分页
- **文件命名**：`销售发票_SI-XXX_时间戳.pdf`

#### 3. 支持的发票类型

1. **采购发票（Purchase Invoice）**
   - API: `/api/admin/purchase-invoices/:invoiceId`
   - 显示供应商完整信息

2. **销售发票（Sales Invoice）**
   - API: `/api/admin/sales-invoices/:invoiceId`
   - 显示客户信息

3. **调货单（Transfer Order）**
   - API: `/api/merchant/transfers/:invoiceId`
   - 显示调出方和调入方

## 使用方法

1. 在产品追溯页面，点击历史记录时间线中的发票编号
2. 在弹出的发票详情对话框中，点击"📄 导出PDF"按钮
3. PDF将自动下载，文件名格式：`发票类型_发票编号_时间戳.pdf`

## 技术细节

### PDF生成库
使用 jsPDF 库生成PDF文档

### 字体和样式
- 标题：24pt 粗体
- 副标题：14pt 普通
- 正文：10-11pt
- 表格内容：8-9pt
- 页脚：8pt 灰色

### 布局参数
- 页面大小：A4 (210mm × 297mm)
- 边距：20mm
- 表格宽度：170mm
- 自动分页阈值：260mm

## 测试建议

1. 测试采购发票PDF导出
2. 测试销售发票PDF导出
3. 测试调货单PDF导出
4. 测试多页内容的分页效果
5. 测试多个序列号的显示
6. 测试备注内容的显示

## 注意事项

- 不需要重启服务器，只需强制刷新浏览器（Ctrl + Shift + R）
- PDF导出功能依赖 jsPDF 库，确保页面已加载该库
- 序列号过多时只显示前3个，避免页面过长
- 产品名称过长时会自动截断

## 相关文件

- `StockControl-main/public/prototype-working.html` - 前端实现
- `StockControl-main/app.js` - 后端API（第3905行和第3925行）
- `StockControl-main/FIX_TRACKING_INVOICE_DETAILS.md` - 发票详情功能文档
