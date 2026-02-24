@echo off
chcp 65001 >nul
echo ========================================
echo  叙程 SVG 转 PNG 转换工具
echo ========================================
echo.

set "SVG_FILE=E:\workspaceai\todolist\assets\icon\xucheng.svg"
set "OUTPUT_FILE=E:\workspaceai\todolist\assets\icon\xucheng.png"
set "SIZE=144"

echo 正在转换...
echo 源文件: %SVG_FILE%
echo 输出文件: %OUTPUT_FILE%
echo 尺寸: %SIZE%x%SIZE%px
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "
    try {
        Add-Type -AssemblyName System.Drawing
        
        $svgPath = '%SVG_FILE%'
        $outputPath = '%OUTPUT_FILE%'
        $size = %SIZE%
        
        # 读取 SVG
        $svgContent = Get-Content $svgPath -Raw
        $byteArray = [System.Text.Encoding]::UTF8.GetBytes($svgContent)
        $stream = New-Object System.IO.MemoryStream(,$byteArray)
        
        # 加载图片
        $img = [System.Drawing.Image]::FromStream($stream)
        
        # 创建新图片
        $newImg = New-Object System.Drawing.Bitmap($size, $size)
        $graphics = [System.Drawing.Graphics]::FromImage($newImg)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.DrawImage($img, 0, 0, $size, $size)
        
        # 保存
        $newImg.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        # 清理
        $graphics.Dispose()
        $newImg.Dispose()
        $img.Dispose()
        $stream.Dispose()
        
        Write-Host '转换成功！' -ForegroundColor Green
        Write-Host \"文件保存至: $outputPath\" -ForegroundColor Cyan
    } catch {
        Write-Host \"错误: $_\" -ForegroundColor Red
        pause
    }
"

echo.
echo ========================================
echo 转换完成！
echo ========================================
pause
