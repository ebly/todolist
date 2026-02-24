#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用 Pillow 将 SVG 转换为 PNG
通过将 SVG 渲染为图像
"""

from PIL import Image, ImageDraw
import xml.etree.ElementTree as ET
import re

def parse_color(color_str):
    """解析颜色字符串"""
    if color_str.startswith('#'):
        return color_str
    if color_str.startswith('url('):
        return '#07c160'  # 默认绿色
    return color_str

def draw_rounded_rect(draw, xy, radius, fill):
    """绘制圆角矩形"""
    x1, y1, x2, y2 = xy
    r = radius
    
    # 绘制主体矩形
    draw.rectangle([x1+r, y1, x2-r, y2], fill=fill)
    draw.rectangle([x1, y1+r, x2, y2-r], fill=fill)
    
    # 绘制四个圆角
    draw.ellipse([x1, y1, x1+r*2, y1+r*2], fill=fill)
    draw.ellipse([x2-r*2, y1, x2, y1+r*2], fill=fill)
    draw.ellipse([x1, y2-r*2, x1+r*2, y2], fill=fill)
    draw.ellipse([x2-r*2, y2-r*2, x2, y2], fill=fill)

def svg_to_png_simple():
    """手动绘制 SVG 内容到 PNG"""
    
    # 创建 144x144 的图像
    size = 144
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # 缩放比例 (1024 -> 144)
    scale = size / 1024
    
    def s(val):
        """缩放数值"""
        return int(val * scale)
    
    # 绘制背景渐变 (简化为纯色)
    bg_color = (7, 193, 96)  # #07c160
    draw.rounded_rectangle(
        [s(64), s(64), s(960), s(960)],
        radius=s(180),
        fill=bg_color
    )
    
    # 绘制白色清单主体
    white_color = (255, 255, 255, 242)  # 0.95 opacity
    draw.rounded_rectangle(
        [s(220), s(280), s(804), s(800)],
        radius=s(60),
        fill=(255, 255, 255)
    )
    
    # 绘制顶部绿色条
    top_green = (7, 193, 96)  # #07c160
    draw.rounded_rectangle(
        [s(220), s(280), s(804), s(380)],
        radius=s(60),
        fill=top_green
    )
    # 补齐矩形下半部分
    draw.rectangle([s(220), s(340), s(804), s(380)], fill=top_green)
    
    # 绘制清单项目 1 - 已完成
    # 绿色圆圈
    circle1_center = (s(320), s(460))
    circle1_radius = s(40)
    draw.ellipse([
        circle1_center[0] - circle1_radius,
        circle1_center[1] - circle1_radius,
        circle1_center[0] + circle1_radius,
        circle1_center[1] + circle1_radius
    ], fill=(7, 193, 96))
    
    # 白色勾选线
    line_width = max(1, s(12))
    # 简化为白色圆点
    draw.ellipse([
        circle1_center[0] - s(15),
        circle1_center[1] - s(15),
        circle1_center[0] + s(15),
        circle1_center[1] + s(15)
    ], fill=(255, 255, 255))
    
    # 灰色线条
    gray_color = (150, 151, 153)  # #969799
    draw.rounded_rectangle(
        [s(400), s(440), s(720), s(460)],
        radius=s(10),
        fill=gray_color
    )
    
    # 绘制清单项目 2 - 已完成
    circle2_center = (s(320), s(580))
    circle2_radius = s(40)
    draw.ellipse([
        circle2_center[0] - circle2_radius,
        circle2_center[1] - circle2_radius,
        circle2_center[0] + circle2_radius,
        circle2_center[1] + circle2_radius
    ], fill=(7, 193, 96))
    
    draw.ellipse([
        circle2_center[0] - s(15),
        circle2_center[1] - s(15),
        circle2_center[0] + s(15),
        circle2_center[1] + s(15)
    ], fill=(255, 255, 255))
    
    draw.rounded_rectangle(
        [s(400), s(560), s(680), s(580)],
        radius=s(10),
        fill=gray_color
    )
    
    # 绘制清单项目 3 - 待完成
    circle3_center = (s(320), s(700))
    circle3_radius = s(40)
    blue_color = (25, 137, 250)  # #1989fa
    # 空心圆圈
    draw.ellipse([
        circle3_center[0] - circle3_radius,
        circle3_center[1] - circle3_radius,
        circle3_center[0] + circle3_radius,
        circle3_center[1] + circle3_radius
    ], outline=blue_color, width=s(12))
    
    # 深色线条
    dark_color = (50, 50, 51)  # #323233
    draw.rounded_rectangle(
        [s(400), s(680), s(760), s(700)],
        radius=s(10),
        fill=dark_color
    )
    
    # 绘制装饰圆点
    white_transparent = (255, 255, 255, 77)  # 0.3 opacity
    draw.ellipse([
        s(800) - s(30), s(220) - s(30),
        s(800) + s(30), s(220) + s(30)
    ], fill=(255, 255, 255, 77))
    
    draw.ellipse([
        s(860) - s(20), s(280) - s(20),
        s(860) + s(20), s(280) + s(20)
    ], fill=(255, 255, 255, 51))
    
    # 保存图像
    output_path = r'E:\workspaceai\todolist\assets\icon\xucheng.png'
    img.save(output_path, 'PNG')
    print(f'✓ 转换成功！')
    print(f'输出文件: {output_path}')
    print(f'尺寸: {size}x{size}px')

if __name__ == '__main__':
    print('=' * 50)
    print('叙程 SVG 转 PNG 转换工具')
    print('=' * 50)
    print()
    svg_to_png_simple()
