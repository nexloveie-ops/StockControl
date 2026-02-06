# 群组库存设备分组显示功能

## 功能描述
在群组库存页面，当查看设备类产品时，相同产品会合并显示，序列号默认隐藏，点击按钮可展开查看详细信息。

## 功能特点

### 1. 智能识别设备类型
- **设备**：有序列号(serialNumber)或IMEI的产品
- **配件**：没有序列号的产品

### 2. 设备产品合并规则
相同的产品会合并为一行，合并条件：
- 相同商户
- 相同产品名称
- 相同品牌
- 相同型号
- 相同颜色
- 相同零售价

### 3. 显示方式

#### 设备类产品（合并显示）
| 商户 | 产品名称 | 品牌/型号 | 颜色 | 数量 | 零售价 | 操作 |
|------|---------|----------|------|------|--------|------|
| MurrayRanelagh | iPhone 14 128GB | Apple iPhone 14 | Black | 3 台 | €450.00 | ▶ 查看序列号 |

点击"查看序列号"后展开：
```
序列号          IMEI              成色
222222         -                 AB Grade
222333         -                 AB Grade  
222555         -                 AB Grade
```

#### 配件类产品（直接显示）
| 商户 | 产品名称 | 品牌/型号 | 颜色 | 条码 | 数量 | 零售价 |
|------|---------|----------|------|------|------|--------|
| MurrayRanelagh | Lightning Cable | - | - | - | 98 | €5.00 |

## 技术实现

### 1. 产品类型判断
```javascript
const isDevice = products.some(p => p.serialNumber || p.imei);
```

### 2. 设备分组逻辑
```javascript
const grouped = {};
products.forEach(item => {
  const key = `${item.merchantId}|${item.productName}|${item.brand}|${item.model}|${item.color}|${item.retailPrice}`;
  if (!grouped[key]) {
    grouped[key] = {
      merchantId: item.merchantId,
      productName: item.productName,
      // ... 其他字段
      items: []
    };
  }
  grouped[key].items.push(item);
});
```

### 3. 展开/收起功能
```javascript
function toggleGroupSerialNumbers(rowIndex) {
  const serialRow = document.getElementById(`serial-row-${rowIndex}`);
  const icon = document.getElementById(`toggle-icon-${rowIndex}`);
  
  if (serialRow.style.display === 'none') {
    serialRow.style.display = 'table-row';
    icon.textContent = '▼';
  } else {
    serialRow.style.display = 'none';
    icon.textContent = '▶';
  }
}
```

## 用户界面

### 设备产品表格
```
┌─────────────────────────────────────────────────────────────────┐
│ 商户 │ 产品名称 │ 品牌/型号 │ 颜色 │ 数量 │ 零售价 │ 操作      │
├─────────────────────────────────────────────────────────────────┤
│ MurrayRanelagh │ iPhone 14 │ Apple │ Black │ 3台 │ €450 │ ▶查看SN │
├─────────────────────────────────────────────────────────────────┤
│ (展开后显示序列号列表)                                           │
│   序列号: 222222  IMEI: -  成色: AB Grade                       │
│   序列号: 222333  IMEI: -  成色: AB Grade                       │
│   序列号: 222555  IMEI: -  成色: AB Grade                       │
└─────────────────────────────────────────────────────────────────┘
```

### 展开状态
- **收起**: ▶ 查看序列号
- **展开**: ▼ 查看序列号

### 序列号详情表格
- 背景色：浅灰色 (#f8f9fa)
- 最大高度：300px（超出滚动）
- 字体：等宽字体（monospace）
- 字号：12px

## 使用场景

### 场景 1: 查看群组内的 iPhone 库存
1. 进入"群组库存"标签页
2. 点击"手机"分类
3. 看到合并后的产品列表：
   - iPhone 14 128GB Black - 3台
   - iPhone 12 128GB - 1台
4. 点击"查看序列号"查看每台设备的详细信息

### 场景 2: 查看配件库存
1. 进入"群组库存"标签页
2. 点击"配件"分类
3. 直接显示所有配件，不合并

## 优势

### 1. 简洁的界面
- 相同产品合并显示，避免列表过长
- 一目了然地看到每种产品的总数量

### 2. 详细信息按需查看
- 序列号默认隐藏，保持界面整洁
- 需要时点击展开，查看每台设备的详细信息

### 3. 灵活的分组
- 按商户、产品、规格分组
- 同一商户的相同产品合并
- 不同商户的相同产品分开显示

### 4. 适配不同产品类型
- 设备：合并显示 + 序列号展开
- 配件：直接显示数量

## 示例数据

### 设备产品（合并前）
```javascript
[
  { merchantId: 'MurrayRanelagh', productName: 'iPhone 14 128GB', serialNumber: '222222', quantity: 1 },
  { merchantId: 'MurrayRanelagh', productName: 'iPhone 14 128GB', serialNumber: '222333', quantity: 1 },
  { merchantId: 'MurrayRanelagh', productName: 'iPhone 14 128GB', serialNumber: '222555', quantity: 1 }
]
```

### 设备产品（合并后）
```javascript
{
  'MurrayRanelagh|iPhone 14 128GB|Apple|iPhone 14|Black|450': {
    merchantId: 'MurrayRanelagh',
    productName: 'iPhone 14 128GB',
    items: [
      { serialNumber: '222222', ... },
      { serialNumber: '222333', ... },
      { serialNumber: '222555', ... }
    ]
  }
}
```

显示为：
- 1 行合并记录，显示"3 台"
- 点击展开后显示 3 条序列号记录

## 修改的文件
- `public/merchant.html` - 修改了 `displayGroupInventoryProducts` 函数，添加了 `toggleGroupSerialNumbers` 函数

## 测试步骤

### 1. 准备测试数据
确保 MurrayRanelagh 有多台相同型号的设备：
- iPhone 14 128GB (序列号: 222222, 222333, 222555)
- iPhone 12 128GB (序列号: 111333)

### 2. 测试设备合并
1. 使用 MurrayDundrum 登录（需要在同一群组）
2. 进入"群组库存"标签页
3. 点击"手机"分类
4. 验证：
   - iPhone 14 显示为 1 行，数量显示"3 台"
   - iPhone 12 显示为 1 行，数量显示"1 台"
   - 每行都有"▶ 查看序列号"按钮

### 3. 测试序列号展开
1. 点击 iPhone 14 的"查看序列号"按钮
2. 验证：
   - 按钮图标变为"▼"
   - 下方展开显示 3 条序列号记录
   - 显示序列号、IMEI、成色信息
3. 再次点击按钮
4. 验证：
   - 按钮图标变回"▶"
   - 序列号列表收起

### 4. 测试配件显示
1. 点击"配件"分类
2. 验证：
   - 配件直接显示，不合并
   - 显示条码列
   - 没有"查看序列号"按钮

## 注意事项

1. **分组键的唯一性**
   - 使用 `|` 分隔多个字段
   - 确保相同产品能正确合并

2. **序列号列表滚动**
   - 最大高度 300px
   - 超出部分可滚动查看

3. **性能考虑**
   - 前端分组，适合中小规模数据
   - 如果单个分类产品过多，考虑后端分组

4. **兼容性**
   - 使用标准 HTML/CSS/JavaScript
   - 无需额外依赖

## 状态
✅ 已实现 - 2026-02-05

## 下一步优化建议

1. **添加筛选功能**
   - 按商户筛选
   - 按价格范围筛选

2. **添加排序功能**
   - 按数量排序
   - 按价格排序

3. **批量操作**
   - 全部展开/收起
   - 批量选择调货

4. **导出功能**
   - 导出群组库存清单
   - 包含序列号详情
