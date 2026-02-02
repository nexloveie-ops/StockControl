# Git设置和GitHub上传指南

## 前提条件
1. 安装Git：https://git-scm.com/download/win
2. 创建GitHub账号：https://github.com
3. 配置Git用户信息

---

## 步骤1：安装Git（如果未安装）

下载并安装Git for Windows：
```
https://git-scm.com/download/win
```

安装后，重启命令行工具。

---

## 步骤2：配置Git用户信息

打开命令行（PowerShell或CMD），运行：

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## 步骤3：初始化Git仓库

在项目目录中运行：

```bash
cd C:\Projects\StockManager\StockControl-main
git init
```

---

## 步骤4：创建.gitignore文件

确保`.gitignore`文件包含以下内容：

```
# Dependencies
node_modules/

# Environment variables
.env

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Build files
dist/
build/

# Backup files
*-backup-*/
*.bak

# Database
*.db
*.sqlite

# Temporary files
*.tmp
*.temp
```

---

## 步骤5：添加文件到Git

```bash
git add .
git status
```

检查要提交的文件列表。

---

## 步骤6：创建首次提交

```bash
git commit -m "Initial commit - StockControl System with latest updates

Features:
- Financial Reports with inventory assets
- Supplier and Customer edit functionality with tax number
- Inventory management filters out sold products
- Product search supports sold product tracking
- Net VAT Payable calculation
- Total Profit display in Financial Reports

Date: 2026-02-02"
```

---

## 步骤7：在GitHub上创建仓库

1. 登录GitHub：https://github.com
2. 点击右上角的"+"，选择"New repository"
3. 填写仓库信息：
   - Repository name: `StockControl`
   - Description: `3C Product Stock Control System`
   - 选择 Private 或 Public
   - **不要**勾选"Initialize this repository with a README"
4. 点击"Create repository"

---

## 步骤8：连接到GitHub仓库

复制GitHub提供的仓库URL（例如：`https://github.com/yourusername/StockControl.git`）

运行以下命令：

```bash
git remote add origin https://github.com/yourusername/StockControl.git
git branch -M main
git push -u origin main
```

如果需要认证，可能需要：
- 使用Personal Access Token（推荐）
- 或配置SSH密钥

---

## 步骤9：创建Personal Access Token（如果需要）

1. 登录GitHub
2. 点击右上角头像 → Settings
3. 左侧菜单 → Developer settings → Personal access tokens → Tokens (classic)
4. 点击"Generate new token (classic)"
5. 设置：
   - Note: `StockControl Access`
   - Expiration: 选择有效期
   - 勾选 `repo` 权限
6. 点击"Generate token"
7. **复制token**（只显示一次！）

使用token推送：
```bash
git push -u origin main
```
当提示输入密码时，粘贴token。

---

## 步骤10：后续更新

每次修改后：

```bash
# 查看修改
git status

# 添加修改的文件
git add .

# 提交修改
git commit -m "描述你的修改"

# 推送到GitHub
git push
```

---

## 常用Git命令

### 查看状态
```bash
git status
```

### 查看提交历史
```bash
git log --oneline
```

### 创建新分支
```bash
git checkout -b feature-name
```

### 切换分支
```bash
git checkout main
```

### 合并分支
```bash
git merge feature-name
```

### 拉取最新代码
```bash
git pull
```

### 查看远程仓库
```bash
git remote -v
```

---

## 备份策略

### 本地备份
已创建备份：`StockControl-main-backup-20260202-024336`

### 定期备份命令
```powershell
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupName = "StockControl-main-backup-$timestamp"
Copy-Item -Path "StockControl-main" -Destination $backupName -Recurse -Force
Write-Host "✅ 备份完成: $backupName"
```

### GitHub作为远程备份
- 每次推送到GitHub都是一次备份
- 可以随时恢复到任何历史版本
- 建议每天至少推送一次

---

## 故障排除

### 问题1：Git命令不识别
**解决**：重新安装Git，确保勾选"Add Git to PATH"

### 问题2：推送失败（认证错误）
**解决**：使用Personal Access Token代替密码

### 问题3：文件太大无法推送
**解决**：
1. 检查`.gitignore`是否正确
2. 移除大文件：`git rm --cached large-file`
3. 使用Git LFS处理大文件

### 问题4：合并冲突
**解决**：
1. 手动编辑冲突文件
2. 标记为已解决：`git add conflicted-file`
3. 完成合并：`git commit`

---

## 安全建议

1. **永远不要提交敏感信息**
   - `.env`文件（已在.gitignore中）
   - 数据库密码
   - API密钥
   - 个人信息

2. **使用Private仓库**
   - 商业项目建议使用私有仓库
   - 或使用GitHub Enterprise

3. **定期更新依赖**
   ```bash
   npm audit
   npm update
   ```

4. **代码审查**
   - 使用Pull Request
   - 至少一人审查代码

---

## 团队协作

### 工作流程
1. 从main分支创建功能分支
2. 在功能分支上开发
3. 提交Pull Request
4. 代码审查
5. 合并到main分支
6. 删除功能分支

### 分支命名规范
- `feature/功能名称` - 新功能
- `bugfix/问题描述` - Bug修复
- `hotfix/紧急修复` - 紧急修复
- `refactor/重构内容` - 代码重构

---

## 资源链接

- Git官方文档：https://git-scm.com/doc
- GitHub文档：https://docs.github.com
- Git教程：https://www.atlassian.com/git/tutorials
- Git速查表：https://education.github.com/git-cheat-sheet-education.pdf

---

## 联系支持

如遇到问题：
1. 查看Git文档
2. 搜索Stack Overflow
3. 查看GitHub Community
4. 联系项目管理员
