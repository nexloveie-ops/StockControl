# 维修订单列表打印功能

## 完成时间
2026-02-09

## 功能概述
在维修业务的订单列表中，为每个订单添加"🖨️ 打印"按钮，点击后可以重新打印维修小票。系统会依次弹出两个对话框，分别询问是否打印客户小票和车间小票。

## 实现细节

### 1. 打印按钮位置
- 位置：维修订单列表的"操作"列
- 显示：所有状态的订单都显示打印按钮
- 样式：蓝色按钮，带打印机图标 🖨️

### 2. 打印流程
1. 用户点击订单的"🖨️ 打印"按钮
2. 系统获取订单详细信息
3. 系统获取用户公司信息
4. 立即弹出第一个对话框："Do you want to print CUSTOMER receipt? 是否打印客人维修小票？"
   - 点击"确定"：标记为打印客户小票
   - 点击"取消"：标记为不打印客户小票
5. 立即弹出第二个对话框："Do you want to print WORKSHOP ticket? 是否打印店铺维修小票？"
   - 点击"确定"：标记为打印车间小票
   - 点击"取消"：标记为不打印车间小票
6. 根据用户选择执行打印：
   - 两张都打印：先打印客户小票，1.5秒后打印车间小票
   - 只打印客户小票：立即打印客户小票
   - 只打印车间小票：立即打印车间小票
   - 两张都不打印：不执行任何操作

### 3. 对话框显示逻辑
- 两个对话框连续显示，不延迟
- 避免浏览器因窗口失去焦点而阻止对话框
- 用户可以一次性决定要打印哪些小票

## 技术实现

### 修改的函数

#### 1. `getRepairActions(repair)`
在操作按钮列表中添加打印按钮：
```javascript
// 打印按钮（所有订单都可以打印）
buttons.push(`<button class="btn" style="padding: 4px 8px; font-size: 12px; background: #3b82f6; color: white;" onclick="reprintRepairReceipts('${repair._id}')">🖨️ 打印</button>`);
```

### 新增函数

#### 2. `reprintRepairReceipts(repairId)`
重新打印维修小票的主函数：
- 通过 `GET /api/merchant/repairs/${repairId}` 获取订单详情
- 通过 `GET /api/users/profile?username=${merchantId}` 获取公司信息
- 准备打印数据（repairData 和 formData）
- 依次询问是否打印客户小票和车间小票
- 根据用户选择调用相应的打印函数

**数据准备**：
```javascript
const repairData = {
  repairOrderId: repair.repairOrderId
};

const formData = {
  customerPhone: repair.customerPhone,
  customerName: repair.customerName,
  deviceName: repair.deviceName,
  deviceIMEI: repair.deviceIMEI,
  deviceSN: repair.deviceSN,
  problemDescription: repair.problemDescription,
  notes: repair.notes,
  salePrice: repair.salePrice,
  repairLocation: repair.repairLocation,
  estimatedCompletionDate: repair.estimatedCompletionDate
};
```

## 用户体验优化

### 1. 灵活性
- 用户可以选择只打印客户小票
- 用户可以选择只打印车间小票
- 用户可以选择两张都打印
- 用户可以选择两张都不打印

### 2. 时序控制
- 两个对话框不会同时弹出，避免混淆
- 如果打印了第一张，会给打印机足够的处理时间
- 如果跳过第一张，第二个对话框会立即显示

### 3. 错误处理
- 获取订单信息失败：显示错误提示
- 获取公司信息失败：显示错误提示
- 打印过程出错：在控制台记录错误并显示提示

## 使用场景

### 1. 客户遗失小票
客户遗失了原始小票，需要重新打印一份给客户。

### 2. 内部记录需要
车间需要重新打印工单进行维修作业。

### 3. 补充打印
创建订单时选择了不打印，后续需要补充打印。

### 4. 打印失败重试
首次打印时打印机出现问题，需要重新打印。

## 测试步骤

### 测试重新打印功能
1. 登录商户账号
2. 进入"维修业务"页面
3. 在订单列表中找到任意订单
4. 点击该订单的"🖨️ 打印"按钮
5. 看到第一个对话框："是否打印客人维修小票？"
   - 测试A：点击"确定"，应该打印客户小票
   - 测试B：点击"取消"，应该跳过客户小票
6. 看到第二个对话框："是否打印店铺维修小票？"
   - 测试C：点击"确定"，应该打印车间小票
   - 测试D：点击"取消"，应该跳过车间小票

### 测试不同状态的订单
- 待维修订单：应该显示打印按钮 ✓
- 已送出订单：应该显示打印按钮 ✓
- 已取回订单：应该显示打印按钮 ✓
- 已完成订单：应该显示打印按钮 ✓
- 等待销售订单：应该显示打印按钮 ✓
- 已销售订单：应该显示打印按钮 ✓

### 测试打印内容
- 客户小票应该包含：公司信息、订单号、客户信息、设备信息、问题描述、销售价格
- 车间小票应该包含：公司信息、订单号、设备信息、问题描述、维修地点、预计完成时间

## 注意事项
- 使用 **Ctrl + Shift + R** 强制刷新浏览器加载新代码
- 服务器不需要重启（只修改了HTML文件）
- 确保浏览器允许弹出窗口
- 确保打印机已连接并设置为默认打印机

## 文件修改
- `StockControl-main/public/merchant.html`
  - 修改 `getRepairActions()` 函数：添加打印按钮
  - 新增 `reprintRepairReceipts()` 函数：处理重新打印逻辑

## 状态
✅ 已完成并可以测试
