# 快速测试：退款成色过滤修复

## 问题
二手产品退款时，成色下拉框仍然显示"全新"选项。

## 修复内容
增强过滤逻辑，同时检查成色的 name 和 code 字段，支持中英文。

## 立即测试

### 步骤1: 刷新浏览器 ⚠️ 重要
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### 步骤2: 打开销售记录
1. 进入 Merchant 页面（http://localhost:3000/merchant.html）
2. 点击"销售记录查询"

### 步骤3: 测试二手产品退款
1. 找到一个二手产品的销售记录（原始成色是 Like New、Excellent 等）
2. 点击"详情"按钮
3. 勾选要退款的产品
4. 查看"成色"下拉框

### 预期结果 ✅

**二手产品（如 Like New）**:
- ❌ 不应该看到"全新"
- ✅ 应该看到：Like New, Excellent, Good, Fair, 二手
- ✅ 应该看到提示："(二手产品不可变为全新)"

**全新产品（Brand New 或 全新）**:
- ✅ 应该看到：全新, Like New, Excellent, Good, Fair, 二手
- ✅ 默认选中：全新

### 步骤4: 验证过滤逻辑
打开浏览器开发者工具（F12），在 Console 中运行：

```javascript
// 模拟测试
const testCond = { code: 'BRAND NEW', name: '全新' };
const condName = testCond.name.toLowerCase();
const condCode = (testCond.code || '').toUpperCase();

const shouldKeep = condName !== 'brand new' && 
                   condName !== '全新' && 
                   condCode !== 'BRAND NEW' &&
                   condCode !== 'BRAND_NEW';

console.log('成色:', testCond.name);
console.log('应该保留:', shouldKeep);
console.log('预期: false（应该被过滤掉）');
```

预期输出：
```
成色: 全新
应该保留: false
预期: false（应该被过滤掉）
```

## 如果测试失败

### 问题1: 仍然看到"全新"选项
**解决方案**:
1. 清除浏览器缓存
2. 强制刷新（Ctrl + Shift + R）
3. 重启浏览器

### 问题2: 控制台显示错误
**解决方案**:
1. 检查错误信息
2. 确认 merchant.html 文件已保存
3. 确认修改在第3872-3883行

### 问题3: 成色列表为空
**解决方案**:
1. 检查控制台是否显示"✅ 成色列表加载成功"
2. 如果显示"❌ 加载成色列表失败"，检查服务器是否运行
3. 检查 API 端点：http://localhost:3000/api/merchant/conditions

## 测试数据

如果需要创建测试数据：

### 创建全新产品销售
```javascript
// 在销售页面
产品: iPhone 15 Pro
成色: 全新
价格: €1000
```

### 创建二手产品销售
```javascript
// 在销售页面
产品: iPhone 15 Pro
成色: Like New
价格: €800
```

## 验证清单

- [ ] 浏览器已强制刷新（Ctrl + Shift + R）
- [ ] 二手产品退款时不显示"全新"选项
- [ ] 全新产品退款时显示所有成色选项
- [ ] 显示提示"(二手产品不可变为全新)"
- [ ] 控制台无错误信息
- [ ] 成色列表正确加载

## 完成

如果所有测试通过，修复成功！✅

---

**修复文件**: `StockControl-main/public/merchant.html`
**修复位置**: 第3872-3883行
**修复日期**: 2026-02-10
