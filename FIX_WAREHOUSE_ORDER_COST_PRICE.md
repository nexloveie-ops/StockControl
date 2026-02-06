# 修复：仓库调货成本价显示错误

## 问题描述
在"我的库存"页面查询产品（如 350032738439198）的产品时间线时，"产品入库"事件显示的成本价不正确。

**问题**：
- 来源：仓库调货
- 显示的成本价：仓库产品的成本价（`product.costPrice`）
- **应该显示**：仓库产品的批发价（`product.wholesalePrice`）

## 根本原因
在商户确认收货时（`/api/warehouse/orders/:id/complete`），创建 `MerchantInventory` 记录时，错误地使用了仓库产品的成本价：

```javascript
costPrice: product.costPrice,  // ❌ 错误
```

**正确逻辑**：
- 仓库的批发价 = 商户的成本价
- 商户从仓库进货，支付的是仓库的批发价
- 这个批发价就是商户的成本价

## 修复方案

### 修改文件
`StockControl-main/app.js`

### 修改位置 1：设备（有序列号）
**行号**：约 2632 行

**修改前**：
```javascript
const merchantInventory = new MerchantInventory({
  // ... 其他字段
  costPrice: product.costPrice,
  wholesalePrice: product.wholesalePrice,
  // ...
});
```

**修改后**：
```javascript
// 对于仓库调货，商户的成本价 = 仓库的批发价
const merchantInventory = new MerchantInventory({
  // ... 其他字段
  costPrice: product.wholesalePrice, // 商户的成本价 = 仓库的批发价
  wholesalePrice: product.wholesalePrice,
  // ...
});
```

### 修改位置 2：配件（无序列号）
**行号**：约 2738 行

**修改前**：
```javascript
for (let j = 0; j < quantity; j++) {
  const merchantInventory = new MerchantInventory({
    // ... 其他字段
    costPrice: product.costPrice,
    wholesalePrice: product.wholesalePrice,
    // ...
  });
  
  await merchantInventory.save();
}
```

**修改后**：
```javascript
// 对于仓库调货，商户的成本价 = 仓库的批发价
for (let j = 0; j < quantity; j++) {
  const merchantInventory = new MerchantInventory({
    // ... 其他字段
    costPrice: product.wholesalePrice, // 商户的成本价 = 仓库的批发价
    wholesalePrice: product.wholesalePrice,
    // ...
  });
  
  await merchantInventory.save();
}
```

## 价格逻辑说明

### 仓库产品价格结构
```
仓库产品 (ProductNew / AdminInventory)
├── costPrice: €100      (仓库的成本价 - 从供应商进货的价格)
├── wholesalePrice: €150 (仓库的批发价 - 卖给商户的价格)
└── retailPrice: €200    (建议零售价)
```

### 商户库存价格结构
```
商户库存 (MerchantInventory)
├── costPrice: €150      (商户的成本价 = 仓库的批发价)
├── wholesalePrice: €150 (商户的批发价 = 仓库的批发价)
└── retailPrice: €200    (商户的零售价)
```

### 价格传递链
```
供应商 → 仓库 → 商户 → 客户
        €100   €150   €200
        
仓库成本价 → 仓库批发价 → 商户零售价
           (商户成本价)
```

## 影响范围

### 已修复
1. ✅ 新的仓库订单确认收货时，成本价正确设置为批发价
2. ✅ 产品时间线显示正确的成本价

### 需要注意
1. **历史数据**：已经入库的产品不会自动更新
   - 如果需要修正历史数据，需要运行数据迁移脚本
   - 或者手动更新特定产品的成本价

2. **利润计算**：
   - 销售利润 = 销售价 - 成本价
   - 修复后，利润计算会更准确

## 测试步骤

### 1. 创建新的仓库订单
1. 登录仓库管理员账号
2. 创建一个新订单（选择一个产品）
3. 记录产品的批发价（如 €150）

### 2. 确认发货
1. 仓库管理员确认订单
2. 标记发货（选择序列号或输入数量）

### 3. 商户确认收货
1. 登录商户账号（如 MurrayDundrum）
2. 进入"仓库订单"
3. 确认收货

### 4. 验证成本价
1. 进入"我的库存"
2. 搜索刚才收货的产品（使用序列号或产品名称）
3. 点击"📊 时间线"按钮
4. 查看"产品入库"事件
5. ✅ 验证：成本价应该等于仓库的批发价（€150）

### 5. 验证产品时间线显示
**产品入库事件应该显示**：
```
📥 产品入库
产品入库到商户库存

来源: 仓库调货
成本价: €150.00  ← 应该等于仓库批发价
零售价: €200.00
数量: 1
```

## 数据迁移（可选）

如果需要修正历史数据，可以运行以下脚本：

```javascript
// fix-warehouse-order-cost-price.js
const mongoose = require('mongoose');
const MerchantInventory = require('./models/MerchantInventory');

async function fixWarehouseOrderCostPrice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 查找所有来源为仓库的库存记录
    const inventories = await MerchantInventory.find({
      source: 'warehouse',
      isActive: true
    });
    
    console.log(`找到 ${inventories.length} 条仓库调货记录`);
    
    let updatedCount = 0;
    
    for (const inventory of inventories) {
      // 如果成本价不等于批发价，则更新
      if (inventory.costPrice !== inventory.wholesalePrice) {
        console.log(`更新 ${inventory.productName} (${inventory.serialNumber || inventory._id})`);
        console.log(`  旧成本价: €${inventory.costPrice.toFixed(2)}`);
        console.log(`  新成本价: €${inventory.wholesalePrice.toFixed(2)}`);
        
        inventory.costPrice = inventory.wholesalePrice;
        await inventory.save();
        updatedCount++;
      }
    }
    
    console.log(`✅ 完成！更新了 ${updatedCount} 条记录`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

fixWarehouseOrderCostPrice();
```

## 相关文件
- `StockControl-main/app.js` (商户确认收货 API)
- `StockControl-main/models/MerchantInventory.js` (商户库存模型)
- `StockControl-main/public/merchant.html` (产品时间线显示)

## 注意事项
1. 修复后需要重启服务器
2. 新的订单会使用正确的成本价
3. 历史数据需要单独处理（可选）
4. 确保仓库产品的批发价设置正确

## 完成时间
2026年2月6日
