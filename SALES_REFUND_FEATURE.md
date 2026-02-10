# 销售记录退款功能

## 功能概述
在merchant.html的销售记录查询中添加了完整的退款功能。商户可以点击任何销售记录查看详情，并对其中的商品进行退款处理。系统会根据产品类型（设备、维修服务、普通产品）提供不同的退款选项。

## 功能特点

### 1. 销售记录可点击
- ✅ 所有销售记录（包括查询结果）都可以点击
- ✅ 鼠标悬停时高亮显示
- ✅ 点击后显示完整的订单详情

### 2. 订单详情显示
显示完整的订单信息：
- 订单号
- 日期时间
- 客户电话
- 支付方式
- 总金额
- 所有商品明细（产品名称、数量、单价、小计、序列号等）

### 3. 灵活的退款选择
- ✅ 支持选择部分商品退款
- ✅ 支持多选退款
- ✅ 每个商品都有独立的复选框

### 4. 根据产品类型提供不同的退款选项

#### 设备产品（Device）
识别条件：有序列号且不是维修服务

退款选项：
- **退回后状态**：
  - 可用（available）
  - 损坏（damaged）
  - 维修中（repairing）
- **成色**：
  - 全新（Brand New）
  - 准新（Like New）
  - 优秀（Excellent）
  - 良好（Good）
  - 一般（Fair）
- **补回库存**：复选框（默认勾选）

处理逻辑：
- 如果选择补回库存，系统会查找对应的MerchantInventory记录
- 更新库存状态为选择的状态
- 更新成色为选择的成色
- 将salesStatus改为UNSOLD
- 数量设为1

#### 维修服务（Repair）
识别条件：有repairLocation字段

退款选项：
- **维修地点提醒**：显示维修地点信息
- **确认复选框**：必须勾选确认已在维修地点退款

处理逻辑：
- 必须确认才能提交退款
- 系统记录退款信息
- 可以扩展为更新维修订单状态

#### 普通产品（Product）
识别条件：既不是设备也不是维修服务

退款选项：
- **补回库存**：复选框（默认勾选）

处理逻辑：
- 如果选择补回库存，系统会查找对应的MerchantInventory记录
- 增加库存数量
- 将salesStatus改为UNSOLD

## 使用流程

### 商户操作步骤
1. 登录商户账号
2. 进入"销售记录查询"
3. 选择日期范围并查询
4. 点击任意销售记录行
5. 查看订单详情
6. 勾选需要退款的商品
7. 根据商品类型设置退款选项：
   - 设备：选择状态和成色
   - 维修：确认已在维修地点退款
   - 普通产品：选择是否补回库存
8. 点击"💰 处理退款"按钮
9. 确认退款信息
10. 系统处理退款并更新库存

### 退款确认
系统会显示确认对话框，包含：
- 退款商品列表
- 每个商品的数量和金额
- 退款总额

### 退款成功
退款成功后：
- 显示成功提示
- 显示退款金额
- 显示是否已补回库存
- 自动刷新销售记录
- 关闭详情对话框

## 代码实现

### 前端代码
**文件**: `StockControl-main/public/merchant.html`

#### 1. 销售记录表格（可点击）
```javascript
// 第3530行左右
<tr style="cursor: pointer; transition: background 0.2s;" 
    onmouseover="this.style.background='#f9fafb'" 
    onmouseout="this.style.background=''"
    onclick="viewSaleDetail('${item.saleId}')">
  ...
</tr>
```

#### 2. 查看订单详情函数
```javascript
// 第3670行左右
async function viewSaleDetail(saleId) {
  // 从allSalesData中查找销售记录
  const sale = allSalesData.find(s => s._id === saleId);
  
  // 显示订单详情和退款选项
  // 为每个商品添加复选框和退款选项
}
```

#### 3. 生成退款选项函数
```javascript
// 第3780行左右
function getRefundOptions(item, index) {
  const isDevice = item.serialNumber && !item.repairLocation;
  const isRepair = item.repairLocation;
  
  if (isDevice) {
    // 返回设备退款选项HTML
  } else if (isRepair) {
    // 返回维修服务退款选项HTML
  } else {
    // 返回普通产品退款选项HTML
  }
}
```

#### 4. 处理退款函数
```javascript
// 第3830行左右
async function processRefund() {
  // 收集选中的退款项目
  const refundItems = [];
  
  for (let i = 0; i < sale.items.length; i++) {
    const checkbox = document.getElementById(`refundItem_${i}`);
    if (!checkbox || !checkbox.checked) continue;
    
    // 根据产品类型收集退款信息
    if (isDevice) {
      // 收集设备状态和成色
    } else if (isRepair) {
      // 验证维修地点确认
    } else {
      // 收集是否补回库存
    }
  }
  
  // 发送退款请求到后端
  await fetch(`${API_BASE}/merchant/sales/${sale._id}/refund`, {
    method: 'POST',
    body: JSON.stringify({ merchantId, refundItems, refundTotal })
  });
}
```

### 后端API
**文件**: `StockControl-main/app.js`

#### 1. 更新销售记录API（添加字段）
```javascript
// 第6391行左右
app.get('/api/merchant/sales', applyDataIsolation, async (req, res) => {
  // 查询销售记录
  const sales = await MerchantSale.find(query);
  
  // 格式化返回数据，添加 repairLocation 和 productId
  const formattedSales = sales.map(sale => ({
    items: sale.items.map(item => ({
      ...item,
      repairLocation: item.repairLocation,
      productId: item.productId
    }))
  }));
});
```

#### 2. 退款API
```javascript
// 第6450行左右
app.post('/api/merchant/sales/:saleId/refund', applyDataIsolation, async (req, res) => {
  const { saleId } = req.params;
  const { merchantId, refundItems, refundTotal } = req.body;
  
  // 查找销售记录
  const sale = await MerchantSale.findById(saleId);
  
  // 处理每个退款项目
  for (const refundItem of refundItems) {
    if (refundItem.type === 'device') {
      // 处理设备退款：更新库存状态和成色
      const inventory = await MerchantInventory.findOne({
        merchantId: merchantId,
        serialNumber: refundItem.serialNumber,
        status: 'SOLD'
      });
      
      if (inventory && refundItem.restock) {
        inventory.status = refundItem.deviceStatus;
        inventory.condition = refundItem.deviceCondition;
        inventory.salesStatus = 'UNSOLD';
        await inventory.save();
      }
      
    } else if (refundItem.type === 'repair') {
      // 处理维修服务退款：记录退款信息
      
    } else if (refundItem.type === 'product') {
      // 处理普通产品退款：增加库存数量
      const inventory = await MerchantInventory.findOne({
        merchantId: merchantId,
        _id: refundItem.productId
      });
      
      if (inventory && refundItem.restock) {
        inventory.quantity += refundItem.quantity;
        inventory.salesStatus = 'UNSOLD';
        await inventory.save();
      }
    }
  }
  
  // 更新销售记录状态
  sale.status = 'refunded';
  sale.refundDate = new Date();
  sale.refundAmount = refundTotal;
  sale.refundItems = refundItems;
  await sale.save();
});
```

### 数据模型更新
**文件**: `StockControl-main/models/MerchantSale.js`

添加的字段：
```javascript
items: [{
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  repairLocation: {
    type: String,
    default: null
  }
}],

// 退款信息
refundDate: {
  type: Date,
  default: null
},
refundAmount: {
  type: Number,
  default: 0,
  min: 0
},
refundItems: {
  type: Array,
  default: []
}
```

## 退款逻辑详解

### 设备产品退款
```
1. 用户选择设备商品
2. 选择退回后状态（可用/损坏/维修中）
3. 选择成色（全新/准新/优秀/良好/一般）
4. 选择是否补回库存
5. 提交退款
   ↓
6. 后端查找MerchantInventory记录（通过serialNumber）
7. 更新库存状态 = 选择的状态
8. 更新成色 = 选择的成色
9. 更新salesStatus = UNSOLD
10. 更新quantity = 1
11. 保存库存记录
```

### 维修服务退款
```
1. 用户选择维修服务商品
2. 系统显示维修地点
3. 用户必须勾选"已在维修地点退款"
4. 提交退款
   ↓
5. 后端记录退款信息
6. 可以扩展：更新RepairOrder状态为已退款
```

### 普通产品退款
```
1. 用户选择普通商品
2. 选择是否补回库存
3. 提交退款
   ↓
4. 后端查找MerchantInventory记录（通过productId）
5. 增加库存数量 += 退款数量
6. 更新salesStatus = UNSOLD
7. 保存库存记录
```

## 数据流

```
用户点击销售记录
  ↓
前端调用 viewSaleDetail(saleId)
  ↓
从 allSalesData 中查找记录
  ↓
显示订单详情对话框
  ↓
用户勾选商品并设置退款选项
  ↓
用户点击"处理退款"
  ↓
前端调用 processRefund()
  ↓
收集退款信息（refundItems）
  ↓
POST /api/merchant/sales/:saleId/refund
  ↓
后端验证权限
  ↓
处理每个退款项目
  ↓
更新库存（如果需要）
  ↓
更新销售记录状态为 'refunded'
  ↓
返回成功响应
  ↓
前端显示成功提示
  ↓
刷新销售记录列表
```

## 测试方法

### 1. 测试设备产品退款
1. 创建一个包含设备的销售订单（有序列号）
2. 在销售记录中找到该订单
3. 点击订单查看详情
4. 勾选设备商品
5. 选择状态为"损坏"
6. 选择成色为"良好"
7. 确保"补回库存"已勾选
8. 点击"处理退款"
9. 验证：
   - 库存中该设备状态变为"DAMAGED"
   - 成色变为"Good"
   - salesStatus变为"UNSOLD"

### 2. 测试维修服务退款
1. 创建一个包含维修服务的销售订单
2. 在销售记录中找到该订单
3. 点击订单查看详情
4. 勾选维修服务商品
5. 勾选"已在维修地点退款"确认框
6. 点击"处理退款"
7. 验证：
   - 退款成功
   - 销售记录状态变为"refunded"

### 3. 测试普通产品退款
1. 创建一个包含普通产品的销售订单（无序列号）
2. 在销售记录中找到该订单
3. 点击订单查看详情
4. 勾选普通商品
5. 确保"补回库存"已勾选
6. 点击"处理退款"
7. 验证：
   - 库存数量增加
   - salesStatus变为"UNSOLD"

### 4. 测试部分退款
1. 创建一个包含多个商品的销售订单
2. 只勾选其中1-2个商品
3. 设置退款选项
4. 点击"处理退款"
5. 验证：
   - 只有选中的商品被退款
   - 退款金额正确
   - 库存正确更新

## 注意事项

1. **权限验证**：
   - 只有订单所属商户可以退款
   - 使用applyDataIsolation中间件确保数据隔离

2. **库存查找**：
   - 设备：通过serialNumber查找
   - 普通产品：通过productId查找
   - 必须是SOLD状态才能退款

3. **维修服务**：
   - 必须确认已在维修地点退款
   - 可以扩展为与RepairOrder集成

4. **退款记录**：
   - 所有退款信息保存在MerchantSale中
   - 包括退款日期、金额、退款项目详情

5. **状态更新**：
   - 销售记录状态变为'refunded'
   - 库存状态根据选择更新
   - salesStatus变为'UNSOLD'

## 扩展功能建议

1. **部分退款**：
   - 支持退款部分数量（当前是全部退款）
   - 需要修改quantity字段

2. **退款原因**：
   - 添加退款原因选择
   - 记录退款备注

3. **退款审批**：
   - 添加退款审批流程
   - 管理员审批后才能退款

4. **退款统计**：
   - 在报表中显示退款统计
   - 退款率分析

5. **维修订单集成**：
   - 退款时自动更新RepairOrder状态
   - 维修订单标记为已退款

## 状态
✅ **功能已完整实现** - 销售记录可点击并支持灵活的退款处理
