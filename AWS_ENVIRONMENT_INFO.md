# AWS环境信息

## 当前环境配置

### Elastic Beanstalk环境
- **应用名称**: Celestiatpl Stock Manager
- **环境名称**: CelestiatplStockManager-env
- **域名**: celestiatpl.eu-central-1.elasticbeanstalk.com
- **区域**: eu-central-1 (欧洲中部 - 法兰克福)
- **平台**: Node.js 24 running on 64bit Amazon Linux 2023

### 访问URL

**HTTP (当前可用):**
```
http://celestiatpl.eu-central-1.elasticbeanstalk.com
```

**HTTPS (需要配置):**
```
https://celestiatpl.eu-central-1.elasticbeanstalk.com
```
注意: HTTPS需要在Load Balancer中配置SSL证书后才能使用

## 环境变量配置

在AWS Elastic Beanstalk控制台 → Configuration → Environment Properties 中配置：

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://toys123ie_db_user:scirvqPqLXJerZ7f@toys123ie.9gsjch4.mongodb.net/3c-inventory?retryWrites=true&w=majority&appName=toys123ie
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
PORT=8080
```

## 测试端点

### 系统健康检查
```
http://celestiatpl.eu-central-1.elasticbeanstalk.com/health
```

### 数据库连接测试
```
http://celestiatpl.eu-central-1.elasticbeanstalk.com/api/test-db
```

### API测试
```
http://celestiatpl.eu-central-1.elasticbeanstalk.com/api/test
```

### 用户登录测试 (GET方式)
```
http://celestiatpl.eu-central-1.elasticbeanstalk.com/api/auth/test-login?username=testuser&password=123456
```

## 测试页面

### HTTP POST测试页面
```
http://celestiatpl.eu-central-1.elasticbeanstalk.com/http-test.html
```
用于测试HTTP协议下的POST请求

### 表单版本 (推荐)
```
http://celestiatpl.eu-central-1.elasticbeanstalk.com/form-only.html
```
完整的用户注册和登录界面

### 主页
```
http://celestiatpl.eu-central-1.elasticbeanstalk.com/
```
自动重定向到AWS优化版本

## 部署信息

### GitHub仓库
```
https://github.com/nexloveie-ops/StockControl.git
```

### 部署方式
- 推送到GitHub main分支
- AWS Elastic Beanstalk自动检测并部署
- 部署时间: 约2-3分钟

### 查看部署日志
1. 登录AWS控制台
2. 进入Elastic Beanstalk
3. 选择应用: Celestiatpl Stock Manager
4. 选择环境: CelestiatplStockManager-env
5. 点击"Logs" → "Request Logs" → "Last 100 Lines"

## 测试用户

```
用户名: testuser
密码: 123456
角色: manager
```

## 数据库信息

### MongoDB Atlas
- **集群**: toys123ie
- **数据库**: 3c-inventory
- **连接**: 已配置并测试成功

## 注意事项

1. **当前只支持HTTP**: HTTPS需要配置SSL证书
2. **端口配置**: 应用运行在8080端口，Load Balancer监听80端口
3. **环境变量**: 敏感信息通过AWS控制台配置，不要提交到代码库
4. **自动部署**: 推送到GitHub后自动触发部署

## 下一步

- [ ] 配置HTTPS (SSL证书)
- [ ] 配置自定义域名 (可选)
- [ ] 设置自动扩展策略
- [ ] 配置CloudWatch监控和告警
- [ ] 设置备份策略
