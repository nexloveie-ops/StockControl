# 数据库清除记录 - 2026年2月11日

## 清除时间
2026-02-11 下午

## 清除原因
用户要求清除所有产品、销售和采购数据，准备重新录入测试数据。

## 清除的数据

### 业务数据（已清除）
- ✅ 商户库存（MerchantInventory）: 0 条（第一次清除27条）
- ✅ 管理员库存（AdminInventory）: 88 条（配件库存）
- ✅ 销售记录（MerchantSale）: 0 条（第一次清除11条）
- ✅ 调货记录（InventoryTransfer）: 0 条（第一次清除1条）
- ✅ 仓库订单（WarehouseOrder）: 0 条（第一次清除3条）
- ✅ 采购发票（PurchaseInvoice）: 0 条（第一次清除2条）
- ✅ 销售发票（SalesInvoice）: 0 条（第一次清除1条）
- ✅ 维修订单（RepairOrder）: 0 条（第一次清除3条）
- ✅ 旧系统产品（ProductNew）: 0 条（第一次清除8条）

**第一次清除**: 48 条业务记录
**第二次清除**: 88 条配件库存记录
**总计**: 136 条业务记录已清除

### 保留的数据
- ✅ 用户账户（admin, warehouse1, mobile123, murraydundrum, murrayranelagh等）
- ✅ 供应商信息（SupplierNew）
- ✅ 客户信息（CustomerNew）
- ✅ 产品分类（Category）
- ✅ 产品成色（Condition）
- ✅ 系统设置（SystemSettings）
- ✅ 用户组（StoreGroup）

## 使用的脚本
`StockControl-main/clear-all-business-data-20260211.js`

## 下一步操作

### 1. 重新录入测试数据
可以通过以下方式录入：

#### 方式A：使用发票识别功能（推荐）
1. 登录仓库账户（warehouse1）
2. 进入"仓库订单"页面
3. 点击"上传发票"
4. 上传采购发票图片
5. 系统自动识别产品信息
6. 确认收货

#### 方式B：手动录入
1. 登录仓库账户（warehouse1）
2. 进入"仓库订单"页面
3. 点击"创建订单"
4. 手动输入产品信息
5. 提交订单
6. 确认收货

### 2. 测试销售功能
1. 登录商户账户（mobile123）
2. 进入"销售业务"页面
3. 选择产品
4. 创建销售订单
5. 打印小票

### 3. 测试调货功能
1. 登录商户账户（mobile123）
2. 进入"群组库存"页面
3. 选择产品
4. 创建调货申请
5. 登录目标商户账户批准调货
6. 确认收货

### 4. 测试产品追溯功能
1. 登录管理员账户（admin）
2. 进入"供货商/客户管理"
3. 点击"产品追溯"
4. 输入序列号
5. 查看产品历史记录
6. 点击发票编号查看详情
7. 导出PDF

## 测试重点

### PDF导出功能测试
由于刚刚修复了PDF导出功能，请重点测试：

1. ✅ Condition显示是否正确（从产品读取）
2. ✅ Tax Classification显示是否正确（优先使用产品的taxClassification）
3. ✅ 总税额是否正确计算和显示
4. ✅ 备注是否只显示英文（中文被过滤）
5. ✅ Supplier Address是否正确显示（不是"Object Object"）

### 建议的测试流程
1. 创建采购订单（包含不同成色和税务分类的产品）
2. 确认收货（产品进入商户库存）
3. 创建销售订单
4. 查看产品追溯
5. 导出采购发票PDF
6. 导出销售发票PDF
7. 验证PDF内容是否正确

## 注意事项

### 用户账户信息
所有用户账户密码保持不变：
- admin / admin123
- warehouse1 / warehouse123
- mobile123 / mobile123
- murraydundrum / murray123
- murrayranelagh / murray123

### 数据隔离
- warehouse1: 仓库账户，可以看到所有库存
- mobile123: 商户账户，只能看到自己的库存
- murraydundrum: 商户账户，属于Murray Group
- murrayranelagh: 商户账户，属于Murray Group

### 产品成色选项
- Brand New（全新）
- Pre-Owned（二手）
- Refurbished（翻新）
- Excellent（优秀）
- Good（良好）
- Fair（一般）

### 税务分类选项
- STANDARD_VAT（标准增值税23%）
- MARGIN_VAT_0（差价增值税0%）
- MARGIN_VAT_23（差价增值税23%）
- VAT 0%（零税率）
- VAT 13.5%（低税率）

## 相关文档

### PDF导出修复文档
- `FIX_INVOICE_PDF_ENGLISH_ONLY.md` - 纯英文版本
- `FIX_INVOICE_PDF_TAX_AND_NOTES.md` - 税务分类和备注修复
- `FIX_INVOICE_PDF_CONDITION_TAX_FINAL.md` - Condition和Tax Classification修复
- `FIX_INVOICE_PDF_USE_PRODUCT_CONDITION.md` - 使用产品字段修复

### 其他功能文档
- `FIX_PROFIT_CALCULATION.md` - 利润计算修复
- `FIX_TRANSFER_COSTPRICE.md` - 调货成本价修复
- `FIX_PRODUCT_TRACKING.md` - 产品追溯功能修复
- `FIX_TRACKING_INVOICE_DETAILS.md` - 发票详情功能

## 服务器状态
- 服务器进程ID: 28
- 状态: 运行中
- 端口: 3000
- 访问地址: http://localhost:3000

## 备注
数据库已完全清空业务数据，可以开始全新的测试。所有之前的修复和功能都已保留，可以正常使用。
