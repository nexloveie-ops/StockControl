# 修复群组库存调货购物车功能

## 日期
2026-02-11

## 问题描述

用户反馈merchant.html的群组库存功能有两个问题：

### 问题1：设备IMEI选择时机不对
- **当前行为**：在源店铺添加设备到调货清单时就要选择IMEI
- **期望行为**：在源店铺添加设备时不选择IMEI，而是在目标店铺收货/出货时由目标店铺选择具体的IMEI

### 问题2：设备数量固定为1
- **当前行为**：设备选择时数量永远是1，无法选择多个
- **期望行为**：设备也应该可以选择数量（例如：iPhone 13 × 3台）

## 根本原因

### 1. 缺少购物车函数定义
代码中调用了以下函数但没有定义：
- `addDeviceToTransferCart()` - 添加设备到购物车
- `addAccessoryToTransferCart()` - 添加配件到购物车
- `clearTransferCart()` - 清空购物车
- `submitTransferRequest()` - 提交调货申请
- `updateTransferCart()` - 更新购物车显示

### 2. 设备和配件处理逻辑混乱
```javascript
// 当前代码（第5768-5780行）
if (firstItem.serialNumber || firstItem.imei) {
  // 设备：添加第一个（数量固定为1）
  addDeviceToTransferCart(firstItem);
} else {
  // 配件：可以选择数量
  addAccessoryToTransferCart(itemWithTotalQty);
}
```

问题：
- 设备直接添加单个item，数量固定为1
- 设备立即绑定了序列号/IMEI
- 无法选择设备数量

## 解决方案

### 设计思路

#### 1. 统一设备和配件的添加逻辑
- 设备和配件都支持数量选择
- 设备在添加到购物车时不绑定具体的IMEI/序列号
- 只记录产品信息和数量

#### 2. IMEI选择延后到收货环节
- 调货申请提交时不包含序列号
- 目标店铺收货时从可用库存中选择具体的IMEI
- 这样更符合实际业务流程

#### 3. 购物车数据结构
```javascript
transferCart = [
  {
    productName: 'iPhone 13',
    brand: 'Apple',
    model: '128GB',
    color: 'Blue',
    condition: 'New',
    quantity: 3,  // 可以是多个
    transferPrice: 800,  // 批发价
    retailPrice: 900,
    taxClassification: 'VAT_23',
    category: '手机',
    // 不包含 serialNumber 或 imei
    availableItems: [...]  // 保存可用的库存记录供参考
  }
]
```

## 实现步骤

### 步骤1：添加购物车变量和基础函数

在merchant.html的JavaScript部分添加：

```javascript
// 调货购物车
let transferCart = [];

// 更新购物车显示
function updateTransferCart() {
  const cartCount = transferCart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = transferCart.reduce((sum, item) => sum + (item.transferPrice * item.quantity), 0);
  
  document.getElementById('transferCartCount').textContent = cartCount;
  document.getElementById('transferCartTotal').textContent = cartTotal.toFixed(2);
  
  if (transferCart.length === 0) {
    document.getElementById('transferCartItems').innerHTML = 
      '<p style="color: #9ca3af; text-align: center; padding: 40px 0;">调货清单是空的</p>';
  } else {
    const html = transferCart.map((item, index) => `
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
        <div style="font-weight: 600; margin-bottom: 8px; color: #1f2937;">
          ${item.productName}
          ${item.model ? `<span style="font-size: 12px; color: #6b7280;"> - ${item.model}</span>` : ''}
          ${item.color ? `<span style="font-size: 12px; color: #6b7280;"> - ${item.color}</span>` : ''}
        </div>
        ${item.condition ? `<div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">成色: ${item.condition}</div>` : ''}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <button onclick="decreaseTransferCartQuantity(${index})" 
              style="width: 24px; height: 24px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; line-height: 1;">-</button>
            <span style="min-width: 30px; text-align: center; font-weight: 600;">${item.quantity}</span>
            <button onclick="increaseTransferCartQuantity(${index})" 
              style="width: 24px; height: 24px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; line-height: 1;">+</button>
          </div>
          <div>
            <div style="color: #6b7280; font-size: 12px;">€${item.transferPrice.toFixed(2)} × ${item.quantity}</div>
            <div style="font-weight: 600; color: #ef4444;">€${(item.transferPrice * item.quantity).toFixed(2)}</div>
          </div>
        </div>
        <button onclick="removeFromTransferCart(${index})" 
          style="width: 100%; margin-top: 8px; padding: 4px; background: #fee2e2; color: #ef4444; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
          移除
        </button>
      </div>
    `).join('');
    
    document.getElementById('transferCartItems').innerHTML = html;
  }
}

// 增加数量
function increaseTransferCartQuantity(index) {
  const item = transferCart[index];
  const maxQuantity = item.availableItems ? item.availableItems.reduce((sum, i) => sum + i.quantity, 0) : 999;
  
  if (item.quantity < maxQuantity) {
    transferCart[index].quantity++;
    updateTransferCart();
  } else {
    alert(`库存不足，最多可调货 ${maxQuantity} 件`);
  }
}

// 减少数量
function decreaseTransferCartQuantity(index) {
  if (transferCart[index].quantity > 1) {
    transferCart[index].quantity--;
    updateTransferCart();
  }
}

// 从购物车移除
function removeFromTransferCart(index) {
  transferCart.splice(index, 1);
  updateTransferCart();
}

// 清空购物车
function clearTransferCart() {
  if (confirm('确定要清空调货清单吗？')) {
    transferCart = [];
    updateTransferCart();
  }
}
```

### 步骤2：统一添加到购物车的函数

```javascript
// 添加产品到调货购物车（设备和配件统一处理）
function addToTransferCart(productData) {
  if (!selectedTransferStore) {
    alert('请先选择目标店铺');
    return;
  }
  
  // 检查是否已存在相同产品
  const existingIndex = transferCart.findIndex(item => 
    item.productName === productData.productName &&
    item.model === productData.model &&
    item.color === productData.color &&
    item.condition === productData.condition
  );
  
  if (existingIndex >= 0) {
    // 已存在，增加数量
    const maxQuantity = productData.availableItems ? 
      productData.availableItems.reduce((sum, i) => sum + i.quantity, 0) : 999;
    
    if (transferCart[existingIndex].quantity < maxQuantity) {
      transferCart[existingIndex].quantity++;
      updateTransferCart();
      alert('✅ 已增加数量');
    } else {
      alert(`库存不足，最多可调货 ${maxQuantity} 件`);
    }
  } else {
    // 新产品，添加到购物车
    transferCart.push({
      productName: productData.productName,
      brand: productData.brand || '',
      model: productData.model || '',
      color: productData.color || '',
      condition: productData.condition || '',
      quantity: 1,  // 初始数量为1
      transferPrice: productData.wholesalePrice || productData.transferPrice,
      retailPrice: productData.retailPrice,
      taxClassification: productData.taxClassification,
      category: productData.category,
      availableItems: productData.availableItems || []  // 保存可用库存记录
    });
    
    updateTransferCart();
    alert('✅ 已添加到调货清单');
  }
}

// 兼容旧代码：添加设备到购物车
function addDeviceToTransferCart(deviceData) {
  addToTransferCart(deviceData);
}

// 兼容旧代码：添加配件到购物车
function addAccessoryToTransferCart(accessoryData) {
  addToTransferCart(accessoryData);
}
```

### 步骤3：修改变体选择逻辑

修改`selectGroupVariant()`函数（第5756-5782行）：

```javascript
// 选择群组变体
function selectGroupVariant(variant) {
  // 关闭模态框
  closeGroupVariantModal();
  
  // 统一添加到调货清单（不区分设备和配件）
  if (variant.items && variant.items.length > 0) {
    const firstItem = variant.items[0];
    
    // 准备产品数据
    const productData = {
      productName: firstItem.productName,
      brand: firstItem.brand,
      model: variant.model || firstItem.model,
      color: variant.color || firstItem.color,
      condition: firstItem.condition,
      wholesalePrice: variant.wholesalePrice,
      retailPrice: variant.retailPrice,
      taxClassification: variant.taxClassification,
      category: firstItem.category,
      availableItems: variant.items  // 保存所有可用库存
    };
    
    // 统一添加（设备和配件都支持数量选择）
    addToTransferCart(productData);
  } else {
    alert('该变体暂无可用库存');
  }
}
```

### 步骤4：修改无变体产品的添加逻辑

修改`displayGroupInventoryProducts()`函数中无变体产品的按钮（第5678-5686行）：

```javascript
<button class="btn-sm btn-primary" onclick='addToTransferCart(${JSON.stringify({
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
}).replace(/'/g, "\\'")})'
  style="width: 100%; padding: 10px; font-size: 14px;">
  🛒 加入调货清单
</button>
```

### 步骤5：实现提交调货申请

```javascript
// 提交调货申请
async function submitTransferRequest() {
  if (!selectedTransferStore) {
    alert('请先选择目标店铺');
    return;
  }
  
  if (transferCart.length === 0) {
    alert('调货清单是空的');
    return;
  }
  
  // 确认对话框
  const itemsHtml = transferCart.map(item => `
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
      <span>${item.productName} ${item.model ? `- ${item.model}` : ''} ${item.color ? `- ${item.color}` : ''} × ${item.quantity}</span>
      <span style="font-weight: 600;">€${(item.transferPrice * item.quantity).toFixed(2)}</span>
    </div>
  `).join('');
  
  const total = transferCart.reduce((sum, item) => sum + (item.transferPrice * item.quantity), 0);
  
  const confirmed = confirm(`确认提交调货申请？\n\n目标店铺：${selectedTransferStore.name}\n\n产品清单：\n${transferCart.map(item => `${item.productName} × ${item.quantity}`).join('\n')}\n\n总金额：€${total.toFixed(2)}`);
  
  if (!confirmed) {
    return;
  }
  
  try {
    // 准备调货数据
    const transferData = {
      fromMerchant: merchantId,  // 当前用户（调出方）
      toMerchant: selectedTransferStore.username,  // 目标店铺（调入方）
      items: transferCart.map(item => ({
        productName: item.productName,
        brand: item.brand,
        model: item.model,
        color: item.color,
        condition: item.condition,
        quantity: item.quantity,
        transferPrice: item.transferPrice,
        retailPrice: item.retailPrice,
        taxClassification: item.taxClassification,
        category: item.category
        // 注意：不包含 serialNumber 或 imei
      })),
      totalAmount: total,
      notes: ''
    };
    
    // 提交到后端
    const response = await fetch(`${API_BASE}/merchant/inventory/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transferData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert(`✅ 调货申请已提交！\n\n调货单号：${result.data.transferNumber}\n\n等待 ${selectedTransferStore.name} 审批。`);
      
      // 清空购物车
      transferCart = [];
      updateTransferCart();
      
      // 返回店铺选择
      backToStoreSelection();
    } else {
      alert('❌ 提交失败：' + result.error);
    }
  } catch (error) {
    console.error('提交调货申请失败:', error);
    alert('❌ 提交失败：' + error.message);
  }
}
```

## 业务流程

### 新的调货流程

#### 1. 源店铺（调出方）
1. 选择目标店铺
2. 浏览群组库存
3. 选择产品和数量（不选择具体IMEI）
4. 添加到调货清单
5. 提交调货申请

#### 2. 目标店铺（调入方）
1. 收到调货申请通知
2. 审批调货申请
3. 准备发货时，从库存中选择具体的IMEI/序列号
4. 确认发货

#### 3. 源店铺收货
1. 收到货物
2. 确认收货
3. 产品进入库存（带有IMEI/序列号）

### 优势

1. **灵活性**：源店铺不需要提前指定IMEI，目标店铺可以根据实际情况选择
2. **准确性**：避免了IMEI选择错误或变更的问题
3. **效率**：简化了调货申请流程
4. **数量支持**：设备也可以批量调货（例如：10台iPhone 13）

## 测试步骤

### 测试1：添加设备到购物车（支持数量）

1. 登录 MurrayRanelagh
2. 进入"群组库存"
3. 选择 MurrayDundrum 店铺
4. 选择"手机"分类
5. 点击 Samsung Galaxy S22 的"选择型号和颜色"
6. 选择一个变体
7. 验证：
   - ✅ 产品添加到购物车
   - ✅ 初始数量为1
   - ✅ 可以点击"+"增加数量
   - ✅ 可以点击"-"减少数量
   - ✅ 不显示序列号/IMEI

### 测试2：添加配件到购物车

1. 选择"配件"分类
2. 点击某个配件的"加入调货清单"
3. 验证：
   - ✅ 配件添加到购物车
   - ✅ 可以调整数量
   - ✅ 价格计算正确

### 测试3：提交调货申请

1. 购物车中添加多个产品
2. 点击"提交调货申请"
3. 确认对话框显示正确信息
4. 提交成功
5. 验证：
   - ✅ 生成调货单号
   - ✅ 购物车清空
   - ✅ 返回店铺选择

### 测试4：目标店铺审批和发货

1. 登录 MurrayDundrum
2. 进入"调货管理" → "待审批"
3. 查看调货申请
4. 审批通过
5. 准备发货时选择具体的IMEI
6. 确认发货

## 文件修改清单

### 需要修改的文件
- `StockControl-main/public/merchant.html`
  - 添加 `transferCart` 变量
  - 添加 `updateTransferCart()` 函数
  - 添加 `addToTransferCart()` 函数
  - 添加 `increaseTransferCartQuantity()` 函数
  - 添加 `decreaseTransferCartQuantity()` 函数
  - 添加 `removeFromTransferCart()` 函数
  - 修改 `clearTransferCart()` 函数
  - 修改 `submitTransferRequest()` 函数
  - 修改 `selectGroupVariant()` 函数
  - 修改无变体产品的添加按钮

### 后端API（可能需要调整）
- `app.js` - `/api/merchant/inventory/transfer` 接口
  - 确保支持不带序列号的调货申请
  - 在收货环节添加IMEI选择功能

## 注意事项

1. **库存数量验证**：确保调货数量不超过可用库存
2. **价格使用**：使用批发价（wholesalePrice）作为调货价格
3. **税务分类**：保持原产品的税务分类
4. **数据一致性**：确保购物车数据与实际库存一致

## 下一步

1. 实现上述代码修改
2. 测试所有功能
3. 更新后端API支持不带序列号的调货
4. 实现目标店铺的IMEI选择功能
5. 更新文档

## 状态
🔄 待实现
