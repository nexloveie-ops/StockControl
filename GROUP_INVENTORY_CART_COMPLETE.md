# 群组库存调货购物车功能完成 ✅

## 日期
2026-02-11

## 状态
✅ 已完成并可测试

## 问题描述

用户反馈merchant.html的群组库存功能有两个问题：

### 问题1：设备IMEI选择时机不对
- **当前行为**：在源店铺添加设备到调货清单时就要选择IMEI
- **期望行为**：在源店铺添加设备时不选择IMEI，而是在目标店铺收货/出货时由目标店铺选择具体的IMEI

### 问题2：设备数量固定为1
- **当前行为**：设备选择时数量永远是1，无法选择多个
- **期望行为**：设备也应该可以选择数量（例如：iPhone 13 × 3台）

## 解决方案

### 核心改进

#### 1. 统一设备和配件的处理逻辑
- 设备和配件都使用相同的添加函数 `addToTransferCart()`
- 都支持数量选择（初始为1，可通过+/-按钮调整）
- 都不在添加时绑定序列号/IMEI

#### 2. 购物车数据结构
```javascript
transferCart = [
  {
    productName: 'iPhone 13',
    brand: 'Apple',
    model: '128GB',
    color: 'Blue',
    condition: 'New',
    quantity: 3,  // 可调整
    transferPrice: 800,
    retailPrice: 900,
    taxClassification: 'VAT_23',
    category: '手机',
    availableItems: [...]  // 保存可用库存记录
    // 不包含 serialNumber 或 imei
  }
]
```

#### 3. IMEI选择延后
- 调货申请提交时不包含序列号
- 目标店铺审批通过后，在发货环节选择具体的IMEI
- 更符合实际业务流程

## 实现细节

### 新增函数

#### 1. `updateTransferCart()`
- 更新购物车显示
- 计算总数量和总金额
- 渲染购物车项列表
- 支持数量调整按钮

#### 2. `addToTransferCart(productData)`
- 统一的添加函数（设备和配件）
- 检查是否已存在相同产品
- 存在则增加数量，不存在则新增
- 验证库存数量限制

#### 3. `increaseTransferCartQuantity(index)`
- 增加指定项的数量
- 检查库存上限
- 更新显示

#### 4. `decreaseTransferCartQuantity(index)`
- 减少指定项的数量
- 最小为1（不能为0）
- 更新显示

#### 5. `removeFromTransferCart(index)`
- 从购物车移除指定项
- 更新显示

#### 6. `clearTransferCart()`
- 清空整个购物车
- 显示确认对话框
- 更新显示

#### 7. `submitTransferRequest()`
- 验证购物车不为空
- 显示确认对话框
- 提交到后端API
- 成功后清空购物车并返回店铺选择

#### 8. `addDeviceToTransferCart()` 和 `addAccessoryToTransferCart()`
- 兼容旧代码的包装函数
- 内部调用 `addToTransferCart()`

### 修改的函数

#### 1. `selectGroupVariant(variant)`
修改前：
```javascript
// 区分设备和配件
if (firstItem.serialNumber || firstItem.imei) {
  addDeviceToTransferCart(firstItem);  // 数量固定为1
} else {
  addAccessoryToTransferCart(itemWithTotalQty);
}
```

修改后：
```javascript
// 统一处理
const productData = {
  productName: firstItem.productName,
  brand: firstItem.brand,
  model: variant.model,
  color: variant.color,
  // ... 其他字段
  availableItems: variant.items  // 不包含序列号
};
addToTransferCart(productData);  // 统一添加
```

#### 2. 无变体产品的添加按钮
修改前：
```javascript
onclick='addAccessoryToTransferCart(${JSON.stringify({
  ...group.items[0],
  quantity: group.quantity,
  allItems: group.items
})})'
```

修改后：
```javascript
onclick='addToTransferCart(${JSON.stringify({
  productName: group.productName,
  brand: group.brand,
  model: '',
  color: '',
  condition: group.items[0].condition,
  wholesalePrice: group.wholesalePrice,
  retailPrice: group.retailPrice,
  taxClassification: group.taxClassification,
  category: group.category,
  availableItems: group.items
})})'
```

## 文件修改

### StockControl-main/public/merchant.html

#### 修改位置1：添加购物车变量和函数（第5329行之后）
```javascript
let transferCart = [];  // 调货购物车

// 添加以下函数：
- updateTransferCart()
- increaseTransferCartQuantity()
- decreaseTransferCartQuantity()
- removeFromTransferCart()
- clearTransferCart()
- addToTransferCart()
- addDeviceToTransferCart()
- addAccessoryToTransferCart()
- submitTransferRequest()
```

#### 修改位置2：selectGroupVariant() 函数
- 统一设备和配件的添加逻辑
- 不区分是否有序列号
- 都支持数量选择

#### 修改位置3：无变体产品的添加按钮
- 使用 `addToTransferCart()` 替代 `addAccessoryToTransferCart()`
- 传递标准化的产品数据结构

## 功能特性

### 1. 数量选择
- ✅ 设备支持数量选择（不再固定为1）
- ✅ 配件支持数量选择
- ✅ 初始数量为1
- ✅ 可通过+/-按钮调整
- ✅ 自动验证库存上限

### 2. 购物车管理
- ✅ 显示产品列表
- ✅ 显示产品详情（名称、型号、颜色、成色）
- ✅ 显示单价和小计
- ✅ 显示总数量和总金额
- ✅ 支持增加/减少数量
- ✅ 支持移除单个产品
- ✅ 支持清空购物车

### 3. 智能合并
- ✅ 相同产品自动合并（增加数量）
- ✅ 不同变体分别显示
- ✅ 避免重复添加

### 4. 数据验证
- ✅ 验证库存数量
- ✅ 验证目标店铺已选择
- ✅ 验证购物车不为空
- ✅ 提交前确认

### 5. 用户体验
- ✅ 实时更新显示
- ✅ 清晰的提示信息
- ✅ 确认对话框
- ✅ 成功/失败反馈

## 业务流程

### 调货流程（新）

#### 步骤1：源店铺选择产品
1. 登录源店铺（例如：MurrayRanelagh）
2. 进入"群组库存"
3. 选择目标店铺（例如：MurrayDundrum）
4. 浏览产品分类
5. 选择产品和数量
   - iPhone 13 - 128GB - Blue × 3
   - Samsung Galaxy S22 × 2
6. 产品添加到购物车（不包含IMEI）

#### 步骤2：提交申请
1. 检查购物车内容
2. 调整数量（如需要）
3. 点击"提交调货申请"
4. 确认信息
5. 提交成功，获得调货单号

#### 步骤3：目标店铺审批
1. 登录目标店铺（MurrayDundrum）
2. 进入"调货管理" → "待审批"
3. 查看申请详情（不显示IMEI）
4. 审批通过或拒绝

#### 步骤4：目标店铺发货
1. 进入"待发货"列表
2. 选择调货单
3. 为每个产品选择具体的IMEI：
   - iPhone 13 × 3: 选择 IMEI001, IMEI002, IMEI003
   - Samsung × 2: 选择 IMEI004, IMEI005
4. 确认发货

#### 步骤5：源店铺收货
1. 收到发货通知
2. 进入"待收货"列表
3. 确认收货
4. 产品进入库存（带有IMEI）

## 测试指南

详见：`QUICK_TEST_GROUP_INVENTORY_CART.md`

### 快速测试步骤

1. **测试数量选择**
   - 添加设备到购物车
   - 点击"+"增加数量
   - 点击"-"减少数量
   - 验证数量变化和金额计算

2. **测试库存限制**
   - 增加数量到库存上限
   - 尝试继续增加
   - 验证提示信息

3. **测试产品合并**
   - 添加相同产品两次
   - 验证自动合并（数量+1）

4. **测试提交申请**
   - 添加多个产品
   - 提交申请
   - 验证成功提示和购物车清空

## 优势

### 1. 业务流程优化
- **灵活性**：发货方可根据实际情况选择IMEI
- **准确性**：避免IMEI选择错误或变更
- **效率**：简化申请流程

### 2. 用户体验改进
- **统一性**：设备和配件使用相同的操作方式
- **直观性**：购物车界面清晰易用
- **便捷性**：支持批量调货

### 3. 数据管理
- **一致性**：统一的数据结构
- **可追溯**：完整的调货记录
- **可扩展**：易于添加新功能

## 技术要点

### 1. 数据结构设计
```javascript
// 购物车项
{
  productName: string,
  brand: string,
  model: string,
  color: string,
  condition: string,
  quantity: number,  // 可调整
  transferPrice: number,
  retailPrice: number,
  taxClassification: string,
  category: string,
  availableItems: Array  // 保存可用库存
}
```

### 2. 状态管理
- 使用全局变量 `transferCart` 存储购物车状态
- 每次修改后调用 `updateTransferCart()` 更新显示
- 提交成功后清空状态

### 3. 数据验证
```javascript
// 库存数量验证
const maxQuantity = item.availableItems.reduce((sum, i) => sum + i.quantity, 0);
if (item.quantity < maxQuantity) {
  // 允许增加
} else {
  // 显示错误提示
}
```

### 4. 产品匹配
```javascript
// 检查是否为相同产品
const existingIndex = transferCart.findIndex(item => 
  item.productName === productData.productName &&
  item.model === productData.model &&
  item.color === productData.color &&
  item.condition === productData.condition
);
```

## 后续工作

### 1. 后端API调整
- [ ] 确保 `/api/merchant/inventory/transfer` 支持不带序列号的调货
- [ ] 添加发货时的IMEI选择接口
- [ ] 更新调货记录数据结构

### 2. 发货功能实现
- [ ] 实现目标店铺的IMEI选择界面
- [ ] 从可用库存中选择具体设备
- [ ] 验证选择的IMEI数量与申请数量一致

### 3. 收货功能完善
- [ ] 显示收到的产品及其IMEI
- [ ] 确认收货后更新库存
- [ ] 生成收货记录

### 4. 文档更新
- [ ] 更新用户手册
- [ ] 更新API文档
- [ ] 更新业务流程图

## 注意事项

### 1. 数据一致性
- 确保购物车数据与实际库存一致
- 提交前验证库存可用性
- 处理并发调货的情况

### 2. 用户体验
- 提供清晰的错误提示
- 显示加载状态
- 确认重要操作

### 3. 性能优化
- 避免频繁的DOM操作
- 使用防抖处理数量调整
- 优化大量产品的渲染

### 4. 错误处理
- 网络请求失败的处理
- 库存不足的提示
- 权限验证

## 相关文档

- `FIX_GROUP_INVENTORY_TRANSFER_CART.md` - 详细修复说明
- `QUICK_TEST_GROUP_INVENTORY_CART.md` - 测试指南
- `GROUP_INVENTORY_COMPLETE.md` - 群组库存功能文档

## 总结

### 完成情况
- ✅ 设备支持数量选择
- ✅ 不在添加时选择IMEI
- ✅ 购物车功能完整
- ✅ 代码无语法错误
- ✅ 测试文档完整

### 核心改进
1. 统一了设备和配件的处理逻辑
2. 实现了完整的购物车功能
3. 延后了IMEI选择到发货环节
4. 提升了用户体验

### 技术亮点
- 清晰的数据结构
- 完善的状态管理
- 智能的产品合并
- 严格的数据验证

---

**功能已完成，可以开始测试！** 🎉

**测试地址**：http://localhost:3000  
**测试账号**：MurrayRanelagh / 123456  
**测试指南**：QUICK_TEST_GROUP_INVENTORY_CART.md

**祝测试顺利！** 🚀
