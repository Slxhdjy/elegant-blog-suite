// 统计信息同步脚本
// 用于在所有页面显示统一的统计信息

class StatsSync {
    constructor() {
        this.init();
    }

    init() {
        // 等待数据存储加载完成
        if (window.blogDataStore) {
            this.updateAllStats();
            this.startAutoUpdate();
            
            // 🔥 页面加载时自动增加访问量和访客数
            this.trackPageView();
        } else {
            // 如果数据存储还未加载，等待一下
            setTimeout(() => this.init(), 100);
        }
    }
    
    // 🔥 追踪页面访问
    async trackPageView() {
        try {
            // 增加总访问量（每次页面加载都计数）
            await this.incrementViews();
            
            // 增加访客数（新访客才计数，使用 localStorage 标记）
            await this.incrementVisitors();
            
            console.log('📊 页面访问已记录');
        } catch (error) {
            console.error('❌ 追踪页面访问失败:', error);
        }
    }

    // 更新所有统计信息
    async updateAllStats() {
        const stats = await window.blogDataStore.getStats();
        
        // 更新总字数
        this.updateElement('totalWords', stats.totalWords);
        
        // 更新总访问量
        this.updateElement('totalViews', stats.totalViews);
        
        // 更新访问人数
        this.updateElement('totalVisitors', stats.totalVisitors);
        
        // 更新运行时长
        await this.updateRunningTime(stats.runningDays);
    }

    // 更新单个元素
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = this.formatNumber(value);
        }
    }

    // 更新运行时长（异步）
    async updateRunningTime(days) {
        const element = document.getElementById('runningTime');
        if (!element) return;

        const settings = await window.blogDataStore.getSettings();
        const startDate = new Date(settings.startDate);
        const now = new Date();
        const diff = now - startDate;
        
        const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (totalDays > 0) {
            element.textContent = `${totalDays}天${hours}时`;
        } else if (hours > 0) {
            element.textContent = `${hours}时${minutes}分`;
        } else {
            element.textContent = `${minutes}分${seconds}秒`;
        }
    }

    // 格式化数字
    formatNumber(num) {
        return num.toLocaleString();
    }

    // 启动自动更新（每秒更新运行时长）
    startAutoUpdate() {
        setInterval(async () => {
            const stats = await window.blogDataStore.getStats();
            this.updateRunningTime(stats.runningDays);
        }, 1000);
    }

    // 🔥 增加访问量（根据环境调用 API）
    async incrementViews(articleId = null) {
        try {
            const environment = window.environmentAdapter?.environment;
            const apiBase = window.environmentAdapter?.apiBase;
            
            console.log('📊 incrementViews 调用:', { environment, apiBase, articleId });
            
            if (environment === 'vercel') {
                // Vercel 环境：使用查询参数格式
                // /api/settings?action=increment-views
                let url;
                if (articleId) {
                    // 文章浏览量: /api/articles?action=view&articleId=xxx
                    url = `${apiBase}/articles?action=view&articleId=${articleId}`;
                } else {
                    // 总访问量: /api/settings?action=increment-views
                    url = `${apiBase}/settings?action=increment-views`;
                }
                
                console.log('📊 [Vercel] 请求URL:', url);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ [Vercel] 访问量已更新:', result);
                } else {
                    const errorText = await response.text();
                    console.warn('⚠️ [Vercel] 更新访问量失败:', response.status, errorText);
                }
            } else if (environment === 'local') {
                // 本地环境：使用路径参数格式
                const url = articleId 
                    ? `${apiBase}/articles/${articleId}/view`
                    : `${apiBase}/settings/increment-views`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                    console.log('✅ [本地] 访问量已更新');
                } else {
                    console.warn('⚠️ [本地] 更新访问量失败:', response.status);
                }
            } else {
                // 静态环境：只在本地更新
                console.log('📊 [静态环境] 访问量统计仅本地记录');
            }
            
            await this.updateAllStats();
        } catch (error) {
            console.error('❌ 增加访问量失败:', error);
        }
    }

    // 🔥 增加访客数（根据环境调用 API）
    async incrementVisitors() {
        try {
            // 检查是否是新访客（使用 localStorage 标记）
            const visitorKey = 'blog_visitor_marked';
            if (localStorage.getItem(visitorKey)) {
                console.log('📊 已标记为访客，跳过计数');
                return;
            }
            
            const environment = window.environmentAdapter?.environment;
            const apiBase = window.environmentAdapter?.apiBase;
            
            console.log('📊 incrementVisitors 调用:', { environment, apiBase });
            
            if (environment === 'vercel') {
                // Vercel 环境：使用查询参数格式
                const url = `${apiBase}/settings?action=increment-visitors`;
                console.log('📊 [Vercel] 请求URL:', url);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ [Vercel] 访客数已更新:', result);
                    localStorage.setItem(visitorKey, 'true');
                } else {
                    const errorText = await response.text();
                    console.warn('⚠️ [Vercel] 更新访客数失败:', response.status, errorText);
                }
            } else if (environment === 'local') {
                // 本地环境：调用本地服务器 API
                const response = await fetch(`${apiBase}/settings/increment-visitors`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                    console.log('✅ [本地] 访客数已更新');
                    localStorage.setItem(visitorKey, 'true');
                } else {
                    console.warn('⚠️ [本地] 更新访客数失败:', response.status);
                }
            } else {
                // 静态环境：只在本地标记
                console.log('📊 [静态环境] 访客统计仅本地记录');
                localStorage.setItem(visitorKey, 'true');
            }
            
            await this.updateAllStats();
        } catch (error) {
            console.error('❌ 增加访客数失败:', error);
        }
    }
}

// 自动初始化 - 等待数据适配器就绪
document.addEventListener('DOMContentLoaded', function() {
    // 等待数据适配器就绪
    function initWhenReady() {
        if (window.blogDataStore && window.blogDataStore.adapter) {
            window.statsSync = new StatsSync();
            console.log('✅ 统计同步器已初始化');
        } else {
            setTimeout(initWhenReady, 100);
        }
    }
    
    // 监听数据适配器就绪事件
    document.addEventListener('dataAdapterReady', function() {
        if (!window.statsSync) {
            window.statsSync = new StatsSync();
            console.log('✅ 统计同步器已初始化（事件触发）');
        }
    });
    
    initWhenReady();
});
