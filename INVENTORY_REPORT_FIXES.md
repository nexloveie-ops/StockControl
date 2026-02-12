# 库存报表功能修复

## 修复的问题

### 1. 排除维修业务 ✅
**问题**: 维修业务被统计在销售报表中

**修复**:
- 后端API添加过滤条件：`saleType: { $ne: 'REPAIR' }`
- 在统计产品销售时跳过维修项目：`if (item.isRepairItem) return;`

**代码位置**: `app.js` 第7530-7545行

### 2. 隐藏型号列 ✅
**问题**: 表格显示了型号列，用户希望隐藏

**修复**:
- 删除表格头的"型号"列
- 将颜色信息合并到产品名称中显示：`产品名称 (颜色)`
- 调整合计行的colspan从3改为2

**代码位置**: `merchant.html` 第7665-7720行

### 3. 修复缺货显示逻辑 ✅
**问题**: 产品有库存但显示缺货

**原因**: 
- 之前的逻辑：`estimatedDays > 0 ? estimatedDays : (currentStock > 0 ? 999 : 0)`
- 这会导致已售出的产品（库存为0）显示为缺货，即使它们不应该出现在报表中

**修复**:
- 改进预计销售时间的计算逻辑：
  ```javascript
  if (monthlySales > 0 && currentStock > 0) {
    estimatedDays = Math.round((currentStock / monthlySales) * 30);
  } else if (currentStock === 0) {
    estimatedDays = 0; // 已缺货
  } else {
    estimatedDays = 999; // 有库存但本月无销售
  }
  ```
- 修复前端显示逻辑，添加`&& item.estimatedDays > 0`条件：
  ```javascript
  item.estimatedDays < 7 && item.estimatedDays > 0 ?
    `<span style="color: #dc2626;">${item.currentStock}</span>` :
  ```

**代码位置**: 
- 后端：`app.js` 第7610-7620行
- 前端：`merchant.html` 第7690-7697行

## 修改的文件

1. **StockControl-main/app.js**
   - 第7530行：添加`saleType: { $ne: 'REPAIR' }`过滤条件
   - 第7543行：添加`if (item.isRepairItem) return;`跳过维修项目
   - 第7610-7620行：改进预计销售时间计算逻辑

2. **StockControl-main/public/merchant.html**
   - 第7665行：删除"型号"列头
   - 第7680行：将颜色合并到产品名称显示
   - 第7690-7697行：修复库存状态显示逻辑
   - 第7720行：调整合计行colspan
   - 第7755行：更新说明文档

## 测试验证

### 测试步骤：
1. 打开 http://localhost:3000/merchant.html
2. 登录商户账户
3. 点击"报表中心"标签
4. 查看库存报表

### 验证点：
- ✅ 维修业务不出现在报表中
- ✅ 表格不显示型号列
- ✅ 产品名称后显示颜色（如果有）
- ✅ 有库存的产品不显示为缺货
- ✅ 库存预警颜色正确：
  - 🟢 绿色：预计15天以上
  - 🟠 橙色：预计7-15天
  - 🔴 红色：预计7天以内
  - ⚫ 灰色：已缺货或无销售

## 服务器状态
- 服务器已重启（进程33）
- 所有修复已生效
- 前端和后端都已更新

## 注意事项

1. **维修业务排除**：
   - 通过`saleType`字段过滤
   - 通过`isRepairItem`字段跳过维修项目
   - 双重保护确保维修不被统计

2. **库存状态判断**：
   - 只有当`estimatedDays > 0`时才显示预警颜色
   - `estimatedDays === 0`表示已缺货
   - `estimatedDays === 999`表示有库存但无销售

3. **产品显示**：
   - 产品名称包含颜色信息
   - 型号信息仍在后端数据中，只是前端不显示
   - 便于后续需要时恢复显示
