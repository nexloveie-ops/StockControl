# 修复旧订单兼容性问题

## 日期: 2026-02-02

## 问题
确认收货时报 400 错误：
```
PUT http://localhost:3000/api/warehouse/orders/xxx/complete 400 (Bad Request)
```

## 原因分析

### 旧订单没有 shipmentDetails
这个订单是在修改发货逻辑之前创建的，`shipmentDetails` 字段为空：

```javascript
订单号: WO-20260202-9112
商户: MurrayDundrum
状态: shipped
shipmentDetails: []  // ❌ 空数组
订单项目数: 1
```

### 新逻辑要求 shipmentDetails
修改后的确认收货 API 需要从 `shipmentDetails` 读取发货信息：

```javascript
const shipmentItems = order.shipmentDetails || [];

if (shipmentItems.length === 0) {
  return res.status(400).json({ success: false, error: '缺少发货信息' });
}
```

## 解决方案

### 兼容性处理
为旧订单自动生成默认的 `shipmentDetails`：

```javascript
let shipmentItems = order.shipmentDetails || [];

// 兼容性处理：如果是旧订单（没有 shipmentDetails），生成默认的发货信息
if (shipmentItems.length === 0) {
  console.log(`⚠️  旧订单 ${order.orderNumber} 没有 shipmentDetails，生成默认发货信息`);
  
  // 为每个订单项目生成默认的发货信息
  for (const item of order.items) {
    const product = await ProductNew.findById(item.productId).populate('category', 'name type');
    
    if (!product) {
      return res.status(400).json({ 
        success: false, 
        error: `产品不存在: ${item.productName}` 
      });
    }
    
    // 判断是设备还是配件
    const isDevice = product.serialNumbers && product.serialNumbers.length > 0;
    
    if (isDevice) {
      // 设备：选择可用的序列号
      const availableSerialNumbers = product.serialNumbers
        .filter(sn => sn.status === 'available')
        .slice(0, item.quantity);
      
      if (availableSerialNumbers.length < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `${item.productName} 可用库存不足` 
        });
      }
      
      shipmentItems.push({
        isDevice: true,
        selectedProducts: availableSerialNumbers.map(sn => sn._id)
      });
    } else {
      // 配件：使用订单数量
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `${item.productName} 库存不足` 
        });
      }
      
      shipmentItems.push({
        isDevice: false,
        quantity: item.quantity
      });
    }
  }
  
  console.log(`✅ 为旧订单生成了 ${shipmentItems.length} 个发货项目`);
}
```

## 工作原理

### 1. 检测旧订单
```javascript
if (shipmentItems.length === 0) {
  // 这是旧订单
}
```

### 2. 查询产品信息
```javascript
const product = await ProductNew.findById(item.productId);
```

### 3. 判断产品类型
```javascript
const isDevice = product.serialNumbers && product.serialNumbers.length > 0;
```

### 4. 生成发货信息

#### 设备（有序列号）
```javascript
{
  isDevice: true,
  selectedProducts: [serialNumber._id, ...]
}
```

#### 配件（无序列号）
```javascript
{
  isDevice: false,
  quantity: 2
}
```

### 5. 验证库存
- 设备：检查可用序列号数量
- 配件：检查 `stockQuantity`

## 优点

### 1. 向后兼容
- 旧订单可以正常确认收货
- 不需要手动修复数据

### 2. 自动处理
- 自动选择可用的序列号
- 自动验证库存

### 3. 安全性
- 验证库存是否充足
- 防止超卖

## 注意事项

### 1. 库存状态
旧订单在下单时已经扣减了库存，但序列号可能已经被其他操作使用。兼容性处理会：
- 检查当前可用的序列号
- 如果库存不足，返回错误

### 2. 数据一致性
如果旧订单的产品已经被删除或修改，确认收货可能会失败。

### 3. 性能
为旧订单生成 `shipmentDetails` 需要查询产品信息，会增加一些处理时间。

## 测试

### 测试旧订单确认收货
```
1. 找到一个 shipped 状态的旧订单（shipmentDetails 为空）
2. 点击"确认收货"
3. 验证: 
   - 控制台显示 "⚠️  旧订单 XXX 没有 shipmentDetails，生成默认发货信息"
   - 控制台显示 "✅ 为旧订单生成了 X 个发货项目"
   - 订单状态变为 completed
   - 产品已入库到商户库存
```

### 测试库存不足的情况
```
1. 找到一个旧订单，其产品库存已不足
2. 点击"确认收货"
3. 验证: 返回错误 "XXX 可用库存不足"
```

## 数据库中的旧订单

当前有 3 个旧订单：
```
- WO-20260202-1061 (已手动标记为 completed)
- WO-20260202-7228 (shipped, 需要确认收货)
- WO-20260202-9112 (shipped, 需要确认收货)
```

这些订单都没有 `shipmentDetails`，现在可以通过兼容性处理正常确认收货。

## 相关文件
- `StockControl-main/app.js` - 添加兼容性处理
- `StockControl-main/models/WarehouseOrder.js` - 订单模型

## 服务器状态
- ✅ 服务器运行中 (Process ID: 50)
- ✅ http://localhost:3000

## 下一步
测试确认收货功能，验证旧订单可以正常处理。
