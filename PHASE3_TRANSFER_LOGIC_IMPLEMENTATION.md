# Phase 3: 调货逻辑实现 ✅

## 核心修改

### 1. 修改调货创建 API ✅

**文件**: `app.js` - `POST /api/merchant/inventory/transfer/request`

**已实现的逻辑**:

```javascript
// 1. 获取双方公司信息
const fromCompany = fromUser.companyInfo?.companyName;
const toCompany = toUser.companyInfo?.companyName;

// 2. 判断交易类型
let transferType, priceType;
if (fromCompany && toCompany && fromCompany === toCompany) {
  transferType = 'INTERNAL_TRANSFER';
  priceType = 'cost'; // 使用成本价
  console.log(`✅ 内部调拨: ${fromCompany}`);
} else {
  transferType = 'INTER_COMPANY_SALE';
  priceType = 'wholesale'; // 使用批发价
  console.log(`💰 公司间销售: ${fromCompany} → ${toCompany}`);
}

// 3. 根据交易类型设置价格
for (const item of items) {
  const inventory = await MerchantInventory.findById(item.inventoryId);
  
  let transferPrice;
  if (transferType === 'INTERNAL_TRANSFER') {
    transferPrice = inventory.costPrice; // 成本价
  } else {
    transferPrice = inventory.wholesalePrice; // 批发价
  }
  
  transferItems.push({
    // ... 其他字段
    transferPrice: transferPrice
  });
  
  totalAmount += item.quantity * transferPrice;
}

// 4. 创建调货记录时包含公司信息和交易类型
const transfer = new InventoryTransfer({
  transferNumber,
  transferType, // 新增
  fromMerchant: fromMerchantId,
  fromMerchantName: fromUser.fullName || fromMerchantId,
  fromCompany: fromUser.companyInfo, // 新增
  toMerchant: toMerchantId,
  toMerchantName: toUser.fullName || toMerchantId,
  toCompany: toUser.companyInfo, // 新增
  // ... 其他字段
});
```

### 2. 修改完成调货 API

**文件**: `app.js` - `POST /api/merchant/inventory/transfer/complete`

**添加的逻辑**:

```javascript
// 完成调货后，如果是公司间销售，生成销售发票
if (transfer.transferType === 'INTER_COMPANY_SALE') {
  const SalesInvoice = require('./models/SalesInvoice');
  
  // 计算VAT
  const subtotal = transfer.totalAmount;
  const vatRate = 0.23; // 23% VAT
  const vatAmount = subtotal * vatRate;
  const totalAmount = subtotal + vatAmount;
  
  // 生成发票号
  const invoiceNumber = await SalesInvoice.generateInvoiceNumber();
  
  // 创建销售发票
  const invoice = new SalesInvoice({
    invoiceNumber,
    invoiceType: 'inter_company_sale',
    merchantId: transfer.fromMerchant,
    merchantName: transfer.fromMerchantName,
    
    // 卖方信息（调出方）
    seller: {
      name: transfer.fromCompany?.companyName || transfer.fromMerchantName,
      address: transfer.fromCompany?.address,
      vatNumber: transfer.fromCompany?.vatNumber,
      phone: transfer.fromCompany?.contactPhone,
      email: transfer.fromCompany?.contactEmail
    },
    
    // 买方信息（调入方）
    buyer: {
      name: transfer.toCompany?.companyName || transfer.toMerchantName,
      address: transfer.toCompany?.address,
      vatNumber: transfer.toCompany?.vatNumber,
      phone: transfer.toCompany?.contactPhone,
      email: transfer.toCompany?.contactEmail
    },
    
    // 产品列表
    items: transfer.items.map(item => ({
      productName: item.productName,
      brand: item.brand,
      model: item.model,
      category: item.category,
      serialNumber: item.serialNumber,
      color: item.color,
      condition: item.condition,
      quantity: item.quantity,
      unitPrice: item.transferPrice,
      totalPrice: item.quantity * item.transferPrice,
      taxClassification: 'VAT_23'
    })),
    
    // 金额
    subtotal: subtotal,
    vatRate: vatRate,
    vatAmount: vatAmount,
    totalAmount: totalAmount,
    
    // 付款信息
    paymentStatus: 'pending',
    paymentMethod: 'transfer',
    
    // 关联调货单
    relatedTransferId: transfer._id,
    relatedTransferNumber: transfer.transferNumber,
    
    status: 'completed',
    isActive: true
  });
  
  await invoice.save();
  
  // 更新调货记录
  transfer.salesInvoiceId = invoice._id;
  transfer.salesInvoiceNumber = invoice.invoiceNumber;
  transfer.financialInfo = {
    subtotal: subtotal,
    vatRate: vatRate,
    vatAmount: vatAmount,
    totalAmount: totalAmount,
    paymentStatus: 'pending'
  };
  
  await transfer.save();
  
  console.log(`✅ 已生成销售发票: ${invoice.invoiceNumber}`);
  
  return res.json({
    success: true,
    data: {
      transferId: transfer._id,
      transferType: 'INTER_COMPANY_SALE',
      salesInvoiceId: invoice._id,
      salesInvoiceNumber: invoice.invoiceNumber,
      totalAmount: totalAmount,
      message: '调货完成，销售发票已生成'
    }
  });
}

// 内部调拨
return res.json({
  success: true,
  data: {
    transferId: transfer._id,
    transferType: 'INTERNAL_TRANSFER',
    message: '内部调拨完成，库存已更新'
  }
});
```

## 实现步骤

### Step 1: 修改调货创建 API ✅
- ✅ 添加公司信息判断
- ✅ 根据交易类型设置价格
- ✅ 保存公司信息到调货记录

### Step 2: 修改完成调货 API ✅
- ✅ 检查交易类型
- ✅ 公司间销售自动生成发票
- ✅ 内部调拨直接完成
- ✅ 创建 InterCompanySalesInvoice 模型

### Step 3: 前端界面修改 ⏳
- 调货确认对话框显示交易类型
- 显示价格类型（成本价 vs 批发价）
- 显示公司信息

## 测试场景

### 场景 1: 内部调拨
```
前提条件:
- MurrayRanelagh: Murray Mobile Ltd
- MurrayDundrum: Murray Mobile Ltd

测试步骤:
1. MurrayDundrum 从群组库存选择产品
2. 发起调货
3. 验证: transferType = 'INTERNAL_TRANSFER'
4. 验证: 使用成本价
5. MurrayRanelagh 审批
6. MurrayDundrum 确认收货
7. 验证: 不生成销售发票
8. 验证: 库存转移完成
```

### 场景 2: 公司间销售
```
前提条件:
- MurrayRanelagh: Murray Mobile Ltd
- TechStore001: Tech Store Ltd

测试步骤:
1. TechStore001 从群组库存选择产品
2. 发起调货
3. 验证: transferType = 'INTER_COMPANY_SALE'
4. 验证: 使用批发价
5. MurrayRanelagh 审批
6. TechStore001 确认收货
7. 验证: 自动生成销售发票
8. 验证: 发票包含双方公司信息
9. 验证: 正确计算VAT
```

## 数据库字段映射

### InventoryTransfer
```javascript
{
  transferType: 'INTERNAL_TRANSFER' | 'INTER_COMPANY_SALE',
  fromCompany: { companyName, vatNumber, address, ... },
  toCompany: { companyName, vatNumber, address, ... },
  financialInfo: {
    subtotal, vatRate, vatAmount, totalAmount,
    paymentStatus, paymentMethod, paidAmount
  },
  salesInvoiceId: ObjectId,
  salesInvoiceNumber: String
}
```

### SalesInvoice
```javascript
{
  invoiceType: 'inter_company_sale',
  seller: { name, address, vatNumber, ... },
  buyer: { name, address, vatNumber, ... },
  relatedTransferId: ObjectId,
  relatedTransferNumber: String
}
```

## 注意事项

1. **向后兼容**: 没有公司信息的用户默认为不同公司（公司间销售）
2. **价格策略**: 
   - 内部调拨: costPrice
   - 公司间销售: wholesalePrice
3. **VAT计算**: 公司间销售需要计算23% VAT
4. **发票生成**: 只有公司间销售才生成发票
5. **权限检查**: 保持现有的群组和权限检查

## 状态
✅ 后端逻辑已完成
⏳ 前端界面待实现

## 已完成的工作

1. **调货创建 API** (`POST /api/merchant/inventory/transfer/request`)
   - ✅ 获取双方公司信息
   - ✅ 判断交易类型（INTERNAL_TRANSFER vs INTER_COMPANY_SALE）
   - ✅ 根据交易类型选择价格（成本价 vs 批发价）
   - ✅ 保存公司信息到调货记录
   - ✅ 返回交易类型和价格类型信息

2. **完成调货 API** (`POST /api/merchant/inventory/transfer/complete`)
   - ✅ 检查交易类型
   - ✅ 内部调拨：直接完成库存转移
   - ✅ 公司间销售：自动生成销售发票
   - ✅ 计算 VAT（23%）
   - ✅ 关联发票到调货记录
   - ✅ 更新财务信息

3. **新增模型**
   - ✅ 创建 `InterCompanySalesInvoice` 模型
   - ✅ 支持卖方/买方公司信息
   - ✅ 支持 VAT 计算
   - ✅ 关联调货单

## 下一步：前端界面修改

需要修改 `merchant.html` 中的调货相关功能：
1. 调货确认对话框显示交易类型
2. 区分显示内部调拨 vs 公司间销售
3. 显示价格类型和公司信息
4. 完成后显示发票信息（如果是公司间销售）
