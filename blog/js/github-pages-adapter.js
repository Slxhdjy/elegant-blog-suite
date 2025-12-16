/**
 * GitHub Pages 适配器
 * 解决静态部署中的路径和功能问题
 */

class GitHubPagesAdapter {
    constructor() {
        this.isGitHubPages = window.location.hostname.includes('github.io');
        this.baseUrl = this.isGitHubPages ? this.getBaseUrl() : '';
        
        console.log('🌐 GitHub Pages适配器初始化:', {
            isGitHubPages: this.isGitHubPages,
            baseUrl: this.baseUrl,
            hostname: window.location.hostname
        });
        
        if (this.isGitHubPages) {
            this.init();
        }
    }
    
    // 获取基础URL
    getBaseUrl() {
        const pathParts = window.location.pathname.split('/');
        if (pathParts.length > 1 && pathParts[1]) {
            return `/${pathParts[1]}`;
        }
        return '';
    }
    
    // 初始化适配
    init() {
        this.fixImagePaths();
        this.fixVideoPaths();
        this.setupStaticMode();
        this.fixNavigationPaths();
    }
    
    // 修复图片路径
    fixImagePaths() {
        // 修复头像和背景图片路径
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (img.src && !img.src.startsWith('http') && !img.src.startsWith('data:')) {
                const newSrc = this.fixPath(img.src);
                img.src = newSrc;
                console.log('🖼️ 修复图片路径:', img.src, '→', newSrc);
            }
        });
        
        // 修复CSS背景图片
        const elements = document.querySelectorAll('[style*="background-image"]');
        elements.forEach(el => {
            const style = el.style.backgroundImage;
            if (style && style.includes('url(') && !style.includes('http')) {
                const newStyle = style.replace(/url\(['"]?([^'"]+)['"]?\)/g, (match, url) => {
                    return `url('${this.fixPath(url)}')`;
                });
                el.style.backgroundImage = newStyle;
            }
        });
    }
    
    // 修复数据文件路径
    fixDataPaths() {
        // 重写fetch函数以修复数据路径
        const originalFetch = window.fetch;
        window.fetch = (url, options) => {
            if (typeof url === 'string') {
                let newUrl = url;
                
                // 修复相对路径的数据文件
                if (url.startsWith('../data/')) {
                    newUrl = `${this.baseUrl}/data/${url.replace('../data/', '')}`;
                    console.log('📊 修复数据路径:', url, '→', newUrl);
                } else if (url.startsWith('../../data/')) {
                    // 处理 pages 目录下的路径
                    newUrl = `${this.baseUrl}/data/${url.replace('../../data/', '')}`;
                    console.log('📊 修复数据路径:', url, '→', newUrl);
                } else if (url.startsWith('/data/')) {
                    newUrl = `${this.baseUrl}${url}`;
                    console.log('📊 修复数据路径:', url, '→', newUrl);
                } else if (url.startsWith('data/')) {
                    newUrl = `${this.baseUrl}/${url}`;
                    console.log('📊 修复数据路径:', url, '→', newUrl);
                }
                
                return originalFetch(newUrl, options);
            }
            return originalFetch(url, options);
        };
    }
    
    // 修复视频路径
    fixVideoPaths() {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (video.src && !video.src.startsWith('http')) {
                video.src = this.fixPath(video.src);
            }
            
            // 修复source标签
            const sources = video.querySelectorAll('source');
            sources.forEach(source => {
                if (source.src && !source.src.startsWith('http')) {
                    source.src = this.fixPath(source.src);
                }
            });
        });
    }
    
    // 修复导航路径
    fixNavigationPaths() {
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                link.href = this.fixPath(href);
            }
        });
    }
    
    // 修复路径
    fixPath(path) {
        // 如果已经是完整URL，直接返回
        if (path.startsWith('http') || path.startsWith('data:')) {
            return path;
        }
        
        // 处理相对路径
        if (path.startsWith('../')) {
            // ../data/xxx.json -> /repository-name/data/xxx.json
            const relativePath = path.replace('../', '');
            return `${this.baseUrl}/${relativePath}`;
        } else if (path.startsWith('./')) {
            // ./images/xxx.jpg -> /repository-name/blog/images/xxx.jpg
            const relativePath = path.replace('./', '');
            return `${this.baseUrl}/blog/${relativePath}`;
        } else if (path.startsWith('/')) {
            // /data/xxx.json -> /repository-name/data/xxx.json
            return `${this.baseUrl}${path}`;
        } else {
            // images/xxx.jpg -> /repository-name/blog/images/xxx.jpg
            return `${this.baseUrl}/blog/${path}`;
        }
    }
    
    // 设置静态模式
    setupStaticMode() {
        // 禁用需要服务器的功能
        window.STATIC_MODE = true;
        
        // 显示静态模式提示
        this.showStaticModeNotice();
        
        // 重写可能失败的API调用
        this.mockServerAPIs();
    }
    
    // 模拟服务器API和修复路径
    mockServerAPIs() {
        // 模拟上传功能
        window.mockUpload = true;
        
        // 模拟保存功能
        window.mockSave = true;
        
        // 重写 fetch 以拦截 API 调用和修复路径
        const originalFetch = window.fetch;
        const adapter = this;
        
        window.fetch = function(url, options) {
            if (typeof url === 'string') {
                // 如果是 API 调用（包含 localhost 或以 /api/ 开头）
                if (url.includes('localhost') || url.includes('127.0.0.1') || url.startsWith('/api/')) {
                    console.log('🚫 静态模式下跳过 API 调用:', url);
                    
                    // 返回模拟的成功响应
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({
                            success: true,
                            message: '静态模式下的模拟响应',
                            data: null
                        })
                    });
                }
                
                // 处理数据文件路径
                let newUrl = url;
                
                // 修复相对路径的数据文件
                if (url.startsWith('../data/')) {
                    newUrl = `${adapter.baseUrl}/data/${url.replace('../data/', '')}`;
                    console.log('📊 修复数据路径:', url, '→', newUrl);
                } else if (url.startsWith('../../data/')) {
                    // 处理 pages 目录下的路径
                    newUrl = `${adapter.baseUrl}/data/${url.replace('../../data/', '')}`;
                    console.log('📊 修复数据路径:', url, '→', newUrl);
                } else if (url.startsWith('/data/')) {
                    newUrl = `${adapter.baseUrl}${url}`;
                    console.log('📊 修复数据路径:', url, '→', newUrl);
                } else if (url.startsWith('data/')) {
                    newUrl = `${adapter.baseUrl}/${url}`;
                    console.log('📊 修复数据路径:', url, '→', newUrl);
                }
                
                // 处理数据文件，替换本地URL
                if (url.includes('.json')) {
                    return originalFetch(newUrl, options).then(response => {
                        if (response.ok) {
                            return response.json().then(data => {
                                let processedData = data;
                                
                                // 处理视频数据
                                if (url.includes('videos.json') && Array.isArray(data)) {
                                    processedData = data.map(video => {
                                        if (video.url && (video.url.includes('localhost') || video.url.includes('127.0.0.1') || video.url.startsWith('/uploads/'))) {
                                            return {
                                                ...video,
                                                url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
                                                cover: (video.cover && (video.cover.includes('localhost') || video.cover.startsWith('/uploads/')))
                                                    ? 'https://picsum.photos/640/360?random=' + video.id 
                                                    : video.cover,
                                                description: video.description + ' (静态模式示例)'
                                            };
                                        }
                                        return video;
                                    });
                                    console.log('🎬 已替换本地视频为示例视频');
                                }
                                
                                // 处理图片数据
                                if (url.includes('images.json') && Array.isArray(data)) {
                                    processedData = data.map(image => {
                                        if (image.url && (image.url.includes('localhost') || image.url.startsWith('/uploads/'))) {
                                            return {
                                                ...image,
                                                url: 'https://picsum.photos/800/600?random=' + image.id,
                                                thumbnail: 'https://picsum.photos/300/300?random=' + image.id,
                                                description: (image.description || '示例图片') + ' (静态模式)'
                                            };
                                        }
                                        return image;
                                    });
                                    console.log('🖼️ 已替换本地图片为示例图片');
                                }
                                
                                // 处理设置数据
                                if (url.includes('settings.json') && data.avatar) {
                                    if (data.avatar.includes('localhost') || data.avatar.startsWith('/uploads/')) {
                                        processedData = {
                                            ...data,
                                            avatar: 'https://ui-avatars.com/api/?name=执念&size=200&background=4fc3f7&color=fff&bold=true'
                                        };
                                        console.log('👤 已替换本地头像为默认头像');
                                    }
                                }
                                
                                // 返回修改后的响应
                                return new Response(JSON.stringify(processedData), {
                                    status: response.status,
                                    statusText: response.statusText,
                                    headers: response.headers
                                });
                            });
                        }
                        return response;
                    });
                }
                
                return originalFetch(newUrl, options);
            }
            
            return originalFetch(url, options);
        };
        
        console.log('🔧 已启用静态模式，API调用将被拦截，数据路径已修复');
    }
    
    // 显示静态模式提示
    showStaticModeNotice() {
        const notice = document.createElement('div');
        notice.id = 'static-mode-notice';
        notice.innerHTML = `
            <div style="
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 123, 255, 0.9);
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                font-size: 12px;
                z-index: 10000;
                max-width: 250px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            ">
                <div style="font-weight: bold; margin-bottom: 5px;">📡 静态部署模式</div>
                <div style="opacity: 0.9;">部分功能受限，完整功能请访问本地版本</div>
            </div>
        `;
        
        document.body.appendChild(notice);
        
        // 5秒后自动隐藏
        setTimeout(() => {
            if (notice.parentNode) {
                notice.style.transition = 'opacity 0.5s';
                notice.style.opacity = '0';
                setTimeout(() => notice.remove(), 500);
            }
        }, 5000);
    }
    
    // 修复动态背景
    fixVideoBackground() {
        const videoElements = document.querySelectorAll('.video-background video, video');
        videoElements.forEach(video => {
            // 使用示例视频或禁用视频背景
            if (!video.src || video.src.includes('localhost') || video.src.includes('127.0.0.1')) {
                // 使用占位符图片替代视频背景
                const placeholder = document.createElement('div');
                placeholder.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    z-index: -1;
                `;
                
                if (video.parentNode) {
                    video.parentNode.insertBefore(placeholder, video);
                    video.style.display = 'none';
                }
                
                console.log('🎬 视频背景已替换为渐变背景（静态模式）');
            }
        });
        
        
        console.log('🎬 视频背景修复完成');
    }
    
    // 修复头像显示
    fixAvatars() {
        const avatars = document.querySelectorAll('.avatar, .user-avatar, [class*="avatar"]');
        avatars.forEach(avatar => {
            if (avatar.src && (avatar.src.includes('localhost') || avatar.src.includes('127.0.0.1'))) {
                // 使用默认头像
                avatar.src = 'https://via.placeholder.com/40x40/4CAF50/white?text=U';
                console.log('👤 已使用默认头像');
            }
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.githubPagesAdapter = new GitHubPagesAdapter();
    
    // 延迟执行一些修复，确保其他脚本已加载
    setTimeout(() => {
        if (window.githubPagesAdapter.isGitHubPages) {
            window.githubPagesAdapter.fixVideoBackground();
            window.githubPagesAdapter.fixAvatars();
        }
    }, 1000);
});

// 导出适配器
window.GitHubPagesAdapter = GitHubPagesAdapter;