# 退款小票打印功能

## 功能说明
在退款成功后，系统会询问用户是否打印退款小票。退款小票包含退款商品详情、退款金额等信息。

## 实现内容

### 1. 退款流程更新
在 `processRefund` 函数中，退款成功后添加打印小票的询问：

```javascript
if (result.success) {
  alert('✅ 退款成功！\n\n' + 
    `退款金额: €${refundTotal.toFixed(2)}\n` +
    (refundItems.some(i => i.restock) ? '已补回库存' : ''));
  
  // 询问是否打印退款小票
  const shouldPrint = confirm('Do you want to print a refund receipt?\n是否打印退款小票？');
  
  if (shouldPrint) {
    // 打印退款小票
    await printRefundReceipt(sale, refundItems, refundTotal);
  }
  
  // 关闭对话框
  closeSaleDetailModal();
  
  // 刷新销售记录
  querySalesRecords();
}
```

### 2. 新增函数
添加了 `printRefundReceipt` 函数，用于生成和打印退款小票。

## 退款小票内容

### 标题区域
```
公司名称
地址
电话
邮箱
VAT号码

=============================
    REFUND RECEIPT
       退款小票
=============================
```

### 订单信息
```
Original Order: [原订单号]
Refund Date: [退款日期时间]
Customer: [客户电话]（如有）
```

### 退款商品列表
每个商品显示：
- 商品名称
- 数量 x 单价 = 退款金额（负数）
- 序列号（如果是设备产品）
- 设备状态信息（如果是设备产品）：
  - Status: available/damaged/repairing
  - Condition: 成色
  - Restocked: 是否补回库存
- 维修服务信息（如果是维修服务）：
  - Repair Service - 维修地点
- 配件产品信息：
  - Restocked（如果补回库存）

### 退款总额
```
REFUND TOTAL: -€XX.XX
```

### 注意事项
```
Notice / 注意事项:
• Please keep this receipt for your records
• 请保留此小票作为退款凭证
• Items have been restocked / 商品已补回库存（如适用）
```

### 页脚
```
Thank you for your understanding
感谢您的理解
[公司电话]
```

## 小票样式

### 设计特点
1. **80mm热敏打印机格式**
2. **退款标题突出显示**：黑色边框，灰色背景
3. **负数金额**：退款金额显示为负数（-€XX.XX）
4. **详细信息**：显示退款原因、商品状态等
5. **双语显示**：中英文对照

### 样式示例
```
================================
      3C Product Store
    123 Main St Dublin
    Tel: 01-234-5678
    Email: info@store.com
    VAT: IE1234567X
================================

┌─────────────────────────────┐
│    REFUND RECEIPT           │
│       退款小票               │
└─────────────────────────────┘

Original Order: SO-2024-001
Refund Date: 10/02/2026 14:30
Customer: 0871234567

--------------------------------
Refunded Items
--------------------------------

iPhone 15 Pro
2 x €800.00          -€1,600.00
SN: 123456789012345
Status: available | Condition: Like New | Restocked

iPhone Clear Case
1 x €12.00              -€12.00
Restocked

================================
REFUND TOTAL:        -€1,612.00
================================

Notice / 注意事项:
• Please keep this receipt
• 请保留此小票作为退款凭证
• Items have been restocked
• 商品已补回库存

Thank you for your understanding
感谢您的理解
01-234-5678
```

## 使用流程

### 退款并打印小票
1. 在销售记录中点击要退款的订单
2. 选择要退款的商品
3. 对于设备产品：
   - 选择退回后的状态（可用/损坏/维修中）
   - 选择成色
   - 选择是否补回库存
4. 对于维修服务：
   - 确认已在维修地点退款
5. 对于配件产品：
   - 选择是否补回库存
6. 点击"确认退款"
7. 系统处理退款
8. 显示成功提示
9. **询问是否打印退款小票**
10. 点击"确定"打印小票
11. 小票自动打开并打印

### 不打印小票
如果不需要打印小票，在询问时点击"取消"即可。

## 退款小票 vs 销售小票

### 相同点
- 使用相同的80mm格式
- 显示公司信息
- 显示商品列表
- 自动打印功能

### 不同点

| 项目 | 销售小票 | 退款小票 |
|------|---------|---------|
| 标题 | 无特殊标题 | **REFUND RECEIPT** 突出显示 |
| 订单号 | Order No | Original Order（原订单号） |
| 金额符号 | 正数 | **负数**（-€XX.XX） |
| 商品信息 | 基本信息 | **详细退款信息**（状态、成色、是否补回库存） |
| 支付信息 | 显示支付方式 | 不显示 |
| 注意事项 | Thank You | **退款注意事项** |

## 技术细节

### 文件修改
**文件**: `StockControl-main/public/merchant.html`

#### 修改1: processRefund函数（第4095行）
添加打印小票询问和调用逻辑

#### 修改2: 新增printRefundReceipt函数（第4120行）
完整的退款小票打印功能

### 函数参数
```javascript
async function printRefundReceipt(sale, refundItems, refundTotal)
```

**参数说明**：
- `sale`: 原销售记录对象
- `refundItems`: 退款商品数组
- `refundTotal`: 退款总额

### 退款商品数据结构
```javascript
{
  productName: "iPhone 15 Pro",
  quantity: 1,
  price: 800.00,
  totalAmount: 800.00,
  serialNumber: "123456789012345",
  type: "device",
  deviceStatus: "available",
  deviceCondition: "Like New",
  restock: true,
  originalCondition: "Brand New",
  originalCategory: "全新设备"
}
```

## 测试场景

### 测试1: 设备产品退款
1. 创建设备产品销售（iPhone）
2. 进行退款
3. 选择状态：可用
4. 选择成色：Like New
5. 勾选补回库存
6. 确认退款
7. 点击"确定"打印小票
8. **验证小票内容**：
   - ✅ 显示"REFUND RECEIPT"标题
   - ✅ 显示原订单号
   - ✅ 显示退款日期
   - ✅ 显示商品名称和序列号
   - ✅ 显示状态和成色信息
   - ✅ 显示"Restocked"
   - ✅ 金额显示为负数

### 测试2: 多商品退款
1. 创建包含多个商品的销售
2. 选择部分商品退款
3. 确认退款
4. 打印小票
5. **验证**：所有退款商品都显示在小票上

### 测试3: 维修服务退款
1. 创建包含维修服务的销售
2. 退款维修服务
3. 确认已在维修地点退款
4. 打印小票
5. **验证**：显示"Repair Service - [维修地点]"

### 测试4: 不打印小票
1. 进行退款
2. 在询问时点击"取消"
3. **验证**：不打印小票，直接关闭对话框

## 打印设置

### 推荐设置
- **纸张大小**: 80mm
- **打印机类型**: 热敏打印机
- **边距**: 5mm
- **字体**: Courier New (等宽字体)

### 浏览器打印
1. 小票会在新窗口打开
2. 自动触发打印对话框
3. 打印完成后自动关闭窗口
4. 如需重新打印，点击"Print"按钮

## 注意事项

### 1. 公司信息
退款小票使用与销售小票相同的公司信息，从用户配置中读取。

### 2. 退款金额显示
退款金额显示为负数（-€XX.XX），清楚表明这是退款而非销售。

### 3. 商品状态信息
- 设备产品：显示详细的状态、成色和库存信息
- 维修服务：显示维修地点
- 配件产品：显示是否补回库存

### 4. 打印时机
退款小票在退款成功后立即询问打印，确保用户可以选择是否打印。

### 5. 错误处理
如果打印失败，会显示错误提示，但不影响退款流程。

## 相关文档
- `SALES_REFUND_FEATURE.md` - 退款功能说明
- `REFUND_CONDITION_LOGIC.md` - 退款成色逻辑
- `RECEIPT_PRINTING_FEATURE.md` - 销售小票打印功能

## 状态
✅ **功能已完成** - 退款小票打印功能已实现

---

**完成日期**: 2026-02-10
**开发人**: Kiro AI Assistant
