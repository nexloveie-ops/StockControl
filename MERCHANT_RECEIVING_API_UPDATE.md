# 商户入库功能API更新说明

## 需要添加的API

由于商户入库功能需要与仓库管理员的入库功能一致，包括：
1. 发票识别入库
2. 手动录入入库

但考虑到：
- 发票识别功能需要OCR服务（可能需要额外配置）
- 当前已有的`/api/merchant/inventory/add` API可以满足基本入库需求
- 手动录入功能可以通过现有API实现

## 建议方案

### 方案A：简化实施（推荐）

保持当前的UI设计（发票上传+手动录入），但：

1. **发票上传功能**：暂时显示"功能开发中"提示
2. **手动录入功能**：使用现有的`/api/merchant/inventory/add` API
3. **批量入库**：通过循环调用现有API实现

优点：
- 无需修改后端
- 快速实现
- 保持UI一致性

### 方案B：完整实施

添加完整的API：
1. `POST /api/merchant/invoice/recognize` - 发票识别
2. `POST /api/merchant/invoice/confirm` - 确认入库
3. `POST /api/merchant/inventory/manual-receiving` - 批量手动入库

需要：
- OCR服务配置
- 发票解析逻辑
- 批量入库事务处理

## 当前状态

- ✅ 前端UI已更新（发票上传+手动录入）
- ✅ 供货商管理功能完整
- ⏳ 发票识别API（待添加或简化）
- ⏳ 批量手动入库API（待添加或使用现有API）

## 下一步建议

1. **立即可用**：修改前端JavaScript，使用现有API实现手动录入
2. **后续优化**：添加发票识别功能（需要OCR服务）

## 修改建议

修改`confirmMerchantManualReceiving()`函数，使用现有API：

```javascript
async function confirmMerchantManualReceiving() {
  // ... 验证代码 ...
  
  try {
    let successCount = 0;
    let failCount = 0;
    
    for (const p of products) {
      try {
        const response = await fetch(`${API_BASE}/merchant/inventory/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId,
            productName: p.productName,
            brand: p.brand,
            model: p.model,
            color: p.color,
            category: p.category,
            quantity: p.quantity,
            costPrice: p.costPrice,
            wholesalePrice: p.wholesalePrice,
            retailPrice: p.retailPrice,
            taxClassification: p.taxClassification,
            barcode: p.barcode,
            condition: p.condition,
            notes: `发票号: ${invoiceNumber}`
          })
        });
        
        const result = await response.json();
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }
    
    alert(`✅ 入库完成！\n\n成功: ${successCount} 个\n失败: ${failCount} 个`);
    clearMerchantManualForm();
    loadMyInventoryRecords();
  } catch (error) {
    alert('❌ 入库失败: ' + error.message);
  }
}
```

## 发票识别功能

暂时禁用或显示"开发中"：

```javascript
async function handleMerchantFileUpload(event) {
  alert('📋 发票识别功能开发中...\n\n请使用"手动录入入库"功能。');
  event.target.value = '';
}
```

---

**建议**: 先实施方案A，快速上线基本功能，后续再添加发票识别功能。
