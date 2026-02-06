# 群组库存变体选择功能修复

## 修复时间
2026年2月6日

## 问题描述
群组库存页面的变体选择功能存在以下问题：
1. 点击"选择型号和颜色"按钮后，选择变体无法正确添加到调货清单
2. `selectGroupVariant` 函数调用了不存在的 `addDeviceToTransferCart` 函数
3. 目标店铺信息没有显示在购物车中

## 根本原因
1. merchant.html 引用了 `/transfer-cart.js` 文件，该文件包含所有购物车管理函数
2. `selectGroupVariant` 函数的逻辑不完整，没有正确处理设备和配件的区别
3. `selectStore` 函数没有更新购物车中的目标店铺显示

## 解决方案

### 1. 修复 `selectGroupVariant` 函数
**文件**: `StockControl-main/public/merchant.html`

**修改前**:
```javascript
function selectGroupVariant(variant) {
  closeGroupVariantModal();
  
  if (variant.items && variant.items.length > 0) {
    addDeviceToTransferCart(variant.items[0]);
  } else {
    const item = { ... };
    alert('已添加到调货清单');
  }
}
```

**修改后**:
```javascript
function selectGroupVariant(variant) {
  closeGroupVariantModal();
  
  if (variant.items && variant.items.length > 0) {
    const firstItem = variant.items[0];
    
    // 检查是否是设备（有序列号或IMEI）
    if (firstItem.serialNumber || firstItem.imei) {
      // 设备：添加第一个
      addDeviceToTransferCart(firstItem);
    } else {
      // 配件：可以选择数量
      addAccessoryToTransferCart(firstItem);
    }
  } else {
    alert('该变体暂无可用库存');
  }
}
```

**改进点**:
- 区分设备和配件：设备直接添加（数量固定为1），配件可以选择数量
- 正确调用 `transfer-cart.js` 中的函数
- 处理无库存的情况

### 2. 显示目标店铺信息
**文件**: `StockControl-main/public/merchant.html`

**修改 `selectStore` 函数**:
```javascript
async function selectStore(storeUsername, storeName) {
  selectedTransferStore = {
    username: storeUsername,
    name: storeName
  };
  
  // 显示目标店铺信息在购物车中
  document.getElementById('transferCartTargetStore').style.display = 'block';
  document.getElementById('transferCartStoreName').textContent = storeName;
  
  // ... 其他代码
}
```

**修改 `backToStoreSelection` 函数**:
```javascript
function backToStoreSelection() {
  // ... 其他代码
  
  // 隐藏目标店铺信息
  document.getElementById('transferCartTargetStore').style.display = 'none';
  document.getElementById('transferCartStoreName').textContent = '';
  
  // ... 其他代码
}
```

### 3. 更新版本号
- 页面版本: v2.1.2 → v2.1.3
- 版本说明: "修复群组库存变体选择功能"

## 功能说明

### transfer-cart.js 提供的函数
1. **addDeviceToTransferCart(item)**: 添加设备到调货清单（数量固定为1）
2. **addAccessoryToTransferCart(item)**: 添加配件到调货清单（可选择数量）
3. **updateTransferCart()**: 更新购物车显示
4. **clearTransferCart()**: 清空购物车
5. **submitTransferRequest()**: 提交调货申请

### 设备 vs 配件的区别
- **设备**: 有唯一的序列号（serialNumber）或IMEI，每个设备独立，数量固定为1
- **配件**: 没有序列号，可以批量调货，用户可以选择数量

## 测试步骤

### 1. 测试变体产品选择
1. 登录 MurrayRanelagh 账号
2. 进入"群组库存"
3. 选择店铺（如 MurrayDundrum）
4. 选择一个分类（如"手机"）
5. 找到有变体的产品（显示"可选变体"）
6. 点击"🎨 选择型号和颜色"按钮
7. 在弹出的模态框中选择一个变体
8. 验证：
   - 模态框关闭
   - 产品添加到右侧"调货清单"
   - 购物车计数器更新
   - 显示成功提示

### 2. 测试设备 vs 配件
**设备（有序列号）**:
- 点击后直接添加到购物车
- 数量固定为1
- 显示序列号/IMEI

**配件（无序列号）**:
- 点击后弹出数量输入框
- 可以输入数量
- 购物车中可以调整数量（+/-按钮）

### 3. 测试目标店铺显示
1. 选择店铺后，查看右侧购物车
2. 验证：
   - 显示"目标店铺"信息框（蓝色背景）
   - 显示选择的店铺名称
3. 返回店铺选择时，验证：
   - 目标店铺信息隐藏
   - 如果购物车有产品，提示清空

### 4. 测试无变体产品
1. 找到无变体的产品（显示为简洁卡片）
2. 点击"🛒 加入调货清单"按钮
3. 验证：
   - 根据产品类型调用正确的函数
   - 成功添加到购物车

## 相关文件
- `StockControl-main/public/merchant.html` (v2.1.3)
- `StockControl-main/public/transfer-cart.js` (购物车管理)

## 注意事项
1. 浏览器缓存问题：修改后需要强制刷新（Ctrl+F5）或清除缓存
2. 页面版本号：检查控制台输出确认加载了新版本
3. 调货清单只能用于一个店铺，切换店铺会清空购物车
4. 设备和配件的处理逻辑不同，需要正确识别

## 下一步
- 测试完整的调货流程（从选择产品到提交申请）
- 验证调货申请的审批流程
- 测试不同税务分类的产品
