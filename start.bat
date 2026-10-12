@echo off
chcp 65001 >nul
echo ====================================
echo Persona Growth Tracker - 安装向导
echo ====================================
echo.

echo [1/3] 检查 Node.js 版本...
node --version
if errorlevel 1 (
    echo 错误: 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)
echo.

echo [2/3] 检查依赖包...
if exist node_modules\vitest (
    echo 依赖已就绪，跳过安装（如需重装请删除 node_modules 文件夹）
) else (
    echo 首次运行，安装依赖包（几分钟）...
    call npm install
    if errorlevel 1 (
        echo 错误: 依赖安装失败
        pause
        exit /b 1
    )
)
echo.

echo [3/3] 启动开发服务器...
echo.
echo ====================================
echo 应用将在浏览器中自动打开
echo 访问地址: http://localhost:5173
echo 按 Ctrl+C 停止服务器
echo ====================================
echo.

set MAIL_USERNAME=19033087685@163.com
set MAIL_PASSWORD=AFta3raJ8LA3w7bd
call npm run dev
