# 修复维修小票公司信息显示[object Object]问题

## 问题
维修订单打印小票时，公司信息显示为 "[object Object]"，而不是正确的地址、电话等信息。

## 原因分析
1. API返回的 `companyInfo.address` 是一个对象，包含 `street`, `city`, `postalCode` 等字段
2. 维修小票打印函数直接使用了 `companyInfo` 对象，没有格式化处理
3. 在HTML模板中直接输出对象会显示 "[object Object]"

### API返回的数据结构
```javascript
{
  companyInfo: {
    companyName: "公司名称",
    address: {
      street: "街道地址",
      city: "城市",
      postalCode: "邮编"
    },
    contactPhone: "电话",
    contactEmail: "邮箱"
  }
}
```

## 解决方案
参考销售小票的处理方式，在打印前格式化公司信息，将地址对象转换为字符串。

### 修改内容

#### 1. 修改 `printRepairReceipts()` 函数（创建新订单时打印）

**修改前**：
```javascript
const companyInfo = profileResult.data.companyInfo || {};
```

**修改后**：
```javascript
// 格式化公司信息
let companyInfo = {
  companyName: '3C Product Store',
  address: '',
  phone: '',
  email: ''
};

if (profileResult.data.companyInfo) {
  const ci = profileResult.data.companyInfo;
  companyInfo = {
    companyName: ci.companyName || companyInfo.companyName,
    address: ci.address ? 
      `${ci.address.street || ''} ${ci.address.city || ''} ${ci.address.postalCode || ''}`.trim() : '',
    phone: ci.contactPhone || '',
    email: ci.contactEmail || ''
  };
}
```

#### 2. 修改 `reprintRepairReceipts()` 函数（从订单列表重新打印）

应用相同的格式化逻辑。

## 格式化逻辑说明

### 地址格式化
```javascript
address: ci.address ? 
  `${ci.address.street || ''} ${ci.address.city || ''} ${ci.address.postalCode || ''}`.trim() : ''
```

- 检查 `ci.address` 是否存在
- 如果存在，拼接 `street`, `city`, `postalCode`
- 使用 `.trim()` 去除多余空格
- 如果不存在，返回空字符串

### 字段映射
| API字段 | 格式化后字段 | 说明 |
|---------|-------------|------|
| `companyName` | `companyName` | 公司名称 |
| `address.street` + `address.city` + `address.postalCode` | `address` | 完整地址字符串 |
| `contactPhone` | `phone` | 联系电话 |
| `contactEmail` | `email` | 联系邮箱 |

## 显示效果

### 修改前
```
[object Object]
[object Object]
[object Object]
```

### 修改后
```
3C Product Store
123 Main Street Dublin D01 ABC1
Tel: +353 1 234 5678
Email: info@3cstore.ie
```

## 测试场景

### 场景1：创建新订单并打印
1. 创建新维修订单
2. 选择打印小票
3. 检查公司信息显示正确

### 场景2：从订单列表重新打印
1. 点击订单的"🖨️ 打印"按钮
2. 选择打印客户小票或车间小票
3. 检查公司信息显示正确

### 场景3：不同的公司信息配置
- 完整信息：所有字段都有值 ✓
- 部分信息：只有公司名称和电话 ✓
- 默认信息：使用默认的 "3C Product Store" ✓

## 与销售小票的一致性
现在维修小票和销售小票使用相同的公司信息格式化逻辑，确保显示一致。

## 文件修改
- `StockControl-main/public/merchant.html`
  - 修改 `printRepairReceipts()` 函数
  - 修改 `reprintRepairReceipts()` 函数

## 测试步骤
1. 使用 **Ctrl + Shift + R** 强制刷新浏览器
2. 创建新维修订单并打印
3. 检查小票上的公司信息显示
4. 从订单列表重新打印
5. 检查公司信息是否正确显示

## 状态
✅ 已修复
