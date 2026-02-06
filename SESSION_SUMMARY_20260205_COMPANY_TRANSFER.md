# 会话总结 - 2026-02-05 - 公司信息调货功能

## 完成的工作

### 1. Phase 3 后端逻辑实现 ✅

#### 1.1 调货创建 API 修改
**文件**: `app.js` - `POST /api/merchant/inventory/transfer/request`

**实现的功能**:
- ✅ 获取双方用户的公司信息
- ✅ 判断交易类型：
  - 同一公司 → `INTERNAL_TRANSFER`（内部调拨）
  - 不同公司 → `INTER_COMPANY_SALE`（公司间销售）
- ✅ 根据交易类型选择价格：
  - 内部调拨：使用 `costPrice`（成本价）
  - 公司间销售：使用 `wholesalePrice`（批发价）
- ✅ 保存公司信息到调货记录（fromCompany, toCompany）
- ✅ 返回交易类型和价格类型信息

**关键代码**:
```javascript
// 判断交易类型
const fromCompany = fromUser.companyInfo?.companyName;
const toCompany = toUser.companyInfo?.companyName;

let transferType, priceType;
if (fromCompany && toCompany && fromCompany === toCompany) {
  transferType = 'INTERNAL_TRANSFER';
  priceType = 'cost';
} else {
  transferType = 'INTER_COMPANY_SALE';
  priceType = 'wholesale';
}

// 根据交易类型选择价格
let transferPrice;
if (transferType === 'INTERNAL_TRANSFER') {
  transferPrice = inventory.costPrice;
} else {
  transferPrice = inventory.wholesalePrice;
}
```

#### 1.2 完成调货 API 修改
**文件**: `app.js` - `POST /api/merchant/inventory/transfer/complete`

**实现的功能**:
- ✅ 检查调货记录的交易类型
- ✅ 内部调拨：直接完成库存转移
- ✅ 公司间销售：自动生成销售发票
  - 计算 VAT（23%）
  - 包含卖方/买方公司信息
  - 关联调货单
  - 更新财务信息
- ✅ 返回不同的响应信息

**关键代码**:
```javascript
if (transfer.transferType === 'INTER_COMPANY_SALE') {
  // 计算 VAT
  const subtotal = transfer.totalAmount;
  const vatRate = 0.23;
  const vatAmount = subtotal * vatRate;
  const totalAmount = subtotal + vatAmount;
  
  // 创建销售发票
  const invoice = new InterCompanySalesInvoice({
    invoiceNumber,
    seller: { /* 调出方公司信息 */ },
    buyer: { /* 调入方公司信息 */ },
    items: transfer.items,
    subtotal, vatRate, vatAmount, totalAmount,
    relatedTransferId: transfer._id
  });
  
  await invoice.save();
}
```

#### 1.3 新增数据模型
**文件**: `models/InterCompanySalesInvoice.js`

**模型字段**:
- `invoiceNumber`: 发票编号
- `invoiceType`: 发票类型（inter_company_sale）
- `merchantId`, `merchantName`: 卖方商户信息
- `seller`: 卖方公司信息（name, address, vatNumber, phone, email）
- `buyer`: 买方公司信息（name, address, vatNumber, phone, email）
- `items`: 产品列表（productName, brand, model, quantity, unitPrice, etc.）
- `subtotal`, `vatRate`, `vatAmount`, `totalAmount`: 金额信息
- `paymentStatus`, `paymentMethod`: 付款信息
- `relatedTransferId`, `relatedTransferNumber`: 关联调货单
- `status`: 发票状态

**特点**:
- 专门用于公司间销售的发票
- 包含完整的卖方/买方公司信息
- 支持 VAT 计算
- 关联调货记录

## 业务逻辑

### 场景 1: 内部调拨（同一公司）
```
前提条件:
- MurrayRanelagh: Murray Mobile Ltd
- MurrayDundrum: Murray Mobile Ltd

流程:
1. MurrayDundrum 从群组库存选择产品
2. 发起调货 → 系统检测：同一公司
3. 创建调货单（transferType: INTERNAL_TRANSFER）
4. 使用成本价（costPrice）
5. MurrayRanelagh 审批
6. MurrayDundrum 确认收货
7. 库存转移完成，不生成发票
```

### 场景 2: 公司间销售（不同公司）
```
前提条件:
- MurrayRanelagh: Murray Mobile Ltd
- TechStore001: Tech Store Ltd

流程:
1. TechStore001 从群组库存选择产品
2. 发起调货 → 系统检测：不同公司
3. 创建销售订单（transferType: INTER_COMPANY_SALE）
4. 使用批发价（wholesalePrice）
5. MurrayRanelagh 审批
6. TechStore001 确认收货
7. 自动生成销售发票
   - 包含双方公司信息
   - 计算 VAT（23%）
   - 关联调货单
```

## 数据流

### 调货创建
```
用户发起调货
  ↓
获取双方用户信息
  ↓
比较公司名称
  ↓
判断交易类型
  ↓
选择价格策略
  ↓
创建调货记录（包含公司信息和交易类型）
  ↓
返回结果
```

### 完成调货
```
用户确认收货
  ↓
验证权限和状态
  ↓
开始事务
  ↓
更新库存
  ↓
检查交易类型
  ↓
如果是公司间销售：
  - 计算 VAT
  - 生成销售发票
  - 关联调货单
  - 更新财务信息
  ↓
提交事务
  ↓
返回结果
```

## 技术细节

### 价格策略
- **内部调拨**: `costPrice`（成本价）
  - 不产生利润
  - 简化流程
  - 无需开具发票

- **公司间销售**: `wholesalePrice`（批发价）
  - 产生利润
  - 需要开具发票
  - 计算 VAT

### VAT 计算
```javascript
const subtotal = transfer.totalAmount;  // 小计（不含税）
const vatRate = 0.23;                   // 23% VAT
const vatAmount = subtotal * vatRate;   // VAT 金额
const totalAmount = subtotal + vatAmount; // 总金额（含税）
```

### 公司信息判断
```javascript
const fromCompany = fromUser.companyInfo?.companyName;
const toCompany = toUser.companyInfo?.companyName;

// 同一公司
if (fromCompany && toCompany && fromCompany === toCompany) {
  transferType = 'INTERNAL_TRANSFER';
}
// 不同公司或未设置公司信息
else {
  transferType = 'INTER_COMPANY_SALE';
}
```

## 向后兼容

- ✅ 没有公司信息的用户默认为不同公司（公司间销售）
- ✅ 保持现有的群组和权限检查
- ✅ 不影响现有的调货流程

## 下一步工作

### 前端界面修改（待实现）
**文件**: `public/merchant.html`

需要修改的功能：
1. **调货确认对话框**
   - 显示交易类型（内部调拨 vs 公司间销售）
   - 显示价格类型（成本价 vs 批发价）
   - 显示双方公司信息
   - 显示预计金额（含 VAT）

2. **调货列表**
   - 区分显示内部调拨和公司间销售
   - 显示关联的发票号（如果有）

3. **完成调货后**
   - 内部调拨：显示"库存已更新"
   - 公司间销售：显示"发票已生成"和发票号

### 测试场景

#### 测试 1: 内部调拨
```
1. 设置 MurrayRanelagh 和 MurrayDundrum 的公司信息为 "Murray Mobile Ltd"
2. MurrayDundrum 从群组库存选择产品
3. 发起调货
4. 验证：transferType = 'INTERNAL_TRANSFER'
5. 验证：使用成本价
6. MurrayRanelagh 审批
7. MurrayDundrum 确认收货
8. 验证：不生成销售发票
9. 验证：库存转移完成
```

#### 测试 2: 公司间销售
```
1. 设置 MurrayRanelagh 公司信息为 "Murray Mobile Ltd"
2. 设置 TechStore001 公司信息为 "Tech Store Ltd"
3. TechStore001 从群组库存选择产品
4. 发起调货
5. 验证：transferType = 'INTER_COMPANY_SALE'
6. 验证：使用批发价
7. MurrayRanelagh 审批
8. TechStore001 确认收货
9. 验证：自动生成销售发票
10. 验证：发票包含双方公司信息
11. 验证：正确计算 VAT
```

## 文件修改清单

### 新增文件
- ✅ `models/InterCompanySalesInvoice.js` - 公司间销售发票模型

### 修改文件
- ✅ `app.js` - 调货创建和完成 API
- ✅ `PHASE3_TRANSFER_LOGIC_IMPLEMENTATION.md` - 更新实现状态

### 已存在的相关文件
- `models/InventoryTransfer.js` - 调货记录模型（已包含所需字段）
- `models/UserNew.js` - 用户模型（已包含 companyInfo）
- `COMPANY_BASED_TRANSFER_DESIGN.md` - 设计文档
- `public/admin.html` - 管理员界面（已包含公司信息表单）
- `public/admin-user-management.js` - 用户管理（已处理公司信息）

## 总结

✅ **Phase 3 后端逻辑已完成**
- 调货创建 API 支持公司信息判断和价格策略
- 完成调货 API 支持自动生成销售发票
- 新增 InterCompanySalesInvoice 模型
- 完整的业务逻辑实现

⏳ **待完成：前端界面修改**
- 调货确认对话框显示交易类型
- 区分显示内部调拨和公司间销售
- 显示发票信息

🎯 **业务价值**
- 符合财务规范
- 区分内部调拨和外部销售
- 自动化发票生成
- 清晰的交易记录

---
**日期**: 2026-02-05
**状态**: Phase 3 后端完成，前端待实现
