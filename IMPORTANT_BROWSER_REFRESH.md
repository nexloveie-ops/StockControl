# ⚠️ 重要：浏览器刷新说明

## 问题
修改了 `prototype-working.html` 文件后，浏览器可能显示旧版本的页面。

## 解决方法

### 方法1: 强制刷新（推荐）
**Windows**: 按 `Ctrl + Shift + R`
**Mac**: 按 `Cmd + Shift + R`

### 方法2: 硬性重新加载
1. 按 `F12` 打开开发者工具
2. 右键点击浏览器地址栏旁边的刷新按钮
3. 选择"清空缓存并硬性重新加载"

### 方法3: 清除缓存
1. 按 `Ctrl + Shift + Delete`
2. 选择"缓存的图片和文件"
3. 时间范围选择"全部时间"
4. 点击"清除数据"
5. 重新加载页面

## 验证是否加载了新版本

### 在浏览器控制台输入：
```javascript
// 检查updateManualProductRow函数
console.log(updateManualProductRow.toString().includes('row.cells[10]'));
```

**预期结果**: 应该显示 `true`

如果显示 `false`，说明浏览器还在使用旧版本，请继续尝试上述刷新方法。

## 关于设备分类

### 会触发IMEI输入框的分类（包含以下关键字）：
- device, 设备
- phone, 手机
- iphone, samsung
- tablet, 平板
- watch, 手表

### 不会触发IMEI输入框的分类：
- 配件, Accessories
- 手机壳, Cases
- 屏幕保护膜, Screen Protectors
- **Brand New Car V** ← 不包含设备关键字

## 注意
从截图看，您选择的分类是"Brand New Car V"，这个分类名称不包含任何设备关键字，所以系统不会显示IMEI输入框。

**如果您想为这个分类显示IMEI输入框**，请：
1. 修改分类名称为"Brand New Car V Device"或"Brand New Car V 设备"
2. 或者选择其他包含设备关键字的分类

---

**重要提示**: 每次修改HTML文件后，都需要强制刷新浏览器才能看到更新！
