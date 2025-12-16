# 主题系统使用指南

## 功能概述

博客系统现在支持5个预设主题，前台和后台可以独立选择主题：

### 5个预设主题

1. **🌊 蓝色海洋** (ocean) - 清新的蓝色主题，如海洋般宁静
2. **💜 紫色梦幻** (purple) - 优雅的紫色主题，充满梦幻气息
3. **🌿 绿色自然** (green) - 清新的绿色主题，贴近自然
4. **🔥 橙色活力** (orange) - 充满活力的橙色主题
5. **🌙 深色模式** (dark) - 护眼的深色主题，适合夜间使用

## 文件结构

```
blog/
├── css/
│   └── themes.css          # 主题CSS变量定义
├── js/
│   ├── theme-manager.js    # 前台主题管理器
│   └── theme-selector.js   # 主题选择器组件

blog-admin/
└── js/
    └── admin-theme-manager.js  # 后台主题管理器
```

## 集成步骤

### 1. 前台集成

在所有前台HTML文件的 `<head>` 标签中添加：

```html
<!-- 主题系统 -->
<link rel="stylesheet" href="../css/themes.css">
<script src="../js/theme-manager.js"></script>
```

在首页 `blog/index.html` 中：

```html
<link rel="stylesheet" href="css/themes.css">
<script src="js/theme-manager.js"></script>
```

### 2. 后台集成

在所有后台HTML文件的 `<head>` 标签中添加：

```html
<!-- 主题系统 -->
<link rel="stylesheet" href="../blog/css/themes.css">
<script src="js/admin-theme-manager.js"></script>
```

### 3. 添加主题选择器到设置页面

在后台设置页面中添加主题选择区域：

```html
<!-- 主题设置 -->
<div class="settings-section">
    <h3>🎨 主题设置</h3>
    
    <div class="setting-item">
        <label>前台主题</label>
        <div id="frontendThemeSelector"></div>
    </div>
    
    <div class="setting-item">
        <label>后台主题</label>
        <div id="adminThemeSelector"></div>
    </div>
</div>

<script src="../blog/js/theme-selector.js"></script>
<script>
// 加载前台主题选择器
document.getElementById('frontendThemeSelector').innerHTML = createThemeSelector();

// 加载后台主题选择器（需要修改theme-selector.js支持后台）
// 或者创建单独的admin-theme-selector.js
</script>
```

## 使用CSS变量

在你的CSS文件中，使用主题变量替换硬编码的颜色：

### 之前：
```css
.button {
    background: #4fc3f7;
    color: white;
}
```

### 之后：
```css
.button {
    background: var(--primary-color);
    color: white;
}
```

### 常用变量：

**颜色变量：**
- `--primary-color` - 主色
- `--primary-dark` - 主色深色
- `--primary-light` - 主色浅色
- `--secondary-color` - 辅助色
- `--accent-color` - 强调色

**背景变量：**
- `--bg-color` - 主背景色
- `--bg-secondary` - 次要背景色
- `--bg-tertiary` - 第三背景色

**文字变量：**
- `--text-primary` - 主文字颜色
- `--text-secondary` - 次要文字颜色
- `--text-tertiary` - 第三文字颜色

**边框变量：**
- `--border-color` - 边框颜色
- `--border-light` - 浅色边框

**阴影变量：**
- `--shadow-sm` - 小阴影
- `--shadow-md` - 中阴影
- `--shadow-lg` - 大阴影

**渐变变量：**
- `--gradient-primary` - 主渐变
- `--gradient-secondary` - 辅助渐变

## JavaScript API

### 前台主题管理

```javascript
// 切换主题
window.themeManager.switchTheme('purple');

// 获取当前主题
const currentTheme = window.themeManager.getCurrentTheme();

// 获取主题信息
const themeInfo = window.themeManager.getThemeInfo('ocean');

// 获取所有主题
const allThemes = window.themeManager.getAllThemes();

// 监听主题变更事件
window.addEventListener('themeChanged', (e) => {
    console.log('主题已变更:', e.detail.theme);
});
```

### 后台主题管理

```javascript
// 切换后台主题
window.adminThemeManager.switchTheme('dark');

// 获取当前后台主题
const currentAdminTheme = window.adminThemeManager.getCurrentTheme();

// 监听后台主题变更事件
window.addEventListener('adminThemeChanged', (e) => {
    console.log('后台主题已变更:', e.detail.theme);
});
```

## 快速开始

### 最小化集成示例

1. 在HTML中引入主题文件：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>我的博客</title>
    
    <!-- 主题系统 -->
    <link rel="stylesheet" href="css/themes.css">
    <script src="js/theme-manager.js"></script>
    
    <!-- 你的其他CSS -->
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <!-- 你的内容 -->
</body>
</html>
```

2. 在你的CSS中使用主题变量：

```css
body {
    background: var(--bg-color);
    color: var(--text-primary);
}

.card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
}

.button-primary {
    background: var(--gradient-primary);
    color: white;
}
```

3. 添加主题切换按钮：

```html
<button onclick="window.themeManager.switchTheme('purple')">
    切换到紫色主题
</button>
```

## 注意事项

1. **前后台独立**：前台和后台使用不同的localStorage键和设置字段，互不影响
2. **平滑过渡**：所有颜色变化都有0.3s的过渡动画
3. **持久化**：主题选择会保存到localStorage和blogDataStore
4. **兼容性**：使用CSS变量，支持现代浏览器

## 自定义主题

如果需要添加新主题，在 `themes.css` 中添加：

```css
:root[data-theme="custom"] {
    --primary-color: #your-color;
    --primary-dark: #your-dark-color;
    /* ... 其他变量 */
}
```

然后在 `theme-manager.js` 的 `THEMES` 对象中添加配置：

```javascript
custom: {
    id: 'custom',
    name: '自定义主题',
    description: '你的主题描述',
    icon: '🎨',
    preview: {
        primary: '#your-color',
        secondary: '#your-secondary',
        accent: '#your-accent'
    }
}
```

## 故障排除

### 主题不生效？
1. 检查是否正确引入了 `themes.css` 和 `theme-manager.js`
2. 检查浏览器控制台是否有错误
3. 确认CSS变量是否正确使用

### 主题切换后没有保存？
1. 检查localStorage是否被禁用
2. 确认blogDataStore是否正常工作

### 颜色显示不正确？
1. 确认使用了正确的CSS变量名
2. 检查是否有其他CSS覆盖了主题样式
3. 使用 `!important` 可能会导致主题变量失效

## 更新日志

- **v1.0.0** - 初始版本，支持5个预设主题，前后台独立选择
