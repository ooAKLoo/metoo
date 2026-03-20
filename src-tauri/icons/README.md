# geogen-studio 图标资源包

## 目录结构

```
├── resources/          # 核心资源
│   ├── icon.svg        # 矢量图标
│   ├── icon.png        # 高清 PNG (1024x1024)
│   ├── icon.icns       # macOS 应用图标
│   └── icon.ico        # Windows 应用图标
│
├── public/             # 网站公共资源
│   ├── icon.svg        # 网站图标
│   ├── geogen-studio.svg # 品牌 Logo
│   ├── favicon.png     # Favicon
│   ├── favicon.ico     # Favicon ICO
│   ├── apple-touch-icon.png  # iOS 主屏图标
│   ├── icon-192.png    # PWA 图标
│   ├── icon-512.png    # PWA 图标
│   ├── manifest.json   # Web App Manifest
│   └── browserconfig.xml
│
├── ios/                # iOS App 图标
├── android/            # Android App 图标
├── macos/              # macOS 各尺寸 PNG
└── windows/            # Windows 各尺寸 PNG
```

## 快速使用

### HTML 引用
```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#ffffff">
```

### Electron / Tauri
- macOS: 使用 `resources/icon.icns`
- Windows: 使用 `resources/icon.ico`
- Linux: 使用 `resources/icon.png`

### iOS / Android
将对应目录下的图标文件复制到项目中

## 生成参数
以下参数可用于复现当前图像效果：

```json
{
  "generator": "GeoGenStudio",
  "config": {
    "count": 8,
    "rotationOffset": 0,
    "innerRadius": 20,
    "length": 80,
    "spread": 40,
    "cornerRadius": 0.5,
    "atomicRotation": 0,
    "hue": 250,
    "saturation": 80,
    "lightness": 60,
    "opacity": 0.8,
    "blendMode": "normal",
    "fill": true,
    "stroke": false,
    "strokeWidth": 2,
    "shadowEnabled": true,
    "shadowX": 0,
    "shadowY": 8,
    "shadowBlur": 24,
    "shadowOpacity": 0.25,
    "shadowColor": "#4f46e5",
    "innerShadowEnabled": false,
    "innerShadowX": -4,
    "innerShadowY": -4,
    "innerShadowBlur": 10,
    "innerShadowOpacity": 0.4,
    "innerShadowColor": "#000000",
    "doubleStrokeEnabled": false,
    "doubleStrokeWidth": 3,
    "doubleStrokeOpacity": 0.6,
    "doubleStrokeColor": "#0f172a",
    "extrudeEnabled": false,
    "extrudeDepth": 10,
    "extrudeOffsetX": 10,
    "extrudeOffsetY": 10,
    "extrudeOpacity": 0.45,
    "extrudeFade": 0.7,
    "extrudeColor": "#111827",
    "autoDepthColor": true
  },
  "export": {
    "bgColor": "#ffffff",
    "iconScale": 0.7,
    "borderRadius": 0.22
  }
}
```


---
导出时间: 2026/3/20 20:28:21
