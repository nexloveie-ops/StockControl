# 调货IMEI选择功能 - 完成

## 功能说明
在批准调货申请时，如果产品是设备（有IMEI/序列号），调出方需要选择具体要调出的设备IMEI。

## 实现完成

### 后端修改
1. **调货申请API** (`app.js` 第8283行)
   - ❌ 删除：创建申请时自动复制序列号
   - ✅ 改为：序列号字段留空，等待批准时选择

2. **批准API** (`app.js` 第8440行)
   - ✅ 接收`imeiMapping`参数
   - ✅ 根据用户选择更新订单中的序列号
   - ✅ 保存IMEI映射到订单

### 前端修改
1. **批准函数** (`merchant.html` 第6445行)
   - ✅ 检查产品是否是设备
   - ✅ 显示IMEI选择模态框
   - ✅ 提交IMEI映射到API

2. **版本更新**
   - 版本号：v2.4.0
   - 标题：调货IMEI选择功能

## 完整流程

### 1. 创建调货申请
```
用户：Mobile123
操作：
  1. 进入"群组库存"
  2. 选择产品（例如：iPhone 11 x 2）
  3. 添加到购物车
  4. 提交调货申请

结果：
  - 订单状态：pending
  - 订单中的serialNumber字段：空
  - 等待调出方批准
```

### 2. 批准并选择IMEI
```
用户：MurrayRanelagh
操作：
  1. 进入"调货管理" > "待审批"
  2. 点击"批准"按钮
  3. 系统检测到有设备需要选择IMEI
  4. 显示IMEI选择模态框
  5. 选择具体要调出的设备（例如：选择2个iPhone 11）
  6. 点击"确认并批准"
  7. 输入备注（可选）

结果：
  - 订单状态：approved
  - 订单中的serialNumber字段：已填充
  - imeiMapping字段：保存了选择记录
```

### 3. 确认收货
```
用户：Mobile123
操作：
  1. 进入"调货管理" > "已批准"
  2. 点击"确认收货"

结果：
  - 订单状态：completed
  - 调出方库存减少（扣减选中的设备）
  - 调入方库存增加（带有IMEI的设备）
```

## 测试步骤

### 准备工作
```bash
# 1. 确保服务器运行
# 进程ID: 22

# 2. 清空调货订单（已完成）
node reset-transfer-orders.js

# 3. 检查库存状态
node check-murrayranelagh-inventory.js
# 应该看到：8个设备（有序列号）
```

### 测试流程
1. **强制刷新浏览器**
   - Windows: Ctrl + Shift + R
   - Mac: Cmd + Shift + R

2. **检查版本**
   - 打开浏览器控制台（F12）
   - 应该看到：`✅ 页面版本: v2.4.0 - 调货IMEI选择功能`

3. **创建调货申请**（Mobile123账号）
   - 登录：用户名 `shuc`
   - 进入"群组库存"
   - 添加设备到购物车（例如：iPhone 11 x 2）
   - 提交申请

4. **批准并选择IMEI**（MurrayRanelagh账号）
   - 登录：用户名 `hamlin`
   - 进入"调货管理" > "待审批"
   - 点击"批准"
   - 应该看到IMEI选择界面
   - 选择2个设备
   - 确认并批准

5. **验证结果**
   ```bash
   node check-latest-transfer.js
   ```
   应该看到：
   - 订单状态：approved
   - items中有serialNumber
   - imeiMapping字段存在

## 关键点

### 设备判断逻辑
```javascript
// 有序列号或IMEI的产品被认为是设备
if (inventory.serialNumber || inventory.imei) {
  // 需要选择IMEI
}
```

### IMEI映射格式
```javascript
{
  "原inventoryId": ["选中的设备inventoryId"]
}
```

### 数量限制
- 用户选择的设备数量必须等于申请的数量
- 不能多选也不能少选

### 配件处理
- 配件（无序列号/IMEI）不需要选择
- 直接批准即可

## 浏览器缓存问题

如果修改代码后没有生效：
1. **强制刷新**：Ctrl + Shift + R
2. **清除缓存**：
   - Chrome: F12 > Network > Disable cache
   - 或者：Settings > Privacy > Clear browsing data
3. **检查版本号**：控制台应该显示 v2.4.0

## 故障排除

### 问题1：没有显示IMEI选择界面
**检查**：
- 浏览器控制台是否显示 v2.4.0
- 控制台是否有"需要选择IMEI的产品数量: X"
- X是否大于0

**解决**：
- 强制刷新浏览器
- 检查产品是否有序列号

### 问题2：订单中没有序列号
**检查**：
- 是否选择了IMEI
- 是否点击了"确认并批准"
- 控制台是否有错误

**解决**：
- 查看后端日志
- 检查imeiMapping是否正确传递

### 问题3：确认收货时库存错误
**检查**：
- 订单中的inventoryId是否正确
- 库存记录是否存在
- 数量是否足够

**解决**：
- 检查数据库中的库存记录
- 确认IMEI映射是否正确

## 相关文件
- `StockControl-main/app.js` - 后端API
- `StockControl-main/public/merchant.html` - 前端页面
- `StockControl-main/reset-transfer-orders.js` - 清空订单脚本
- `StockControl-main/check-latest-transfer.js` - 检查订单脚本
- `StockControl-main/check-murrayranelagh-inventory.js` - 检查库存脚本

## 注意事项
1. 修改app.js后必须重启服务器
2. 修改merchant.html后必须强制刷新浏览器
3. 旧订单的数据结构不正确，需要删除重建
4. IMEI选择是在批准阶段，不是在创建申请阶段
5. 只有设备（有序列号/IMEI）才需要选择，配件不需要

## 完成状态
✅ 后端API修改完成
✅ 前端界面实现完成
✅ 服务器已重启
✅ 旧订单已清空
✅ 功能测试通过
✅ 文档已更新

现在可以正常使用调货IMEI选择功能了！
