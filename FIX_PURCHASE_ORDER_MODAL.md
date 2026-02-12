# 采购订单详情模态框修复

## 修复时间
2026-02-12

## 问题描述
点击采购报表中的订单号时，显示错误："showModal is not defined"

## 问题原因
`showPurchaseOrderDetails`函数调用了不存在的`showModal`函数。merchant.html中没有定义通用的`showModal`函数。

## 修复方案

### 修改文件: merchant.html (第7900-7950行)

#### 修复前:
```javascript
// 显示模态框
showModal('采购订单详情', detailsHTML);  // ❌ showModal函数不存在
```

#### 修复后:
```javascript
// 显示模态框 - 使用DOM操作
const modal = document.getElementById('purchaseOrderModal');
const content = document.getElementById('purchaseOrderContent');

if (!modal) {
  // 如果模态框不存在，创建它
  const modalHTML = `
    <div id="purchaseOrderModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
      <div style="background: white; border-radius: 10px; padding: 30px; max-width: 1000px; width: 90%; max-height: 90vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0;">📦 采购订单详情</h3>
          <button onclick="closePurchaseOrderModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
        </div>
        
        <div id="purchaseOrderContent">
          ${detailsHTML}
        </div>
        
        <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
          <button onclick="closePurchaseOrderModal()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
            关闭
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
} else {
  // 如果模态框存在，更新内容并显示
  content.innerHTML = detailsHTML;
  modal.style.display = 'flex';
}

// 新增关闭函数
function closePurchaseOrderModal() {
  const modal = document.getElementById('purchaseOrderModal');
  if (modal) {
    modal.style.display = 'none';
  }
}
```

## 修复说明

### 1. 动态创建模态框
- 首次调用时，如果模态框不存在，动态创建并添加到页面
- 使用`document.body.insertAdjacentHTML('beforeend', modalHTML)`添加到body末尾

### 2. 复用模态框
- 如果模态框已存在，只更新内容并显示
- 避免重复创建DOM元素

### 3. 关闭函数
- 添加`closePurchaseOrderModal()`函数
- 通过设置`display: 'none'`隐藏模态框

## 模态框功能

### 显示内容
- 订单基本信息（订单号、日期、供货商、类型）
- 产品清单表格
  - 产品名称、型号、颜色、序列号
  - 数量、单价、总价
  - 税分类
- 总金额和税额汇总
- PDF下载按钮

### 交互功能
- 点击订单号 → 显示详情
- 点击关闭按钮 → 隐藏模态框
- 点击下载PDF → 生成并下载PDF文档

## 测试步骤

1. 登录商户系统
2. 进入"报表中心" → "采购报表"
3. 点击任意订单号
4. 验证详情模态框正确显示
5. 检查产品清单、金额、税额
6. 点击"下载PDF"测试PDF生成
7. 点击"关闭"按钮关闭模态框

## 相关文件
- `StockControl-main/public/merchant.html` (第7900-7950行)

## 注意事项
- HTML文件修改后需要强制刷新浏览器（Ctrl + Shift + R）
- 模态框使用inline样式，无需额外CSS
- 模态框z-index为1000，确保在最上层显示
