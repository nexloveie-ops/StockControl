@echo off
echo 启动3C库存管理系统...

echo 检查Node.js安装...
node --version
if %errorlevel% neq 0 (
    echo 错误: 请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo 检查npm安装...
npm --version
if %errorlevel% neq 0 (
    echo 错误: npm未正确安装
    pause
    exit /b 1
)

echo 安装依赖包...
npm install
if %errorlevel% neq 0 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)

echo 检查环境配置文件...
if not exist .env (
    echo 复制环境配置文件...
    copy .env.example .env
    echo 请编辑 .env 文件配置数据库连接
    notepad .env
)

echo 启动应用...
npm run dev

pause