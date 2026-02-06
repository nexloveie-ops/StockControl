# 前端调货功能完成

## 完成的工作

### 1. 群组库存页面修改
**文件**: `public/merchant.html`

#### 添加的功能：
- ✅ 在设备列表中添加"调货"按钮（批量调货）
- ✅ 在序列号详情中添加"调货"按钮（单个调货）
- ✅ 在配件列表中添加"调货"按钮
- ✅ 调货确认对话框
- ✅ 显示交易类型（内部调拨 vs 公司间销售）
- ✅ 显示双方公司信息
- ✅ 显示价格类型（成本价 vs 批发价）
- ✅ 显示金额汇总（含 VAT）

### 2. 新增 API
**文件**: `app.js`

#### GET /api/merchant/inventory/transfer/info
获取调货信息，用于前端显示交易类型和公司信息

**参数**:
- fromMerchantId: 调出方商户ID
- toMerchantId: 调入方商户ID

**响应**:
```json
{
  "success": true,
  "data": {
    "fromMerchantId": "MurrayRanelagh",
    "fromMerchantName": "Murray Ranelagh",
    "fromCompany": "Murray Electronics Limited",
    "toMerchantId": "MurrayDundrum",
    "toMerchantName": "Murray Dundrum",
    "toCompany": "Murray Electronics Limited",
    "transferType": "INTERNAL_TRANSFER"
  }
}
```

## 用户界面

### 调货确认对话框

#### 内部调拨示例
```
┌─────────────────────────────────────┐
│ 📦 内部调拨                    ×   │
├─────────────────────────────────────┤
│ ✅ 同一公司内部调拨                │
│ 这是内部调拨，将使用成本价，        │
│ 不会产生销售记录和发票。            │
├─────────────────────────────────────┤
│ 调出方: MurrayRanelagh              │
│ Murray Electronics Limited          │
│                                     │
│ 调入方: MurrayDundrum               │
│ Murray Electronics Limited          │
├─────────────────────────────────────┤
│ 产品清单:                           │
│ iPhone 12 128GB    €210 (成本价)   │
├─────────────────────────────────────┤
│ 小计: €210                          │
│ 总计: €210                          │
├─────────────────────────────────────┤
│ [取消]  [✅ 确认调货]               │
└─────────────────────────────────────┘
```


#### 公司间销售示例
```
┌─────────────────────────────────────┐
│ 💰 公司间销售                  ×   │
├─────────────────────────────────────┤
│ 💼 不同公司间销售                  │
│ 这是公司间销售，将使用批发价，      │
│ 完成后会自动生成销售发票。          │
├─────────────────────────────────────┤
│ 卖方: MurrayRanelagh                │
│ Murray Electronics Limited          │
│                                     │
│ 买方: TechStore001                  │
│ Tech Store Limited                  │
├─────────────────────────────────────┤
│ 产品清单:                           │
│ iPhone 12 128GB    €235 (批发价)   │
├─────────────────────────────────────┤
│ 小计: €235                          │
│ VAT (23%): €54.05                   │
│ 总计: €289.05                       │
├─────────────────────────────────────┤
│ [取消]  [💰 确认购买]               │
└─────────────────────────────────────┘
```

## 测试步骤

### 测试 1: 内部调拨

1. **登录 MurrayDundrum**
   - 访问: http://localhost:3000/merchant.html
   - 用户名: MurrayDundrum
   - 密码: password123

2. **进入群组库存**
   - 点击"群组库存"标签
   - 选择一个分类（例如：手机）

3. **发起调货**
   - 点击产品行的"🔄 调货"按钮
   - 或点击"查看序列号"，然后点击单个产品的"调货"按钮

4. **查看调货确认对话框**
   - 应该显示"📦 内部调拨"
   - 显示"✅ 同一公司内部调拨"
   - 双方公司都是"Murray Electronics Limited"
   - 价格显示为"成本价"
   - 不显示 VAT

5. **确认调货**
   - 点击"✅ 确认调货"按钮
   - 应该显示成功消息和调货单号

### 测试 2: 公司间销售

**前提**: 需要先修改 MurrayDundrum 的公司信息

1. **修改公司信息**
   - 登录管理员: http://localhost:3000/admin.html
   - 用户名: admin, 密码: admin123
   - 进入"用户管理"
   - 编辑 MurrayDundrum
   - 修改公司名称为"Tech Store Limited"
   - 保存

2. **登录 MurrayDundrum**
   - 访问: http://localhost:3000/merchant.html
   - 用户名: MurrayDundrum
   - 密码: password123

3. **进入群组库存**
   - 点击"群组库存"标签
   - 选择一个分类

4. **发起调货**
   - 点击"🔄 调货"按钮

5. **查看调货确认对话框**
   - 应该显示"💰 公司间销售"
   - 显示"💼 不同公司间销售"
   - 卖方: Murray Electronics Limited
   - 买方: Tech Store Limited
   - 价格显示为"批发价"
   - 显示 VAT (23%)

6. **确认购买**
   - 点击"💰 确认购买"按钮
   - 应该显示成功消息和订单号

## 功能特点

### 智能判断
- ✅ 自动判断交易类型（基于公司信息）
- ✅ 自动选择价格（成本价 vs 批发价）
- ✅ 自动计算 VAT（仅公司间销售）

### 用户体验
- ✅ 清晰的视觉区分（颜色、图标）
- ✅ 详细的交易信息展示
- ✅ 实时金额计算
- ✅ 友好的提示信息

### 数据完整性
- ✅ 包含所有必要的调货信息
- ✅ 支持备注功能
- ✅ 完整的错误处理

## 技术实现

### 前端函数

1. **requestSingleTransfer(item)**
   - 发起单个产品调货
   - 获取调货信息
   - 显示确认对话框

2. **requestTransferFromGroup(groupKey, group)**
   - 发起批量调货
   - 支持多个产品
   - 显示确认对话框

3. **showTransferConfirmDialog(items, transferInfo)**
   - 显示调货确认对话框
   - 根据交易类型显示不同UI
   - 计算金额汇总

4. **confirmTransferRequest()**
   - 提交调货请求
   - 调用后端 API
   - 处理响应

### 数据流

```
用户点击调货按钮
  ↓
调用 requestSingleTransfer 或 requestTransferFromGroup
  ↓
GET /api/merchant/inventory/transfer/info
  ↓
获取交易类型和公司信息
  ↓
显示调货确认对话框
  ↓
用户确认
  ↓
POST /api/merchant/inventory/transfer/request
  ↓
创建调货记录
  ↓
显示成功消息
```

## 下一步

### 待实现功能
1. ⏳ 调货管理页面（查看调货记录）
2. ⏳ 审批调货申请
3. ⏳ 确认收货
4. ⏳ 查看销售发票

### 建议优化
1. 添加调货历史记录
2. 支持批量选择产品
3. 添加调货状态通知
4. 支持取消调货申请

---
**完成日期**: 2026-02-05
**状态**: 前端调货功能已完成
**测试**: 可以开始测试
