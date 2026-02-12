# 修复 transferCart 重复声明错误

## 日期
2026-02-11

## 问题
浏览器报错：
```
Uncaught SyntaxError: Identifier 'transferCart' has already been declared (at merchant.html:1558:11)
```

## 原因

### 1. 外部文件已声明
在 `public/transfer-cart.js` 文件中（第4行）已经声明了：
```javascript
let transferCart = [];
```

### 2. HTML中重复声明
在 `merchant.html` 中（第5331行）又声明了一次：
```javascript
let transferCart = [];  // 调货购物车
```

### 3. 加载顺序
merchant.html 的 head 部分加载了 transfer-cart.js：
```html
<script src="/transfer-cart.js"></script>
```

这导致 `transferCart` 变量被声明了两次，引发语法错误。

## 解决方案

### 修改内容
删除 merchant.html 中的重复声明，改为注释说明：

```javascript
// ==================== 群组库存功能 ====================

let selectedTransferStore = null;  // 选中的目标店铺
let allGroupInventoryData = [];
// transferCart 已在 transfer-cart.js 中声明

// 更新调货购物车显示（覆盖 transfer-cart.js 中的版本）
function updateTransferCart() {
  // ... 新的实现
}
```

### 函数覆盖机制

由于 JavaScript 的函数覆盖机制，merchant.html 中定义的函数会覆盖 transfer-cart.js 中的同名函数。这意味着：

1. `transferCart` 变量使用 transfer-cart.js 中的声明
2. 以下函数使用 merchant.html 中的新实现（覆盖旧版本）：
   - `updateTransferCart()`
   - `increaseTransferCartQuantity()`
   - `decreaseTransferCartQuantity()`
   - `removeFromTransferCart()`
   - `clearTransferCart()`
   - `addToTransferCart()`
   - `addDeviceToTransferCart()`
   - `addAccessoryToTransferCart()`
   - `submitTransferRequest()`

## 新旧版本对比

### transfer-cart.js（旧版本）

#### 设备添加
```javascript
function addDeviceToTransferCart(item) {
  // 检查是否已在购物车
  const exists = transferCart.find(cartItem => cartItem._id === item._id);
  if (exists) {
    alert('该设备已在调货清单中');
    return;
  }
  
  // 添加到购物车，数量固定为1
  transferCart.push({
    _id: item._id,
    // ...
    quantity: 1, // 固定为1
    isDevice: true
  });
}
```

#### 配件添加
```javascript
function addAccessoryToTransferCart(item) {
  // 通过 prompt 输入数量
  const quantity = prompt(`请输入调货数量（可用: ${item.quantity}）:`, '1');
  // ...
}
```

#### 数量调整
- 设备：不支持调整（固定为1）
- 配件：支持 +/- 按钮调整

### merchant.html（新版本）

#### 统一添加
```javascript
function addToTransferCart(productData) {
  // 检查是否已存在相同产品
  const existingIndex = transferCart.findIndex(item => 
    item.productName === productData.productName &&
    item.model === productData.model &&
    item.color === productData.color &&
    item.condition === productData.condition
  );
  
  if (existingIndex >= 0) {
    // 已存在，增加数量
    transferCart[existingIndex].quantity++;
  } else {
    // 新产品，添加到购物车
    transferCart.push({
      productName: productData.productName,
      // ...
      quantity: 1,  // 初始为1，可调整
      availableItems: productData.availableItems
    });
  }
}
```

#### 数量调整
- 设备：支持 +/- 按钮调整
- 配件：支持 +/- 按钮调整
- 统一的用户体验

## 优势

### 1. 统一的用户体验
- 设备和配件使用相同的操作方式
- 都支持 +/- 按钮调整数量
- 不再需要 prompt 输入

### 2. 智能产品合并
- 相同产品自动合并（增加数量）
- 不同变体分别显示

### 3. 延后IMEI选择
- 添加时不绑定序列号
- 发货时才选择具体IMEI

### 4. 更好的数据结构
```javascript
// 新版本
{
  productName: 'iPhone 13',
  brand: 'Apple',
  model: '128GB',
  color: 'Blue',
  condition: 'New',
  quantity: 3,  // 可调整
  transferPrice: 800,
  availableItems: [...]  // 保存可用库存
  // 不包含 serialNumber 或 imei
}

// 旧版本
{
  _id: '...',
  inventoryId: '...',
  serialNumber: 'XXX',  // 立即绑定
  quantity: 1,  // 固定为1
  isDevice: true
}
```

## 兼容性

### 保留的兼容函数
```javascript
// 兼容旧代码：添加设备到购物车
function addDeviceToTransferCart(deviceData) {
  addToTransferCart(deviceData);
}

// 兼容旧代码：添加配件到购物车
function addAccessoryToTransferCart(accessoryData) {
  addToTransferCart(accessoryData);
}
```

这些函数确保旧代码仍然可以工作，但内部使用新的实现。

## 测试步骤

1. 清除浏览器缓存（Ctrl + Shift + Delete）
2. 强制刷新页面（Ctrl + Shift + R）
3. 打开浏览器控制台（F12）
4. 检查是否还有错误
5. 测试群组库存功能：
   - 添加设备到购物车
   - 调整数量（+/-按钮）
   - 添加配件到购物车
   - 提交调货申请

## 预期结果

- ✅ 没有 JavaScript 错误
- ✅ 设备可以调整数量
- ✅ 配件可以调整数量
- ✅ 购物车功能正常
- ✅ 提交申请成功

## 注意事项

### 1. 函数覆盖顺序
- transfer-cart.js 先加载
- merchant.html 的 script 后执行
- 后定义的函数会覆盖先定义的

### 2. 变量作用域
- `transferCart` 是全局变量
- 在两个文件中都可以访问
- 只能声明一次

### 3. 未来改进
考虑将所有调货购物车相关代码整合到一个文件中，避免分散在多个文件导致维护困难。

## 相关文件

- `public/transfer-cart.js` - 原有的购物车实现
- `public/merchant.html` - 新的购物车实现（覆盖旧版本）
- `FIX_GROUP_INVENTORY_TRANSFER_CART.md` - 功能改进说明
- `GROUP_INVENTORY_CART_COMPLETE.md` - 完成总结

## 状态
✅ 已修复

## 测试
🔄 待测试
