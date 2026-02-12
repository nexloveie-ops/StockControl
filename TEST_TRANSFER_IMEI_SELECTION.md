# 测试调货IMEI选择功能

## 当前数据状态

### 待审批订单
- **订单号**: TRF20260211001
- **调出方**: MurrayRanelagh (ham lin)
- **调入方**: Mobile123 (shu chen)
- **产品**: 
  - IPHONE11 x 1 (128GB, Unknown品牌)
  - IPHONE11 x 1 (128GB, Unknown品牌)

### MurrayRanelagh可用设备
找到 3 个 iPhone 11 设备：
1. IMEI: 352926111850103 - PRE-OWNED, 128GB, white
2. IMEI: 353988109592906 - PRE-OWNED, 128GB, white
3. IMEI: 352928114188457 - PRE-OWNED, 128GB, white

## 测试步骤

### 1. 登录MurrayRanelagh账号
```
用户名: hamlin
密码: [使用正确的密码]
```

### 2. 进入调货管理
1. 点击左侧菜单"调货管理"
2. 切换到"待审批"标签
3. 应该看到订单 TRF20260211001

### 3. 批准调货并选择IMEI
1. 点击"批准"按钮
2. **打开浏览器控制台（F12）查看调试信息**
3. 应该看到以下console.log输出：
   ```
   === 开始批准调货流程 ===
   调货ID: 698d035af441fd79946a57fb
   调货详情: {...}
   调出方: MurrayRanelagh ham lin
   调入方: Mobile123 shu chen
   产品列表: [...]
   
   检查产品: IPHONE11
     - inventoryId: 698b5b5d6ea0dc97349026c4
     - 数量: 1
     - 品牌: Unknown
     - 型号: 128GB
     - 查询URL: /api/merchant/inventory?merchantId=MurrayRanelagh&search=IPHONE11
     - 查询结果: {...}
     - 找到 3 个可用设备
     ✅ 需要选择IMEI
   
   检查产品: IPHONE11
     - inventoryId: 698ab37b577c287584aa4c64
     - 数量: 1
     - 品牌: Unknown
     - 型号: 128GB
     - 查询URL: /api/merchant/inventory?merchantId=MurrayRanelagh&search=IPHONE11
     - 查询结果: {...}
     - 找到 3 个可用设备
     ✅ 需要选择IMEI
   
   === 检查完成 ===
   需要选择IMEI的产品数量: 2
   ✅ 显示IMEI选择界面
   显示IMEI选择模态框
   模态框已添加到页面
   开始加载产品 1 的IMEI列表: IPHONE11
   开始加载产品 2 的IMEI列表: IPHONE11
   ```

4. **应该看到IMEI选择模态框**，包含：
   - 标题：📱 选择设备序列号/IMEI
   - 调货单号：TRF20260211001
   - 调出方：ham lin
   - 调入方：shu chen
   - 两个产品区域，每个显示：
     - 产品名称：IPHONE11 - Unknown 128GB
     - 需要数量：1 件
     - 已选择：0 件
     - IMEI列表（3个可选）：
       - 352926111850103 (成色: PRE-OWNED, 型号: 128GB, 颜色: white)
       - 353988109592906 (成色: PRE-OWNED, 型号: 128GB, 颜色: white)
       - 352928114188457 (成色: PRE-OWNED, 型号: 128GB, 颜色: white)

5. **选择IMEI**：
   - 为第一个IPHONE11选择1个IMEI（例如：352926111850103）
   - 为第二个IPHONE11选择1个IMEI（例如：353988109592906）
   - 已选择数量应该变为 1/1

6. **确认并批准**：
   - 点击"✅ 确认并批准"按钮
   - 输入批准备注（可选）
   - 点击确定

### 4. 验证结果
1. 订单状态应该变为"已批准"
2. 订单应该从"待审批"移到"已批准"标签
3. 查看订单详情，应该显示选择的IMEI

## 如果没有看到IMEI选择界面

### 检查控制台输出
1. 打开浏览器控制台（F12）
2. 查看是否有错误信息
3. 查看console.log输出，特别注意：
   - "调出方" 是否正确（应该是 MurrayRanelagh）
   - "查询URL" 是否正确
   - "查询结果" 是否返回数据
   - "找到 X 个可用设备" 的数量
   - 是否显示 "✅ 需要选择IMEI"
   - 是否显示 "✅ 显示IMEI选择界面"

### 常见问题

#### 1. 没有找到可用设备
```
找到 0 个可用设备
ℹ️ 不需要选择IMEI（配件或无可用设备）
```
**原因**: 查询条件不匹配或库存数据问题
**解决**: 运行 `node check-transfer-test-data.js` 检查数据

#### 2. 查询失败
```
❌ 查询库存失败: [错误信息]
```
**原因**: API调用失败
**解决**: 检查网络请求，确认API端点正确

#### 3. merchantId错误
```
调出方: undefined undefined
```
**原因**: 调货详情API返回数据不完整
**解决**: 检查后端API返回的数据结构

#### 4. 模态框没有显示
```
✅ 显示IMEI选择界面
显示IMEI选择模态框
模态框已添加到页面
```
**原因**: 可能是CSS或z-index问题
**解决**: 
- 检查页面元素，确认模态框是否存在
- 检查模态框的z-index（应该是10000）
- 尝试刷新页面（Ctrl + Shift + R）

## 强制刷新
修改HTML文件后，必须强制刷新浏览器：
- Windows: Ctrl + Shift + R
- Mac: Cmd + Shift + R

## 相关文件
- `StockControl-main/public/merchant.html` - 前端代码
- `StockControl-main/app.js` - 后端API
- `StockControl-main/check-transfer-test-data.js` - 数据检查脚本
- `StockControl-main/FIX_TRANSFER_APPROVAL_IMEI_SELECTION_V2.md` - 修复文档

## 数据检查命令
```bash
# 检查当前测试数据
node check-transfer-test-data.js

# 检查商户库存状态
node check-merchant-inventory-status.js

# 如果需要重置调货订单
node reset-transfer-orders.js
```
