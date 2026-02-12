# 用户Profile API返回公司信息修复

## 问题描述

用户在查看发票详情时，公司信息显示"Company information not available"。

## 问题原因

### 数据库状态
1. ✅ **CompanyInfo表中有完整的公司信息**
   ```
   公司名称: Celestia Trade Partners Limited (668302)
   地址: 2nd Floor Office, 62 Main Street, Carrick-On-Suir, E32 C956, Ireland
   税号: 4399799UH
   银行: Bank Of Ireland (IE52BOFI90596986903963)
   ```

2. ❌ **用户的companyInfo字段是空的**
   ```javascript
   {
     "companyInfo": {
       "address": {}  // 只有一个空对象
     }
   }
   ```

### API问题

用户profile API (`/api/users/profile`) 只返回用户自己的 `companyInfo` 字段：

```javascript
// 修复前
app.get('/api/users/profile', async (req, res) => {
  const user = await UserNew.findOne({ username, isActive: true });
  res.json({ success: true, data: user });  // ❌ 只返回用户的companyInfo（空的）
});
```

但是系统的公司信息存储在 `CompanyInfo` 表中，不是用户表中。

## 解决方案

修改用户profile API，让它返回 `CompanyInfo` 表中的默认公司信息：

### 修复前
```javascript
app.get('/api/users/profile', async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ success: false, error: '缺少用户名参数' });
    }
    
    const UserNew = require('./models/UserNew');
    const user = await UserNew.findOne({ username, isActive: true })
      .select('-password')
      .populate('retailInfo.storeGroup', 'name code')
      .populate('retailInfo.store', 'name');
    
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    
    // ❌ 直接返回用户数据（companyInfo是空的）
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### 修复后
```javascript
app.get('/api/users/profile', async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ success: false, error: '缺少用户名参数' });
    }
    
    const UserNew = require('./models/UserNew');
    const CompanyInfo = require('./models/CompanyInfo');
    
    const user = await UserNew.findOne({ username, isActive: true })
      .select('-password')
      .populate('retailInfo.storeGroup', 'name code')
      .populate('retailInfo.store', 'name');
    
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    
    // ✅ 获取默认的公司信息
    const defaultCompanyInfo = await CompanyInfo.findOne({ isDefault: true });
    
    // ✅ 将公司信息添加到用户数据中
    const userData = user.toObject();
    userData.companyInfo = defaultCompanyInfo || userData.companyInfo;
    
    res.json({ success: true, data: userData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## 修改逻辑

1. 查询用户信息（UserNew表）
2. 查询默认公司信息（CompanyInfo表，`isDefault: true`）
3. 将用户对象转换为普通对象（`user.toObject()`）
4. 用默认公司信息覆盖用户的空companyInfo字段
5. 返回合并后的数据

## 返回数据结构

修复后，API返回：

```javascript
{
  success: true,
  data: {
    username: "admin",
    email: "admin@stockcontrol.com",
    role: "admin",
    // ... 其他用户字段
    companyInfo: {  // ✅ 从CompanyInfo表获取
      _id: "698134c4af4515b19a441b5f",
      companyName: "Celestia Trade Partners Limited (668302)",
      address: {
        street: "2nd Floor Office, 62 Main Street",
        city: "Carrick-On-Suir",
        postalCode: "E32 C956",
        country: "Ireland"
      },
      contact: {
        phone: "",
        email: ""
      },
      taxNumber: "4399799UH",
      bankDetails: {
        iban: "IE52BOFI90596986903963",
        bic: "BOFIIE2D",
        bankName: "Bank Of Ireland",
        accountName: "Celestia Trade Partners Limited "
      },
      isDefault: true
    }
  }
}
```

## 影响范围

这个修复影响所有使用 `/api/users/profile` API的功能：

1. ✅ 采购发票详情 - 显示公司信息
2. ✅ 销售发票详情 - 显示公司信息
3. ✅ PDF导出 - 包含公司信息
4. ✅ 其他需要公司信息的功能

## 测试步骤

1. ✅ 服务器已重启（进程30）
2. ✅ 强制刷新浏览器（Ctrl + Shift + R）
3. ✅ 登录系统
4. ✅ 进入"供货商/客户管理" → "客户管理"
5. ✅ 点击"查看发票"
6. ✅ 点击发票编号查看详情
7. ✅ 验证公司信息正确显示：
   - 公司名称：Celestia Trade Partners Limited (668302)
   - 地址：2nd Floor Office, 62 Main Street, Carrick-On-Suir, E32 C956, Ireland
   - 税号：4399799UH
   - 银行信息：Bank Of Ireland

## 修改文件

- `StockControl-main/app.js` (第338-365行 - /api/users/profile API)

## 注意事项

1. ✅ 服务器已重启，修改已生效
2. ✅ 如果CompanyInfo表中没有默认公司信息，会使用用户自己的companyInfo
3. ✅ 使用 `isDefault: true` 查找默认公司信息
4. ✅ 不会修改数据库中的用户数据，只是在API响应中合并

## 相关文件

- `StockControl-main/check-company-info.js` - 检查公司信息的脚本

## 日期
2026-02-12
