# 修复维修小票打印API调用

## 问题
维修小票打印时出现错误：
```
api/users/profile:1 Failed to load resource: the server responded with a status of 400 (Bad Request)
merchant.html:6320 Failed to get company info
```

## 原因
`/api/users/profile` API需要 `username` 查询参数，但维修小票打印函数没有传递该参数。

## 解决方案
修改 `printRepairReceipts()` 函数，添加 `username` 参数：

### 修改前
```javascript
const profileResponse = await fetch(`${API_BASE}/users/profile`);
```

### 修改后
```javascript
const profileResponse = await fetch(`${API_BASE}/users/profile?username=${merchantId}`);
```

## 参考
销售小票打印功能使用了正确的API调用方式：
```javascript
const userResponse = await fetch(`${API_BASE}/users/profile?username=${merchantId}`);
```

## 文件修改
- `StockControl-main/public/merchant.html` - 修复API调用
- `StockControl-main/REPAIR_BUSINESS_RECEIPT_PRINTING.md` - 更新文档

## 测试
1. 使用 **Ctrl + Shift + R** 强制刷新浏览器
2. 创建新维修订单
3. 确认打印时应该能成功获取公司信息并打印两张小票

## 状态
✅ 已修复
