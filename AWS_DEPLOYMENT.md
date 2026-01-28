# AWS部署指南

## MongoDB Atlas + AWS Elastic Beanstalk 部署

### 1. 环境变量配置

在AWS Elastic Beanstalk控制台中设置以下环境变量：

**必需的环境变量：**
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://toys123ie_db_user:scirvqPqLXJerZ7f@toys123ie.9gsjch4.mongodb.net/3c-inventory?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
```

### 2. 设置步骤

#### 方法1：通过AWS控制台
1. 登录AWS Elastic Beanstalk控制台
2. 选择你的应用环境
3. 点击"Configuration" → "Software"
4. 在"Environment properties"中添加上述环境变量
5. 点击"Apply"保存

#### 方法2：通过EB CLI
```bash
eb setenv NODE_ENV=production
eb setenv MONGODB_URI="mongodb+srv://toys123ie_db_user:scirvqPqLXJerZ7f@toys123ie.9gsjch4.mongodb.net/3c-inventory?retryWrites=true&w=majority"
eb setenv JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
eb setenv JWT_EXPIRE="7d"
```

### 3. MongoDB Atlas网络配置

确保MongoDB Atlas允许AWS访问：

1. 登录MongoDB Atlas控制台
2. 进入"Network Access"
3. 添加IP白名单：
   - 开发测试：`0.0.0.0/0`（允许所有IP）
   - 生产环境：添加AWS Elastic Beanstalk的出站IP

### 4. 部署命令

```bash
# 使用EB CLI部署
eb deploy

# 或者通过CodePipeline自动部署
git push origin main
```

### 5. 验证部署

部署完成后访问：
- 健康检查：`https://your-app.region.elasticbeanstalk.com/health`
- 数据库测试：`https://your-app.region.elasticbeanstalk.com/api/test-db`

### 6. 架构优势

```
┌─────────────────┐    ┌──────────────────┐
│   用户请求       │───▶│  AWS Load Balancer │
└─────────────────┘    └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ AWS EC2 Instance  │
                       │ (Elastic Beanstalk)│
                       │                  │
                       │  Node.js App     │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  MongoDB Atlas   │
                       │   (Cloud DB)     │
                       └──────────────────┘
```

### 7. 监控和日志

- **应用日志**：AWS CloudWatch
- **数据库监控**：MongoDB Atlas Dashboard
- **性能监控**：AWS X-Ray（可选）

### 8. 安全最佳实践

- ✅ 使用环境变量存储敏感信息
- ✅ MongoDB Atlas自动加密传输
- ✅ 定期轮换JWT密钥
- ✅ 限制MongoDB Atlas网络访问
- ✅ 启用AWS CloudTrail日志

### 9. 故障排除

**常见问题：**
- 数据库连接超时：检查MongoDB Atlas网络白名单
- 环境变量未生效：确认EB环境配置正确
- 应用启动失败：查看CloudWatch日志

**调试命令：**
```bash
eb logs
eb status
eb health
```