# 修复SI-003发票详情查看错误

## 问题描述
用户点击SI-003发票时报错：
```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
api/admin/purchase-orders/admin-SI-003
```

## 问题原因

1. SI-003只存在于AdminInventory表中，没有对应的PurchaseInvoice记录
2. 供货商发票列表API为只有AdminInventory的发票生成了特殊ID：`admin-SI-003`
3. 发票详情API无法处理这种格式的ID，因为它尝试用`findById()`查询，而"admin-SI-003"不是有效的MongoDB ObjectId

## 修复方案

修改了两个API，让它们能够处理"admin-{invoiceNumber}"格式的ID：

### 1. `/api/purchase-orders/:id` (第381行)
- 检测ID是否以"admin-"开头
- 如果是，提取发票编号并查询AdminInventory
- 如果PurchaseInvoice不存在，构造虚拟发票对象
- 支持只有AdminInventory数据的发票

### 2. `/api/admin/purchase-orders/:invoiceId` (第1577行)
- 同样的逻辑
- 检测"admin-"前缀
- 查询AdminInventory并构造虚拟发票对象
- 获取供货商信息

## 修改的文件
- `StockControl-main/app.js` (第381-470行, 第1577-1670行)

## 测试步骤

1. 打开 prototype-working.html
2. 进入"供货商/客户管理" → "供货商管理"
3. 点击查看Mobigo Limited的发票
4. 点击SI-003发票编号
5. 应该能够正常显示发票详情，包含44个产品

## 预期结果

- SI-003发票详情正常显示
- 显示所有44个AdminInventory产品
- 显示供货商信息（Mobigo Limited）
- 显示总金额、小计、税额等信息

## 服务器状态
- 服务器已重启（进程31）
- 修改已生效
