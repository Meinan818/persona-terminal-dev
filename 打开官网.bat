@echo off
chcp 65001 >nul
title MASKARIA 官网预览
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo 没找到 Node.js。装一下 Node.js ^(18 以上^) 再双击这个文件。
  echo 下载地址： https://nodejs.org/
  pause
  exit /b 1
)

echo 正在启动官网预览，稍等两秒会自动打开浏览器...
echo 如果浏览器没自动打开，就手动访问： http://127.0.0.1:8123/
echo 看完回来这个窗口按 Ctrl+C 停止。
echo.

node site\serve.mjs --open
pause
