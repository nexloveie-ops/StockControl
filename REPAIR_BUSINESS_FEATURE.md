# 维修业务功能

## 实现日期
2026-02-02

## 功能概述
完整的维修工单管理系统，支持自己维修和外送维修两种模式，维修完成后可直接在销售业务中销售。

## 主要功能

### 1. 新增维修订单
创建维修工单，记录客户和设备信息。

#### 必填信息
- 客户电话
- 设备名称
- 问题描述

#### 选填信息
- 客户姓名
- 设备IMEI
- 设备序列号(SN)
- 备注
- 维修地点（留空表示自己维修）
- 预计完成时间
- 维修费用

### 2. 维修模式

#### 自己维修
- 维修地点留空
- 初始状态：**待维修** (pending)
- 流程：待维修 → 已完成 → 等待销售

#### 外送维修
- 填写维修地点
- 初始状态：**已送出** (sent_out)
- 流程：已送出 → 已取回 → 等待销售

### 3. 状态管理

| 状态 | 代码 | 说明 | 可用操作 |
|------|------|------|----------|
| 待维修 | pending | 自己维修，等待处理 | 完成、待销售 |
| 已送出 | sent_out | 外送维修，已送出 | 已取回 |
| 已取回 | retrieved | 外送维修，已取回 | 待销售 |
| 已完成 | completed | 自己维修，已完成 | 待销售 |
| 等待销售 | ready_for_sale | 可以销售 | 在销售业务中显示 |
| 已销售 | sold | 已销售 | 无 |
| 已取消 | cancelled | 已取消 | 无 |

### 4. 销售集成
- 等待销售的维修订单显示在销售业务的"维修订单"分类中
- 建议售价 = 维修费用 × 1.3
- 使用 Service VAT 13.5% 税率
- 销售后自动更新维修订单状态为"已销售"

## 数据模型

### RepairOrder（维修订单）

```javascript
{
  merchantId: String,              // 商户ID
  customerPhone: String,           // 客户电话 *
  customerName: String,            // 客户姓名
  deviceName: String,              // 设备名称 *
  deviceIMEI: String,              // IMEI
  deviceSN: String,                // 序列号
  problemDescription: String,      // 问题描述 *
  notes: String,                   // 备注
  repairLocation: String,          // 维修地点（空=自己维修）
  estimatedCompletionDate: Date,   // 预计完成时间
  repairCost: Number,              // 维修费用
  status: String,                  // 状态
  receivedDate: Date,              // 接收日期
  sentOutDate: Date,               // 送出日期
  retrievedDate: Date,             // 取回日期
  completedDate: Date,             // 完成日期
  soldDate: Date,                  // 销售日期
  saleId: ObjectId,                // 销售记录ID
  salePrice: Number,               // 销售价格
  taxClassification: String        // 税务分类（SERVICE_VAT_13_5）
}
```

## API 端点

### POST /api/merchant/repairs
创建维修订单

**请求体**:
```json
{
  "merchantId": "merchant_001",
  "customerPhone": "0851234567",
  "customerName": "John Doe",
  "deviceName": "iPhone 13 Pro",
  "deviceIMEI": "123456789012345",
  "deviceSN": "ABC123",
  "problemDescription": "屏幕破裂",
  "notes": "客户要求尽快修复",
  "repairLocation": "",
  "estimatedCompletionDate": "2026-02-05",
  "repairCost": 150.00
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "repairOrderId": "65xyz...",
    "status": "pending",
    "isOutsourced": false,
    "message": "维修订单创建成功"
  }
}
```

### GET /api/merchant/repairs
获取维修记录列表

**查询参数**:
- `merchantId`: 商户ID
- `status`: 状态筛选（可选）
- `startDate`: 开始日期（可选）
- `endDate`: 结束日期（可选）

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "65xyz...",
      "customerPhone": "0851234567",
      "deviceName": "iPhone 13 Pro",
      "status": "pending",
      ...
    }
  ]
}
```

### GET /api/merchant/repairs/ready-for-sale
获取等待销售的维修订单

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "65xyz...",
      "deviceName": "iPhone 13 Pro",
      "repairCost": 150.00,
      "status": "ready_for_sale",
      ...
    }
  ]
}
```

### PUT /api/merchant/repairs/:id/status
更新维修订单状态

**请求体**:
```json
{
  "status": "completed",
  "repairCost": 150.00
}
```

### DELETE /api/merchant/repairs/:id
删除维修订单

## 用户界面

### 维修业务标签页

#### 状态筛选按钮
- 全部
- 待维修（橙色）
- 已送出（紫色）
- 已取回（绿色）
- 已完成（青色）
- 等待销售（粉色）

#### 维修记录表格
显示列：
- 接收日期
- 客户（电话+姓名）
- 设备
- IMEI/SN
- 问题描述
- 维修地点
- 费用
- 状态
- 操作按钮

### 新增维修订单模态框

#### 客户信息（蓝色区域）
- 客户电话 *
- 客户姓名

#### 设备信息（黄色区域）
- 设备名称 *
- IMEI
- 序列号(SN)

#### 维修信息（粉色区域）
- 问题描述 *
- 备注
- 维修地点（留空=自己维修）
- 预计完成时间
- 维修费用

### 销售业务集成

#### 维修订单分类卡片
- 橙色渐变背景
- 🔧 图标
- 显示待销售订单数量

#### 维修订单列表
- 设备名称
- 客户信息
- IMEI/SN
- 问题描述
- 维修费用
- 建议售价（维修费用 × 1.3）
- "加入购物车"按钮

## 业务流程

### 流程 1：自己维修
```
1. 客户送修
   ↓
2. 创建维修订单（维修地点留空）
   ↓
3. 状态：待维修 (pending)
   ↓
4. 维修完成 → 点击"完成"按钮
   ↓
5. 状态：已完成 (completed)
   ↓
6. 点击"待销售"按钮
   ↓
7. 状态：等待销售 (ready_for_sale)
   ↓
8. 在销售业务中显示
   ↓
9. 加入购物车并销售
   ↓
10. 状态：已销售 (sold)
```

### 流程 2：外送维修
```
1. 客户送修
   ↓
2. 创建维修订单（填写维修地点）
   ↓
3. 状态：已送出 (sent_out)
   ↓
4. 从维修地点取回 → 点击"已取回"按钮
   ↓
5. 状态：已取回 (retrieved)
   ↓
6. 点击"待销售"按钮
   ↓
7. 状态：等待销售 (ready_for_sale)
   ↓
8. 在销售业务中显示
   ↓
9. 加入购物车并销售
   ↓
10. 状态：已销售 (sold)
```

## 税务处理

### 维修服务税率
- 使用 **Service VAT 13.5%**
- 计算公式：`税额 = 销售额 × 13.5 / 113.5`

### 示例
```
维修费用：€150.00
建议售价：€195.00 (150 × 1.3)
税额：€23.21 (195 × 13.5 / 113.5)
```

## 测试场景

### 场景 A：自己维修
1. 创建维修订单
   - 客户电话：0851234567
   - 设备：iPhone 13
   - 问题：屏幕破裂
   - 维修地点：留空
   - 费用：€150
2. 验证状态：待维修
3. 点击"完成"
4. 验证状态：已完成
5. 点击"待销售"
6. 在销售业务中查看
7. 加入购物车并销售
8. 验证状态：已销售

### 场景 B：外送维修
1. 创建维修订单
   - 客户电话：0851234568
   - 设备：Samsung S21
   - 问题：电池更换
   - 维修地点：ABC Repair Shop
   - 费用：€80
2. 验证状态：已送出
3. 点击"已取回"
4. 验证状态：已取回
5. 点击"待销售"
6. 在销售业务中查看
7. 加入购物车并销售
8. 验证状态：已销售

## 相关文件

- `StockControl-main/models/RepairOrder.js` - 维修订单模型
- `StockControl-main/models/MerchantSale.js` - 销售记录模型（已更新）
- `StockControl-main/app.js` - 维修业务API（约3377-3600行）
- `StockControl-main/public/merchant.html` - 前端界面

## 注意事项

1. **客户信息**：客户电话是必填项，便于后续联系
2. **设备标识**：IMEI或SN至少填写一个，便于追踪
3. **维修地点**：留空表示自己维修，填写表示外送维修
4. **状态流转**：不同维修模式有不同的状态流程
5. **销售集成**：只有"等待销售"状态的订单才会在销售业务中显示
6. **税率固定**：维修服务统一使用 Service VAT 13.5%
7. **建议售价**：系统自动计算为维修费用的1.3倍，可在购物车中调整

## 未来优化

1. 支持维修进度跟踪
2. 支持维修配件管理
3. 支持客户通知（短信/邮件）
4. 支持维修报价单打印
5. 支持维修历史记录查询
6. 支持维修统计报表
7. 支持维修师傅分配
8. 支持维修质保管理

## 总结

维修业务功能已完整实现，支持：
- ✅ 创建维修订单
- ✅ 自己维修和外送维修两种模式
- ✅ 完整的状态管理
- ✅ 与销售业务无缝集成
- ✅ 自动税额计算
- ✅ 维修记录查询和筛选
- ✅ 订单状态更新
- ✅ 订单删除

商户可以轻松管理维修业务，从接收设备到完成销售的全流程都得到支持。
