# 快速测试：公司信息调货功能

## 测试前准备

### 1. 检查当前状态
运行测试脚本查看当前配置：
```bash
node test-company-transfer.js
```

### 2. 当前用户公司信息
根据测试结果，两个用户都设置为同一公司：
- **MurrayRanelagh**: Murray Electronics Limited (VAT: IE3947563IH)
- **MurrayDundrum**: Murray Electronics Limited (VAT: IE3947563IH)

这意味着他们之间的调货将是**内部调拨**。

## 测试场景

### 场景 1: 内部调拨（当前配置）✅

**前提条件**:
- MurrayRanelagh 和 MurrayDundrum 属于同一公司

**测试步骤**:

1. **登录 MurrayDundrum**
   - 访问: http://localhost:3000/merchant.html
   - 用户名: MurrayDundrum
   - 密码: password123

2. **查看群组库存**
   - 点击左侧菜单 "群组库存"
   - 应该能看到 MurrayRanelagh 的库存（6 条记录）

3. **选择产品发起调货**
   - 选择一个产品（例如：Lightning Cable）
   - 点击"调货"按钮
   - 查看调货确认对话框

4. **验证内部调拨信息**
   - 交易类型应显示: "内部调拨"
   - 价格应该是: €1.50（成本价）
   - 公司信息: Murray Electronics Limited（相同）

5. **提交调货申请**
   - 点击"确认调货"
   - 应该显示: "内部调拨申请已提交，等待对方审批"

6. **登录 MurrayRanelagh 审批**
   - 访问: http://localhost:3000/merchant.html
   - 用户名: MurrayRanelagh
   - 密码: password123
   - 点击"调货管理" → "待审批"
   - 审批调货申请

7. **MurrayDundrum 确认收货**
   - 切换回 MurrayDundrum
   - 点击"调货管理" → "待收货"
   - 确认收货

8. **验证结果**
   - 应该显示: "内部调拨完成，库存已更新"
   - **不应该**生成销售发票
   - 库存应该转移到 MurrayDundrum

### 场景 2: 公司间销售（需要修改配置）

**前提条件**:
需要修改其中一个用户的公司信息

#### 步骤 A: 修改公司信息

1. **登录管理员账号**
   - 访问: http://localhost:3000/admin.html
   - 用户名: admin
   - 密码: admin123

2. **修改 MurrayDundrum 的公司信息**
   - 点击"用户管理"
   - 找到 MurrayDundrum，点击"编辑"
   - 修改公司信息：
     ```
     公司名称: Tech Store Limited
     公司注册号: IE1234567
     VAT号: IE1234567TH
     地址:
       街道: 456 Tech Street
       城市: Dublin
       邮编: D02 XY12
       国家: Ireland
     联系电话: +353 1 234 5678
     联系邮箱: info@techstore.ie
     ```
   - 点击"保存"

3. **验证修改**
   - 再次运行测试脚本：
     ```bash
     node test-company-transfer.js
     ```
   - 应该显示：
     ```
     💰 不同公司 → 公司间销售
     调出方: Murray Electronics Limited
     调入方: Tech Store Limited
     ```

#### 步骤 B: 测试公司间销售

1. **登录 MurrayDundrum**
   - 访问: http://localhost:3000/merchant.html
   - 用户名: MurrayDundrum
   - 密码: password123

2. **查看群组库存**
   - 点击"群组库存"
   - 选择一个产品（例如：iPhone 12 128GB）

3. **发起调货**
   - 点击"调货"按钮
   - 查看调货确认对话框

4. **验证公司间销售信息**
   - 交易类型应显示: "公司间销售"
   - 价格应该是: €235（批发价）
   - 卖方: Murray Electronics Limited
   - 买方: Tech Store Limited
   - 小计: €235
   - VAT (23%): €54.05
   - 总计: €289.05

5. **提交销售订单**
   - 点击"确认购买"
   - 应该显示: "公司间销售订单已创建，等待对方审批"

6. **MurrayRanelagh 审批**
   - 登录 MurrayRanelagh
   - 审批销售订单

7. **MurrayDundrum 确认收货**
   - 切换回 MurrayDundrum
   - 确认收货

8. **验证结果**
   - 应该显示: "调货完成，销售发票已生成"
   - 应该显示发票号（例如：SI-1738761234567-0001）
   - 显示金额信息：
     - 小计: €235
     - VAT: €54.05
     - 总计: €289.05

9. **查看销售发票**
   - 可以通过 API 查询发票：
     ```bash
     # 在浏览器控制台或使用 curl
     GET http://localhost:3000/api/merchant/invoices
     ```

## 验证要点

### 内部调拨验证清单
- [ ] 交易类型显示为 "INTERNAL_TRANSFER"
- [ ] 使用成本价（costPrice）
- [ ] 不生成销售发票
- [ ] 库存正确转移
- [ ] 不计算 VAT

### 公司间销售验证清单
- [ ] 交易类型显示为 "INTER_COMPANY_SALE"
- [ ] 使用批发价（wholesalePrice）
- [ ] 自动生成销售发票
- [ ] 发票包含卖方公司信息
- [ ] 发票包含买方公司信息
- [ ] 正确计算 VAT（23%）
- [ ] 发票关联调货单
- [ ] 库存正确转移

## 数据库查询

### 查询调货记录
```javascript
// 在 MongoDB Compass 或 mongo shell 中
db.inventorytransfers.find({
  $or: [
    { fromMerchant: 'MurrayRanelagh' },
    { toMerchant: 'MurrayDundrum' }
  ]
}).sort({ createdAt: -1 }).limit(5)
```

### 查询销售发票
```javascript
db.intercompanysalesinvoices.find({}).sort({ createdAt: -1 }).limit(5)
```

### 查询用户公司信息
```javascript
db.usernews.find(
  { username: { $in: ['MurrayRanelagh', 'MurrayDundrum'] } },
  { username: 1, 'companyInfo.companyName': 1, 'companyInfo.vatNumber': 1 }
)
```

## 常见问题

### Q1: 为什么两个用户都显示内部调拨？
**A**: 因为两个用户的公司名称相同（Murray Electronics Limited）。如果要测试公司间销售，需要修改其中一个用户的公司信息。

### Q2: 如何修改用户的公司信息？
**A**: 
1. 登录管理员账号（admin / admin123）
2. 进入"用户管理"
3. 编辑用户，填写公司信息
4. 保存

### Q3: 如果用户没有设置公司信息会怎样？
**A**: 系统会默认为不同公司，使用公司间销售流程（批发价 + 生成发票）。

### Q4: 内部调拨和公司间销售的主要区别是什么？
**A**:
| 项目 | 内部调拨 | 公司间销售 |
|------|---------|-----------|
| 价格 | 成本价 | 批发价 |
| VAT | 不计算 | 23% |
| 发票 | 不生成 | 自动生成 |
| 利润 | 无 | 有 |

### Q5: 如何查看生成的销售发票？
**A**: 
1. 通过 API 查询：`GET /api/merchant/invoices`
2. 在数据库中查询：`intercompanysalesinvoices` 集合
3. 调货记录中会显示关联的发票号

## 测试数据

### 测试产品示例
根据当前库存，可以使用以下产品测试：

1. **Lightning Cable**
   - 成本价: €1.50
   - 批发价: €2.50
   - 数量: 98

2. **iPhone 12 128GB AB Grade**
   - 成本价: €210
   - 批发价: €235
   - 数量: 1

3. **iPhone 14 128GB AB Grade**
   - 成本价: €317
   - 批发价: €335
   - 数量: 1

## 下一步

完成后端测试后，需要：
1. ✅ 验证内部调拨流程
2. ✅ 验证公司间销售流程
3. ⏳ 更新前端界面显示交易类型
4. ⏳ 添加发票查看功能

---
**测试日期**: 2026-02-05
**测试状态**: 后端逻辑已完成，可以开始测试
