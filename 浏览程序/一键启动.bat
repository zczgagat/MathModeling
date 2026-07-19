@echo off
chcp 65001 >nul
title 数学建模知识库
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js 20 或更高版本。
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo 首次运行，正在安装依赖，请稍候……
  call npm.cmd install
  if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
)

echo 正在启动数学建模知识库……
echo 启动后窗口会显示手机访问地址。
echo.
call npm.cmd run dev
pause
