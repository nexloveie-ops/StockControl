# 待修复问题列表

## 1. ✅ IMEI号码对应颜色
**状态**: 已完成
**修改**: 
- 修改了 `generateIdentifierInputs` 函数，为每个IMEI添加颜色输入框
- 修改了 `updateSerialNumber` 函数，存储序列号和颜色为对象
- 修改了 `validateDeviceSerialNumbers` 函数，支持新的数据结构
- 修改了 `confirmReceiving` 函数，正确处理序列号对象数组

## 2. ✅ 进货价格式问题
**状态**: 已完成
**修改**:
- 移除了价格验证中的字符串清理逻辑
- 直接使用 `parseFloat()` 处理价格
- 保留小数点，不再强制删除 `.00`

## 3. ⏳ 产品追溯重复记录
**状态**: 需要修复
**问题**: 序列号 350152502265338 应该有2条记录，但显示了6条
**原因**: 
- 在 `app.get('/api/admin/products/tracking')` 中
- 代码遍历发票的所有items，但没有正确过滤匹配的产品
- 当一个发票包含多个产品时，会为每个产品都创建重复记录

**修复方案**:
```javascript
// 当前代码问题：
purchaseInvoices.forEach(invoice => {
  invoice.items.forEach(item => {
    if (productIds.some(id => id.toString() === item.product.toString())) {
      // 这里会为所有匹配的产品创建记录
      // 如果发票有3个产品，每个产品都会创建3条记录
    }
  });
});

// 应该改为：
purchaseInvoices.forEach(invoice => {
  invoice.items.forEach(item => {
    // 只为当前item的产品创建记录
    const matchedProduct = products.find(p => p._id.toString() === item.product.toString());
    if (matchedProduct) {
      // 创建记录
    }
  });
});
```

## 4. ⏳ 采购发票付款功能
**状态**: 需要添加
**需求**: 
- 供货商管理 → 采购发票记录 → 点击发票编号 → 显示发票详情
- 添加"确认付款"按钮
- 支持混合支付（现金 + 银行转账 + 信用卡）
- 类似销售发票的付款功能

**实现步骤**:
1. 修改采购发票详情显示，添加付款按钮
2. 创建付款模态框，支持混合支付
3. 添加后端API: `POST /api/admin/purchase-invoices/:invoiceId/payment`
4. 更新采购发票状态（pending → partial → paid）
5. 显示付款记录和剩余金额

## 修改文件
- `StockControl-main/public/prototype-working.html` - 前端修改
- `StockControl-main/app-new.js` - 后端API修改

## 更新日期
2026-02-02
