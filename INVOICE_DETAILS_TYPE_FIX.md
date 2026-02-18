# 发票详情类型参数修复

## 问题描述

在仓库管理员页面查看产品的进货历史时，点击发票号（如SI-0016）会报错："未知的发票类型"。

## 根本原因

`showProductInvoices`函数中，点击发票号时调用的是：

```javascript
onclick="showInvoiceDetails('${invoice._id}', '${invoice.invoiceNumber}')"
```

这个调用传递了两个参数：
1. `invoiceId`：发票ID
2. `invoiceNumber`：发票号码

但是`showInvoiceDetails`函数（在产品追溯功能中定义）需要三个参数：

```javascript
async function showInvoiceDetails(invoiceId, type) {
  // type参数用于判断发票类型：'purchase', 'sales', 'transfer'
  if (type === 'purchase') {
    endpoint = `/api/admin/purchase-invoices/${invoiceId}`;
  } else if (type === 'sales') {
    endpoint = `/api/admin/sales-invoices/${invoiceId}`;
  } else if (type === 'transfer') {
    endpoint = `/api/merchant/transfers/${invoiceId}`;
  } else {
    alert('未知的发票类型');
    return;
  }
}
```

由于第二个参数传递的是`invoiceNumber`（字符串，如"SI-0016"）而不是`type`（应该是'purchase'），函数无法识别发票类型，导致报错。

## 解决方案

修改`showProductInvoices`函数中的调用，将第二个参数从`invoiceNumber`改为`'purchase'`：

```javascript
onclick="showInvoiceDetails('${invoice._id}', 'purchase')"
```

因为`showProductInvoices`显示的都是采购发票（PurchaseInvoice），所以类型固定为'purchase'。

## 修改的文件

`StockControl-main/public/prototype-working.html` (line 2356)

### 修改前
```javascript
<span style="cursor: pointer; text-decoration: underline;" 
      onclick="showInvoiceDetails('${invoice._id}', '${invoice.invoiceNumber}')">
  ${invoice.invoiceNumber}
</span>
```

### 修改后
```javascript
<span style="cursor: pointer; text-decoration: underline;" 
      onclick="showInvoiceDetails('${invoice._id}', 'purchase')">
  ${invoice.invoiceNumber}
</span>
```

## 测试步骤

1. 打开仓库管理员页面：http://localhost:3000/prototype-working.html
2. 点击"Pre-Owned Devices"分类
3. 点击"iPhone 17"产品名称（蓝色下划线）
4. 在弹出的采购发票记录中，点击发票号"SI-0016"
5. 应该能正常显示发票详情，不再报错

## 预期结果

- 点击发票号后，能正确显示发票详情
- 发票详情包含：
  - 发票信息（发票号、日期、供应商等）
  - 产品列表
  - 价格明细
  - 下载PDF按钮

## 注意事项

1. **函数重载问题**：代码中可能存在两个`showInvoiceDetails`函数：
   - 一个在产品追溯功能中（需要type参数）
   - 一个在采购发票管理中（可能不需要type参数）
   
2. **统一接口**：建议统一所有调用`showInvoiceDetails`的地方，都传递type参数

3. **类型判断**：如果发票来源不同（采购/销售/调货），需要传递正确的type值

## 相关功能

- 产品追溯功能（Product Tracking）
- 采购发票管理（Purchase Invoice Management）
- 产品进货历史（Product Purchase History）

## 修复日期

2026-02-18
