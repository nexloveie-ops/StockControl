# 添加客户功能和公司信息保存修复

## 修改日期
2026-02-02 00:46

## 备份信息
- 备份文件夹：`StockControl-main-backup-20260202-004607`
- 备份内容：完整项目文件

## 修复的问题

### 1. ✅ 公司信息保存500错误

**错误信息：**
```
TypeError: next is not a function
at model.<anonymous> (CompanyInfo.js:72:3)
```

**原因：**
- CompanyInfo模型的pre save钩子使用了async函数
- 在async函数中不应该调用next()
- Mongoose新版本中，async钩子会自动处理

**修复前：**
```javascript
companyInfoSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next(); // ❌ 错误：async函数不需要next()
});
```

**修复后：**
```javascript
companyInfoSchema.pre('save', async function() {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  // ✅ 正确：async函数自动完成
});
```

---

### 2. ✅ 添加客户功能实现

**之前状态：**
```javascript
function showAddCustomerModal() {
  alert('添加客户功能开发中...');
}
```

**现在状态：**
- ✅ 完整的添加客户表单
- ✅ 支持所有必要字段
- ✅ 自动生成客户代码
- ✅ 表单验证
- ✅ 保存到数据库

---

## 添加客户功能详情

### 客户信息字段

#### 基本信息
- **公司名称** *（必填）
- **客户代码**（可选，自动生成格式：CUST-时间戳）
- **公司注册号码**
- **类型**：企业/个人（默认：企业）

#### 联系信息
- 联系人
- 电话
- 邮箱

#### 地址信息
- 街道地址
- 城市
- 州/省
- 邮编
- 国家（默认：Ireland）

#### 其他信息
- 税号（VAT Number）
- 备注

---

## 数据模型更新

### Customer 模型新增字段

**新增：**
```javascript
// 公司注册号码
registrationNumber: {
  type: String,
  trim: true
}
```

**修改：**
```javascript
// 客户类型默认值改为 'business'
type: {
  type: String,
  enum: ['individual', 'business'],
  default: 'business'  // 之前是 'individual'
}
```

---

## 前端实现

### 添加客户表单

**表单结构：**
```html
<form id="addCustomerForm" onsubmit="saveNewCustomer(event)">
  <!-- 基本信息 -->
  <input name="name" required>           <!-- 公司名称 -->
  <input name="code">                    <!-- 客户代码 -->
  <input name="registrationNumber">     <!-- 注册号码 -->
  <select name="type">                   <!-- 类型 -->
  
  <!-- 联系信息 -->
  <input name="contact.person">          <!-- 联系人 -->
  <input name="contact.phone">           <!-- 电话 -->
  <input name="contact.email">           <!-- 邮箱 -->
  
  <!-- 地址信息 -->
  <input name="contact.address.street">  <!-- 街道 -->
  <input name="contact.address.city">    <!-- 城市 -->
  <input name="contact.address.state">   <!-- 州/省 -->
  <input name="contact.address.postalCode"> <!-- 邮编 -->
  <input name="contact.address.country"> <!-- 国家 -->
  
  <!-- 其他信息 -->
  <input name="taxNumber">               <!-- 税号 -->
  <textarea name="notes">                <!-- 备注 -->
</form>
```

### JavaScript 函数

#### showAddCustomerModal()
- 显示添加客户模态框
- 使用通用模态框（showUniversalModal）
- 包含完整的表单字段

#### saveNewCustomer(event)
- 处理表单提交
- 构建嵌套对象结构
- 自动生成客户代码（如果未填写）
- 调用API保存客户
- 刷新客户列表

---

## 客户代码生成规则

### 自动生成
如果用户未填写客户代码，系统自动生成：

```javascript
code: formData.get('code') || `CUST-${Date.now()}`
```

**格式：** `CUST-{时间戳}`

**示例：**
- `CUST-1738454767000`
- `CUST-1738454768123`

### 手动输入
用户也可以手动输入自定义代码：
- 例如：`C001`, `CLIENT-ABC`, `COMPANY-XYZ`

---

## 使用流程

### 添加新客户

1. **进入客户管理**
   - 点击"供货商/客户管理"
   - 点击"🛒 客户管理"子标签

2. **点击添加按钮**
   - 点击"➕ 添加客户"按钮

3. **填写客户信息**
   - 公司名称（必填）
   - 客户代码（可选）
   - 公司注册号码
   - 选择类型（企业/个人）
   - 填写联系信息
   - 填写地址信息
   - 填写税号
   - 添加备注（可选）

4. **保存客户**
   - 点击"✅ 保存客户"
   - 系统验证并保存
   - 显示成功消息
   - 自动刷新客户列表

---

## 表单验证

### 必填字段
- ✅ 公司名称（HTML required属性）

### 可选字段
- 客户代码（未填写则自动生成）
- 其他所有字段都是可选的

### 邮箱验证
- 使用HTML5 email类型
- 自动验证邮箱格式

---

## API 端点

### 添加客户
```
POST /api/admin/customers
```

**请求体：**
```json
{
  "name": "ABC Company Ltd",
  "code": "CUST-001",
  "registrationNumber": "12345678",
  "type": "business",
  "contact": {
    "person": "John Doe",
    "phone": "+353 1 234 5678",
    "email": "john@abc.ie",
    "address": {
      "street": "123 Main Street",
      "city": "Dublin",
      "state": "Dublin",
      "postalCode": "D01 ABC1",
      "country": "Ireland"
    }
  },
  "taxNumber": "IE1234567X",
  "notes": "重要客户"
}
```

**响应：**
```json
{
  "success": true,
  "message": "客户添加成功",
  "data": {
    "_id": "...",
    "name": "ABC Company Ltd",
    "code": "CUST-001",
    ...
  }
}
```

---

## 测试步骤

### 测试 1: 公司信息保存（修复验证）

1. 访问：`http://localhost:3000/prototype-working.html`
2. 点击"供货商/客户管理"
3. 点击"🏢 公司信息设置"
4. 填写所有字段：
   - 公司名称
   - 地址
   - 电话、邮箱
   - 税号
   - IBAN、BIC等
5. 点击"💾 保存"
6. **预期结果：** ✅ 显示"公司信息保存成功"（不再500错误）

### 测试 2: 添加客户（完整信息）

1. 点击"🛒 客户管理"
2. 点击"➕ 添加客户"
3. 填写所有字段
4. 点击"✅ 保存客户"
5. **预期结果：** 
   - ✅ 显示"客户添加成功"
   - ✅ 客户列表自动刷新
   - ✅ 新客户出现在列表中

### 测试 3: 添加客户（最小信息）

1. 点击"➕ 添加客户"
2. 只填写公司名称
3. 点击"✅ 保存客户"
4. **预期结果：**
   - ✅ 保存成功
   - ✅ 客户代码自动生成（CUST-时间戳）
   - ✅ 类型默认为"企业"

### 测试 4: 添加客户（自定义代码）

1. 点击"➕ 添加客户"
2. 填写公司名称
3. 填写自定义客户代码（例如：C001）
4. 点击"✅ 保存客户"
5. **预期结果：**
   - ✅ 使用自定义代码
   - ✅ 不自动生成代码

### 测试 5: 销售给新客户

1. 添加一个新客户
2. 点击该客户的"💰 销售"按钮
3. 选择产品并销售
4. **预期结果：**
   - ✅ 销售流程正常
   - ✅ 发票包含新客户信息

---

## 技术要点

### 1. Mongoose Pre Save 钩子

**规则：**
- 如果使用 `async function`，不要调用 `next()`
- 如果使用普通 `function`，必须调用 `next()`

**正确写法：**
```javascript
// Async 函数（推荐）
schema.pre('save', async function() {
  await someAsyncOperation();
  // 不需要 next()
});

// 普通函数
schema.pre('save', function(next) {
  someOperation();
  next(); // 必须调用
});
```

### 2. 嵌套对象构建

前端表单使用点号命名：
```html
<input name="contact.address.city">
```

JavaScript构建嵌套对象：
```javascript
const data = {
  contact: {
    address: {
      city: formData.get('contact.address.city')
    }
  }
};
```

### 3. 客户代码唯一性

- 数据库字段：`unique: true, sparse: true`
- `sparse: true` 允许多个null值
- 如果提供代码，必须唯一
- 如果不提供，自动生成

### 4. 默认值处理

```javascript
// 客户代码
code: formData.get('code') || `CUST-${Date.now()}`

// 国家
country: formData.get('contact.address.country') || 'Ireland'

// 类型
type: formData.get('type') || 'business'
```

---

## 文件修改清单

### 修改文件

1. **StockControl-main/models/CompanyInfo.js**
   - 修复pre save钩子（移除next()调用）

2. **StockControl-main/models/Customer.js**
   - 添加registrationNumber字段
   - 修改type默认值为'business'

3. **StockControl-main/public/prototype-working.html**
   - 实现showAddCustomerModal()函数
   - 添加saveNewCustomer()函数
   - 完整的添加客户表单

---

## 注意事项

### 1. 客户代码
- 如果手动输入，确保唯一性
- 如果留空，系统自动生成
- 自动生成的代码格式：CUST-时间戳

### 2. 公司类型
- 默认为"企业"（business）
- 也可以选择"个人"（individual）
- 影响后续的发票显示

### 3. 税号
- 对于企业客户，建议填写税号
- 税号会显示在销售发票上
- 格式示例：IE1234567X

### 4. 地址信息
- 地址会显示在销售发票上
- 建议填写完整
- 国家默认为Ireland

### 5. 表单验证
- 只有公司名称是必填的
- 其他字段都是可选的
- 邮箱会自动验证格式

---

## 下一步优化

### 1. 编辑客户功能
- 加载现有客户数据
- 更新客户信息
- 保存修改

### 2. 客户详情页
- 查看完整客户信息
- 显示销售历史
- 显示应收账款

### 3. 批量操作
- 批量导入客户
- 批量导出客户
- 批量删除

### 4. 高级搜索
- 按多个条件搜索
- 按地区筛选
- 按类型筛选

### 5. 客户分类
- 客户等级（VIP、普通等）
- 客户标签
- 客户分组

---

## 总结

✅ **问题修复：**
- 公司信息保存500错误已修复
- Mongoose pre save钩子正确实现

✅ **功能完成：**
- 添加客户功能完整实现
- 支持所有必要字段
- 自动生成客户代码
- 表单验证

✅ **数据模型：**
- Customer模型添加registrationNumber
- 默认类型改为business
- 支持完整的公司信息

✅ **用户体验：**
- 清晰的表单布局
- 分组显示（基本信息、联系信息、地址信息）
- 必填字段标注
- 自动填充默认值

✅ **备份完成：**
- `StockControl-main-backup-20260202-004607`

现在可以正常添加客户并保存公司信息了！
