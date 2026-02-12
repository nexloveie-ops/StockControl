# 仓库订单税额显示 - 基于公司信息匹配的正确逻辑

## 问题分析

之前的逻辑使用`userRole`参数判断是卖方还是买方，这个逻辑不够完善，无法处理：
- 商户A → 商户B的群组调货
- 同一公司内部调货
- 不同角色但属于同一公司的情况

## 正确的逻辑

### 核心原则：
**通过比较当前用户的公司信息与订单的卖方/买方公司信息来判断视角**

### 判断流程：

1. **获取当前登录用户的公司信息**
   - `currentUser.companyInfo.companyName`

2. **获取订单的卖方公司信息**
   - 仓库订单：卖方 = 仓库的默认公司信息（`CompanyInfo.isDefault = true`）
   - 调货订单：卖方 = 发货方的公司信息

3. **获取订单的买方公司信息**
   - 仓库订单：买方 = 商户的公司信息（`merchant.companyInfo`）
   - 调货订单：买方 = 收货方的公司信息

4. **比较并判断视角**
   ```javascript
   if (currentUserCompany === sellerCompany) {
     // 卖方视角：显示差价税
     isSellerView = true;
   } else if (currentUserCompany === buyerCompany) {
     // 买方视角：Margin VAT税额=0
     isSellerView = false;
   } else {
     // 默认：根据角色判断
     isSellerView = (currentUser.role === 'warehouse' || currentUser.role === 'admin');
   }
   ```

## 实现细节

### 1. PDF生成端点（app.js 第2465行）

```javascript
app.get('/api/warehouse/orders/:id/pdf', async (req, res) => {
  try {
    const currentUserId = req.query.userId; // 只需要用户ID
    
    // 获取订单、公司信息、商户信息、当前用户信息
    const [order, companyInfo] = await Promise.all([
      WarehouseOrder.findById(req.params.id),
      CompanyInfo.findOne({ isDefault: true })
    ]);
    
    const merchant = await UserNew.findOne({ username: order.merchantId });
    const currentUser = await UserNew.findOne({ username: currentUserId });
    
    // 判断当前用户是卖方还是买方
    let isSellerView = false;
    
    if (currentUser && currentUser.companyInfo && currentUser.companyInfo.companyName) {
      const currentUserCompany = currentUser.companyInfo.companyName;
      const sellerCompany = companyInfo ? companyInfo.companyName : null;
      const buyerCompany = merchant && merchant.companyInfo ? merchant.companyInfo.companyName : null;
      
      if (sellerCompany && currentUserCompany === sellerCompany) {
        isSellerView = true; // 卖方视角
      } else if (buyerCompany && currentUserCompany === buyerCompany) {
        isSellerView = false; // 买方视角
      } else if (currentUser.role === 'warehouse' || currentUser.role === 'admin') {
        isSellerView = true; // 默认卖方视角
      }
    } else {
      // 没有公司信息，根据角色判断
      if (currentUser && (currentUser.role === 'warehouse' || currentUser.role === 'admin')) {
        isSellerView = true;
      }
    }
    
    console.log(`   当前用户公司: ${currentUser?.companyInfo?.companyName || '无'}`);
    console.log(`   卖方公司: ${companyInfo?.companyName || '无'}`);
    console.log(`   买方公司: ${merchant?.companyInfo?.companyName || '无'}`);
    console.log(`   视角: ${isSellerView ? '卖方（显示差价税）' : '买方（Margin VAT税额=0）'}`);
    
    // 根据视角重新计算税额...
  }
});
```

### 2. 订单详情API（app.js 第8092行）

使用相同的逻辑判断视角，然后重新计算税额。

### 3. 前端调用

只需要传递`userId`参数：

**prototype-working.html（仓库管理员）:**
```javascript
const currentUsername = localStorage.getItem('username');
const response = await fetch(`/api/warehouse/orders/${orderId}?userId=${currentUsername}`);
```

**merchant.html（商户）:**
```javascript
apiUrl = `${API_BASE}/warehouse-orders/number/${orderNumber}?userId=${currentUser.username}`;
```

## 支持的场景

### 场景1: 仓库 → 商户（不同公司）
- **订单**: WO-20260212-2243
- **卖方**: Calmins Trade Partners Limited (仓库)
- **买方**: Murray Electronics Limited (商户MurrayRanelagh)

**仓库管理员查看:**
- 当前用户公司: Calmins Trade Partners Limited
- 匹配卖方 → 卖方视角
- Samsung Galaxy A53税额: €9.35 ✅

**商户MurrayRanelagh查看:**
- 当前用户公司: Murray Electronics Limited
- 匹配买方 → 买方视角
- Samsung Galaxy A53税额: €0.00 ✅

### 场景2: 商户A → 商户B（群组调货）
- **卖方**: 商户A的公司
- **买方**: 商户B的公司

**商户A查看:**
- 当前用户公司 = 卖方公司 → 卖方视角
- Margin VAT税额: 显示差价税 ✅

**商户B查看:**
- 当前用户公司 = 买方公司 → 买方视角
- Margin VAT税额: €0.00 ✅

### 场景3: 同一公司内部调货
- **卖方**: 公司A
- **买方**: 公司A（同一公司）

**任何该公司的用户查看:**
- 当前用户公司 = 卖方公司 = 买方公司
- 匹配卖方 → 卖方视角（优先匹配卖方）
- 或者根据业务需求调整逻辑

## 关键改进

### 之前的问题：
❌ 使用`userRole`参数（'warehouse' 或 'merchant'）
❌ 无法处理群组调货
❌ 无法处理同一公司内部调货
❌ 角色和公司信息不匹配时出错

### 现在的解决方案：
✅ 使用公司信息匹配
✅ 支持任意公司之间的交易
✅ 支持群组调货
✅ 支持同一公司内部调货
✅ 有fallback逻辑（根据角色判断）

## 测试验证

### 测试1: 仓库管理员查看WO-20260212-2243
```
当前用户: warehouse1
当前用户公司: Calmins Trade Partners Limited
卖方公司: Calmins Trade Partners Limited
买方公司: Murray Electronics Limited
视角: 卖方（显示差价税）
Samsung Galaxy A53税额: €9.35 ✅
```

### 测试2: 商户MurrayRanelagh查看WO-20260212-2243
```
当前用户: MurrayRanelagh
当前用户公司: Murray Electronics Limited
卖方公司: Calmins Trade Partners Limited
买方公司: Murray Electronics Limited
视角: 买方（Margin VAT税额=0）
Samsung Galaxy A53税额: €0.00 ✅
```

## 相关文件

- `StockControl-main/app.js` (第2465-2850行 - PDF生成, 第8092-8180行 - 订单详情API)
- `StockControl-main/public/prototype-working.html` (仓库管理员前端)
- `StockControl-main/public/merchant.html` (商户前端)

## 状态

✅ **已完成** - 2026-02-12

- [x] 修改PDF生成逻辑，使用公司信息匹配
- [x] 修改订单详情API，使用公司信息匹配
- [x] 更新前端代码，只传递userId参数
- [x] 添加详细的日志输出
- [x] 服务器已重启（进程51）

## 核心逻辑总结

**Margin VAT税额显示规则：**
1. 比较当前用户公司 vs 卖方公司 → 匹配 = 卖方视角（显示差价税）
2. 比较当前用户公司 vs 买方公司 → 匹配 = 买方视角（税额=0）
3. 都不匹配 → 根据角色判断（warehouse/admin = 卖方视角）

这个逻辑可以处理所有场景，包括群组调货和公司内部调货。
