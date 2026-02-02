# AWS Elastic Beanstalk 故障排除指南

## 🚨 当前问题
```
ERR_CONNECTION_TIMED_OUT
celestiatpl.eu-central-1.elasticbeanstalk.com took too long to respond
```

## 🔍 排查步骤

### 1. 检查应用健康状态
在AWS EB控制台中查看：
- **Health**: 应该显示绿色的"OK"
- **Running Version**: 确认是最新版本
- **Events**: 查看是否有错误事件

### 2. 查看应用日志
```bash
# 在EB控制台中
Logs → Request Logs → Last 100 Lines
```

常见错误：
- `Error: Cannot find module` - 依赖安装失败
- `MongoDB connection failed` - 数据库连接问题
- `Port already in use` - 端口配置问题

### 3. 检查环境变量配置
在Configuration → Environment Properties中确认：

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://toys123ie_db_user:scirvqPqLXJerZ7f@toys123ie.9gsjch4.mongodb.net/3c-inventory?retryWrites=true&w=majority&appName=toys123ie
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
```

### 4. 检查MongoDB Atlas网络访问
1. 登录MongoDB Atlas
2. 进入Network Access
3. 确保有以下IP白名单：
   - `0.0.0.0/0` (允许所有IP - 仅用于测试)
   - 或者添加AWS的出站IP范围

### 5. 检查安全组设置
在EC2控制台中：
- 找到EB创建的安全组
- 确保入站规则允许HTTP (80) 和HTTPS (443)

## 🛠️ 修复方案

### 方案1: 使用简化版应用
临时修改package.json的start脚本：
```json
"start": "node app-simple.js"
```

### 方案2: 检查端口配置
确保应用监听正确端口：
```javascript
const PORT = process.env.PORT || 8080;
```

### 方案3: 重新部署
```bash
eb deploy --staged
```

### 方案4: 创建新环境
如果当前环境损坏，创建新的EB环境

## 🧪 测试端点

部署成功后测试：
- `/` - 根路径
- `/health` - 健康检查
- `/test` - 简单测试页面
- `/env-check` - 环境变量检查

## 📋 部署检查清单

- [ ] 代码已推送到GitHub
- [ ] EB应用已连接到GitHub仓库
- [ ] 环境变量已正确配置
- [ ] MongoDB Atlas网络访问已配置
- [ ] 应用健康状态为绿色
- [ ] 日志中无错误信息

## 🆘 紧急修复

如果应用完全无法访问：

1. **重启环境**
   ```
   EB Console → Actions → Restart App Server
   ```

2. **重建环境**
   ```
   EB Console → Actions → Rebuild Environment
   ```

3. **检查平台版本**
   确保使用Node.js 18或20平台

4. **简化应用**
   临时使用app-simple.js进行调试

## 📞 获取帮助

如果问题持续：
1. 导出EB日志
2. 检查CloudWatch日志
3. 联系AWS支持