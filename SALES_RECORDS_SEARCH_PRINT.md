# 销售记录搜索和打印功能

## 功能概述

在销售记录查询中添加了两个新功能：
1. **搜索框** - 快速搜索销售记录
2. **打印按钮** - 重新打印历史订单的小票

## 1. 搜索功能

### 搜索框位置
在日期选择器下方，查询按钮上方

### 搜索范围
可以搜索以下字段：
- ✅ 客户电话号码
- ✅ 产品名称
- ✅ 序列号 (IMEI/SN)
- ✅ 订单号
- ✅ 金额（单价或总额）

### 使用方法
1. 先选择日期范围并点击"查询销售记录"
2. 在搜索框中输入关键字
3. 系统自动过滤显示匹配的记录
4. 清空搜索框显示所有记录

### 搜索示例

#### 示例1: 搜索客户电话
```
输入: 087
结果: 显示所有电话号码包含"087"的销售记录
```

#### 示例2: 搜索产品名称
```
输入: iPhone
结果: 显示所有产品名称包含"iPhone"的销售记录
```

#### 示例3: 搜索序列号
```
输入: IMEI123
结果: 显示序列号包含"IMEI123"的销售记录
```

#### 示例4: 搜索金额
```
输入: 899
结果: 显示价格包含"899"的销售记录
```

#### 示例5: 搜索订单号
```
输入: SALE-20260206
结果: 显示订单号包含"SALE-20260206"的销售记录
```

### 搜索特点
- 🔍 实时搜索（输入即搜索）
- 📝 不区分大小写
- 🎯 模糊匹配
- ⚡ 快速响应
- 🔄 可清空重置

## 2. 打印功能

### 打印按钮位置
每条销售记录的最后一列"操作"栏

### 功能说明
- 点击"🖨️ 打印"按钮
- 重新生成该订单的小票
- 调用打印机打印

### 打印内容
与原始小票完全相同：
- 公司信息
- 订单号
- 日期时间
- 客户电话
- 商品明细
- 支付信息
- 总金额

### 使用场景

#### 场景1: 客户遗失小票
客户回来要求补打小票
1. 搜索客户电话或订单号
2. 找到对应记录
3. 点击"打印"按钮
4. 重新打印小票

#### 场景2: 存档需要
需要打印历史订单存档
1. 查询日期范围
2. 找到需要的订单
3. 点击"打印"按钮
4. 打印存档

#### 场景3: 退换货凭证
客户退换货需要原始小票
1. 搜索订单号或产品
2. 找到对应记录
3. 点击"打印"按钮
4. 提供给客户

## 界面更新

### 表格新增列
在原有表格基础上新增：
- **订单号** 列 - 显示完整订单号
- **操作** 列 - 显示打印按钮

### 表格列顺序
1. 日期
2. 订单号 (新增)
3. 产品
4. 序列号
5. 数量
6. 单价
7. 销售额
8. 成本
9. 税额
10. 税务分类
11. 支付方式
12. 客户
13. 操作 (新增)

## 技术实现

### 数据存储
```javascript
// 全局变量存储销售记录
let allSalesData = [];

// 查询时保存数据
async function querySalesRecords() {
  const result = await fetch(...);
  allSalesData = result.data; // 保存原始数据
  displaySalesRecords(allSalesData);
}
```

### 搜索过滤
```javascript
function filterSalesRecords() {
  const searchTerm = document.getElementById('salesSearchInput').value;
  
  const filteredData = allSalesData.filter(sale => {
    // 搜索客户电话
    if (sale.customerPhone?.includes(searchTerm)) return true;
    
    // 搜索订单号
    if (sale.saleId?.includes(searchTerm)) return true;
    
    // 搜索商品名称和序列号
    return sale.items.some(item => 
      item.productName?.includes(searchTerm) ||
      item.serialNumber?.includes(searchTerm)
    );
  });
  
  displaySalesRecords(filteredData);
}
```

### 重新打印
```javascript
async function reprintReceipt(saleId) {
  // 从保存的数据中找到销售记录
  const sale = allSalesData.find(s => s._id === saleId);
  
  // 准备打印数据
  const saleData = { saleId: sale.saleId };
  const orderData = {
    customerPhone: sale.customerPhone,
    paymentMethod: sale.paymentMethod,
    items: sale.items
  };
  
  // 调用打印函数
  await printReceipt(saleData, orderData, sale.totalAmount);
}
```

## 测试步骤

### 测试1: 搜索功能
1. 登录商户账号
2. 进入"销售业务"
3. 展开"销售记录查询"
4. 选择日期范围并查询
5. 在搜索框输入关键字
6. 验证：
   - ✅ 实时过滤显示
   - ✅ 匹配正确
   - ✅ 清空搜索框恢复所有记录

### 测试2: 打印功能
1. 在销售记录中找到一条记录
2. 点击"🖨️ 打印"按钮
3. 验证：
   - ✅ 打印窗口弹出
   - ✅ 小票内容正确
   - ✅ 订单号匹配
   - ✅ 商品明细正确
   - ✅ 金额正确

### 测试3: 综合测试
1. 搜索特定客户的订单
2. 找到后点击打印
3. 验证打印内容与搜索结果一致

## 搜索关键字示例

### 按客户搜索
```
+353 87 123 4567
087
123 4567
```

### 按产品搜索
```
iPhone
Samsung
Case
Cable
```

### 按序列号搜索
```
IMEI
SN
123456
```

### 按金额搜索
```
899
29.99
100
```

### 按订单号搜索
```
SALE-20260206
20260206
001
```

## 优势

### 1. 提高效率
- ✅ 快速找到特定订单
- ✅ 无需翻页查找
- ✅ 节省时间

### 2. 改善服务
- ✅ 快速响应客户需求
- ✅ 及时补打小票
- ✅ 提升客户满意度

### 3. 便于管理
- ✅ 方便查询历史记录
- ✅ 支持多种搜索方式
- ✅ 灵活的数据查找

## 注意事项

### 1. 搜索范围
- 搜索仅在当前查询的日期范围内
- 需要先查询再搜索
- 更改日期需要重新查询

### 2. 打印限制
- 需要浏览器允许弹出窗口
- 需要配置打印机
- 打印内容与原始小票相同

### 3. 性能考虑
- 大量数据时搜索可能稍慢
- 建议缩小日期范围
- 使用更具体的关键字

## 未来改进

### 可能的增强功能
1. **高级搜索** - 多条件组合搜索
2. **导出功能** - 导出搜索结果为Excel
3. **批量打印** - 选择多条记录批量打印
4. **搜索历史** - 保存常用搜索关键字
5. **排序功能** - 按不同字段排序
6. **分页显示** - 大量数据分页显示

## 修改的文件

- `StockControl-main/public/merchant.html`
  - 添加搜索框HTML
  - 添加打印按钮
  - 新增 `allSalesData` 全局变量
  - 重写 `querySalesRecords()` 函数
  - 新增 `displaySalesRecords()` 函数
  - 新增 `filterSalesRecords()` 函数
  - 新增 `reprintReceipt()` 函数

## 版本历史

- **v1.0.0** - 基础销售记录查询
- **v1.1.0** - 添加搜索和打印功能

## 状态

✅ 已完成 - 请刷新浏览器测试（Ctrl + Shift + R）
