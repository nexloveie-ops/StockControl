# 库存编辑状态功能 & 时间线退款记录

## 功能概述

### 1. 库存编辑添加状态修改功能
在"我的库存"搜索结果的编辑功能中，添加了修改产品状态的选项。

### 2. 产品时间线添加退款记录
在产品时间线中显示销售和退款的完整历史记录。

## 修改的文件

### 前端修改 (merchant.html)

#### 1. 编辑模态框添加状态选择 (第910-920行)
```html
<div style="margin-bottom: 15px;">
  <label style="display: block; margin-bottom: 5px; font-weight: 600;">状态</label>
  <select id="editStatus" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
    <option value="active">✅ Active (正常)</option>
    <option value="damaged">⚠️ Damaged (损坏)</option>
    <option value="repairing">🔧 Repairing (维修中)</option>
    <option value="reserved">📌 Reserved (预留)</option>
    <option value="returned">↩️ Returned (退货)</option>
  </select>
</div>
```

#### 2. 编辑函数添加状态字段 (第7790行)
```javascript
document.getElementById('editStatus').value = item.status || 'active';
```

#### 3. 保存函数添加状态字段 (第7819行)
```javascript
status: document.getElementById('editStatus').value,
```

#### 4. 时间线添加退款事件颜色 (第7693行)
```javascript
const eventColor = event.type === 'created' ? '#10b981' : 
                   event.type === 'sold' ? '#3b82f6' : 
                   event.type === 'refunded' ? '#dc2626' :  // 新增：红色表示退款
                   event.type === 'transferred_out' ? '#f59e0b' : 
                   event.type === 'transferred_in' ? '#8b5cf6' : '#6b7280';
```

### 后端修改 (app.js)

#### 1. 更新库存API添加状态字段 (第6143行)
```javascript
const allowedFields = [
  'productName',
  'brand',
  'model',
  'color',
  'costPrice',
  'wholesalePrice',
  'retailPrice',
  'taxClassification',
  'condition',
  'status',  // 新增：允许更新状态
  'location',
  'notes'
];
```

#### 2. 时间线API添加退款记录 (第6320-6350行)
```javascript
// 2. 查找销售记录（包括已完成和已退款的）
const sales = await MerchantSale.find({
  'items.inventoryId': inventoryId,
  status: { $in: ['completed', 'refunded'] }
}).sort({ saleDate: 1 });

sales.forEach(sale => {
  const saleItem = sale.items.find(item => item.inventoryId && item.inventoryId.toString() === inventoryId);
  if (saleItem) {
    // 销售记录
    if (sale.status === 'completed' || sale.status === 'refunded') {
      timeline.push({
        type: 'sold',
        icon: '💰',
        title: '产品销售',
        date: sale.saleDate,
        description: `产品已售出`,
        details: `销售价格: €${saleItem.price.toFixed(2)}<br>
                  数量: ${saleItem.quantity}<br>
                  支付方式: ${sale.paymentMethod === 'CASH' ? '现金' : sale.paymentMethod === 'CARD' ? '刷卡' : '混合支付'}<br>
                  ${sale.customerPhone ? `客户电话: ${sale.customerPhone}` : ''}`
      });
    }
    
    // 退款记录
    if (sale.status === 'refunded' && sale.refundDate) {
      timeline.push({
        type: 'refunded',
        icon: '↩️',
        title: '产品退款',
        date: sale.refundDate,
        description: `产品已退款并退回库存`,
        details: `退款金额: €${sale.totalAmount.toFixed(2)}<br>
                  退款原因: ${sale.refundReason || '未填写'}<br>
                  退回成色: ${saleItem.refundCondition || saleItem.condition || '未知'}<br>
                  ${sale.customerPhone ? `客户电话: ${sale.customerPhone}` : ''}`
      });
    }
  }
});
```

## 功能说明

### 状态选项
- **Active (正常)**: 产品状态正常，可以销售
- **Damaged (损坏)**: 产品损坏，需要维修或报废
- **Repairing (维修中)**: 产品正在维修
- **Reserved (预留)**: 产品已预留给客户
- **Returned (退货)**: 产品已退货

### 时间线事件类型
- **📥 产品入库** (绿色 #10b981): 产品首次入库
- **💰 产品销售** (蓝色 #3b82f6): 产品售出
- **↩️ 产品退款** (红色 #dc2626): 产品退款并退回库存
- **📤 调货出库** (橙色 #f59e0b): 产品调出到其他商户
- **📥 调货入库** (紫色 #8b5cf6): 从其他商户调入

## 测试步骤

### 测试1: 修改产品状态

1. **登录商户账号**
   - 访问 merchant.html
   - 使用 murrayranelagh / password123 登录

2. **搜索产品**
   - 进入"我的库存"
   - 搜索序列号 1113333

3. **编辑产品**
   - 点击"✏️ 编辑"按钮
   - 查看"状态"下拉框
   - 选择不同的状态（如 Damaged）
   - 点击"💾 保存修改"

4. **验证修改**
   - 刷新页面
   - 再次搜索该产品
   - 确认状态已更新

### 测试2: 查看时间线退款记录

1. **查找已退款的产品**
   - 搜索序列号 111999（之前退款的 iPhone 11）

2. **打开时间线**
   - 点击"📊 时间线"按钮

3. **验证时间线内容**
   - 应该看到以下记录（按时间倒序）：
     - ↩️ 产品退款（红色边框）
       - 退款金额
       - 退款原因
       - 退回成色
     - 💰 产品销售（蓝色边框）
       - 销售价格
       - 支付方式
     - 📥 产品入库（绿色边框）
       - 来源
       - 成本价、零售价

4. **检查退款详情**
   - 退款记录应显示：
     - 退款金额: €XXX.XX
     - 退款原因: （如果有）
     - 退回成色: Pre-Owned / 二手
     - 客户电话: （如果有）

## 预期结果

### 状态修改功能
- ✅ 编辑模态框显示状态下拉框
- ✅ 状态下拉框有5个选项（Active, Damaged, Repairing, Reserved, Returned）
- ✅ 当前状态正确显示
- ✅ 修改后保存成功
- ✅ 刷新后状态保持修改后的值

### 时间线退款记录
- ✅ 时间线包含退款记录
- ✅ 退款记录显示红色边框和红色圆点
- ✅ 退款记录显示正确的图标 ↩️
- ✅ 退款详情包含：退款金额、退款原因、退回成色
- ✅ 时间线按时间倒序排列
- ✅ 销售和退款记录都显示

## 注意事项

1. **状态修改权限**
   - 只能修改自己商户的库存产品
   - 数据隔离中间件确保安全性

2. **时间线数据完整性**
   - 退款记录依赖 MerchantSale 表的 refundDate 字段
   - 如果销售记录没有 refundDate，退款记录不会显示

3. **浏览器刷新**
   - 修改 merchant.html 后需要刷新浏览器（Ctrl + Shift + R）
   - 修改 app.js 后需要重启服务器

## 技术细节

### 状态字段
- 字段名: `status`
- 类型: String
- 可选值: active, damaged, repairing, reserved, returned
- 默认值: active

### 退款记录查询
```javascript
const sales = await MerchantSale.find({
  'items.inventoryId': inventoryId,
  status: { $in: ['completed', 'refunded'] }
}).sort({ saleDate: 1 });
```

### 时间线排序
```javascript
timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
```

## 完成时间
2026-02-10
