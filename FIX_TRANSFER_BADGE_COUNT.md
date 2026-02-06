# 修复：调货管理标签数量初始显示

## 问题描述
在调货管理页面，标签上的数字徽章（如"已完成"）初始显示为 0，只有点击标签后才会更新为正确的数量。

## 根本原因
`loadTransferManagement` 函数只加载默认标签（待审批）的数据，其他标签的数据要等到用户点击时才加载，导致徽章数字不准确。

## 解决方案

### 修改文件
`StockControl-main/public/merchant.html`

### 修改内容
添加 `loadAllTransferCounts` 函数，在页面加载时并行获取所有标签的数量。

**修改前**：
```javascript
function loadTransferManagement() {
  // 默认加载待审批列表
  switchTransferTab('pending-approval');
}
```

**修改后**：
```javascript
async function loadTransferManagement() {
  // 加载所有标签的数量
  await loadAllTransferCounts();
  
  // 默认加载待审批列表
  switchTransferTab('pending-approval');
}

// 加载所有标签的数量
async function loadAllTransferCounts() {
  try {
    // 并行加载所有数量
    const [pendingRes, approvedRes, myRequestsRes, completedRes] = await Promise.all([
      fetch(`${API_BASE}/merchant/inventory/transfer/list?merchantId=${merchantId}&status=pending`),
      fetch(`${API_BASE}/merchant/inventory/transfer/list?merchantId=${merchantId}&type=received&status=approved`),
      fetch(`${API_BASE}/merchant/inventory/transfer/list?merchantId=${merchantId}&type=received`),
      fetch(`${API_BASE}/merchant/inventory/transfer/list?merchantId=${merchantId}&status=completed`)
    ]);
    
    const [pending, approved, myRequests, completed] = await Promise.all([
      pendingRes.json(),
      approvedRes.json(),
      myRequestsRes.json(),
      completedRes.json()
    ]);
    
    // 更新徽章数字
    if (pending.success) {
      document.getElementById('badge-pending-approval').textContent = pending.data.length;
    }
    if (approved.success) {
      document.getElementById('badge-pending-receive').textContent = approved.data.length;
    }
    if (myRequests.success) {
      const activeRequests = myRequests.data.filter(t => t.status !== 'completed');
      document.getElementById('badge-my-requests').textContent = activeRequests.length;
    }
    if (completed.success) {
      document.getElementById('badge-completed').textContent = completed.data.length;
    }
  } catch (error) {
    console.error('加载调货数量失败:', error);
  }
}
```

## 优势

### 1. 并行加载
使用 `Promise.all` 并行请求所有数据，提高加载速度。

### 2. 准确显示
页面加载时立即显示所有标签的正确数量。

### 3. 用户体验
用户无需点击每个标签就能看到各个状态的调货数量。

## 测试步骤

1. 清除浏览器缓存（Ctrl+F5）
2. 登录 MurrayRanelagh 账号
3. 进入"调货管理"标签
4. ✅ 验证：所有标签的数字徽章立即显示正确数量
   - 待审批：X 件
   - 待收货：X 件
   - 我的申请：X 件
   - 已完成：1 件（或实际数量）

## 版本历史
- v2.1.7: 调货管理列表显示变体信息
- v2.1.8: 调货管理初始加载所有标签数量 ✅

## 完成时间
2026年2月6日
