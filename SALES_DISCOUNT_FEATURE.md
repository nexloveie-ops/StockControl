# 销售结账折扣/抹零功能

## 功能描述
在商户销售业务结账时，允许手动调整实际收款金额，用于：
- 💰 **抹零**：将零头抹掉（如 €12.97 → €12.90）
- 🎁 **打折**：给客户优惠（如 €100 → €90）
- 📊 **灵活定价**：根据实际情况调整最终价格

## 界面变更

### 结账模态框
```
购物车明细
├── 产品列表
└── 金额汇总
    ├── 小计: €100.00 (原始总额，只读)
    └── 实际收款: €[可编辑] (最终收款金额)
        └── 💰 优惠 €10.00 (10% 折扣) [自动计算显示]
```

### 实际收款输入框
- **位置**：购物车明细底部
- **样式**：蓝色边框，大字体，右对齐
- **功能**：
  - 可手动输入任意金额
  - 自动显示折扣信息
  - 支持小数点后两位

### 折扣信息显示
- **优惠情况**（实际收款 < 小计）：
  ```
  💰 优惠 €10.00 (10.0% 折扣)
  ```
  颜色：绿色 (#059669)

- **异常情况**（实际收款 > 小计）：
  ```
  ⚠️ 实际收款大于小计 €5.00
  ```
  颜色：红色 (#dc2626)

- **无折扣**（实际收款 = 小计）：
  不显示折扣信息

## 功能逻辑

### 1. 初始化
打开结账模态框时：
```javascript
const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
document.getElementById('checkoutSubtotal').textContent = '€' + total.toFixed(2);
document.getElementById('actualAmount').value = total.toFixed(2);  // 默认等于小计
```

### 2. 实时更新
当修改实际收款金额时：
```javascript
function updateActualAmount() {
  const subtotal = cart.reduce(...);
  const actualAmount = parseFloat(document.getElementById('actualAmount').value) || 0;
  const difference = subtotal - actualAmount;
  
  // 计算折扣百分比
  const discountPercent = ((difference / subtotal) * 100).toFixed(1);
  
  // 显示折扣信息
  if (difference > 0) {
    显示: "💰 优惠 €X.XX (X.X% 折扣)"
  }
}
```

### 3. 混合支付自动调整
当选择混合支付时，自动按比例分配现金和刷卡金额：
```javascript
if (selectedPaymentMethod === 'MIXED') {
  const cashRatio = parseFloat(document.getElementById('cashAmount').value) / subtotal;
  document.getElementById('cashAmount').value = (actualAmount * cashRatio).toFixed(2);
  document.getElementById('cardAmount').value = (actualAmount * (1 - cashRatio)).toFixed(2);
}
```

### 4. 提交销售
```javascript
const saleData = {
  merchantId,
  customerPhone,
  paymentMethod,
  items: [...],
  totalAmount: actualAmount,    // 实际收款金额
  subtotal: subtotal,           // 原始小计
  discount: discount > 0 ? discount : 0  // 折扣金额
};
```

## 数据模型

### MerchantSale 模型新增字段
```javascript
{
  subtotal: {
    type: Number,
    default: null,  // 原始小计（打折前）
    min: 0
  },
  discount: {
    type: Number,
    default: 0,     // 折扣金额
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true, // 实际收款金额（打折后）
    min: 0
  }
}
```

### 字段关系
```
subtotal - discount = totalAmount

例如：
subtotal: €100.00
discount: €10.00
totalAmount: €90.00
```

## API 变更

### POST /api/merchant/sales/complete

#### 请求参数新增
```json
{
  "merchantId": "merchant001",
  "items": [...],
  "totalAmount": 90.00,    // 实际收款金额
  "subtotal": 100.00,      // 原始小计（新增）
  "discount": 10.00,       // 折扣金额（新增）
  "paymentMethod": "CASH"
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "saleId": "...",
    "totalAmount": 90.00,
    "totalTax": 16.83
  }
}
```

## 使用场景

### 场景 1：抹零
```
购物车小计: €12.97
实际收款: €12.90
折扣: €0.07 (0.5% 折扣)
```

### 场景 2：整数优惠
```
购物车小计: €99.50
实际收款: €95.00
折扣: €4.50 (4.5% 折扣)
```

### 场景 3：百分比折扣
```
购物车小计: €200.00
实际收款: €180.00
折扣: €20.00 (10.0% 折扣)
```

### 场景 4：混合支付 + 折扣
```
购物车小计: €100.00
实际收款: €90.00
折扣: €10.00

支付方式：混合
- 现金: €45.00
- 刷卡: €45.00
总计: €90.00 ✓
```

## 验证规则

### 前端验证
1. **实际收款 > 0**
   ```javascript
   if (actualAmount <= 0) {
     alert('实际收款金额必须大于 0');
     return;
   }
   ```

2. **混合支付金额匹配**
   ```javascript
   if (selectedPaymentMethod === 'MIXED') {
     if (Math.abs((cash + card) - actualAmount) > 0.01) {
       alert('混合支付金额不正确');
       return;
     }
   }
   ```

### 后端验证
- 保持现有验证逻辑
- subtotal 和 discount 为可选字段
- 向后兼容（旧销售记录没有这些字段）

## 报表影响

### 销售记录显示
- 显示实际收款金额（totalAmount）
- 如果有折扣，显示原价和折扣信息
- 利润计算基于实际收款金额

### 财务报表
- 收入：使用 totalAmount（实际收款）
- 折扣：单独统计 discount 字段
- 税额：基于原始价格计算（不受折扣影响）

## 测试步骤

### 1. 基本折扣测试
1. 登录商户账号：merchant001 / merchant123
2. 进入"销售业务"
3. 添加产品到购物车（如 iPhone 14, €650）
4. 点击"💳 结账"
5. 修改实际收款金额为 €600
6. 验证显示：💰 优惠 €50.00 (7.7% 折扣)
7. 选择支付方式，点击"✅ 确认支付"
8. 验证销售成功

### 2. 抹零测试
1. 添加配件到购物车（总计 €12.97）
2. 点击"💳 结账"
3. 修改实际收款为 €12.90
4. 验证显示：💰 优惠 €0.07 (0.5% 折扣)
5. 完成支付

### 3. 混合支付 + 折扣测试
1. 添加产品到购物车（总计 €100）
2. 点击"💳 结账"
3. 修改实际收款为 €90
4. 选择"💰 混合"支付
5. 验证现金和刷卡金额自动调整为各 €45
6. 完成支付

### 4. 无折扣测试
1. 添加产品到购物车
2. 点击"💳 结账"
3. 不修改实际收款金额
4. 验证不显示折扣信息
5. 完成支付

## 修改文件
- `StockControl-main/public/merchant.html` (结账界面和逻辑)
- `StockControl-main/models/MerchantSale.js` (数据模型)
- `StockControl-main/app.js` (销售 API)

## 状态
✅ 已完成 - 2026-02-06

## 相关功能
- 销售业务购物车
- 混合支付功能
- 销售记录查询
- 财务报表
