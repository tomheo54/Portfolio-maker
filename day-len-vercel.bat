@echo off
title Day Portfolio Len GitHub va Vercel
cls

echo ================================================================
echo           DONG BO VA DAY PORTFOLIO LEN GITHUB / VERCEL
echo ================================================================
echo.

echo [*] Dang kiem tra cac tep portfolio moi va thay doi...
git status -s

echo.
echo [*] Dang gom toan bo du lieu (file JSON, anh DOCX, ma nguon)...
git add .

set COMMIT_MSG=update: cap nhat portfolio moi [%date% %time%]
git commit -m "%COMMIT_MSG%"

echo.
echo [*] Dang day len nhanh main tren GitHub...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo  [THANH CONG] Du lieu da duoc day len GitHub an toan!
    echo  Vercel dang tu dong nhan dien va cap nhat web trong 1-2 phut.
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo  [CHU Y] Khong co thay doi moi nao hoac co loi khi day len.
    echo ================================================================
)

echo.
echo Nhan phim bat ky de dong cua so nay...
pause >nul
