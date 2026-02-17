# Create tabBar icons using .NET
Add-Type -AssemblyName System.Drawing

# Extension methods for rounded rectangles
Add-Type @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;

public static class GraphicsExtensions {
    public static void DrawRoundedRectangle(this Graphics graphics, Pen pen, int x, int y, int width, int height, int radius) {
        using (GraphicsPath path = new GraphicsPath()) {
            path.AddArc(x, y, radius * 2, radius * 2, 180, 90);
            path.AddArc(x + width - radius * 2, y, radius * 2, radius * 2, 270, 90);
            path.AddArc(x + width - radius * 2, y + height - radius * 2, radius * 2, radius * 2, 0, 90);
            path.AddArc(x, y + height - radius * 2, radius * 2, radius * 2, 90, 90);
            path.CloseFigure();
            graphics.DrawPath(pen, path);
        }
    }
    
    public static void FillRoundedRectangle(this Graphics graphics, Brush brush, int x, int y, int width, int height, int radius) {
        using (GraphicsPath path = new GraphicsPath()) {
            path.AddArc(x, y, radius * 2, radius * 2, 180, 90);
            path.AddArc(x + width - radius * 2, y, radius * 2, radius * 2, 270, 90);
            path.AddArc(x + width - radius * 2, y + height - radius * 2, radius * 2, radius * 2, 0, 90);
            path.AddArc(x, y + height - radius * 2, radius * 2, radius * 2, 90, 90);
            path.CloseFigure();
            graphics.FillPath(brush, path);
        }
    }
}
"@ -ReferencedAssemblies System.Drawing

$baseDir = "e:\workspaceai\todolist\assets\tab"

# Create todo icon
function Create-TodoIcon($path, $color) {
    $bitmap = New-Object System.Drawing.Bitmap(81, 81)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)
    
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($color))
    
    # Draw three lines
    [GraphicsExtensions]::FillRoundedRectangle($graphics, $brush, 20, 22, 41, 6, 2)
    [GraphicsExtensions]::FillRoundedRectangle($graphics, $brush, 20, 37, 41, 6, 2)
    [GraphicsExtensions]::FillRoundedRectangle($graphics, $brush, 20, 52, 28, 6, 2)
    
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

# Create calendar icon
function Create-CalendarIcon($path, $color) {
    $bitmap = New-Object System.Drawing.Bitmap(81, 81)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)
    
    $pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($color), 4)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($color))
    
    # Draw calendar frame
    [GraphicsExtensions]::DrawRoundedRectangle($graphics, $pen, 18, 20, 45, 41, 4)
    
    # Draw separator line
    $graphics.DrawLine($pen, 18, 32, 63, 32)
    
    # Draw hanging rings
    $graphics.DrawLine($pen, 28, 14, 28, 24)
    $graphics.DrawLine($pen, 53, 14, 53, 24)
    
    # Draw date dots
    $graphics.FillRectangle($brush, 26, 40, 6, 6)
    $graphics.FillRectangle($brush, 38, 40, 6, 6)
    $graphics.FillRectangle($brush, 50, 40, 6, 6)
    
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

# Generate all icons
Create-TodoIcon "$baseDir\todo.png" "#969799"
Create-TodoIcon "$baseDir\todo-active.png" "#1989fa"
Create-CalendarIcon "$baseDir\calendar.png" "#969799"
Create-CalendarIcon "$baseDir\calendar-active.png" "#1989fa"

Write-Output "Icons created successfully!"
