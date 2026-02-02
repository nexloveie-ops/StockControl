# 销售价格确认 - 使用批发价

## 确认状态：✅ 已使用批发价

经过检查，系统已经在使用批发价（wholesalePrice）进行销售，而不是零售价（retailPrice）。

## 代码验证

### 1. 前端显示价格（prototype-working.html）

#### 设备价格显示
```javascript
// 第4677行
<div style="font-size: 16px; color: #10b981; font-weight: bold;">
  €${(product.wholesalePrice || 0).toFixed(2)} / Unit
</div>
```

#### 设备选择传递价格
```javascript
// 第4687行
onchange="updateDeviceSelection('${product._id}', '${product.name}', ${product.wholesalePrice || 0}, '${sn.serialNumber}', this.checked)"
```

#### 配件价格显示
```javascript
// 第4705行
<div style="font-size: 16px; color: #10b981; font-weight: bold;">
  €${(product.wholesalePrice || 0).toFixed(2)}
</div>
```

#### 配件选择传递价格
```javascript
// 第4715行
onchange="updateAccessorySelection('${product._id}', '${product.name}', ${product.wholesalePrice || 0}, ${product.stockQuantity}, '${product.barcode || ''}')"
```

### 2. 后端创建发票（app-new.js）

```javascript
// 第2345-2347行
// 使用批发价作为销售价格
const unitPrice = product.wholesalePrice || 0;
const totalPrice = unitPrice * item.quantity;
```

## 价格流程

### 完整的价格传递链路

1. **前端选择产品**
   - 用户在销售界面选择产品
   - 显示批发价：`product.wholesalePrice`
   - 传递批发价到 `selectedProducts` 数组

2. **前端提交订单**
   ```javascript
   selectedProducts = [
     {
       productId: "...",
       productName: "...",
       quantity: 1,
       price: 850.00, // 这是批发价
       serialNumbers: [...],
       code: "..."
     }
   ]
   ```

3. **后端处理订单**
   - 接收前端传递的数据
   - **重新从数据库获取产品信息**
   - 使用数据库中的批发价：`product.wholesalePrice`
   - 计算不含税价格和税额
   - 创建发票记录

4. **发票存储**
   ```javascript
   {
     unitPrice: 691.06, // 不含税批发价
     totalPrice: 691.06, // 不含税总价
     taxAmount: 158.94,  // 税额
     // 含税价格 = 850.00 (批发价)
   }
   ```

## 价格类型说明

系统中有三种价格：

1. **进货价（costPrice）** - 含税
   - 从供应商采购的价格
   - 用于计算成本和利润

2. **批发价（wholesalePrice）** - 含税
   - 销售给客户的价格
   - **当前销售功能使用此价格**
   - 高于进货价，低于零售价

3. **零售价（retailPrice）** - 含税
   - 建议零售价
   - 最高价格
   - **不用于销售功能**

## 价格关系

```
进货价 < 批发价 < 零售价
costPrice < wholesalePrice < retailPrice

示例：
进货价：€700 (含税)
批发价：€850 (含税) ← 销售使用
零售价：€1000 (含税)
```

## 测试验证

### 验证步骤

1. **查看产品批发价**
   - 进入库存管理
   - 查看任意产品的批发价（wholesalePrice）
   - 记录价格，例如：€850.00

2. **创建销售订单**
   - 进入客户管理
   - 选择客户并点击"💰 销售"
   - 选择产品
   - 确认显示的价格是批发价（€850.00）

3. **查看发票详情**
   - 创建发票后查看详情
   - 确认单价是批发价（€850.00 含税）
   - 确认计算正确

4. **验证数据库**
   - 发票中存储的是不含税价格
   - 例如：€691.06（不含税）+ €158.94（税额）= €850.00（含税批发价）

## 结论

✅ **系统已正确使用批发价**
- 前端显示批发价
- 前端传递批发价
- 后端使用批发价
- 发票记录批发价

✅ **价格计算正确**
- 含税价格 = 批发价
- 不含税价格 = 批发价 / (1 + 税率)
- 税额 = 含税价格 - 不含税价格

✅ **不使用零售价**
- 零售价仅作为参考
- 销售功能不使用零售价

---

**确认时间：** 2026-02-02
**状态：** ✅ 已验证
**结论：** 系统正确使用批发价进行销售
