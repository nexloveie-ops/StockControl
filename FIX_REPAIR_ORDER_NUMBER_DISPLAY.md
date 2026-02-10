# 修复维修小票订单号显示N/A问题

## 问题
维修小票打印时，订单号（Order No）显示为 "N/A"。

## 原因分析
1. RepairOrder模型中没有 `repairOrderId` 字段
2. 数据库中只有MongoDB自动生成的 `_id` 字段
3. 创建订单API返回的 `repairOrderId` 实际上就是 `_id`
4. 打印函数尝试访问不存在的 `repairOrderId` 字段，导致显示 "N/A"

## 解决方案
使用MongoDB的 `_id` 字段，并格式化为可读的订单号格式。

### 订单号格式
- 格式：`RO-XXXXXXXX`
- RO = Repair Order（维修订单）
- XXXXXXXX = MongoDB _id 的后8位（大写）
- 示例：`RO-5F8A3B2C`

### 修改内容

#### 1. 修改 `printRepairReceipts()` 函数（创建新订单时打印）
```javascript
// 格式化订单号（使用_id的后8位）
const orderId = repairData.repairOrderId || repairData._id || 'N/A';
const formattedOrderId = orderId.length > 8 ? `RO-${orderId.toString().slice(-8).toUpperCase()}` : orderId;

const printData = {
  repairOrderId: formattedOrderId
};
```

#### 2. 修改 `reprintRepairReceipts()` 函数（从订单列表重新打印）
```javascript
// 准备打印数据
const repairData = {
  repairOrderId: `RO-${repair._id.toString().slice(-8).toUpperCase()}` // 使用_id的后8位作为订单号
};
```

## 技术细节

### MongoDB _id 结构
- MongoDB的 `_id` 是一个24位的十六进制字符串
- 示例：`507f1f77bcf86cd799439011`
- 我们取后8位：`99439011`
- 转换为大写：`99439011`
- 添加前缀：`RO-99439011`

### 字段回退机制
```javascript
const orderId = repairData.repairOrderId || repairData._id || 'N/A';
```
- 优先使用 `repairOrderId`（如果存在）
- 其次使用 `_id`
- 最后显示 'N/A'

### 长度检查
```javascript
orderId.length > 8 ? `RO-${orderId.toString().slice(-8).toUpperCase()}` : orderId
```
- 如果订单号长度大于8（说明是MongoDB _id），则格式化
- 如果长度小于等于8，直接使用（可能是已经格式化的订单号）

## 测试场景

### 场景1：创建新订单并打印
1. 创建新维修订单
2. 选择打印小票
3. 订单号应显示为：`RO-XXXXXXXX`

### 场景2：从订单列表重新打印
1. 点击订单的"🖨️ 打印"按钮
2. 选择打印客户小票或车间小票
3. 订单号应显示为：`RO-XXXXXXXX`

### 场景3：不同状态的订单
- 待维修订单：订单号正确显示 ✓
- 已送出订单：订单号正确显示 ✓
- 已完成订单：订单号正确显示 ✓
- 所有状态订单：订单号格式一致 ✓

## 优势
1. **可读性**：`RO-5F8A3B2C` 比 `507f1f77bcf86cd799439011` 更易读
2. **简洁性**：8位十六进制足以区分订单
3. **一致性**：所有维修小票使用相同的订单号格式
4. **兼容性**：支持未来可能添加的自定义订单号字段

## 文件修改
- `StockControl-main/public/merchant.html`
  - 修改 `printRepairReceipts()` 函数
  - 修改 `reprintRepairReceipts()` 函数

## 测试步骤
1. 使用 **Ctrl + Shift + R** 强制刷新浏览器
2. 创建新维修订单并打印
3. 检查小票上的订单号格式
4. 从订单列表重新打印
5. 检查订单号是否一致

## 状态
✅ 已修复
