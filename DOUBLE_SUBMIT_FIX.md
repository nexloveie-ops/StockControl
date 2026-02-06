# 双重提交问题修复

## 问题描述
用户报告即使有保护机制，仍然出现了2个相同的订单（WO-20260206-1935 和 WO-20260206-0755）。

## 根本原因
原代码使用了内联 `onclick` 属性绑定事件：
```html
<button onclick="confirmWarehouseOrderSubmit()">确认提交</button>
```

这种方式存在以下问题：
1. 在某些浏览器中，快速点击可能绕过JavaScript的防护标志
2. 内联事件处理器可能在某些情况下被多次触发
3. 事件冒泡可能导致意外的多次调用

## 解决方案

### 1. 移除内联onclick属性
```html
<!-- 修改前 -->
<button onclick="confirmWarehouseOrderSubmit()">确认提交</button>

<!-- 修改后 -->
<button id="confirmOrderSubmitBtn">确认提交</button>
```

### 2. 使用addEventListener绑定事件
在页面初始化时绑定事件监听器：
```javascript
window.addEventListener('DOMContentLoaded', () => {
  // ... 其他初始化代码
  
  // 绑定订单提交按钮事件（使用事件监听器而不是onclick，防止重复提交）
  const confirmBtn = document.getElementById('confirmOrderSubmitBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', confirmWarehouseOrderSubmit);
  }
});
```

### 3. 更新按钮选择器
将所有使用querySelector查找按钮的代码改为使用getElementById：
```javascript
// 修改前
const submitBtn = document.querySelector('#warehouseOrderSubmitModal button[onclick="confirmWarehouseOrderSubmit()"]');

// 修改后
const submitBtn = document.getElementById('confirmOrderSubmitBtn');
```

## 多层保护机制

现在系统有以下多层保护：

### 第1层：事件监听器（新增）
- 使用 `addEventListener` 而不是内联 `onclick`
- 浏览器原生防止同一事件监听器被多次触发

### 第2层：提交标志位
```javascript
let isSubmittingOrder = false;

if (isSubmittingOrder) {
  console.log('订单正在提交中，请勿重复点击');
  return;
}
isSubmittingOrder = true;
```

### 第3层：按钮禁用
```javascript
submitBtn.disabled = true;
submitBtn.style.opacity = '0.6';
submitBtn.style.cursor = 'not-allowed';
submitBtn.textContent = '提交中...';
```

### 第4层：状态恢复
```javascript
finally {
  isSubmittingOrder = false;
  submitBtn.disabled = false;
  submitBtn.style.opacity = '1';
  submitBtn.style.cursor = 'pointer';
  submitBtn.textContent = '确认提交';
}
```

## 测试步骤

1. **重启服务器**（加载新代码）
2. **刷新浏览器**（F5）
3. **测试场景**：
   - 产品：iPhone Clear Case (iPhone 12 Pro Max)
   - 当前库存：3个
   - 下单数量：2个
4. **快速连击"确认提交"按钮**（尽可能快地点击多次）
5. **验证结果**：
   - 只生成1个订单
   - 库存正确变为1个（3 - 2 = 1）
   - 按钮在提交期间显示"提交中..."且不可点击

## 修改的文件
- `StockControl-main/public/merchant.html`
  - 第1456行：移除按钮的onclick属性，添加id
  - 第6898行：更新按钮选择器
  - 第6958行：更新按钮选择器
  - 第7209-7213行：添加事件监听器绑定

## 为什么这次修复会有效

1. **addEventListener的优势**：
   - 浏览器原生防止重复触发
   - 更好的事件管理
   - 可以使用 `once: true` 选项（如果需要）

2. **移除内联事件的好处**：
   - 避免事件冒泡问题
   - 更好的代码分离
   - 更容易调试和维护

3. **多层防护**：
   - 即使某一层失效，其他层仍然有效
   - 提供视觉反馈（按钮禁用）
   - 提供日志记录（console.log）

## 下一步
用户需要：
1. 重启服务器
2. 刷新浏览器
3. 测试快速连击提交按钮
4. 验证只生成1个订单
