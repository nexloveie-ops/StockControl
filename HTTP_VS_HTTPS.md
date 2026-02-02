# HTTP vs HTTPS 问题说明

## 问题根源

AWS Elastic Beanstalk Load Balancer **只配置了HTTP (端口80)**，**没有配置HTTPS (端口443)**。

## 现象

✅ **HTTP可以正常工作:**
- `http://celestiatpl.eu-central-1.elasticbeanstalk.com/`
- GET请求正常
- POST请求正常

❌ **HTTPS无法工作:**
- `https://celestiatpl.eu-central-1.elasticbeanstalk.com/`
- 浏览器显示: `ERR_CONNECTION_REFUSED`
- 原因: Load Balancer没有监听443端口

## 测试步骤

### 1. 使用HTTP访问测试页面

```
http://celestiatpl.eu-central-1.elasticbeanstalk.com/http-test.html
```

这个页面会:
- 自动检测当前使用的协议（HTTP或HTTPS）
- 如果使用HTTPS，会提示切换到HTTP
- 提供3种POST测试方法

### 2. 测试表单提交

页面上有预填的登录表单，点击"登录"按钮即可测试POST请求。

### 3. 测试Fetch API

点击"测试Fetch POST"按钮，使用JavaScript发送POST请求。

## 解决方案

### 方案A: 继续使用HTTP（简单但不安全）

**优点:**
- 无需配置，立即可用
- 适合开发和测试环境

**缺点:**
- 数据未加密，不安全
- 浏览器会显示"不安全"警告
- 不适合生产环境

**使用方法:**
所有URL使用HTTP协议:
```
http://celestiatpl.eu-central-1.elasticbeanstalk.com/
```

### 方案B: 配置HTTPS（推荐用于生产）

**步骤:**

1. **获取SSL证书**
   - 使用AWS Certificate Manager (ACM)申请免费SSL证书
   - 或上传自己的SSL证书

2. **配置Load Balancer**
   - 在AWS Elastic Beanstalk控制台
   - 进入环境配置 → Load Balancer
   - 添加HTTPS监听器（端口443）
   - 选择SSL证书

3. **配置域名（可选）**
   - 在Route 53或其他DNS服务商配置域名
   - 指向Load Balancer
   - 为域名申请SSL证书

4. **启用HTTP到HTTPS重定向**
   - 配置Load Balancer规则
   - 自动将HTTP请求重定向到HTTPS

**优点:**
- 数据加密传输，安全
- 浏览器显示安全锁图标
- 符合生产环境标准

**缺点:**
- 需要配置SSL证书
- 需要一些AWS配置工作

## 当前状态

- ✅ 应用程序代码完全正常
- ✅ MongoDB Atlas连接正常
- ✅ 所有API端点工作正常
- ✅ HTTP访问完全可用
- ❌ HTTPS未配置（Load Balancer层面）

## 测试用户

```
用户名: testuser
密码: 123456
角色: manager
```

## 可用的测试页面

所有页面都使用HTTP访问:

1. **HTTP测试页面（新）**
   ```
   http://celestiatpl.eu-central-1.elasticbeanstalk.com/http-test.html
   ```
   专门用于测试HTTP POST请求

2. **表单版本（推荐）**
   ```
   http://celestiatpl.eu-central-1.elasticbeanstalk.com/form-only.html
   ```
   完整的用户注册和登录界面

3. **POST测试页面**
   ```
   http://celestiatpl.eu-central-1.elasticbeanstalk.com/test-post.html
   ```
   多种POST测试方法

## API端点测试

使用HTTP协议测试所有端点:

```bash
# 健康检查
http://celestiatpl.eu-central-1.elasticbeanstalk.com/health

# 数据库测试
http://celestiatpl.eu-central-1.elasticbeanstalk.com/api/test-db

# GET测试登录
http://celestiatpl.eu-central-1.elasticbeanstalk.com/api/auth/test-login?username=testuser&password=123456
```

## 下一步建议

1. **立即测试:** 使用HTTP访问 `http-test.html` 验证POST请求正常工作
2. **短期方案:** 如果只是开发测试，继续使用HTTP
3. **长期方案:** 如果要上线生产，配置HTTPS（方案B）

## 技术细节

- **应用端口:** 8080
- **Load Balancer HTTP端口:** 80
- **Load Balancer HTTPS端口:** 未配置
- **Node.js版本:** 24
- **平台:** Amazon Linux 2023
- **数据库:** MongoDB Atlas
