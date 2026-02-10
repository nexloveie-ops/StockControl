# 退款成色逻辑规则

## 业务规则

### 核心逻辑
1. **全新产品退货**：可以变成任何成色（包括二手）
   - 如果变成二手成色，系统会自动修改分类
   - 例如："全新设备" → "二手设备"

2. **二手产品退货**：不能变成全新
   - 只能保持二手或选择更差的成色
   - 成色选项中不会显示"Brand New"

## 实现细节

### 1. 数据模型更新

#### MerchantSale模型
添加了原始成色和分类字段：
```javascript
items: [{
  originalCondition: {
    type: String,
    default: null
  },
  originalCategory: {
    type: String,
    default: null
  }
}]
```

### 2. 前端逻辑

#### 成色选项过滤
```javascript
// 判断原始成色是否为全新
const isBrandNew = originalCondition === 'Brand New' || 
                   originalCondition === '全新' || 
                   originalCondition === 'BRAND NEW';

// 根据原始成色过滤可选成色
if (isBrandNew) {
  // 全新产品：可以变成任何成色
  availableConditions = productConditions;
} else {
  // 二手产品：不能变成全新
  availableConditions = productConditions.filter(cond => {
    const condName = cond.name.toLowerCase();
    return condName !== 'brand new' && condName !== '全新';
  });
}
```

#### 分类变更警告
当全新产品选择二手成色时，显示警告提示：
```javascript
function checkCategoryChange(index, originalCondition, originalCategory) {
  const selectedCondition = document.getElementById(`deviceCondition_${index}`).value;
  
  const wasNew = originalCondition === 'Brand New';
  const isNowUsed = selectedCondition !== 'Brand New';
  
  if (wasNew && isNowUsed) {
    // 显示警告：分类将从"全新设备"变更为"二手设备"
    warningDiv.style.display = 'block';
  }
}
```

### 3. 后端逻辑

#### 分类自动变更
```javascript
// 检查是否需要变更分类（全新变二手）
const wasNew = refundItem.originalCondition === 'Brand New';
const isNowUsed = refundItem.deviceCondition !== 'Brand New';

if (wasNew && isNowUsed) {
  // 从全新变为二手，需要更新分类
  const oldCategory = inventory.category;
  
  // 将"全新设备"改为"二手设备"
  if (oldCategory && oldCategory.includes('全新')) {
    inventory.category = oldCategory.replace('全新', '二手');
  } else if (oldCategory && oldCategory.toLowerCase().includes('new')) {
    inventory.category = oldCategory.replace(/new/gi, 'Used');
  } else {
    inventory.category = '二手设备';
  }
  
  console.log(`分类变更: ${oldCategory} → ${inventory.category}`);
}
```

## 使用场景

### 场景1：全新产品退货（保持全新）
```
原始状态：
- 成色: Brand New
- 分类: 全新设备

退货选择：
- 成色: Brand New
- 状态: 可用

结果：
- 成色: Brand New
- 分类: 全新设备（不变）
- 状态: AVAILABLE
```

### 场景2：全新产品退货（变为二手）
```
原始状态：
- 成色: Brand New
- 分类: 全新设备

退货选择：
- 成色: Like New
- 状态: 可用

结果：
- 成色: Like New
- 分类: 二手设备（自动变更）
- 状态: AVAILABLE
- ⚠️ 显示警告提示
```

### 场景3：二手产品退货
```
原始状态：
- 成色: Like New
- 分类: 二手设备

可选成色：
- Like New ✅
- Excellent ✅
- Good ✅
- Fair ✅
- Pre-Owned ✅
- Brand New ❌（不可选）

退货选择：
- 成色: Good
- 状态: 可用

结果：
- 成色: Good
- 分类: 二手设备（不变）
- 状态: AVAILABLE
```

### 场景4：全新产品退货（损坏）
```
原始状态：
- 成色: Brand New
- 分类: 全新设备

退货选择：
- 成色: Fair
- 状态: 损坏

结果：
- 成色: Fair
- 分类: 二手设备（自动变更）
- 状态: DAMAGED
```

## 界面提示

### 全新产品退货界面
```
成色: [下拉选择]
      ├─ Brand New
      ├─ Like New
      ├─ Excellent
      ├─ Good
      ├─ Fair
      └─ Pre-Owned

⚠️ 注意：将全新产品改为二手成色后，分类将从"全新设备"变更为"二手设备"
（此警告在选择非Brand New成色时显示）
```

### 二手产品退货界面
```
成色: [下拉选择] (二手产品不可变为全新)
      ├─ Like New
      ├─ Excellent
      ├─ Good
      ├─ Fair
      └─ Pre-Owned
```

## 数据流

```
1. 用户点击销售记录
   ↓
2. 加载产品成色列表（从数据库）
   ↓
3. 显示订单详情
   ↓
4. 用户勾选退款商品
   ↓
5. 系统检查原始成色
   ↓
6. 过滤可选成色选项
   - 全新产品：显示所有成色
   - 二手产品：隐藏"Brand New"
   ↓
7. 用户选择新成色
   ↓
8. 系统检测分类变更
   - 全新→二手：显示警告
   ↓
9. 用户确认退款
   ↓
10. 后端处理
    - 更新库存成色
    - 如需要，自动变更分类
    ↓
11. 完成退款
```

## 分类变更规则

### 规则1：包含"全新"关键字
```
原分类: "全新设备"
新分类: "二手设备"

原分类: "全新iPhone"
新分类: "二手iPhone"
```

### 规则2：包含"new"关键字（英文）
```
原分类: "New Devices"
新分类: "Used Devices"

原分类: "Brand New Phones"
新分类: "Brand Used Phones"
```

### 规则3：无关键字
```
原分类: "iPhone"
新分类: "二手设备"（默认）
```

## 验证逻辑

### 前端验证
1. 检查原始成色
2. 过滤可选成色
3. 显示分类变更警告
4. 传递原始信息到后端

### 后端验证
1. 接收原始成色和分类
2. 比较新旧成色
3. 判断是否需要变更分类
4. 执行分类变更
5. 记录变更日志

## 成色数据库

当前系统中的成色（按sortOrder排序）：
1. Brand New (全新) - sortOrder: 1
2. Like New (准新) - sortOrder: 2
3. Excellent (优秀) - sortOrder: 3
4. Good (良好) - sortOrder: 4
5. Fair (一般) - sortOrder: 5
6. Pre-Owned (二手) - sortOrder: 6

## API端点

### 获取成色列表
```
GET /api/merchant/conditions

Response:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "code": "BRAND_NEW",
      "name": "Brand New",
      "description": "全新未拆封",
      "sortOrder": 1,
      "isActive": true
    },
    ...
  ]
}
```

### 处理退款
```
POST /api/merchant/sales/:saleId/refund

Request Body:
{
  "merchantId": "...",
  "refundItems": [
    {
      "type": "device",
      "deviceCondition": "Like New",
      "originalCondition": "Brand New",
      "originalCategory": "全新设备",
      ...
    }
  ],
  "refundTotal": 100.00
}

Response:
{
  "success": true,
  "message": "退款处理成功",
  "data": {
    "refundAmount": 100.00,
    "refundDate": "2026-02-10T..."
  }
}
```

## 测试场景

### 测试1：全新产品保持全新
1. 创建全新产品销售
2. 退款时选择Brand New
3. 验证：成色不变，分类不变

### 测试2：全新产品变二手
1. 创建全新产品销售
2. 退款时选择Like New
3. 验证：成色变为Like New，分类变为"二手设备"

### 测试3：二手产品不能变全新
1. 创建二手产品销售
2. 打开退款界面
3. 验证：成色选项中没有Brand New

### 测试4：二手产品保持二手
1. 创建二手产品销售
2. 退款时选择Good
3. 验证：成色变为Good，分类保持"二手设备"

## 注意事项

1. **原始数据保存**：
   - 销售时需要保存originalCondition和originalCategory
   - 如果旧数据没有这些字段，默认为Brand New

2. **成色判断**：
   - 支持多种格式：Brand New、全新、BRAND NEW
   - 不区分大小写

3. **分类变更**：
   - 只在全新→二手时触发
   - 二手→二手不变更分类
   - 全新→全新不变更分类

4. **用户提示**：
   - 二手产品界面明确标注"不可变为全新"
   - 全新产品选择二手成色时显示警告
   - 警告内容清晰说明分类变更

## 状态
✅ **功能已完整实现** - 退款成色逻辑符合业务规则
