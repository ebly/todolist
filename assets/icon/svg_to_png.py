#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SVG 转 PNG 转换脚本
"""

import sys
import os

# 尝试使用不同的库
def convert_with_cairosvg():
    """使用 CairoSVG 转换"""
    try:
        import cairosvg
        
        svg_path = r'E:\workspaceai\todolist\assets\icon\xucheng.svg'
        output_path = r'E:\workspaceai\todolist\assets\icon\xucheng.png'
        
        cairosvg.svg2png(
            url=svg_path,
            write_to=output_path,
            output_width=144,
            output_height=144
        )
        print(f'✓ 转换成功: {output_path}')
        return True
    except ImportError:
        return False
    except Exception as e:
        print(f'CairoSVG 错误: {e}')
        return False

def convert_with_svglib():
    """使用 svglib + reportlab 转换"""
    try:
        from svglib.svglib import svg2rlg
        from reportlab.graphics import renderPM
        
        svg_path = r'E:\workspaceai\todolist\assets\icon\xucheng.svg'
        output_path = r'E:\workspaceai\todolist\assets\icon\xucheng.png'
        
        drawing = svg2rlg(svg_path)
        renderPM.drawToFile(drawing, output_path, fmt='PNG')
        print(f'✓ 转换成功: {output_path}')
        return True
    except ImportError:
        return False
    except Exception as e:
        print(f'svglib 错误: {e}')
        return False

def convert_with_inkscape():
    """使用 Inkscape 命令行转换"""
    import subprocess
    
    try:
        svg_path = r'E:\workspaceai\todolist\assets\icon\xucheng.svg'
        output_path = r'E:\workspaceai\todolist\assets\icon\xucheng.png'
        
        result = subprocess.run([
            'inkscape',
            '--export-type=png',
            '--export-width=144',
            '--export-height=144',
            f'--export-filename={output_path}',
            svg_path
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f'✓ 转换成功: {output_path}')
            return True
        else:
            print(f'Inkscape 错误: {result.stderr}')
            return False
    except FileNotFoundError:
        return False
    except Exception as e:
        print(f'Inkscape 错误: {e}')
        return False

def convert_with_imagemagick():
    """使用 ImageMagick 转换"""
    import subprocess
    
    try:
        svg_path = r'E:\workspaceai\todolist\assets\icon\xucheng.svg'
        output_path = r'E:\workspaceai\todolist\assets\icon\xucheng.png'
        
        result = subprocess.run([
            'magick',
            'convert',
            '-background', 'none',
            '-resize', '144x144',
            svg_path,
            output_path
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f'✓ 转换成功: {output_path}')
            return True
        else:
            print(f'ImageMagick 错误: {result.stderr}')
            return False
    except FileNotFoundError:
        return False
    except Exception as e:
        print(f'ImageMagick 错误: {e}')
        return False

def main():
    print('=' * 50)
    print('叙程 SVG 转 PNG 转换工具')
    print('=' * 50)
    print()
    
    # 按优先级尝试不同的转换方法
    converters = [
        ('CairoSVG', convert_with_cairosvg),
        ('svglib', convert_with_svglib),
        ('Inkscape', convert_with_inkscape),
        ('ImageMagick', convert_with_imagemagick),
    ]
    
    for name, converter in converters:
        print(f'尝试使用 {name}...')
        if converter():
            print()
            print('✓ 转换完成！')
            print(f'输出文件: E:\\workspaceai\\todolist\\assets\\icon\\xucheng.png')
            print('尺寸: 144x144px')
            return
    
    print()
    print('✗ 所有方法都失败了')
    print()
    print('请安装以下工具之一:')
    print('1. CairoSVG: pip install cairosvg')
    print('2. svglib: pip install svglib reportlab')
    print('3. Inkscape: https://inkscape.org/release/')
    print('4. ImageMagick: https://imagemagick.org/')
    print()
    print('或者使用在线工具:')
    print('https://convertio.co/zh/svg-png/')

if __name__ == '__main__':
    main()
