# 维修业务小票打印功能完成

## 完成时间
2026-02-09

## 功能概述
在维修业务中创建新维修订单后，系统会询问是否打印小票，如果确认则自动打印两张80mm热敏小票：
1. **客户小票** - 给客户保留的凭证
2. **车间小票** - 内部维修使用的工单

## 实现细节

### 1. 打印流程
- 创建维修订单成功后，显示确认对话框："Do you want to print repair receipts? 是否打印维修小票？"
- 用户选择"确定"后，依次打印两张小票
- 两张小票之间延迟1秒，确保打印机正常处理

### 2. 客户小票内容
**标题**: CUSTOMER REPAIR RECEIPT

**包含信息**:
- 公司信息（名称、地址、电话、邮箱）
- 订单号 (Order No)
- 日期时间（爱尔兰格式：DD/MM/YYYY, HH:MM）
- 客户电话 (Customer Phone)
- 客户姓名 (Customer Name) - 如果有
- 设备名称 (Device)
- IMEI号码 - 如果有
- 序列号 (Serial No) - 如果有
- 问题描述 (Problem Description)
- 备注 (Notes) - 如果有
- 销售价格 (Sale Price)
- 页脚：Thank You! / For any questions, please contact us

### 3. 车间小票内容
**标题**: WORKSHOP REPAIR TICKET

**包含信息**:
- 公司信息（名称、地址、电话、邮箱）
- 订单号 (Order No)
- 日期时间（爱尔兰格式：DD/MM/YYYY, HH:MM）
- 设备名称 (Device)
- IMEI号码 - 如果有
- 序列号 (Serial No) - 如果有
- 问题描述 (Problem Description)
- 备注 (Notes) - 如果有
- 维修地点 (Repair Location)
- 预计完成时间 (Est. Completion) - 如果有
- 页脚：INTERNAL USE ONLY

## 技术实现

### 新增函数

#### 1. `printRepairReceipts(repairData, formData)`
主函数，负责协调打印流程：
- 获取用户公司信息
- 调用客户小票打印函数
- 延迟1秒后调用车间小票打印函数

#### 2. `printCustomerRepairReceipt(repairData, formData, companyInfo)`
打印客户小票：
- 生成客户小票HTML
- 打开新窗口
- 自动触发打印
- 打印后自动关闭窗口

#### 3. `printWorkshopRepairReceipt(repairData, formData, companyInfo)`
打印车间小票：
- 生成车间小票HTML
- 打开新窗口
- 自动触发打印
- 打印后自动关闭窗口

### 修改的函数

#### `submitNewRepair(event)`
在创建订单成功后添加了打印确认逻辑：
```javascript
// 询问是否打印小票
const shouldPrint = confirm('Do you want to print repair receipts?\n是否打印维修小票？');

if (shouldPrint) {
  // 打印两张小票
  await printRepairReceipts(result.data, formData);
}
```

## 小票格式特点

### 样式设计
- 字体：Courier New（等宽字体，适合热敏打印机）
- 宽度：80mm
- 字体大小：12px（正文）、16px（公司名称）、14px（总价）
- 分隔线：虚线边框
- 布局：左右对齐的行格式

### 打印设置
- 页面尺寸：80mm宽度，自动高度
- 页边距：0
- 打印延迟：500ms（等待页面加载）
- 窗口关闭延迟：1000ms（等待打印完成）

## 数据来源

### 公司信息
通过 `GET /api/users/profile?username=${merchantId}` API获取：
- companyName - 公司名称
- address - 地址
- phone - 电话
- email - 邮箱

### 维修订单信息
从 `repairData` 获取：
- repairOrderId - 订单号

从 `formData` 获取：
- customerPhone - 客户电话
- customerName - 客户姓名
- deviceName - 设备名称
- deviceIMEI - IMEI号码
- deviceSN - 序列号
- problemDescription - 问题描述
- notes - 备注
- salePrice - 销售价格
- repairLocation - 维修地点
- estimatedCompletionDate - 预计完成时间

## 使用说明

### 测试步骤
1. 登录商户账号
2. 进入"维修业务"页面
3. 点击"新增维修订单"
4. 填写维修订单信息：
   - 客户电话（必填）
   - 客户姓名（可选）
   - 设备名称（必填）
   - IMEI或序列号（可选）
   - 问题描述（必填）
   - 备注（可选）
   - 维修地点（必填）
   - 预计完成时间（可选）
   - 销售价格（必填）
5. 点击"创建订单"
6. 看到成功提示后，会弹出打印确认对话框
7. 点击"确定"开始打印
8. 第一张客户小票会自动打印
9. 1秒后第二张车间小票会自动打印

### 注意事项
- 确保浏览器允许弹出窗口
- 确保打印机已连接并设置为默认打印机
- 使用 Ctrl + Shift + R 强制刷新浏览器加载新代码
- 服务器不需要重启（只修改了HTML文件）
- 打印失败不会影响订单创建

## 文件修改
- `StockControl-main/public/merchant.html` - 添加了三个打印函数

## 状态
✅ 已完成并可以测试
