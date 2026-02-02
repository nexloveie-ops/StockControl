# AWS Elastic Beanstalk 环境变量配置指南

## 📋 需要配置的环境变量

在AWS Elastic Beanstalk中，你需要配置以下环境变量（使用你的.env文件中的实际值）：

```
MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/stockcontrol?retryWrites=true&w=majority
OPENAI_API_KEY = sk-proj-your-openai-api-key-here
JWT_SECRET = your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE = 7d
NODE_ENV = production
PORT = 3000
```

**重要**: 请从你的本地.env文件中复制实际的值！

---

## 🖥️ 方法1：通过AWS控制台配置（最简单，推荐）

### 步骤详解

1. **登录AWS控制台**
   - 访问：https://console.aws.amazon.com

2. **进入Elastic Beanstalk服务**
   - 搜索 "Elastic Beanstalk" 并点击

3. **选择你的应用和环境**
   - 点击应用名称
   - 点击环境名称

4. **进入配置页面**
   - 左侧菜单选择 "Configuration"（配置）

5. **编辑软件配置**
   - 找到 "Software" 卡片
   - 点击 "Edit"（编辑）

6. **添加环境变量**
   - 滚动到 "Environment properties"（环境属性）
   - 点击 "Add environment property"
   - 逐个添加上面列出的环境变量

7. **保存并应用**
   - 点击 "Apply"（应用）
   - 等待环境更新完成（2-5分钟）

---

## 💻 方法2：使用AWS CLI配置

### 前提条件
```bash
# 安装AWS CLI
# Windows: https://aws.amazon.com/cli/

# 配置AWS凭证
aws configure
```

### 配置命令（Windows PowerShell）
```powershell
aws elasticbeanstalk update-environment `
  --environment-name YOUR-ENVIRONMENT-NAME `
  --option-settings `
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=MONGODB_URI,Value="从.env复制" `
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=OPENAI_API_KEY,Value="从.env复制" `
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=JWT_SECRET,Value="从.env复制" `
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=JWT_EXPIRE,Value="7d" `
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=NODE_ENV,Value="production" `
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=PORT,Value="3000"
```

---

## 📝 方法3：使用EB CLI配置

### 安装EB CLI
```bash
pip install awsebcli
```

### 配置环境变量
```bash
cd StockControl-main

# 设置环境变量（使用你的.env文件中的实际值）
eb setenv MONGODB_URI="从.env复制" \
  OPENAI_API_KEY="从.env复制" \
  JWT_SECRET="从.env复制" \
  JWT_EXPIRE="7d" \
  NODE_ENV="production" \
  PORT="3000"

# 查看当前环境变量
eb printenv
```

---

## 🔍 验证配置

### 1. 检查环境变量
- AWS控制台：Configuration → Software → Environment properties
- CLI：`eb printenv`

### 2. 检查应用日志
- AWS控制台：Logs → Request Logs → Last 100 Lines
- CLI：`eb logs`

### 3. 测试应用
访问你的应用URL，测试功能是否正常。

---

## ⚠️ 常见问题

### Q1: 修改环境变量后应用没有生效？
**A:** 确保点击了 "Apply" 按钮，并等待环境更新完成。

### Q2: 环境更新失败？
**A:** 检查环境变量值是否正确，查看日志了解具体错误。

### Q3: 如何查看当前配置的环境变量？
**A:** 
- 控制台：Configuration → Software → Environment properties
- CLI：`eb printenv`

### Q4: 修改数据库连接后需要重新部署吗？
**A:** 不需要。修改环境变量后，AWS会自动重启应用。

---

## 🔐 安全建议

1. **不要在代码中硬编码敏感信息**
   - ❌ 不要提交.env文件到Git
   - ❌ 不要写在.ebextensions配置文件中
   - ✅ 使用AWS环境变量

2. **定期更换密钥**
   - JWT_SECRET 应该定期更换
   - 数据库密码应该定期更换
   - API密钥应该定期轮换

3. **限制访问权限**
   - 只给必要的人员AWS控制台访问权限
   - 使用IAM角色和策略控制权限

---

## 📚 相关文档

- [AWS Elastic Beanstalk 环境变量](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-cfg-softwaresettings.html)
- [EB CLI 命令参考](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html)
- [MongoDB Atlas 连接指南](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/)

---

**最后更新**: 2026-02-02
