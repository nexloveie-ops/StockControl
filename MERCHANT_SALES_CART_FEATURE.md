# 商户销售业务 - 购物车模式

## 更新日期
2026-02-02

## 功能概述
重新设计商户销售业务流程，实现购物车式销售界面，支持按分类浏览、批量添加、混合支付等功能。

## 主要功能

### 1. 按分类浏览产品
- 首页显示所有有库存的产品分类
- 每个分类卡片显示产品种类数和总库存数
- 点击分类进入该分类的产品列表

### 2. 产品列表
- 显示分类下所有可销售产品
- 显示产品名称、品牌、型号、颜色、库存、价格
- 区分设备和配件：
  - **设备**（有序列号/IMEI）：显示"选择设备"按钮
  - **配件**：显示"加入购物车"按钮

### 3. 购物车功能
- 实时显示购物车商品数量和总金额
- 支持多个产品批量结账
- 配件类产品：点击一次数量+1
- 设备类产品：需要选择具体的IMEI/SN号码
- 支持清空购物车

### 4. 结账流程
- 显示购物车明细
- 输入客户电话（选填）
- 选择支付方式：
  - 💵 现金
  - 💳 刷卡
  - 💰 混合支付（现金+刷卡）
- 混合支付时需要输入现金和刷卡金额
- 自动验证支付金额是否匹配

### 5. 支付方式

#### 现金支付
- 全额现金支付
- 记录为 `CASH`

#### 刷卡支付
- 全额刷卡支付
- 记录为 `CARD`

#### 混合支付
- 部分现金 + 部分刷卡
- 需要输入两种支付方式的具体金额
- 系统自动验证总额是否匹配
- 记录为 `MIXED`，同时保存 `cashAmount` 和 `cardAmount`

## 数据模型

### MerchantSale（商户销售记录）

```javascript
{
  merchantId: String,           // 商户ID
  customerPhone: String,        // 客户电话（可选）
  paymentMethod: String,        // 支付方式：CASH/CARD/MIXED
  cashAmount: Number,           // 现金金额
  cardAmount: Number,           // 刷卡金额
  items: [{                     // 销售项目
    inventoryId: ObjectId,      // 库存ID
    productName: String,        // 产品名称
    quantity: Number,           // 数量
    price: Number,              // 单价
    costPrice: Number,          // 成本价
    taxClassification: String,  // 税务分类
    taxAmount: Number,          // 税额
    serialNumber: String        // 序列号（设备）
  }],
  totalAmount: Number,          // 总金额
  totalTax: Number,             // 总税额
  saleDate: Date,               // 销售日期
  status: String                // 状态：completed/refunded/cancelled
}
```

## API 端点

### POST /api/merchant/sales/complete
完成销售（购物车结账）

**请求体**:
```json
{
  "merchantId": "merchant_001",
  "customerPhone": "0851234567",
  "paymentMethod": "MIXED",
  "cashAmount": 50.00,
  "cardAmount": 50.00,
  "items": [
    {
      "inventoryId": "65abc...",
      "productName": "Type-C Cable 1M",
      "quantity": 2,
      "price": 5.00,
      "taxClassification": "VAT_23",
      "serialNumber": null
    },
    {
      "inventoryId": "65def...",
      "productName": "iPhone 13",
      "quantity": 1,
      "price": 800.00,
      "taxClassification": "MARGIN_VAT_0",
      "serialNumber": "IMEI123456789"
    }
  ],
  "totalAmount": 100.00
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "saleId": "65xyz...",
    "totalAmount": 100.00,
    "totalTax": 18.70
  }
}
```

## 税额计算

### VAT 23%
```
销项税 = 销售额 × 23/123
```

### Service VAT 13.5%
```
服务税 = 金额 × 13.5/113.5
```

### Margin VAT
```
应缴税 = (销售额 - 成本) × 23/123
```

## 用户界面流程

### 流程图
```
1. 进入销售业务
   ↓
2. 显示产品分类列表
   ↓
3. 点击分类 → 显示该分类产品
   ↓
4. 选择产品：
   - 配件：直接加入购物车
   - 设备：选择IMEI/SN后加入购物车
   ↓
5. 购物车显示商品数量和总额
   ↓
6. 点击"结账"按钮
   ↓
7. 显示结账界面：
   - 购物车明细
   - 输入客户电话（可选）
   - 选择支付方式
   - 混合支付时输入金额
   ↓
8. 点击"确认支付"
   ↓
9. 后端处理：
   - 验证库存
   - 减少库存数量
   - 计算税额
   - 创建销售记录
   - 使用事务确保数据一致性
   ↓
10. 显示成功消息
    ↓
11. 清空购物车
    ↓
12. 返回分类列表
```

## 特殊处理

### 设备销售
- 设备必须有序列号或IMEI
- 销售时需要选择具体的设备
- 每个设备只能销售一次
- 序列号记录在销售记录中

### 配件销售
- 配件按数量销售
- 点击一次加入购物车，数量+1
- 不超过库存最大数量

### 库存管理
- 销售时自动减少库存
- 使用MongoDB事务确保一致性
- 库存不足时拒绝销售

## 事务处理

使用MongoDB事务确保数据一致性：

```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 1. 检查并减少库存
  // 2. 创建销售记录
  // 3. 提交事务
  await session.commitTransaction();
} catch (error) {
  // 回滚事务
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

## 测试场景

### 场景 1：配件销售
1. 选择"数据线"分类
2. 添加"Type-C Cable 1M" × 5
3. 添加"Lightning Cable 2M" × 3
4. 结账，选择现金支付
5. 验证库存减少

### 场景 2：设备销售
1. 选择"手机"分类
2. 点击"iPhone 13"
3. 选择具体的IMEI号码
4. 加入购物车
5. 结账，选择刷卡支付
6. 验证该设备库存减少

### 场景 3：混合销售
1. 添加配件 × 2（€10）
2. 添加设备 × 1（€800）
3. 总计：€810
4. 选择混合支付
5. 现金：€400，刷卡：€410
6. 验证支付金额匹配
7. 完成销售

### 场景 4：混合支付验证
1. 添加产品，总计€100
2. 选择混合支付
3. 输入现金€50，刷卡€40
4. 系统提示金额不匹配（€90 ≠ €100）
5. 修正为现金€50，刷卡€50
6. 成功完成销售

## 相关文件

- `StockControl-main/public/merchant.html` - 前端界面
- `StockControl-main/app.js` - 销售API（约3471-3600行）
- `StockControl-main/models/MerchantSale.js` - 销售记录模型
- `StockControl-main/models/MerchantInventory.js` - 库存模型

## 注意事项

1. **库存一致性**：使用事务确保库存和销售记录同步
2. **支付验证**：混合支付时严格验证金额
3. **设备唯一性**：设备销售需要记录序列号
4. **税额计算**：根据税务分类自动计算税额
5. **客户信息**：客户电话为选填项，便于后续查询

## 未来优化

1. 支持退货/退款功能
2. 支持销售记录打印
3. 支持客户管理（常用客户）
4. 支持优惠券/折扣
5. 支持销售统计报表
6. 支持多设备批量选择
7. 支持扫码枪快速添加产品
