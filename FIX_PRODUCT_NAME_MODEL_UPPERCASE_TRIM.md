# 产品名称和型号标准化 - 大写并去除空格

## 修改日期
2026年2月10日

## 需求描述
在所有入库操作中，对产品名称和型号/规格进行标准化处理：
1. 转换为大写字母
2. 去除所有空格

## 目的
- 统一产品名称和型号格式
- 避免因大小写或空格导致的重复产品
- 便于产品搜索和匹配

## 修改内容

### 1. prototype-working.html - 仓库入库管理

#### 文件位置
`StockControl-main/public/prototype-working.html`

#### 修改函数
`confirmReceiving()` - 第4765行

#### 修改内容
在验证产品数据之前，添加标准化处理：

```javascript
products.forEach((product, index) => {
  // 🔄 标准化产品名称和型号：转大写并去除空格
  if (product.name) {
    product.name = product.name.trim().toUpperCase().replace(/\s+/g, '');
  }
  if (product.model) {
    product.model = product.model.trim().toUpperCase().replace(/\s+/g, '');
  }
  
  // ... 后续验证逻辑
});
```

#### 影响范围
- ✅ 发票上传入库
- ✅ 手动录入入库

#### 处理逻辑
1. `trim()` - 去除首尾空格
2. `toUpperCase()` - 转换为大写
3. `replace(/\s+/g, '')` - 去除所有空格（包括中间的空格）

#### 示例
| 输入 | 输出 |
|------|------|
| "iPhone 15 Pro" | "IPHONE15PRO" |
| " Galaxy S24 " | "GALAXYS24" |
| "256GB" | "256GB" |
| " 128 GB " | "128GB" |
| "iphone 11" | "IPHONE11" |

---

### 2. merchant.html - 商户手动入库

#### 文件位置
`StockControl-main/public/merchant.html`

#### 修改函数
`submitAddInventory()` - 第4870行

#### 修改内容
在提交表单数据之前，添加标准化处理：

```javascript
async function submitAddInventory(event) {
  event.preventDefault();
  
  // 获取表单数据
  let productName = document.getElementById('inv_productName').value;
  let model = document.getElementById('inv_model').value;
  
  // 🔄 标准化产品名称和型号：转大写并去除空格
  if (productName) {
    productName = productName.trim().toUpperCase().replace(/\s+/g, '');
  }
  if (model) {
    model = model.trim().toUpperCase().replace(/\s+/g, '');
  }
  
  const formData = {
    merchantId: merchantId,
    productName: productName,
    brand: document.getElementById('inv_brand').value,
    model: model,
    // ... 其他字段
  };
  
  // ... 提交逻辑
}
```

#### 影响范围
- ✅ 商户手动入库功能

#### 处理逻辑
与 prototype-working.html 相同：
1. `trim()` - 去除首尾空格
2. `toUpperCase()` - 转换为大写
3. `replace(/\s+/g, '')` - 去除所有空格

---

## 标准化规则

### 处理的字段
1. **产品名称** (productName / name)
2. **型号/规格** (model)

### 不处理的字段
以下字段保持原样，不进行大写和去空格处理：
- 品牌 (brand)
- 颜色 (color)
- 条码 (barcode)
- 序列号 (serialNumber)
- 成色 (condition)
- 备注 (notes)

### 处理步骤
```javascript
// 步骤1: 去除首尾空格
value = value.trim();

// 步骤2: 转换为大写
value = value.toUpperCase();

// 步骤3: 去除所有空格（包括中间的空格）
value = value.replace(/\s+/g, '');
```

### 正则表达式说明
- `/\s+/g` - 匹配一个或多个空白字符（空格、制表符、换行符等）
- `g` - 全局匹配标志，替换所有匹配项

---

## 测试场景

### 场景1: 发票上传入库
1. 上传发票图片
2. AI识别产品名称：`iPhone 15 Pro`
3. 用户编辑型号：`256 GB`
4. 点击"确认入库"
5. **预期结果**：
   - 产品名称保存为：`IPHONE15PRO`
   - 型号保存为：`256GB`

### 场景2: 手动录入入库
1. 进入"入库管理" > "手动录入"
2. 输入产品名称：` Galaxy S24 `（前后有空格）
3. 输入型号：`128 GB`（中间有空格）
4. 点击"确认入库"
5. **预期结果**：
   - 产品名称保存为：`GALAXYS24`
   - 型号保存为：`128GB`

### 场景3: 商户手动入库
1. 登录商户账户（merchant001）
2. 进入"我的库存" > 点击"+ 手动入库"
3. 输入产品名称：`iphone 11`
4. 输入型号：`64gb`
5. 点击"保存"
6. **预期结果**：
   - 产品名称保存为：`IPHONE11`
   - 型号保存为：`64GB`

### 场景4: 中英文混合
1. 输入产品名称：`iPhone 手机壳`
2. 输入型号：`MagSafe 磁吸`
3. **预期结果**：
   - 产品名称保存为：`IPHONE手机壳`
   - 型号保存为：`MAGSAFE磁吸`

---

## 优点

### 1. 数据一致性
- 所有产品名称和型号格式统一
- 避免因大小写差异导致的重复产品
- 例如：`iPhone 15` 和 `iphone 15` 会被识别为同一产品

### 2. 搜索优化
- 用户搜索时不需要考虑大小写
- 搜索 `iphone` 可以找到 `IPHONE15PRO`
- 搜索 `256gb` 可以找到 `256GB`

### 3. 产品匹配
- 在销售、调货、退款等操作中更容易匹配产品
- 减少因格式不一致导致的匹配失败

### 4. 数据库查询
- 统一格式便于数据库索引和查询
- 提高查询效率

---

## 注意事项

### 1. 中文字符
- 中文字符不受 `toUpperCase()` 影响
- 中文之间的空格也会被去除
- 例如：`iPhone 手机壳` → `IPHONE手机壳`

### 2. 特殊字符
- 特殊字符（如：`-`, `_`, `/`）保持不变
- 例如：`iPhone-15` → `IPHONE-15`

### 3. 数字
- 数字不受 `toUpperCase()` 影响
- 例如：`256GB` → `256GB`

### 4. 用户体验
- 用户在输入框中看到的是原始输入
- 只有在提交时才进行转换
- 用户不会感知到转换过程

### 5. 现有数据
- 此修改只影响新录入的产品
- 现有数据库中的产品不会自动更新
- 如需统一现有数据，需要运行数据迁移脚本

---

## 数据迁移（可选）

如果需要将现有数据库中的产品名称和型号也进行标准化，可以运行以下脚本：

```javascript
// standardize-existing-products.js
require('dotenv').config();
const mongoose = require('mongoose');
const AdminInventory = require('./models/AdminInventory');

async function standardizeExistingProducts() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const products = await AdminInventory.find({});
  let updated = 0;
  
  for (const product of products) {
    let changed = false;
    
    if (product.productName) {
      const standardized = product.productName.trim().toUpperCase().replace(/\s+/g, '');
      if (standardized !== product.productName) {
        product.productName = standardized;
        changed = true;
      }
    }
    
    if (product.model) {
      const standardized = product.model.trim().toUpperCase().replace(/\s+/g, '');
      if (standardized !== product.model) {
        product.model = standardized;
        changed = true;
      }
    }
    
    if (changed) {
      await product.save();
      updated++;
    }
  }
  
  console.log(`✅ 已更新 ${updated} 个产品`);
  await mongoose.connection.close();
}

standardizeExistingProducts();
```

---

## 相关文件
- `StockControl-main/public/prototype-working.html` (第4765-4785行)
- `StockControl-main/public/merchant.html` (第4870-4900行)

## 状态
✅ **已完成** - 代码已修改，等待测试验证

## 测试步骤
1. 刷新浏览器（Ctrl + Shift + R）
2. 测试发票上传入库
3. 测试手动录入入库
4. 测试商户手动入库
5. 验证产品名称和型号是否已转为大写并去除空格
6. 在数据库中查看保存的数据格式

## 下一步
- 用户测试验证功能
- 如有需要，运行数据迁移脚本统一现有数据
