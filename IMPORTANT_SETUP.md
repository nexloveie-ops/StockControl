# ⚠️ 重要：正确启动应用

## 问题说明

如果你从GitHub克隆代码后遇到以下错误：
- 入库管理报错 404
- 供货商/客户管理报错 404
- 库存报表报错 404

**原因**：使用了错误的启动文件。

## ✅ 正确的启动方式

### 方法1：使用npm启动（推荐）
```bash
npm start
```

### 方法2：直接运行
```bash
node app.js
```

### 方法3：开发模式（需要nodemon）
```bash
npm run dev
```

## ❌ 错误的启动方式

不要使用以下命令：
```bash
node app-prototype.js  # 旧版本，缺少很多API
node app-old-backup.js # 非常旧的版本
```

## 文件说明

- **app.js** - ✅ 主应用文件（93KB），包含所有最新功能
- **app-prototype.js** - ⚠️ 旧版本原型（48KB），功能不完整
- **app-old-backup.js** - ⚠️ 非常旧的备份（6KB），仅供参考
- **app-simple.js** - ⚠️ 简化测试版本
- **app-test.js** - ⚠️ 测试文件

## 完整启动步骤

1. **克隆仓库**
```bash
git clone https://github.com/nexloveie-ops/StockControl.git
cd StockControl
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
# 复制示例配置文件
copy .env.example .env

# 编辑.env文件，填入你的配置：
# - MONGODB_URI（MongoDB连接字符串）
# - JWT_SECRET（JWT密钥）
# - OPENAI_API_KEY（OpenAI API密钥，用于图片识别）
# - PORT（端口号，默认3000）
```

4. **启动服务器**
```bash
npm start
```

5. **访问应用**
```
http://localhost:3000/prototype-working.html
```

## 验证启动成功

启动后应该看到类似输出：
```
Server running on port 3000
MongoDB connected successfully
```

访问 http://localhost:3000/prototype-working.html 应该能正常加载页面。

## 功能验证

启动成功后，以下功能应该正常工作：
- ✅ 入库管理（图片识别）
- ✅ 供货商管理（增删改查）
- ✅ 客户管理（增删改查）
- ✅ 库存产品管理
- ✅ 销售管理
- ✅ 财务报表
- ✅ 库存报表

## 常见问题

### Q: 为什么会有多个app文件？
A: 这是开发过程中的历史遗留。`app.js` 是最新的完整版本，其他文件是旧版本备份。

### Q: package.json中的"main"字段是什么？
A: 指定了应用的入口文件，现在正确指向 `app.js`。

### Q: 如何确认我运行的是正确版本？
A: 检查文件大小，`app.js` 应该是93KB左右。或者启动后测试入库管理功能是否正常。

### Q: 我已经在运行旧版本了怎么办？
A: 停止当前进程（Ctrl+C），然后使用 `npm start` 重新启动。

## 更新日志

- **2026-02-02**: 修复启动文件问题，统一使用 `app.js`
- **2026-02-02**: 添加财务报表资产列表功能
- **2026-02-02**: 添加供货商/客户编辑功能（含税号）
- **2026-02-02**: 修复库存管理已售产品显示问题

## 技术支持

如有问题，请查看：
- [更新日志](UPDATES_20260202.md)
- [本地设置指南](LOCAL_SETUP.md)
- [Git设置指南](GIT_SETUP_GUIDE.md)

或在GitHub上提Issue：
https://github.com/nexloveie-ops/StockControl/issues
