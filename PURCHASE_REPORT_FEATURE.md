# 采购报表功能完成

## 完成时间
2026-02-12

## 功能概述
在商户系统的报表中心添加了采购报表功能，显示所有采购订单的汇总信息，支持点击订单号查看详情和下载PDF。

## 修改内容

### 1. 后端API修改 (app.js)

#### 1.1 采购报表API优化
- **位置**: 第7670-7900行
- **修改**: 将返回数据从产品明细改为订单汇总
- **返回数据结构**:
  ```javascript
  {
    orders: [
      {
        orderNumber: '订单号',
        date: '日期',
        totalAmount: 总金额,
        taxAmount: 税额,
        supplier: '供货商',
        type: 'transfer|warehouse|invoice',
        itemCount: 产品数量,
        _id: 订单ID
      }
    ],
    summary: {
      totalOrders: 订单总数,
      totalAmount: 总金额,
      totalTax: 总税额
    }
  }
  ```

#### 1.2 新增订单详情API
- **调货订单详情**: `GET /api/transfers/:transferNumber`
  - 通过调货单号查询调货订单详情
  - 返回完整的调货订单信息

- **仓库订单详情**: `GET /api/warehouse-orders/number/:orderNumber`
  - 通过仓库订单号查询订单详情
  - 返回完整的仓库订单信息

#### 1.3 新增PDF生成API
- **调货订单PDF**: `GET /api/transfers/:transferNumber/pdf`
  - 生成调货订单的PDF文档
  - 包含产品清单、价格、税额等信息
  - 纯英文格式

- **仓库订单PDF**: `GET /api/warehouse-orders/number/:orderNumber/pdf`
  - 通过订单号生成仓库订单PDF
  - 重定向到现有的PDF API

- **采购发票PDF**: `GET /api/admin/purchase-orders/:invoiceId/pdf`
  - 生成采购发票的PDF文档
  - 支持"admin-{invoiceNumber}"格式
  - 从AdminInventory查询产品数据
  - 纯英文格式

### 2. 前端修改 (merchant.html)

#### 2.1 采购报表表格简化
- **位置**: 第7620-7750行
- **修改内容**:
  - 简化表格显示，只显示：订单号、日期、总金额、税额、供货商、来源
  - 移除产品明细显示
  - 订单号改为可点击链接
  - 显示每个订单的产品数量

#### 2.2 新增订单详情功能
- **函数**: `showPurchaseOrderDetails(orderNumber, orderType)`
- **功能**:
  - 根据订单类型调用不同的API获取详情
  - 在模态框中显示完整的产品清单
  - 显示订单基本信息、产品列表、总金额、税额
  - 提供PDF下载按钮

#### 2.3 新增PDF下载功能
- **函数**: `downloadPurchaseOrderPDF(orderNumber, orderType)`
- **功能**:
  - 根据订单类型调用对应的PDF生成API
  - 在新窗口打开PDF文档

## 数据来源

采购报表整合了三个数据源：

1. **调货记录** (InventoryTransfer)
   - 作为接收方的已完成调货
   - 订单类型: `transfer`
   - 供货商: 调货发起方

2. **仓库订单** (WarehouseOrder)
   - 状态为已完成或已收货的订单
   - 订单类型: `warehouse`
   - 供货商: "仓库"

3. **发票入库** (AdminInventory)
   - 按发票号分组的库存记录
   - 订单类型: `invoice`
   - 供货商: 发票上的供货商名称

## 显示内容

### 报表汇总
- 采购订单数
- 采购总金额
- 总税额
- 平均订单金额

### 订单列表
- 采购日期
- 订单号（可点击）
- 总金额
- 税额
- 供货商
- 来源标签（调货/仓库/发票）

### 订单详情（点击订单号）
- 订单基本信息（订单号、日期、供货商、类型）
- 产品清单（名称、型号、颜色、序列号、数量、单价、总价、税分类）
- 总金额和税额
- PDF下载按钮

## PDF格式

所有PDF文档采用统一的英文格式：
- 标题: TRANSFER ORDER / PURCHASE INVOICE
- 订单号
- 日期、供货商等基本信息
- 产品表格（Product, Qty, Price, Total）
- 小计、税额、总计

## 测试步骤

1. 登录商户系统
2. 进入"报表中心" → "采购报表"
3. 查看采购订单列表
4. 点击任意订单号查看详情
5. 在详情页面点击"下载PDF"
6. 验证PDF内容正确

## 服务器状态
- 服务器已重启（进程38）
- 所有API已生效
- 前端无需重启，强制刷新浏览器即可（Ctrl + Shift + R）

## 注意事项

1. HTML文件修改后需要强制刷新浏览器（Ctrl + Shift + R）
2. 服务器修改（app.js）需要重启服务器
3. PDF只包含英文内容
4. 税额计算基于产品的税分类（VAT 23%、VAT 13.5%、VAT 0%）
5. 订单详情API会根据订单类型自动选择正确的数据源

## 相关文件
- `StockControl-main/app.js` (第7670-8200行)
- `StockControl-main/public/merchant.html` (第7620-7950行)
