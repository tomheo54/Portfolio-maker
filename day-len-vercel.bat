@echo off
chcp 65001 >nul
title Đẩy Portfolio Lên GitHub & Vercel
cls

echo ================================================================
echo           ĐỒNG BỘ & ĐẨY PORTFOLIO LÊN GITHUB / VERCEL
echo ================================================================
echo.

echo [*] Đang kiểm tra các tệp portfolio mới và thay đổi...
git status -s

echo.
echo [*] Đang gom toàn bộ dữ liệu (file JSON, ảnh DOCX, mã nguồn)...
git add .

set COMMIT_MSG=update: cap nhat portfolio moi [%date% %time%]
git commit -m "%COMMIT_MSG%"

echo.
echo [*] Đang đẩy lên nhánh main trên GitHub...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo  [THÀNH CÔNG] Dữ liệu đã được đẩy lên GitHub an toàn!
    echo  Vercel đang tự động nhận diện và cập nhật web trong 1-2 phút.
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo  [CHÚ Ý] Không có thay đổi mới nào hoặc có lỗi khi đẩy lên.
    echo ================================================================
)

echo.
echo Nhấn phím bất kỳ để đóng cửa sổ này...
pause >nul
