@echo off
chcp 65001 >nul
title 芯光智数管理后台
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-project.ps1" -Admin
if errorlevel 1 pause
