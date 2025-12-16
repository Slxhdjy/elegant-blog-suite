/* ========================================
   后台管理系统视频背景管理
   ======================================== */

class AdminVideoBackgroundManager {
    constructor() {
        this.videoElement = null;
        this.controlBtn = null;
        this.init();
    }

    async init() {
        console.log('🎬 初始化后台视频背景管理器...');
        
        // 检查是否启用后台视频背景
        const enabled = await this.isVideoBackgroundEnabled();
        if (!enabled) {
            console.log('🚫 后台视频背景已禁用');
            return;
        }
        
        // 尝试获取视频列表
        const videos = await this.fetchBackgroundVideos();
        
        if (videos && videos.length > 0) {
            // 有视频，随机选择一个使用
            const randomIndex = Math.floor(Math.random() * videos.length);
            const selectedVideo = videos[randomIndex];
            console.log(`🎲 从 ${videos.length} 个视频中随机选择了第 ${randomIndex + 1} 个`);
            this.createVideoBackground(selectedVideo.url);
            this.createControlButton();
        } else {
            // 没有视频，使用图片背景（保持现有逻辑）
            console.log('📷 没有找到背景视频，使用图片背景');
        }
    }

    async isVideoBackgroundEnabled() {
        try {
            // 从数据存储获取设置
            if (window.blogDataStore) {
                const settings = await window.blogDataStore.getSettings();
                return settings.enableBackendVideoBackground !== false; // 默认启用
            }
            return true; // 如果无法获取设置，默认启用
        } catch (error) {
            console.error('获取视频背景设置失败:', error);
            return true; // 出错时默认启用
        }
    }

    async fetchBackgroundVideos() {
        try {
            console.log('📡 正在获取背景视频列表...');
            // 直接从数据文件获取视频列表
            const response = await fetch('../data/videos.json');
            
            if (!response.ok) {
                console.error('❌ API响应错误:', response.status, response.statusText);
                return null;
            }
            
            const text = await response.text();
            console.log('📄 API原始响应:', text);
            
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                console.error('❌ JSON解析失败:', e);
                console.error('响应内容:', text);
                return null;
            }
            
            if (result && Array.isArray(result) && result.length > 0) {
                // 过滤出BG类型的视频作为背景视频
                const backgroundVideos = result.filter(video => video.category === 'BG');
                console.log(`✅ 找到 ${backgroundVideos.length} 个背景视频`);
                return backgroundVideos;
            } else {
                console.log('⚠️ 没有找到背景视频');
                return null;
            }
        } catch (error) {
            console.error('❌ 获取背景视频失败:', error);
            return null;
        }
    }

    createVideoBackground(videoUrl) {
        console.log('🎬 创建视频背景元素...');
        
        // 创建视频元素
        this.videoElement = document.createElement('video');
        this.videoElement.className = 'admin-video-background';
        this.videoElement.autoplay = true;
        this.videoElement.loop = true;
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;
        
        // 设置视频源
        this.videoElement.src = videoUrl;
        
        // 添加到页面最前面（通过CSS的z-index控制层级）
        document.body.insertBefore(this.videoElement, document.body.firstChild);
        
        // 给body添加类，表示有视频背景
        document.body.classList.add('has-admin-video-background');
        
        console.log('✅ 视频背景已创建');
        console.log('📊 层级结构：背景图片(z-index:-1) < 视频(z-index:0) < 内容(z-index:1+)');
        
        // 监听视频加载
        this.videoElement.addEventListener('loadeddata', () => {
            console.log('✅ 视频背景加载成功');
            this.videoElement.classList.add('loaded');
            this.videoElement.play().catch(err => {
                console.error('❌ 视频自动播放失败:', err);
            });
        });
        
        // 监听错误
        this.videoElement.addEventListener('error', (e) => {
            console.error('❌ 视频加载失败:', e);
            this.fallbackToImage();
        });
    }

    createControlButton() {
        // 创建控制按钮
        this.controlBtn = document.createElement('button');
        this.controlBtn.className = 'admin-video-control-btn';
        this.controlBtn.innerHTML = '⏸️'; // 暂停图标
        this.controlBtn.title = '暂停/播放视频';
        
        // 添加点击事件
        this.controlBtn.addEventListener('click', () => {
            this.toggle();
        });
        
        // 添加到页面
        document.body.appendChild(this.controlBtn);
        
        console.log('✅ 视频控制按钮已创建');
    }

    fallbackToImage() {
        // 视频加载失败，移除视频元素
        if (this.videoElement) {
            this.videoElement.remove();
            this.videoElement = null;
        }
        
        // 移除控制按钮
        if (this.controlBtn) {
            this.controlBtn.remove();
            this.controlBtn = null;
        }
        
        // 移除body类
        document.body.classList.remove('has-admin-video-background');
        
        console.log('⚠️ 视频加载失败，回退到图片背景');
    }

    // 暂停视频
    pause() {
        if (this.videoElement) {
            this.videoElement.pause();
            if (this.controlBtn) {
                this.controlBtn.innerHTML = '▶️'; // 播放图标
            }
            console.log('⏸️ 视频已暂停');
        }
    }

    // 播放视频
    play() {
        if (this.videoElement) {
            this.videoElement.play().catch(err => {
                console.error('❌ 视频播放失败:', err);
            });
            if (this.controlBtn) {
                this.controlBtn.innerHTML = '⏸️'; // 暂停图标
            }
            console.log('▶️ 视频已播放');
        }
    }

    // 切换播放/暂停
    toggle() {
        if (this.videoElement) {
            if (this.videoElement.paused) {
                this.play();
            } else {
                this.pause();
            }
        }
    }

    // 销毁视频背景
    destroy() {
        if (this.videoElement) {
            this.videoElement.remove();
            this.videoElement = null;
        }
        
        if (this.controlBtn) {
            this.controlBtn.remove();
            this.controlBtn = null;
        }
        
        document.body.classList.remove('has-admin-video-background');
        console.log('🗑️ 视频背景已销毁');
    }
}

// 页面加载完成后初始化
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.adminVideoBackgroundManager) {
                window.adminVideoBackgroundManager = new AdminVideoBackgroundManager();
            }
        });
    } else {
        window.adminVideoBackgroundManager = new AdminVideoBackgroundManager();
    }
})();
