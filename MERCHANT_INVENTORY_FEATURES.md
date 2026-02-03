# 📦 商户库存管理功能实现方案

## 更新时间
2026-02-02

## 功能概述

为 merchant.html 添加完整的库存管理功能，包括：
1. ✅ 入库功能 - 商户可以手动添加产品到自己的库存
2. ✅ 库存归属 - 每个库存记录属于特定的商户用户
3. ✅ 群组可视 - 通过店面组（StoreGroup）配置，实现库存共享可视
4. ✅ 调货功能 - 群组内的商户可以互相调货

---

## 📋 数据模型

### 1. MerchantInventory（商户库存）
```javascript
{
  merchantId: String,           // 商户ID
  merchantName: String,         // 商户名称
  storeGroup: ObjectId,         // 所属店面组
  store: ObjectId,              // 所属店面
  
  productId: ObjectId,          // 产品ID
  productName: String,          // 产品名称
  brand: String,                // 品牌
  model: String,                // 型号
  category: String,             // 分类
  
  quantity: Number,             // 库存数量
  costPrice: Number,            // 成本价
  wholesalePrice: Number,       // 批发价
  retailPrice: Number,          // 零售价
  
  barcode: String,              // 条码
  serialNumber: String,         // 序列号（设备类产品）
  color: String,                // 颜色
  condition: String,            // 成色
  
  source: String,               // 来源（warehouse/manual/transfer）
  sourceOrderId: ObjectId,      // 来源订单ID
  
  status: String,               // 状态（active/sold/transferred）
  
  createdAt: Date,
  updatedAt: Date
}
```

### 2. InventoryTransfer（库存调货记录）
```javascript
{
  transferNumber: String,       // 调货单号
  
  fromMerchant: ObjectId,       // 调出商户
  fromMerchantName: String,
  fromStore: ObjectId,          // 调出店面
  
  toMerchant: ObjectId,         // 调入商户
  toMerchantName: String,
  toStore: ObjectId,            // 调入店面
  
  storeGroup: ObjectId,         // 所属店面组
  
  items: [{
    inventoryId: ObjectId,      // 库存ID
    productName: String,
    quantity: Number,
    transferPrice: Number       // 调货价格
  }],
  
  totalAmount: Number,          // 总金额
  
  status: String,               // 状态（pending/approved/rejected/completed）
  requestedBy: ObjectId,        // 申请人
  approvedBy: ObjectId,         // 审批人
  
  notes: String,                // 备注
  
  requestedAt: Date,
  approvedAt: Date,
  completedAt: Date,
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔧 API 端点

### 1. 入库相关

#### POST /api/merchant/inventory/add
添加产品到商户库存（手动入库）

**请求体**:
```javascript
{
  merchantId: "merchant_001",
  productName: "iPhone 15 Pro",
  brand: "Apple",
  model: "iPhone 15 Pro",
  category: "手机配件",
  quantity: 10,
  costPrice: 800,
  wholesalePrice: 900,
  retailPrice: 1000,
  barcode: "123456789",
  color: "黑色",
  condition: "BRAND_NEW",
  source: "manual"
}
```

**响应**:
```javascript
{
  success: true,
  data: {
    inventoryId: "...",
    message: "入库成功"
  }
}
```

---

### 2. 群组库存可视

#### GET /api/merchant/inventory/group
获取群组内所有商户的库存（需要权限）

**查询参数**:
- merchantId: 当前商户ID
- storeGroupId: 店面组ID（可选，自动从用户信息获取）

**响应**:
```javascript
{
  success: true,
  data: {
    myInventory: [...],        // 自己的库存
    groupInventory: [          // 群组内其他商户的库存
      {
        merchantId: "...",
        merchantName: "...",
        storeName: "...",
        products: [...]
      }
    ]
  }
}
```

---

### 3. 调货相关

#### POST /api/merchant/inventory/transfer/request
发起调货请求

**请求体**:
```javascript
{
  fromMerchantId: "merchant_002",
  toMerchantId: "merchant_001",
  items: [
    {
      inventoryId: "...",
      quantity: 5,
      transferPrice: 900
    }
  ],
  notes: "急需补货"
}
```

**响应**:
```javascript
{
  success: true,
  data: {
    transferId: "...",
    transferNumber: "TRF20260202001",
    status: "pending"
  }
}
```

#### GET /api/merchant/inventory/transfer/list
获取调货记录列表

**查询参数**:
- merchantId: 商户ID
- type: 类型（sent/received/all）
- status: 状态（pending/approved/completed）

#### POST /api/merchant/inventory/transfer/approve
审批调货请求（调出方审批）

**请求体**:
```javascript
{
  transferId: "...",
  action: "approve", // approve/reject
  notes: "同意调货"
}
```

#### POST /api/merchant/inventory/transfer/complete
完成调货（调入方确认收货）

---

## 🎨 前端界面设计

### 1. 入库界面

在"我的库存"标签页添加"+ 手动入库"按钮，点击后弹出模态框：

```
┌─────────────────────────────────────┐
│  手动入库                      ✕    │
├─────────────────────────────────────┤
│  产品名称: [________________]       │
│  品牌:     [________________]       │
│  型号:     [________________]       │
│  分类:     [下拉选择▼]             │
│  数量:     [________________]       │
│  成本价:   [________________]       │
│  批发价:   [________________]       │
│  零售价:   [________________]       │
│  条码:     [________________]       │
│  颜色:     [________________]       │
│  成色:     [下拉选择▼]             │
│                                     │
│  [取消]              [确认入库]    │
└─────────────────────────────────────┘
```

### 2. 群组库存界面

添加新标签页"群组库存"：

```
┌─────────────────────────────────────┐
│  群组库存                           │
├─────────────────────────────────────┤
│  📍 我的店面: 北京朝阳店            │
│  🏢 所属群组: XX连锁店              │
│                                     │
│  ┌─ 我的库存 ─────────────────┐   │
│  │ [产品列表]                   │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌─ 群组内其他店面库存 ────────┐   │
│  │ 📍 上海浦东店                │   │
│  │    [产品列表] [申请调货]     │   │
│  │                              │   │
│  │ 📍 广州天河店                │   │
│  │    [产品列表] [申请调货]     │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 3. 调货界面

添加新标签页"调货管理"：

```
┌─────────────────────────────────────┐
│  调货管理                           │
├─────────────────────────────────────┤
│  [我发起的] [我收到的] [全部]      │
│                                     │
│  ┌─ 调货单 TRF20260202001 ──────┐  │
│  │ 状态: 待审批                  │  │
│  │ 调出: 上海浦东店              │  │
│  │ 调入: 北京朝阳店（我）        │  │
│  │ 产品: iPhone 15 Pro x 5       │  │
│  │ 金额: €4,500                  │  │
│  │ 时间: 2026-02-02 10:30       │  │
│  │                               │  │
│  │ [查看详情] [取消申请]         │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ 调货单 TRF20260202002 ──────┐  │
│  │ 状态: 已批准                  │  │
│  │ 调出: 北京朝阳店（我）        │  │
│  │ 调入: 广州天河店              │  │
│  │ 产品: iPad Air x 3            │  │
│  │ 金额: €2,100                  │  │
│  │ 时间: 2026-02-02 09:15       │  │
│  │                               │  │
│  │ [查看详情] [确认发货]         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 🔐 权限控制

### 用户权限字段（UserNew 模型）

```javascript
retailInfo: {
  storeGroup: ObjectId,              // 所属店面组
  store: ObjectId,                   // 所属店面
  canViewGroupInventory: Boolean,    // 可以查看群组库存
  canTransferFromGroup: Boolean,     // 可以从群组调货
  canApproveTransfer: Boolean        // 可以审批调货（店长权限）
}
```

### 权限检查逻辑

1. **查看群组库存**:
   - 用户必须属于某个店面组
   - `canViewGroupInventory` 必须为 true
   - 只能查看同一店面组内的库存

2. **发起调货**:
   - 用户必须属于某个店面组
   - `canTransferFromGroup` 必须为 true
   - 只能从同一店面组内的其他店面调货

3. **审批调货**:
   - 用户必须是调出店面的成员
   - `canApproveTransfer` 必须为 true（店长权限）
   - 或者是管理员

---

## 📊 业务流程

### 1. 手动入库流程

```
1. 商户点击"+ 手动入库"
   ↓
2. 填写产品信息
   ↓
3. 提交入库请求
   ↓
4. 系统创建 MerchantInventory 记录
   ↓
5. 更新库存统计
   ↓
6. 显示入库成功
```

### 2. 调货流程

```
1. 商户A查看群组库存
   ↓
2. 发现商户B有需要的产品
   ↓
3. 点击"申请调货"
   ↓
4. 填写调货数量和价格
   ↓
5. 提交调货申请（状态: pending）
   ↓
6. 商户B收到调货申请通知
   ↓
7. 商户B审批（approve/reject）
   ↓
8. 如果批准，状态变为 approved
   ↓
9. 商户B确认发货
   ↓
10. 商户A确认收货（状态: completed）
   ↓
11. 系统更新双方库存
```

---

## 🧪 测试场景

### 场景 1: 手动入库
1. 登录商户账号
2. 进入"我的库存"
3. 点击"+ 手动入库"
4. 填写产品信息
5. 提交
6. 验证库存列表中显示新产品

### 场景 2: 查看群组库存
1. 登录有群组权限的商户账号
2. 进入"群组库存"标签
3. 验证显示自己的库存
4. 验证显示群组内其他店面的库存
5. 验证没有权限的用户看不到此标签

### 场景 3: 发起调货
1. 在群组库存中找到需要的产品
2. 点击"申请调货"
3. 填写数量和价格
4. 提交申请
5. 验证调货记录创建成功

### 场景 4: 审批调货
1. 登录调出方商户账号
2. 进入"调货管理"
3. 查看待审批的调货申请
4. 点击"批准"或"拒绝"
5. 验证状态更新

### 场景 5: 完成调货
1. 调出方确认发货
2. 调入方确认收货
3. 验证双方库存更新正确

---

## 📝 实施步骤

### 第一阶段：基础入库功能
1. ✅ 创建 MerchantInventory 模型
2. ✅ 实现入库 API
3. ✅ 更新 merchant.html 添加入库界面
4. ✅ 测试入库功能

### 第二阶段：群组库存可视
1. ✅ 实现群组库存查询 API
2. ✅ 添加"群组库存"标签页
3. ✅ 实现权限检查
4. ✅ 测试群组可视功能

### 第三阶段：调货功能
1. ✅ 创建 InventoryTransfer 模型
2. ✅ 实现调货相关 API
3. ✅ 添加"调货管理"标签页
4. ✅ 实现调货流程
5. ✅ 测试完整调货流程

---

## ⚠️ 注意事项

### 1. 库存一致性
- 调货时需要使用事务确保库存一致性
- 防止超卖（调货数量不能超过可用库存）
- 记录所有库存变动历史

### 2. 权限安全
- 严格检查用户权限
- 只能查看同一店面组的库存
- 只能向同一店面组的店面调货

### 3. 数据验证
- 入库时验证产品信息完整性
- 调货时验证数量和价格合理性
- 防止恶意操作

### 4. 用户体验
- 提供清晰的操作提示
- 实时更新库存数量
- 调货状态实时通知

---

**文档版本**: v1.0
**创建时间**: 2026-02-02
**状态**: 📝 设计阶段
