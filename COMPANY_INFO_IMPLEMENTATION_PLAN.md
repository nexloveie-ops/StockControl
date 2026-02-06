# 公司信息与调货逻辑实现计划

## 概述
为用户添加公司信息，在群组调货时根据双方公司判断交易类型。

## 核心逻辑

```
同一公司 → 内部调拨（Transfer Order）
不同公司 → 销售发票（Sales Invoice）
```

## 已完成

### ✅ Phase 1: 数据模型
- UserNew 模型添加 companyInfo 字段：
  - companyName（公司名称）
  - registrationNumber（注册号）
  - vatNumber（税号）
  - address（地址）
  - contactPhone（电话）
  - contactEmail（邮箱）

## 待实现

### Phase 2: 用户管理界面
**文件**: `public/admin-user-management.html`

添加公司信息表单：
```html
<div id="companyFields" style="display: none;">
  <h4>公司信息</h4>
  <div class="form-group">
    <label>公司名称</label>
    <input type="text" id="userCompanyName">
  </div>
  <div class="form-group">
    <label>注册号</label>
    <input type="text" id="userRegistrationNumber">
  </div>
  <div class="form-group">
    <label>VAT号</label>
    <input type="text" id="userVatNumber">
  </div>
  <!-- 地址字段 -->
  <!-- 联系信息字段 -->
</div>
```

### Phase 3: 调货逻辑
**文件**: `app.js`

修改调货 API：
```javascript
// 创建调货请求
POST /api/merchant/inventory/transfer

// 1. 获取双方用户信息
const fromUser = await UserNew.findOne({ username: fromMerchantId });
const toUser = await UserNew.findOne({ username: toMerchantId });

// 2. 判断交易类型
const fromCompany = fromUser.companyInfo?.companyName;
const toCompany = toUser.companyInfo?.companyName;

let transferType, transferPrice;
if (fromCompany && toCompany && fromCompany === toCompany) {
  transferType = 'INTERNAL_TRANSFER';
  transferPrice = item.costPrice;  // 成本价
} else {
  transferType = 'INTER_COMPANY_SALE';
  transferPrice = item.wholesalePrice;  // 批发价
}

// 3. 创建调货单
const transfer = new InventoryTransfer({
  transferType,
  fromCompany: fromUser.companyInfo,
  toCompany: toUser.companyInfo,
  // ...
});
```

### Phase 4: 确认收货逻辑
```javascript
// 完成调货
POST /api/merchant/inventory/transfer/:id/complete

if (transfer.transferType === 'INTER_COMPANY_SALE') {
  // 生成销售发票
  const invoice = new SalesInvoice({
    seller: transfer.fromCompany,
    buyer: transfer.toCompany,
    items: transfer.items,
    // ...
  });
  await invoice.save();
}
```

### Phase 5: 前端界面
**文件**: `public/merchant.html`

调货确认对话框：
```javascript
function showTransferConfirmation(item, transferType) {
  if (transferType === 'INTERNAL_TRANSFER') {
    // 显示内部调拨确认
    alert('内部调拨 - 成本价转移');
  } else {
    // 显示销售确认
    alert('公司间销售 - 将生成发票');
  }
}
```

## 实现优先级

### 高优先级（必须）
1. ✅ UserNew 模型添加 companyInfo
2. ⏳ 用户管理界面添加公司信息表单
3. ⏳ 调货 API 判断交易类型
4. ⏳ 内部调拨逻辑

### 中优先级（重要）
5. ⏳ 公司间销售逻辑
6. ⏳ 自动生成销售发票
7. ⏳ 前端界面区分显示

### 低优先级（优化）
8. ⏳ 发票PDF生成
9. ⏳ 财务报表统计
10. ⏳ 审计日志

## 快速开始

### 1. 为现有用户添加公司信息
```javascript
// 运行脚本
node add-company-info.js

// 或手动在管理员控制台编辑用户
```

### 2. 测试内部调拨
```
1. 设置 MurrayRanelagh 和 MurrayDundrum 为同一公司
2. MurrayDundrum 从群组库存调货
3. 验证生成内部调拨单
```

### 3. 测试公司间销售
```
1. 设置 MurrayRanelagh 和 TechStore 为不同公司
2. TechStore 从群组库存调货
3. 验证生成销售发票
```

## 数据示例

### 公司信息示例
```javascript
{
  companyName: "Murray Mobile Ltd",
  registrationNumber: "IE123456",
  vatNumber: "IE1234567X",
  address: {
    street: "123 Main Street",
    city: "Dublin",
    state: "Dublin",
    postalCode: "D01 ABC1",
    country: "Ireland"
  },
  contactPhone: "+353 1 234 5678",
  contactEmail: "info@murraymobile.ie"
}
```

## 注意事项

1. **向后兼容**: 没有公司信息的用户默认为不同公司
2. **数据验证**: 公司名称应该唯一且规范
3. **权限控制**: 只有管理员可以修改公司信息
4. **测试充分**: 确保两种交易类型都正确处理

## 文档
- `COMPANY_BASED_TRANSFER_DESIGN.md` - 完整设计文档
- `COMPANY_INFO_IMPLEMENTATION_PLAN.md` - 本文档

## 状态
- ✅ Phase 1: 数据模型完成
- ⏳ Phase 2-5: 待实现

## 下一步
建议先实现用户管理界面的公司信息表单，然后再实现调货逻辑。
