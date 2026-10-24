# Generate app-icon.png (1024x1024) using System.Drawing
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$size = 1024
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)

function New-RoundRect([System.Drawing.Rectangle]$r, [int]$rad) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $rad * 2
    $p.AddArc($r.X, $r.Y, $d, $d, 180, 90)
    $p.AddArc($r.Right - $d, $r.Y, $d, $d, 270, 90)
    $p.AddArc($r.Right - $d, $r.Bottom - $d, $d, $d, 0, 90)
    $p.AddArc($r.X, $r.Bottom - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    return $p
}

$path = New-RoundRect $rect 210
$c1 = [System.Drawing.Color]::FromArgb(255, 139, 92, 246)
$c2 = [System.Drawing.Color]::FromArgb(255, 34, 211, 238)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)
$g.FillPath($brush, $path)

# lightning bolt
$bolt = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(584.0, 96.0),
    [System.Drawing.PointF]::new(178.0, 572.0),
    [System.Drawing.PointF]::new(452.0, 572.0),
    [System.Drawing.PointF]::new(340.0, 950.0),
    [System.Drawing.PointF]::new(878.0, 438.0),
    [System.Drawing.PointF]::new(566.0, 438.0)
)
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(242, 255, 255, 255))
$g.FillPolygon($white, $bolt)

$g.Dispose()
$out = Join-Path $PSScriptRoot "..\app-icon.png"
$bmp.Save((Resolve-Path (Join-Path $PSScriptRoot "..")).Path + "\app-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "icon saved: $out"
