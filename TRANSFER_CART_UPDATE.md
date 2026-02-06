# 调货购物车功能更新

## 问题
1. 无法一次调多个产品
2. 设备调货需要指定具体的 IMEI/SN

## 解决方案

### 1. 添加购物车功能
- 参考仓库订货的购物车实现
- 支持添加多个产品到调货清单
- 支持从多个商户调货（自动分组）

### 2. 设备调货
- 每个设备都有唯一的 IMEI/SN
- 点击"查看详情"展开序列号列表
- 每个设备单独添加到购物车
- 数量固定为 1

### 3. 配件调货
- 可以选择数量
- 支持增加/减少数量
- 检查库存限制

## 已完成的修改

### HTML 结构
- ✅ 添加购物车侧边栏
- ✅ 显示购物车数量和总计
- ✅ 支持清空购物车

### JavaScript 函数
- ✅ addDeviceToTransferCart() - 添加设备
- ✅ addAccessoryToTransferCart() - 添加配件
- ✅ updateTransferCart() - 更新购物车显示
- ✅ increaseTransferCartQuantity() - 增加数量
- ✅ decreaseTransferCartQuantity() - 减少数量
- ✅ removeFromTransferCart() - 移除产品
- ✅ clearTransferCart() - 清空购物车
- ✅ submitTransferRequest() - 提交调货申请
- ✅ showTransferConfirmDialog() - 显示确认对话框

## 待完成
- 需要完成 showTransferConfirmDialog 函数的完整实现
- 需要完成 confirmTransferRequest 函数
- 需要完成 closeTransferConfirmDialog 函数

## 下一步
由于代码太长，需要分步完成。建议重启服务器测试当前功能。
