// 博客数据存储管理
class BlogDataStore {
    constructor() {
        // 环境类型: 'local' | 'github-pages' | 'vercel'
        this.environment = this.detectEnvironment();
        this.useJSONFiles = this.environment !== 'vercel'; // 本地和GitHub Pages使用JSON
        this.useApi = this.environment === 'vercel'; // 只有Vercel使用API
        this.jsonBaseURL = this._calculateJsonBaseURL(); // 🔥 动态计算JSON文件目录
        this.dataLoaded = false; // 数据是否已加载
        this._jsonDataCache = null; // JSON数据缓存
        
        console.log('🔍 BlogDataStore 初始化:', {
            environment: this.environment,
            useJSONFiles: this.useJSONFiles,
            useApi: this.useApi,
            jsonBaseURL: this.jsonBaseURL
        });
        
        this.initializeData();
    }
    
    // 🔥 动态计算JSON文件基础URL
    _calculateJsonBaseURL() {
        const pathname = window.location.pathname;
        console.log('📍 当前页面路径:', pathname);
        
        // 🔥 优先检查更具体的路径模式
        
        // 1. blog-admin/pages/ 下的页面 (如 blog-admin/pages/editor.html)
        if (pathname.includes('/blog-admin/pages/')) {
            console.log('📁 检测到 blog-admin/pages 子目录，使用 ../../data');
            return '../../data';
        }
        
        // 2. blog/pages/ 下的页面
        if (pathname.includes('/blog/pages/')) {
            console.log('📁 检测到 blog/pages 子目录，使用 ../../data');
            return '../../data';
        }
        
        // 3. blog-admin 目录下 (如 blog-admin/index.html)
        if (pathname.includes('/blog-admin/')) {
            console.log('📁 检测到 blog-admin 目录，使用 ../data');
            return '../data';
        }
        
        // 4. blog 目录下
        if (pathname.includes('/blog/')) {
            console.log('📁 检测到 blog 目录，使用 ../data');
            return '../data';
        }
        
        // 5. 默认情况（根目录）
        console.log('📁 默认路径，使用 ./data');
        return './data';
    }
    
    // 🔥 环境检测 - 三种环境完全独立
    detectEnvironment() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        // 1. Vercel环境 - 使用KV数据库API
        if (hostname.includes('vercel.app') || 
            hostname.includes('vercel.com') ||
            hostname.includes('web3v.vip') || 
            hostname.includes('slxhdjy.top')) {
            console.log('🌐 检测到 Vercel 环境');
            return 'vercel';
        }
        
        // 2. GitHub Pages环境 - 只读JSON文件
        if (hostname.includes('github.io') || 
            hostname.includes('githubusercontent.com')) {
            console.log('📄 检测到 GitHub Pages 环境');
            return 'github-pages';
        }
        
        // 3. 本地开发环境 - JSON文件读写
        if (hostname === 'localhost' || 
            hostname === '127.0.0.1' || 
            hostname.startsWith('192.168.') ||
            port === '3000' || port === '3001' || port === '5500' || port === '8080') {
            console.log('💻 检测到本地开发环境');
            return 'local';
        }
        
        // 默认当作本地环境处理
        console.log('❓ 未知环境，默认使用本地模式');
        return 'local';
    }

    // 获取API基础URL (仅Vercel环境使用)
    getApiBaseURL() {
        if (this.environment !== 'vercel') {
            console.warn('⚠️ 非Vercel环境不应调用API');
        }
        
        // 优先使用环境适配器
        if (window.environmentAdapter && window.environmentAdapter.initialized && window.environmentAdapter.apiBase) {
            return window.environmentAdapter.apiBase;
        }
        
        const hostname = window.location.hostname;
        if (hostname.includes('slxhdjy.top')) {
            return 'https://www.slxhdjy.top/api';
        }
        return '/api';
    }
    
    // 🔥 获取本地服务器API基础URL (本地环境使用)
    getLocalApiBaseURL() {
        // 本地服务器通常运行在 3001 端口
        const port = window.location.port;
        const hostname = window.location.hostname;
        
        // 如果当前就在本地服务器上，使用相对路径
        if (port === '3001') {
            return '/api';
        }
        
        // 否则使用完整的本地服务器地址
        return `http://${hostname}:3001/api`;
    }
    
    // 🔥 检查本地服务器是否可用
    async checkLocalServer() {
        try {
            const localApiBase = this.getLocalApiBaseURL();
            const response = await fetch(`${localApiBase}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            return response.ok;
        } catch (error) {
            console.warn('⚠️ 本地服务器不可用:', error.message);
            return false;
        }
    }
    
    // 🔥 通用的API请求方法 - 根据环境自动选择正确的API端点
    async _apiRequest(resource, method, id = null, data = null) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持此操作');
        }
        
        let apiBase;
        let envLabel;
        let usePathParams; // 是否使用路径参数格式
        
        if (this.environment === 'vercel') {
            apiBase = this.getApiBaseURL();
            envLabel = 'Vercel';
            usePathParams = false; // Vercel API 使用查询参数
        } else {
            apiBase = this.getLocalApiBaseURL();
            envLabel = '本地';
            usePathParams = true; // 本地服务器使用路径参数 /api/resource/:id
        }
        
        // 🔥 根据环境构建URL
        let url = `${apiBase}/${resource}`;
        if (id !== null) {
            if (usePathParams) {
                // 本地服务器: /api/tags/123
                url += `/${id}`;
            } else {
                // Vercel API: /api/tags?id=123
                url += `?id=${id}`;
            }
        }
        
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        
        if (data !== null && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        console.log(`📡 [${envLabel}] ${method} ${url}`);
        
        try {
            const response = await fetch(url, options);
            
            if (response.ok) {
                if (method === 'DELETE') {
                    console.log(`✅ [${envLabel}] ${resource} 删除成功:`, id);
                    return { success: true };
                }
                const result = await response.json();
                const returnData = result.data || result;
                console.log(`✅ [${envLabel}] ${resource} ${method === 'POST' ? '创建' : '更新'}成功:`, returnData.id || id);
                return returnData;
            } else {
                const errorText = await response.text();
                throw new Error(`${resource} 操作失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error(`❌ [${envLabel}] ${resource} ${method} 失败:`, error);
            throw error;
        }
    }

    // 初始化数据
    initializeData() {
        // 只在本地环境初始化localStorage默认数据
        if (this.environment === 'local' && !localStorage.getItem('blogData')) {
            const initialData = {
                articles: [
                    {
                        id: 1,
                        title: '如何使用 Vue 3 构建现代化应用',
                        content: '这是一篇关于 Vue 3 的详细教程...',
                        excerpt: '学习如何使用 Vue 3 的最新特性构建现代化的 Web 应用',
                        category: '技术',
                        tags: ['Vue.js', '前端开发'],
                        status: 'published',
                        publishDate: '2025-11-15',
                        image: 'https://picsum.photos/seed/vue3/400/250',
                        views: 256,
                        author: '管理员'
                    },
                    {
                        id: 2,
                        title: 'JavaScript 异步编程最佳实践',
                        content: '深入理解 JavaScript 的异步编程...',
                        excerpt: '掌握 Promise、async/await 等异步编程技术',
                        category: '技术',
                        tags: ['JavaScript'],
                        status: 'published',
                        publishDate: '2025-11-10',
                        image: 'https://picsum.photos/seed/js-async/400/250',
                        views: 189,
                        author: '管理员'
                    },
                    {
                        id: 3,
                        title: 'CSS Grid 布局完全指南',
                        content: 'CSS Grid 是现代网页布局的强大工具...',
                        excerpt: '全面了解 CSS Grid 布局系统的使用方法',
                        category: '技术',
                        tags: ['CSS', '前端开发'],
                        status: 'draft',
                        publishDate: '2025-11-05',
                        image: 'https://picsum.photos/seed/css-grid/400/250',
                        views: 142,
                        author: '管理员'
                    }
                ],
                categories: [
                    { id: 1, name: '技术', description: '技术相关文章', count: 12 },
                    { id: 2, name: '生活', description: '生活随笔', count: 8 },
                    { id: 3, name: '设计', description: '设计相关内容', count: 5 }
                ],
                tags: [
                    { id: 1, name: 'JavaScript', count: 15 },
                    { id: 2, name: '前端开发', count: 20 },
                    { id: 3, name: 'CSS', count: 10 },
                    { id: 4, name: 'Vue.js', count: 12 },
                    { id: 5, name: 'React', count: 8 }
                ],
                comments: [
                    {
                        id: 1,
                        articleId: 1,
                        articleTitle: 'Vue 3 构建应用',
                        content: '很棒的文章，学到了很多！',
                        author: '张三',
                        email: 'zhangsan@example.com',
                        time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                        status: 'approved'
                    },
                    {
                        id: 2,
                        articleId: 2,
                        articleTitle: 'JavaScript 异步编程',
                        content: '期待更多这样的内容',
                        author: '李四',
                        email: 'lisi@example.com',
                        time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                        status: 'pending'
                    }
                ],
                images: [
                    {
                        id: 1,
                        name: 'sample-image-1.jpg',
                        url: 'https://picsum.photos/seed/media1/800/600',
                        thumbnail: 'https://picsum.photos/seed/media1/300/300',
                        size: 245678,
                        type: 'image/jpeg',
                        description: '示例图片 1',
                        uploadDate: '2025-11-15',
                        usedIn: []
                    },
                    {
                        id: 2,
                        name: 'sample-image-2.jpg',
                        url: 'https://picsum.photos/seed/media2/800/600',
                        thumbnail: 'https://picsum.photos/seed/media2/300/300',
                        size: 189234,
                        type: 'image/jpeg',
                        description: '示例图片 2',
                        uploadDate: '2025-11-14',
                        usedIn: []
                    }
                ],
                music: [
                    {
                        id: 1,
                        name: '示例歌曲 1',
                        artist: '示例歌手',
                        album: '示例专辑',
                        cover: 'https://picsum.photos/seed/music1/300/300',
                        url: 'https://example.com/music1.mp3',
                        lrc: '[00:00.00]这是示例歌词\n[00:05.00]第二行歌词',
                        duration: 240,
                        description: '这是一首示例歌曲',
                        uploadDate: '2025-11-15'
                    },
                    {
                        id: 2,
                        name: '示例歌曲 2',
                        artist: '示例歌手',
                        album: '示例专辑',
                        cover: 'https://picsum.photos/seed/music2/300/300',
                        url: 'https://example.com/music2.mp3',
                        lrc: '[00:00.00]示例歌词内容',
                        duration: 180,
                        description: '另一首示例歌曲',
                        uploadDate: '2025-11-14'
                    }
                ],
                videos: [
                    {
                        id: 1,
                        name: '示例视频 1',
                        cover: 'https://picsum.photos/seed/video1/640/360',
                        url: 'https://example.com/video1.mp4',
                        duration: 300,
                        description: '这是一个示例视频',
                        category: '教程',
                        uploadDate: '2025-11-15'
                    },
                    {
                        id: 2,
                        name: '示例视频 2',
                        cover: 'https://picsum.photos/seed/video2/640/360',
                        url: 'https://example.com/video2.mp4',
                        duration: 420,
                        description: '另一个示例视频',
                        category: '生活',
                        uploadDate: '2025-11-14'
                    }
                ],
                users: [
                    {
                        id: "user_1763831613696",
                        username: "admin",
                        password: "admin123",
                        role: "super_admin",
                        email: "admin@example.com",
                        displayName: "超级管理员",
                        status: "active",
                        createdAt: "2025-11-22T17:13:33.696Z",
                        updatedAt: "2025-12-18T10:00:00.000Z"
                    }
                ],
                settings: {
                    siteName: 'ℳঞ执念ꦿ的博客',
                    siteDescription: '一个记录生活和技术的博客',
                    postsPerPage: 10,
                    commentModeration: true,
                    totalWords: 125000,
                    totalViews: 5432,
                    totalVisitors: 1234,
                    startDate: '2025-01-01',
                    avatar: 'https://ui-avatars.com/api/?name=执念&size=200&background=4fc3f7&color=fff&bold=true'
                }
            };
            localStorage.setItem('blogData', JSON.stringify(initialData));
        }
    }

    // 🔥 从 JSON 文件加载所有数据
    async loadDataFromJSON() {
        console.log('📁 从 JSON 文件加载数据...');
        
        const resources = ['articles', 'categories', 'tags', 'comments', 'guestbook', 'images', 'music', 'videos', 'links', 'settings'];
        const data = {};
        let loadedCount = 0;
        
        for (const resource of resources) {
            try {
                const response = await fetch(`${this.jsonBaseURL}/${resource}.json`);
                if (response.ok) {
                    data[resource] = await response.json();
                    loadedCount++;
                    console.log(`✅ 加载 ${resource}.json:`, Array.isArray(data[resource]) ? data[resource].length + ' 条' : 'object');
                } else {
                    console.warn(`⚠️ 无法加载 ${resource}.json: HTTP ${response.status}`);
                    data[resource] = resource === 'settings' ? {} : [];
                }
            } catch (error) {
                console.error(`❌ 加载 ${resource}.json 失败:`, error);
                data[resource] = resource === 'settings' ? {} : [];
            }
        }
        
        // 🔥 只有在成功加载了数据时才保存到 localStorage
        // 避免用空数据覆盖已有数据
        if (loadedCount > 0) {
            // 获取现有的 localStorage 数据
            const existingData = this.getAllData() || {};
            
            // 合并数据：只覆盖成功加载的资源
            const mergedData = { ...existingData };
            for (const resource of resources) {
                // 只有当新数据不为空时才覆盖
                if (resource === 'settings') {
                    if (Object.keys(data[resource]).length > 0) {
                        mergedData[resource] = data[resource];
                    }
                } else {
                    if (Array.isArray(data[resource]) && data[resource].length > 0) {
                        mergedData[resource] = data[resource];
                    }
                }
            }
            
            localStorage.setItem('blogData', JSON.stringify(mergedData));
            console.log(`✅ 数据加载完成，成功加载 ${loadedCount}/${resources.length} 个资源`);
            this.dataLoaded = true;
            return mergedData;
        } else {
            console.warn('⚠️ 没有成功加载任何 JSON 文件，保留现有 localStorage 数据');
            this.dataLoaded = true;
            return this.getAllData();
        }
    }
    
    // 获取所有数据
    getAllData() {
        return JSON.parse(localStorage.getItem('blogData'));
    }
    
    // 🔥 异步获取所有数据（Vercel环境下禁用JSON文件加载）
    async getAllDataAsync() {
        // 在Vercel环境下不加载JSON文件，避免覆盖KV数据
        const hostname = window.location.hostname;
        const isVercelEnv = hostname.includes('vercel.app') || 
                           hostname.includes('vercel.com') ||
                           hostname.includes('web3v.vip') || 
                           hostname.includes('slxhdjy.top');
        
        console.log('🔍 getAllDataAsync 环境检测:', {
            hostname: hostname,
            isVercelEnv: isVercelEnv,
            useJSONFiles: this.useJSONFiles,
            useApi: this.useApi,
            dataLoaded: this.dataLoaded
        });
        
        // 强制检查：如果是Vercel环境，绝对不加载JSON文件
        if (isVercelEnv) {
            console.log('🚫 Vercel环境：绝对禁止JSON文件加载，直接返回localStorage缓存');
            this.useJSONFiles = false;
            this.useApi = true;
            return this.getAllData();
        }
        
        // 只有在非Vercel环境且明确配置使用JSON文件时才加载
        if (this.useJSONFiles && !this.dataLoaded && !isVercelEnv) {
            console.log('📁 从JSON文件加载数据 (非Vercel环境)');
            return await this.loadDataFromJSON();
        }
        
        console.log('💾 使用localStorage缓存数据');
        return this.getAllData();
    }

    // 保存所有数据
    saveAllData(data) {
        try {
            const jsonStr = JSON.stringify(data);
            const sizeInMB = (new Blob([jsonStr]).size / (1024 * 1024)).toFixed(2);
            
            console.log(`尝试保存数据，大小: ${sizeInMB} MB`);
            
            // 直接尝试保存，不预先检查大小
            // localStorage的实际限制通常是5-10MB，让浏览器自己判断
            localStorage.setItem('blogData', jsonStr);
            console.log('✅ 数据保存到localStorage成功');
            
            // 注释：已移除自动同步到JSON文件的逻辑，避免覆盖Vercel KV数据库
            // this.syncToJSONFiles(data).catch(err => {
            //     console.warn('⚠️ 同步到JSON文件失败（这不影响localStorage保存）:', err.message);
            // });
            
            // 保存成功后，如果数据较大，给出警告
            if (sizeInMB > 4) {
                console.warn(`⚠️ 数据量较大 (${sizeInMB} MB)，建议优化图片或使用外部存储`);
            }
        } catch (error) {
            console.error('❌ 保存失败:', error);
            
            // 如果是配额错误
            if (error.name === 'QuotaExceededError' || 
                error.message.includes('quota') || 
                error.message.includes('exceeded')) {
                
                const jsonStr = JSON.stringify(data);
                const sizeInMB = (new Blob([jsonStr]).size / (1024 * 1024)).toFixed(2);
                
                // 询问用户是否清理
                const shouldCleanup = confirm(
                    `存储空间不足！\n\n` +
                    `当前数据大小: ${sizeInMB} MB\n` +
                    `localStorage限制: 约 5-10 MB\n\n` +
                    `是否自动清理Base64图片？\n` +
                    `（清理后图片将显示为占位符，需要重新上传）\n\n` +
                    `点击"确定"清理图片\n` +
                    `点击"取消"放弃保存`
                );
                
                if (!shouldCleanup) {
                    throw new Error('保存已取消。建议：\n1. 删除一些旧文章\n2. 使用图床上传图片\n3. 压缩图片大小');
                }
                
                // 用户同意清理
                console.log('🔄 用户同意清理Base64图片...');
                const cleanedCount = this.cleanupOldData(data);
                
                try {
                    const cleanedJsonStr = JSON.stringify(data);
                    const cleanedSizeMB = (new Blob([cleanedJsonStr]).size / (1024 * 1024)).toFixed(2);
                    localStorage.setItem('blogData', cleanedJsonStr);
                    console.log(`✅ 清理后保存成功，清理了 ${cleanedCount} 张图片，新大小: ${cleanedSizeMB} MB`);
                    
                    // 注释：已移除自动同步到JSON文件的逻辑，避免覆盖Vercel KV数据库
                    // this.syncToJSONFiles(data).catch(err => {
                    //     console.warn('⚠️ 同步到JSON文件失败:', err.message);
                    // });
                    
                    // 提示用户
                    alert(`保存成功！\n\n已清理 ${cleanedCount} 张Base64图片\n数据大小从 ${sizeInMB} MB 减少到 ${cleanedSizeMB} MB\n\n建议使用图床服务上传图片`);
                } catch (retryError) {
                    throw new Error('清理后仍然无法保存，请删除更多文章或使用图床');
                }
            } else {
                throw error;
            }
        }
    }
    
    // 🔥 同步数据到JSON文件（通过API服务器）
    async syncToJSONFiles(data) {
        const apiBaseURL = this.getApiBaseURL();
        
        // 检查API服务器是否可用
        try {
            const healthCheck = await fetch(`${apiBaseURL}/health`, { 
                method: 'GET',
                signal: AbortSignal.timeout(2000) // 2秒超时
            });
            
            if (!healthCheck.ok) {
                throw new Error('API服务器不可用');
            }
        } catch (error) {
            console.log('💡 提示：启动API服务器（端口3001）可自动同步数据到JSON文件');
            return; // 静默失败，不影响localStorage保存
        }
        
        // 保存各个资源到对应的JSON文件
        const resources = ['articles', 'categories', 'tags', 'comments', 'guestbook', 'images', 'music', 'videos', 'links', 'settings'];
        const savePromises = [];
        
        for (const resource of resources) {
            if (!data[resource]) continue;
            
            try {
                let promise;
                if (resource === 'settings') {
                    // settings 是对象，使用 PUT
                    promise = fetch(`${apiBaseURL}/${resource}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data[resource]),
                        signal: AbortSignal.timeout(5000)
                    });
                } else {
                    // 其他资源是数组，使用 POST batch
                    promise = fetch(`${apiBaseURL}/${resource}/batch`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data[resource]),
                        signal: AbortSignal.timeout(5000)
                    });
                }
                savePromises.push(promise);
            } catch (error) {
                console.warn(`保存 ${resource} 失败:`, error.message);
            }
        }
        
        // 等待所有保存完成
        const results = await Promise.allSettled(savePromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
        
        if (successCount > 0) {
            console.log(`✅ 成功同步 ${successCount}/${resources.length} 个资源到JSON文件`);
        }
    }
    
    // 清理旧数据（移除Base64图片，保留URL）
    cleanupOldData(data, keepNewest = 1) {
        console.log(`清理Base64图片（保留最新 ${keepNewest} 篇文章）...`);
        let cleanedCount = 0;
        
        // 按ID排序，保留最新的文章
        const sortedArticles = [...data.articles].sort((a, b) => b.id - a.id);
        const articlesToClean = sortedArticles.slice(keepNewest);
        const keepIds = sortedArticles.slice(0, keepNewest).map(a => a.id);
        
        console.log(`保留文章ID: ${keepIds.join(', ')}`);
        
        // 清理旧文章中的Base64图片
        data.articles.forEach(article => {
            // 跳过最新的文章
            if (keepIds.includes(article.id)) {
                console.log(`跳过文章 ${article.id}: ${article.title}`);
                return;
            }
            
            if (article.content) {
                const originalLength = article.content.length;
                // 将Base64图片替换为占位符
                article.content = article.content.replace(
                    /!\[([^\]]*)\]\(data:image\/[^;]+;base64,[^\)]{100,}\)/g,
                    (match, alt) => {
                        cleanedCount++;
                        return `![${alt}](图片已移除-请重新上传)`;
                    }
                );
                if (article.content.length < originalLength) {
                    console.log(`文章 ${article.id} 清理了 ${originalLength - article.content.length} 字节`);
                }
            }
        });
        
        console.log(`共清理 ${cleanedCount} 张Base64图片`);
        return cleanedCount;
    }
    
    // 获取存储使用情况
    getStorageInfo() {
        try {
            const data = this.getAllData();
            const jsonStr = JSON.stringify(data);
            const totalSize = new Blob([jsonStr]).size;
            const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
            const maxSize = 5; // localStorage通常限制为5MB
            const usagePercent = ((totalSize / (maxSize * 1024 * 1024)) * 100).toFixed(1);
            
            // 计算各部分大小
            const articlesSize = (new Blob([JSON.stringify(data.articles)]).size / 1024).toFixed(2);
            const imagesSize = (new Blob([JSON.stringify(data.images || [])]).size / 1024).toFixed(2);
            
            return {
                totalSize: totalSize,
                totalSizeMB: totalSizeMB,
                maxSizeMB: maxSize,
                usagePercent: usagePercent,
                articlesKB: articlesSize,
                imagesKB: imagesSize,
                articleCount: data.articles.length
            };
        } catch (error) {
            console.error('获取存储信息失败:', error);
            return null;
        }
    }

    // ========== 文章相关方法 ==========
    
    // 🔥 根据环境获取文章 - 三种环境完全独立
    async getArticles(status = null) {
        console.log(`📚 getArticles 调用，环境: ${this.environment}`);
        
        let articles = [];
        
        // 根据环境选择数据源
        switch (this.environment) {
            case 'vercel':
                // Vercel环境 - 从API获取
                articles = await this._getArticlesFromAPI();
                break;
            case 'github-pages':
            case 'local':
            default:
                // 本地和GitHub Pages - 从JSON文件获取
                articles = await this._getArticlesFromJSON();
                break;
        }
        
        // 按状态过滤
        if (status && Array.isArray(articles)) {
            return articles.filter(article => article.status === status);
        }
        return articles || [];
    }
    
    // 从API获取文章 (Vercel环境)
    async _getArticlesFromAPI() {
        try {
            const apiBase = this.getApiBaseURL();
            console.log('📡 [Vercel] 从API获取文章列表:', `${apiBase}/articles`);
            
            const response = await fetch(`${apiBase}/articles`);
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const result = await response.json();
            let articles = [];
            if (result.success && result.data) {
                articles = result.data;
            } else if (Array.isArray(result)) {
                articles = result;
            }
            
            console.log('✅ [Vercel] 文章获取成功:', articles.length, '篇');
            return articles;
        } catch (error) {
            console.error('❌ [Vercel] API获取文章失败:', error);
            return [];
        }
    }
    
    // 从JSON文件获取文章 (本地/GitHub Pages环境)
    async _getArticlesFromJSON() {
        try {
            // 优先使用缓存
            if (this._jsonDataCache && this._jsonDataCache.articles) {
                console.log('📋 [JSON] 使用缓存的文章数据');
                return this._jsonDataCache.articles;
            }
            
            const url = `${this.jsonBaseURL}/articles.json`;
            console.log('📁 [JSON] 从JSON文件获取文章, URL:', url);
            
            const response = await fetch(url);
            console.log('📁 [JSON] 文章请求响应状态:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`JSON文件加载失败: ${response.status}`);
            }
            
            const articles = await response.json();
            
            // 缓存数据
            if (!this._jsonDataCache) this._jsonDataCache = {};
            this._jsonDataCache.articles = articles;
            
            console.log('✅ [JSON] 文章加载成功:', articles.length, '篇');
            return articles;
        } catch (error) {
            console.error('❌ [JSON] 加载文章失败:', error);
            console.error('❌ [JSON] 错误详情:', error.message);
            // 降级到localStorage
            const data = this.getAllData();
            console.log('📋 [JSON] 降级到localStorage, 文章数:', data?.articles?.length || 0);
            return data?.articles || [];
        }
    }

    // 根据ID获取文章
    getArticleById(id) {
        // 同步方法 - 从缓存或localStorage获取
        if (this._jsonDataCache && this._jsonDataCache.articles) {
            return this._jsonDataCache.articles.find(article => 
                article.id === parseInt(id) || String(article.id) === String(id)
            );
        }
        const data = this.getAllData();
        return data?.articles?.find(article => 
            article.id === parseInt(id) || String(article.id) === String(id)
        );
    }
    
    // 🔥 异步获取单篇文章 - 根据环境选择数据源
    async getArticleByIdAsync(id) {
        console.log('🔍 getArticleByIdAsync 调用，ID:', id, '环境:', this.environment);
        
        if (this.environment === 'vercel') {
            // Vercel环境 - 从API获取
            try {
                const apiBase = this.getApiBaseURL();
                const response = await fetch(`${apiBase}/articles?id=${id}`);
                
                if (!response.ok) {
                    if (response.status === 404) return null;
                    throw new Error(`API请求失败: ${response.status}`);
                }
                
                const result = await response.json();
                if (result.success && result.data) {
                    return result.data;
                }
                return null;
            } catch (error) {
                console.error('❌ [Vercel] 获取文章失败:', error);
                return null;
            }
        } else {
            // 本地/GitHub Pages - 从JSON获取
            const articles = await this._getArticlesFromJSON();
            return articles.find(article => 
                article.id === parseInt(id) || String(article.id) === String(id)
            );
        }
    }

    // 添加文章
    async addArticle(article) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持添加文章');
        }
        
        const articleData = {
            ...article,
            views: 0,
            publishDate: article.publishDate || new Date().toISOString().split('T')[0],
            likes: article.likes || 0
        };
        
        const result = await this._apiRequest('articles', 'POST', null, articleData);
        if (this._jsonDataCache) this._jsonDataCache.articles = null;
        return result;
    }

    async updateArticle(id, updates) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持更新文章');
        }
        
        const result = await this._apiRequest('articles', 'PUT', id, updates);
        if (this._jsonDataCache) this._jsonDataCache.articles = null;
        return result;
    }

    async deleteArticle(id) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持删除文章');
        }
        
        const result = await this._apiRequest('articles', 'DELETE', id);
        if (this._jsonDataCache) this._jsonDataCache.articles = null;
        return result;
    }

    // ========== 分类相关方法 ==========
    
    // 同步获取分类 (用于兼容旧代码)
    getCategories() {
        // 从缓存获取
        if (this._jsonDataCache && this._jsonDataCache.categories) {
            return this._jsonDataCache.categories;
        }
        const data = this.getAllData();
        return data?.categories || [];
    }
    
    // 🔥 异步获取分类 - 根据环境选择数据源
    async getCategoriesAsync() {
        console.log(`📂 getCategoriesAsync 调用，环境: ${this.environment}`);
        
        switch (this.environment) {
            case 'vercel':
                return await this._getCategoriesFromAPI();
            case 'github-pages':
            case 'local':
            default:
                return await this._getCategoriesFromJSON();
        }
    }
    
    // 从API获取分类 (Vercel环境)
    async _getCategoriesFromAPI() {
        try {
            const apiBase = this.getApiBaseURL();
            console.log('📡 [Vercel] 从API获取分类列表');
            
            const response = await fetch(`${apiBase}/categories`);
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const result = await response.json();
            let categories = [];
            if (result.success && result.data) {
                categories = result.data;
            } else if (Array.isArray(result)) {
                categories = result;
            }
            
            console.log('✅ [Vercel] 分类获取成功:', categories.length, '个');
            return categories;
        } catch (error) {
            console.error('❌ [Vercel] API获取分类失败:', error);
            return [];
        }
    }
    
    // 从JSON文件获取分类 (本地/GitHub Pages环境)
    async _getCategoriesFromJSON() {
        try {
            if (this._jsonDataCache && this._jsonDataCache.categories) {
                console.log('📋 [JSON] 使用缓存的分类数据');
                return this._jsonDataCache.categories;
            }
            
            console.log('📁 [JSON] 从JSON文件获取分类');
            const response = await fetch(`${this.jsonBaseURL}/categories.json`);
            if (!response.ok) {
                throw new Error(`JSON文件加载失败: ${response.status}`);
            }
            
            const categories = await response.json();
            
            if (!this._jsonDataCache) this._jsonDataCache = {};
            this._jsonDataCache.categories = categories;
            
            console.log('✅ [JSON] 分类加载成功:', categories.length, '个');
            return categories;
        } catch (error) {
            console.error('❌ [JSON] 加载分类失败:', error);
            const data = this.getAllData();
            return data?.categories || [];
        }
    }
    
    // 同步分类统计（仅本地环境使用）
    syncCategoryStats() {
        if (this.environment !== 'local') return;
        const data = this.getAllData();
        if (data) {
            this.syncCategoryStatsWithData(data);
            this.saveAllData(data);
        }
    }
    
    // 同步分类统计（传入data对象，不保存）
    syncCategoryStatsWithData(data) {
        if (!data || !data.articles || !data.categories) return;
        
        const articles = data.articles;
        const categoryCounts = {};
        articles.forEach(article => {
            const category = article.category || '未分类';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        
        data.categories.forEach(cat => {
            cat.count = categoryCounts[cat.name] || 0;
        });
    }

    async addCategory(category) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持添加分类');
        }
        
        const categoryData = {
            ...category,
            count: 0
        };
        
        // 🔥 根据环境选择操作方式
        if (this.environment === 'vercel') {
            // Vercel环境 - 使用KV数据库API
            try {
                const apiBase = this.getApiBaseURL();
                const response = await fetch(`${apiBase}/categories`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(categoryData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ [Vercel] 分类已保存到KV数据库:', result.data.id);
                    if (this._jsonDataCache) this._jsonDataCache.categories = null;
                    return result.data;
                } else {
                    const errorText = await response.text();
                    throw new Error(`分类创建失败: ${response.status} - ${errorText}`);
                }
            } catch (error) {
                console.error('❌ [Vercel] 添加分类失败:', error);
                throw error;
            }
        } else {
            // 本地环境 - 使用本地服务器API操作JSON文件
            try {
                const localApiBase = this.getLocalApiBaseURL();
                const response = await fetch(`${localApiBase}/categories`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(categoryData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ [本地] 分类已保存到JSON文件:', result.data?.id || result.id);
                    if (this._jsonDataCache) this._jsonDataCache.categories = null;
                    return result.data || result;
                } else {
                    const errorText = await response.text();
                    throw new Error(`分类创建失败: ${response.status} - ${errorText}`);
                }
            } catch (error) {
                console.error('❌ [本地] 添加分类失败:', error);
                throw error;
            }
        }
    }

    async updateCategory(id, updates) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持更新分类');
        }
        
        const result = await this._apiRequest('categories', 'PUT', id, updates);
        if (this._jsonDataCache) this._jsonDataCache.categories = null;
        return result;
    }

    async deleteCategory(id) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持删除分类');
        }
        
        const result = await this._apiRequest('categories', 'DELETE', id);
        if (this._jsonDataCache) this._jsonDataCache.categories = null;
        return result;
    }

    // ========== 标签相关方法 ==========
    
    // 同步获取标签 (用于兼容旧代码)
    getTags() {
        if (this._jsonDataCache && this._jsonDataCache.tags) {
            return this._jsonDataCache.tags;
        }
        const data = this.getAllData();
        return data?.tags || [];
    }
    
    // 🔥 异步获取标签 - 根据环境选择数据源
    async getTagsAsync() {
        console.log(`🏷️ getTagsAsync 调用，环境: ${this.environment}`);
        
        switch (this.environment) {
            case 'vercel':
                return await this._getTagsFromAPI();
            case 'github-pages':
            case 'local':
            default:
                return await this._getTagsFromJSON();
        }
    }
    
    // 从API获取标签 (Vercel环境)
    async _getTagsFromAPI() {
        try {
            const apiBase = this.getApiBaseURL();
            console.log('📡 [Vercel] 从API获取标签列表');
            
            const response = await fetch(`${apiBase}/tags`);
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const result = await response.json();
            let tags = [];
            if (result.success && result.data) {
                tags = result.data;
            } else if (Array.isArray(result)) {
                tags = result;
            }
            
            console.log('✅ [Vercel] 标签获取成功:', tags.length, '个');
            return tags;
        } catch (error) {
            console.error('❌ [Vercel] API获取标签失败:', error);
            return [];
        }
    }
    
    // 从JSON文件获取标签 (本地/GitHub Pages环境)
    async _getTagsFromJSON() {
        try {
            if (this._jsonDataCache && this._jsonDataCache.tags) {
                console.log('📋 [JSON] 使用缓存的标签数据');
                return this._jsonDataCache.tags;
            }
            
            console.log('📁 [JSON] 从JSON文件获取标签');
            const response = await fetch(`${this.jsonBaseURL}/tags.json`);
            if (!response.ok) {
                throw new Error(`JSON文件加载失败: ${response.status}`);
            }
            
            const tags = await response.json();
            
            if (!this._jsonDataCache) this._jsonDataCache = {};
            this._jsonDataCache.tags = tags;
            
            console.log('✅ [JSON] 标签加载成功:', tags.length, '个');
            return tags;
        } catch (error) {
            console.error('❌ [JSON] 加载标签失败:', error);
            const data = this.getAllData();
            return data?.tags || [];
        }
    }
    
    // 同步标签统计（仅本地环境使用）
    syncTagStats() {
        if (this.environment !== 'local') return;
        const data = this.getAllData();
        if (data) {
            this.syncTagStatsWithData(data);
            this.saveAllData(data);
        }
    }
    
    // 同步标签统计（传入data对象，不保存）
    syncTagStatsWithData(data) {
        if (!data || !data.articles || !data.tags) return;
        
        const articles = data.articles;
        const tagCounts = {};
        articles.forEach(article => {
            if (article.tags && Array.isArray(article.tags)) {
                article.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });
        
        data.tags.forEach(tag => {
            tag.count = tagCounts[tag.name] || 0;
        });
        
        // 添加新出现的标签
        Object.keys(tagCounts).forEach(tagName => {
            const exists = data.tags.find(t => t.name === tagName);
            if (!exists) {
                const newTag = {
                    id: Math.max(...data.tags.map(t => t.id), 0) + 1,
                    name: tagName,
                    count: tagCounts[tagName]
                };
                data.tags.push(newTag);
            }
        });
    }

    async addTag(tag) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持添加标签');
        }
        
        const tagData = {
            ...tag,
            count: 0
        };
        
        // 🔥 根据环境选择操作方式
        if (this.environment === 'vercel') {
            try {
                const apiBase = this.getApiBaseURL();
                const response = await fetch(`${apiBase}/tags`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tagData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ [Vercel] 标签已保存到KV数据库:', result.data.id);
                    if (this._jsonDataCache) this._jsonDataCache.tags = null;
                    return result.data;
                } else {
                    const errorText = await response.text();
                    throw new Error(`标签创建失败: ${response.status} - ${errorText}`);
                }
            } catch (error) {
                console.error('❌ [Vercel] 添加标签失败:', error);
                throw error;
            }
        } else {
            try {
                const localApiBase = this.getLocalApiBaseURL();
                const response = await fetch(`${localApiBase}/tags`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tagData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ [本地] 标签已保存到JSON文件:', result.data?.id || result.id);
                    if (this._jsonDataCache) this._jsonDataCache.tags = null;
                    return result.data || result;
                } else {
                    const errorText = await response.text();
                    throw new Error(`标签创建失败: ${response.status} - ${errorText}`);
                }
            } catch (error) {
                console.error('❌ [本地] 添加标签失败:', error);
                throw error;
            }
        }
    }

    async updateTag(id, updates) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持更新标签');
        }
        
        const result = await this._apiRequest('tags', 'PUT', id, updates);
        if (this._jsonDataCache) this._jsonDataCache.tags = null;
        return result;
    }

    async deleteTag(id) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持删除标签');
        }
        
        const result = await this._apiRequest('tags', 'DELETE', id);
        if (this._jsonDataCache) this._jsonDataCache.tags = null;
        return result;
    }

    // ========== 评论相关方法 ==========
    
    // 🔥 异步获取评论 - 根据环境选择数据源
    async getComments(status = null) {
        console.log(`💬 getComments 调用，环境: ${this.environment}`);
        
        let comments = [];
        
        switch (this.environment) {
            case 'vercel':
                comments = await this._getCommentsFromAPI();
                break;
            case 'github-pages':
            case 'local':
            default:
                comments = await this._getCommentsFromJSON();
                break;
        }
        
        if (status && Array.isArray(comments)) {
            return comments.filter(comment => comment.status === status);
        }
        return comments || [];
    }
    
    // 从API获取评论 (Vercel环境)
    async _getCommentsFromAPI() {
        try {
            const apiBase = this.getApiBaseURL();
            console.log('📡 [Vercel] 从API获取评论列表');
            
            const response = await fetch(`${apiBase}/comments`);
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const result = await response.json();
            let comments = [];
            if (result.success && result.data) {
                comments = result.data;
            } else if (Array.isArray(result)) {
                comments = result;
            }
            
            console.log('✅ [Vercel] 评论获取成功:', comments.length, '条');
            return comments;
        } catch (error) {
            console.error('❌ [Vercel] API获取评论失败:', error);
            return [];
        }
    }
    
    // 从JSON文件获取评论 (本地/GitHub Pages环境)
    async _getCommentsFromJSON() {
        try {
            if (this._jsonDataCache && this._jsonDataCache.comments) {
                console.log('📋 [JSON] 使用缓存的评论数据');
                return this._jsonDataCache.comments;
            }
            
            console.log('📁 [JSON] 从JSON文件获取评论');
            const response = await fetch(`${this.jsonBaseURL}/comments.json`);
            if (!response.ok) {
                throw new Error(`JSON文件加载失败: ${response.status}`);
            }
            
            const comments = await response.json();
            
            if (!this._jsonDataCache) this._jsonDataCache = {};
            this._jsonDataCache.comments = comments;
            
            console.log('✅ [JSON] 评论加载成功:', comments.length, '条');
            return comments;
        } catch (error) {
            console.error('❌ [JSON] 加载评论失败:', error);
            const data = this.getAllData();
            return data?.comments || [];
        }
    }

    async addComment(comment) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持添加评论');
        }
        
        const commentData = {
            ...comment,
            time: new Date().toISOString(),
            status: 'pending'
        };
        
        const result = await this._apiRequest('comments', 'POST', null, commentData);
        if (this._jsonDataCache) this._jsonDataCache.comments = null;
        return result;
    }

    async updateComment(id, updates) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持更新评论');
        }
        
        const result = await this._apiRequest('comments', 'PUT', id, updates);
        if (this._jsonDataCache) this._jsonDataCache.comments = null;
        return result;
    }

    async deleteComment(id) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持删除评论');
        }
        
        const result = await this._apiRequest('comments', 'DELETE', id);
        if (this._jsonDataCache) this._jsonDataCache.comments = null;
        return result;
    }

    // ========== 留言相关方法 ==========
    
    // 同步获取留言 (用于兼容旧代码)
    getGuestbookMessages() {
        if (this._jsonDataCache && this._jsonDataCache.guestbook) {
            return this._jsonDataCache.guestbook;
        }
        const data = this.getAllData();
        return data?.guestbook || [];
    }
    
    // 🔥 异步获取留言 - 根据环境选择数据源
    async getGuestbookMessagesAsync() {
        console.log(`📝 getGuestbookMessagesAsync 调用，环境: ${this.environment}`);
        
        switch (this.environment) {
            case 'vercel':
                return await this._getGuestbookFromAPI();
            case 'github-pages':
            case 'local':
            default:
                return await this._getGuestbookFromJSON();
        }
    }
    
    // 从API获取留言 (Vercel环境)
    async _getGuestbookFromAPI() {
        try {
            const apiBase = this.getApiBaseURL();
            console.log('📡 [Vercel] 从API获取留言列表');
            
            const response = await fetch(`${apiBase}/guestbook`);
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const result = await response.json();
            let messages = [];
            if (result.success && result.data) {
                messages = result.data;
            } else if (Array.isArray(result)) {
                messages = result;
            }
            
            console.log('✅ [Vercel] 留言获取成功:', messages.length, '条');
            return messages;
        } catch (error) {
            console.error('❌ [Vercel] API获取留言失败:', error);
            return [];
        }
    }
    
    // 从JSON文件获取留言 (本地/GitHub Pages环境)
    async _getGuestbookFromJSON() {
        try {
            if (this._jsonDataCache && this._jsonDataCache.guestbook) {
                console.log('📋 [JSON] 使用缓存的留言数据');
                return this._jsonDataCache.guestbook;
            }
            
            console.log('📁 [JSON] 从JSON文件获取留言');
            const response = await fetch(`${this.jsonBaseURL}/guestbook.json`);
            if (!response.ok) {
                throw new Error(`JSON文件加载失败: ${response.status}`);
            }
            
            const messages = await response.json();
            
            if (!this._jsonDataCache) this._jsonDataCache = {};
            this._jsonDataCache.guestbook = messages;
            
            console.log('✅ [JSON] 留言加载成功:', messages.length, '条');
            return messages;
        } catch (error) {
            console.error('❌ [JSON] 加载留言失败:', error);
            const data = this.getAllData();
            return data?.guestbook || [];
        }
    }
    
    async addGuestbookMessage(message) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持添加留言');
        }
        
        const timestamp = new Date().toISOString();
        const messageData = {
            ...message,
            time: timestamp,
            createdAt: timestamp,
            likes: 0,
            pinned: false
        };
        
        const result = await this._apiRequest('guestbook', 'POST', null, messageData);
        if (this._jsonDataCache) this._jsonDataCache.guestbook = null;
        return result;
    }
    
    async updateGuestbookMessage(id, updates) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持更新留言');
        }
        
        const result = await this._apiRequest('guestbook', 'PUT', id, updates);
        if (this._jsonDataCache) this._jsonDataCache.guestbook = null;
        return result;
    }
    
    async deleteGuestbookMessage(id) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持删除留言');
        }
        
        const result = await this._apiRequest('guestbook', 'DELETE', id);
        if (this._jsonDataCache) this._jsonDataCache.guestbook = null;
        return result;
    }
    
    toggleGuestbookLike(id) {
        const data = this.getAllData();
        if (!data.guestbook) return null;
        const message = data.guestbook.find(m => m.id === parseInt(id));
        if (message) {
            message.likes = (message.likes || 0) + 1;
            this.saveAllData(data);
            return message;
        }
        return null;
    }
    
    toggleGuestbookPin(id) {
        const data = this.getAllData();
        if (!data.guestbook) return null;
        const message = data.guestbook.find(m => m.id === parseInt(id));
        if (message) {
            message.pinned = !message.pinned;
            this.saveAllData(data);
            return message;
        }
        return null;
    }

    // ========== 设置相关方法 ==========
    
    // 🔥 异步获取设置 - 根据环境选择数据源
    async getSettings() {
        console.log(`⚙️ getSettings 调用，环境: ${this.environment}`);
        
        switch (this.environment) {
            case 'vercel':
                return await this._getSettingsFromAPI();
            case 'github-pages':
            case 'local':
            default:
                return await this._getSettingsFromJSON();
        }
    }
    
    // 从API获取设置 (Vercel环境)
    async _getSettingsFromAPI() {
        try {
            const apiBase = this.getApiBaseURL();
            console.log('📡 [Vercel] 从API获取设置');
            
            const response = await fetch(`${apiBase}/settings`);
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('⚠️ [Vercel] 设置数据不存在');
                    return {};
                }
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const result = await response.json();
            const settings = result.success ? result.data : (result || {});
            
            console.log('✅ [Vercel] 设置获取成功:', Object.keys(settings).length, '个字段');
            return settings;
        } catch (error) {
            console.error('❌ [Vercel] API获取设置失败:', error);
            return {};
        }
    }
    
    // 从JSON文件获取设置 (本地/GitHub Pages环境)
    async _getSettingsFromJSON() {
        try {
            if (this._jsonDataCache && this._jsonDataCache.settings) {
                console.log('📋 [JSON] 使用缓存的设置数据');
                return this._jsonDataCache.settings;
            }
            
            console.log('📁 [JSON] 从JSON文件获取设置');
            const response = await fetch(`${this.jsonBaseURL}/settings.json`);
            if (!response.ok) {
                throw new Error(`JSON文件加载失败: ${response.status}`);
            }
            
            const settings = await response.json();
            
            if (!this._jsonDataCache) this._jsonDataCache = {};
            this._jsonDataCache.settings = settings;
            
            console.log('✅ [JSON] 设置加载成功:', Object.keys(settings).length, '个字段');
            return settings;
        } catch (error) {
            console.error('❌ [JSON] 加载设置失败:', error);
            const data = this.getAllData();
            return data?.settings || {};
        }
    }

    async updateSettings(updates) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持更新设置');
        }
        
        let apiBase;
        if (this.environment === 'vercel') {
            apiBase = this.getApiBaseURL();
        } else {
            apiBase = this.getLocalApiBaseURL();
        }
        
        try {
            // 先获取现有设置
            let currentSettings = {};
            try {
                const getResponse = await fetch(`${apiBase}/settings`);
                if (getResponse.ok) {
                    const result = await getResponse.json();
                    currentSettings = result.data || result || {};
                }
            } catch (error) {
                console.warn('⚠️ 无法获取当前设置:', error.message);
            }
            
            // 合并设置
            const mergedSettings = { ...currentSettings, ...updates };
            
            const response = await fetch(`${apiBase}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mergedSettings)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`✅ [${this.environment === 'vercel' ? 'Vercel' : '本地'}] 设置已更新`);
                if (this._jsonDataCache) this._jsonDataCache.settings = null;
                return result.data || result;
            } else {
                const errorText = await response.text();
                throw new Error(`设置更新失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 更新设置失败:', error);
            throw error;
        }
    }

    // 统计方法
    getStats() {
        // 🔥 在Vercel环境下，同步方法可能返回不完整数据
        const hostname = window.location.hostname;
        const isVercelEnv = hostname.includes('vercel.app') || 
                           hostname.includes('vercel.com') ||
                           hostname.includes('web3v.vip') || 
                           hostname.includes('slxhdjy.top');
        
        if (isVercelEnv) {
            console.warn('⚠️ Vercel环境下请使用 getStatsAsync() 异步方法');
        }
        
        const data = this.getAllData();
        
        // 如果数据为空，返回默认值
        if (!data || !data.articles) {
            return {
                totalArticles: 0,
                totalComments: 0,
                totalViews: 0,
                totalVisitors: 0,
                totalWords: 0,
                runningDays: 0
            };
        }
        
        // 计算总字数（所有已发布文章的字数总和）
        const calculatedTotalWords = data.articles
            .filter(a => a.status === 'published')
            .reduce((sum, article) => sum + (article.content?.length || 0), 0);
        
        // 计算总浏览量（所有文章的浏览量总和）
        const calculatedTotalViews = data.articles.reduce((sum, article) => sum + (article.views || 0), 0);
        
        // 计算运行天数
        const runningDays = Math.floor((Date.now() - new Date(data.settings?.startDate || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
        
        return {
            totalArticles: data.articles.filter(a => a.status === 'published').length,
            totalComments: data.comments?.length || 0,
            // 🔥 优先使用 settings 中的值
            totalViews: data.settings?.totalViews || calculatedTotalViews,
            totalVisitors: data.settings?.totalVisitors || 0,
            totalWords: data.settings?.totalWords || calculatedTotalWords,
            runningDays: runningDays
        };
    }
    
    // 🔥 异步获取统计数据 - 根据环境选择数据源
    async getStatsAsync() {
        console.log(`📊 getStatsAsync 调用，环境: ${this.environment}`);
        
        if (this.environment === 'vercel') {
            // Vercel环境 - 从API获取
            try {
                const apiBase = this.getApiBaseURL();
                const [articlesRes, commentsRes, settingsRes] = await Promise.all([
                    fetch(`${apiBase}/articles`),
                    fetch(`${apiBase}/comments`),
                    fetch(`${apiBase}/settings`)
                ]);
                
                let articles = [];
                let comments = [];
                let settings = {};
                
                if (articlesRes.ok) {
                    const result = await articlesRes.json();
                    articles = result.success && result.data ? result.data : (Array.isArray(result) ? result : []);
                }
                
                if (commentsRes.ok) {
                    const result = await commentsRes.json();
                    comments = result.success && result.data ? result.data : (Array.isArray(result) ? result : []);
                }
                
                if (settingsRes.ok) {
                    const result = await settingsRes.json();
                    settings = result.success && result.data ? result.data : (result || {});
                }
                
                const publishedArticles = articles.filter(a => a.status === 'published');
                const totalWords = publishedArticles.reduce((sum, article) => sum + (article.content?.length || 0), 0);
                const totalViews = articles.reduce((sum, article) => sum + (article.views || 0), 0);
                const runningDays = Math.floor((Date.now() - new Date(settings.startDate || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
                
                console.log('📊 [Vercel] 统计数据获取完成:', {
                    totalArticles: publishedArticles.length,
                    totalComments: comments.length,
                    totalViews: totalViews
                });
                
                return {
                    totalArticles: publishedArticles.length,
                    totalComments: comments.length,
                    totalViews: totalViews,
                    totalVisitors: settings.totalVisitors || 0,
                    totalWords: totalWords,
                    runningDays: runningDays
                };
            } catch (error) {
                console.error('❌ [Vercel] API获取统计失败:', error);
                return this.getStats();
            }
        } else {
            // 本地/GitHub Pages环境 - 从JSON文件获取
            try {
                console.log('📊 [本地] 开始从JSON文件获取统计数据...');
                console.log('📊 [本地] jsonBaseURL:', this.jsonBaseURL);
                
                const [articles, comments, settings] = await Promise.all([
                    this._getArticlesFromJSON(),
                    this._getCommentsFromJSON(),
                    this._getSettingsFromJSON()
                ]);
                
                console.log('📊 [本地] 原始数据:', {
                    articles: articles?.length || 0,
                    comments: comments?.length || 0,
                    settings: settings ? Object.keys(settings).length : 0,
                    settingsData: settings
                });
                
                const publishedArticles = (articles || []).filter(a => a.status === 'published');
                
                // 🔥 优先使用 settings 中的统计数据，如果没有则计算
                const calculatedTotalWords = publishedArticles.reduce((sum, article) => sum + (article.content?.length || 0), 0);
                const calculatedTotalViews = (articles || []).reduce((sum, article) => sum + (article.views || 0), 0);
                const runningDays = Math.floor((Date.now() - new Date(settings?.startDate || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
                
                const stats = {
                    totalArticles: publishedArticles.length,
                    totalComments: (comments || []).length,
                    // 🔥 优先使用 settings 中的值
                    totalViews: settings?.totalViews || calculatedTotalViews,
                    totalVisitors: settings?.totalVisitors || 0,
                    totalWords: settings?.totalWords || calculatedTotalWords,
                    runningDays: runningDays
                };
                
                console.log('📊 [本地] 统计数据获取完成:', stats);
                
                return stats;
            } catch (error) {
                console.error('❌ [本地] JSON获取统计失败:', error);
                console.error('❌ [本地] 错误详情:', error.message, error.stack);
                return this.getStats();
            }
        }
    }

    // 增加浏览量
    incrementViews(articleId = null) {
        const data = this.getAllData();
        data.settings.totalViews++;
        if (articleId) {
            const article = data.articles.find(a => a.id === parseInt(articleId));
            if (article) {
                article.views++;
            }
        }
        this.saveAllData(data);
    }

    // ========== 图片管理方法 ==========
    
    // 🔥 异步获取图片 - 根据环境选择数据源
    async getImages() {
        console.log(`🖼️ getImages 调用，环境: ${this.environment}`);
        
        switch (this.environment) {
            case 'vercel':
                return await this._getImagesFromAPI();
            case 'github-pages':
            case 'local':
            default:
                return await this._getImagesFromJSON();
        }
    }
    
    // 从API获取图片 (Vercel环境)
    async _getImagesFromAPI() {
        try {
            const apiBase = this.getApiBaseURL();
            console.log('📡 [Vercel] 从API获取图片列表');
            
            const response = await fetch(`${apiBase}/images`);
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const result = await response.json();
            let images = [];
            if (result.success && result.data) {
                images = result.data;
            } else if (Array.isArray(result)) {
                images = result;
            }
            
            console.log('✅ [Vercel] 图片获取成功:', images.length, '张');
            return images;
        } catch (error) {
            console.error('❌ [Vercel] API获取图片失败:', error);
            return [];
        }
    }
    
    // 从JSON文件获取图片 (本地/GitHub Pages环境)
    async _getImagesFromJSON() {
        try {
            if (this._jsonDataCache && this._jsonDataCache.images) {
                console.log('📋 [JSON] 使用缓存的图片数据');
                return this._jsonDataCache.images;
            }
            
            console.log('📁 [JSON] 从JSON文件获取图片');
            const response = await fetch(`${this.jsonBaseURL}/images.json`);
            if (!response.ok) {
                throw new Error(`JSON文件加载失败: ${response.status}`);
            }
            
            const images = await response.json();
            
            if (!this._jsonDataCache) this._jsonDataCache = {};
            this._jsonDataCache.images = images;
            
            console.log('✅ [JSON] 图片加载成功:', images.length, '张');
            return images;
        } catch (error) {
            console.error('❌ [JSON] 加载图片失败:', error);
            return [];
        }
    }

    async getImageById(id) {
        const images = await this.getImages();
        return images.find(img => img.id === parseInt(id) || String(img.id) === String(id));
    }

    async addImage(image) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持添加图片');
        }
        
        image.uploadDate = new Date().toISOString().split('T')[0];
        image.usedIn = image.usedIn || [];
        image.type = image.type || 'image';
        
        const result = await this._apiRequest('images', 'POST', null, image);
        if (this._jsonDataCache) this._jsonDataCache.images = null;
        return result;
    }

    async updateImage(id, updates) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持更新图片');
        }
        
        const result = await this._apiRequest('images', 'PUT', id, updates);
        if (this._jsonDataCache) this._jsonDataCache.images = null;
        return result;
    }

    async deleteImage(id) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持删除图片');
        }
        
        const result = await this._apiRequest('images', 'DELETE', id);
        if (this._jsonDataCache) this._jsonDataCache.images = null;
        return result;
    }

    // ========== 音乐管理方法 ==========
    
    // 同步获取音乐 (用于兼容旧代码)
    getMusic() {
        if (this._jsonDataCache && this._jsonDataCache.music) {
            return this._jsonDataCache.music;
        }
        const data = this.getAllData();
        return data?.music || [];
    }
    
    // 🔥 异步获取音乐 - 根据环境选择数据源
    async getMusicAsync() {
        console.log(`🎵 getMusicAsync 调用，环境: ${this.environment}`);
        
        switch (this.environment) {
            case 'vercel':
                return await this._getMusicFromAPI();
            case 'github-pages':
            case 'local':
            default:
                return await this._getMusicFromJSON();
        }
    }
    
    // 从API获取音乐 (Vercel环境)
    async _getMusicFromAPI() {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/music`);
            if (!response.ok) throw new Error(`API请求失败: ${response.status}`);
            
            const result = await response.json();
            let music = result.success && result.data ? result.data : (Array.isArray(result) ? result : []);
            console.log('✅ [Vercel] 音乐获取成功:', music.length, '首');
            return music;
        } catch (error) {
            console.error('❌ [Vercel] API获取音乐失败:', error);
            return [];
        }
    }
    
    // 从JSON文件获取音乐 (本地/GitHub Pages环境)
    async _getMusicFromJSON() {
        try {
            if (this._jsonDataCache && this._jsonDataCache.music) {
                return this._jsonDataCache.music;
            }
            
            const response = await fetch(`${this.jsonBaseURL}/music.json`);
            if (!response.ok) throw new Error(`JSON文件加载失败: ${response.status}`);
            
            const music = await response.json();
            if (!this._jsonDataCache) this._jsonDataCache = {};
            this._jsonDataCache.music = music;
            
            console.log('✅ [JSON] 音乐加载成功:', music.length, '首');
            return music;
        } catch (error) {
            console.error('❌ [JSON] 加载音乐失败:', error);
            return [];
        }
    }

    getMusicById(id) {
        const music = this.getMusic();
        return music.find(m => m.id === parseInt(id) || String(m.id) === String(id));
    }
    
    // 🔥 异步获取单个音乐
    async getMusicByIdAsync(id) {
        const music = await this.getMusicAsync();
        return music.find(m => m.id === parseInt(id) || String(m.id) === String(id));
    }

    async addMusic(music) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持添加音乐');
        }
        
        const musicData = { ...music, uploadDate: new Date().toISOString().split('T')[0] };
        const result = await this._apiRequest('music', 'POST', null, musicData);
        if (this._jsonDataCache) this._jsonDataCache.music = null;
        return result;
    }

    async updateMusic(id, updates) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持更新音乐');
        }
        
        const result = await this._apiRequest('music', 'PUT', id, updates);
        if (this._jsonDataCache) this._jsonDataCache.music = null;
        return result;
    }

    async deleteMusic(id) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持删除音乐');
        }
        
        const result = await this._apiRequest('music', 'DELETE', id);
        if (this._jsonDataCache) this._jsonDataCache.music = null;
        return result;
    }

    // ========== 视频管理方法 ==========
    
    // 同步获取视频 (用于兼容旧代码)
    getVideos() {
        if (this._jsonDataCache && this._jsonDataCache.videos) {
            return this._jsonDataCache.videos;
        }
        const data = this.getAllData();
        return data?.videos || [];
    }
    
    // 🔥 异步获取视频 - 根据环境选择数据源
    async getVideosAsync() {
        console.log(`🎬 getVideosAsync 调用，环境: ${this.environment}`);
        
        switch (this.environment) {
            case 'vercel':
                return await this._getVideosFromAPI();
            case 'github-pages':
            case 'local':
            default:
                return await this._getVideosFromJSON();
        }
    }
    
    // 从API获取视频 (Vercel环境)
    async _getVideosFromAPI() {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/videos`);
            if (!response.ok) throw new Error(`API请求失败: ${response.status}`);
            
            const result = await response.json();
            let videos = result.success && result.data ? result.data : (Array.isArray(result) ? result : []);
            console.log('✅ [Vercel] 视频获取成功:', videos.length, '个');
            return videos;
        } catch (error) {
            console.error('❌ [Vercel] API获取视频失败:', error);
            return [];
        }
    }
    
    // 从JSON文件获取视频 (本地/GitHub Pages环境)
    async _getVideosFromJSON() {
        try {
            if (this._jsonDataCache && this._jsonDataCache.videos) {
                return this._jsonDataCache.videos;
            }
            
            const response = await fetch(`${this.jsonBaseURL}/videos.json`);
            if (!response.ok) throw new Error(`JSON文件加载失败: ${response.status}`);
            
            const videos = await response.json();
            if (!this._jsonDataCache) this._jsonDataCache = {};
            this._jsonDataCache.videos = videos;
            
            console.log('✅ [JSON] 视频加载成功:', videos.length, '个');
            return videos;
        } catch (error) {
            console.error('❌ [JSON] 加载视频失败:', error);
            return [];
        }
    }

    getVideoById(id) {
        const videos = this.getVideos();
        return videos.find(v => v.id === parseInt(id) || String(v.id) === String(id));
    }
    
    // 🔥 异步获取单个视频
    async getVideoByIdAsync(id) {
        const videos = await this.getVideosAsync();
        return videos.find(v => v.id === parseInt(id) || String(v.id) === String(id));
    }

    async addVideo(video) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持添加视频');
        }
        
        const videoData = { ...video, uploadDate: new Date().toISOString().split('T')[0] };
        const result = await this._apiRequest('videos', 'POST', null, videoData);
        if (this._jsonDataCache) this._jsonDataCache.videos = null;
        return result;
    }

    async updateVideo(id, updates) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持更新视频');
        }
        
        const result = await this._apiRequest('videos', 'PUT', id, updates);
        if (this._jsonDataCache) this._jsonDataCache.videos = null;
        return result;
    }

    async deleteVideo(id) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持删除视频');
        }
        
        const result = await this._apiRequest('videos', 'DELETE', id);
        if (this._jsonDataCache) this._jsonDataCache.videos = null;
        return result;
    }

    // 兼容旧的 getMedia 方法
    async getMedia() {
        return await this.getImages();
    }

    getMediaById(id) {
        return this.getImageById(id);
    }

    addMedia(media) {
        return this.addImage(media);
    }

    deleteMedia(id) {
        return this.deleteImage(id);
    }

    // 上传图片（优先使用服务器上传，失败则使用 Base64）
    async uploadImage(file) {
        // 不限制文件大小
        console.log('上传图片大小:', (file.size / 1024 / 1024).toFixed(2) + 'MB');

        // 检查文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('只支持 JPG、PNG、GIF、WebP 格式');
        }

        // 尝试使用服务器上传
        if (window.fileUploader) {
            try {
                const serverAvailable = await window.fileUploader.checkServer();
                
                if (serverAvailable) {
                    console.log('使用服务器上传图片...');
                    const result = await window.fileUploader.uploadImage(file);
                    
                    if (result.success) {
                        const media = {
                            name: file.name,
                            url: result.url,
                            thumbnail: result.url,
                            size: result.size,
                            type: file.type,
                            uploadMethod: 'server'
                        };
                        const savedMedia = this.addMedia(media);
                        console.log('图片已上传到服务器:', result.url);
                        return savedMedia;
                    }
                }
            } catch (error) {
                console.warn('服务器上传失败，使用 Base64 备用方案:', error);
            }
        }

        // 备用方案：使用 Base64
        console.log('使用 Base64 存储图片...');
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const media = {
                    name: file.name,
                    url: e.target.result,
                    thumbnail: e.target.result,
                    size: file.size,
                    type: file.type,
                    uploadMethod: 'base64'
                };
                const savedMedia = this.addMedia(media);
                console.log('图片已转换为 Base64');
                resolve(savedMedia);
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    // 上传飞书文档图片（专用文件夹）
    async uploadFeishuImage(file, articleId) {
        // 不限制文件大小
        console.log('上传飞书图片大小:', (file.size / 1024 / 1024).toFixed(2) + 'MB');

        // 检查文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('只支持 JPG、PNG、GIF、WebP 格式');
        }

        // 使用服务器上传到文档专用文件夹
        if (window.fileUploader) {
            try {
                const serverAvailable = await window.fileUploader.checkServer();
                
                if (serverAvailable) {
                    console.log(`上传飞书图片到文档文件夹: ${articleId}`);
                    const result = await window.fileUploader.uploadFeishuImage(file, articleId);
                    
                    if (result.success) {
                        console.log('飞书图片已上传:', result.url);
                        return {
                            url: result.url,
                            filename: result.filename
                        };
                    }
                }
            } catch (error) {
                console.error('服务器上传失败:', error);
                throw error;
            }
        }

        throw new Error('上传服务器不可用');
    }

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // ========== 友情链接管理方法 ==========
    
    // 同步获取友情链接 (用于兼容旧代码)
    getLinks() {
        if (this._jsonDataCache && this._jsonDataCache.links) {
            return this._jsonDataCache.links;
        }
        const data = this.getAllData();
        return data?.links || [];
    }
    
    // 🔥 异步获取友情链接 - 根据环境选择数据源
    async getLinksAsync() {
        console.log(`🔗 getLinksAsync 调用，环境: ${this.environment}`);
        
        switch (this.environment) {
            case 'vercel':
                return await this._getLinksFromAPI();
            case 'github-pages':
            case 'local':
            default:
                return await this._getLinksFromJSON();
        }
    }
    
    // 从API获取友情链接 (Vercel环境)
    async _getLinksFromAPI() {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/links`);
            if (!response.ok) throw new Error(`API请求失败: ${response.status}`);
            
            const result = await response.json();
            let links = result.success && result.data ? result.data : (Array.isArray(result) ? result : []);
            console.log('✅ [Vercel] 友情链接获取成功:', links.length, '个');
            return links;
        } catch (error) {
            console.error('❌ [Vercel] API获取友情链接失败:', error);
            return [];
        }
    }
    
    // 从JSON文件获取友情链接 (本地/GitHub Pages环境)
    async _getLinksFromJSON() {
        try {
            if (this._jsonDataCache && this._jsonDataCache.links) {
                return this._jsonDataCache.links;
            }
            
            const response = await fetch(`${this.jsonBaseURL}/links.json`);
            if (!response.ok) throw new Error(`JSON文件加载失败: ${response.status}`);
            
            const links = await response.json();
            if (!this._jsonDataCache) this._jsonDataCache = {};
            this._jsonDataCache.links = links;
            
            console.log('✅ [JSON] 友情链接加载成功:', links.length, '个');
            return links;
        } catch (error) {
            console.error('❌ [JSON] 加载友情链接失败:', error);
            return [];
        }
    }

    // 根据ID获取友情链接
    getLinkById(id) {
        const links = this.getLinks();
        return links.find(link => link.id === id || String(link.id) === String(id));
    }
    
    // 🔥 异步获取单个友情链接
    async getLinkByIdAsync(id) {
        const links = await this.getLinksAsync();
        return links.find(link => link.id === id || String(link.id) === String(id));
    }

    // 添加友情链接
    async addLink(link) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持添加友情链接');
        }
        
        const linkData = {
            name: link.name || '未命名',
            url: link.url || '',
            description: link.description || '',
            avatar: link.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(link.name || 'Link') + '&size=200&background=4fc3f7&color=fff&bold=true',
            category: link.category || '默认',
            status: link.status || 'active',
            addedDate: new Date().toISOString().split('T')[0]
        };
        
        const result = await this._apiRequest('links', 'POST', null, linkData);
        if (this._jsonDataCache) this._jsonDataCache.links = null;
        return result;
    }

    // 更新友情链接
    async updateLink(id, updates) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持更新友情链接');
        }
        
        const result = await this._apiRequest('links', 'PUT', id, updates);
        if (this._jsonDataCache) this._jsonDataCache.links = null;
        return result;
    }

    // 删除友情链接
    async deleteLink(id) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持删除友情链接');
        }
        
        const result = await this._apiRequest('links', 'DELETE', id);
        if (this._jsonDataCache) this._jsonDataCache.links = null;
        return result;
    }

    // 获取友情链接分类
    getLinkCategories() {
        const links = this.getLinks();
        const categories = [...new Set(links.map(link => link.category))];
        return categories.length > 0 ? categories : ['默认'];
    }

    // 按分类获取友情链接
    getLinksByCategory(category) {
        const links = this.getLinks();
        return links.filter(link => link.category === category && link.status === 'active');
    }

    // 获取活跃的友情链接
    getActiveLinks() {
        const links = this.getLinks();
        return links.filter(link => link.status === 'active');
    }

    // ========== 用户管理方法 ==========
    
    // 同步获取用户 (用于兼容旧代码)
    getUsers() {
        if (this._jsonDataCache && this._jsonDataCache.users) {
            return this._jsonDataCache.users;
        }
        const data = this.getAllData();
        return data?.users || [];
    }
    
    // 🔥 异步获取用户列表 - 根据环境选择数据源
    async getUsersAsync() {
        console.log(`👥 getUsersAsync 调用，环境: ${this.environment}`);
        
        switch (this.environment) {
            case 'vercel':
                return await this._getUsersFromAPI();
            case 'github-pages':
            case 'local':
            default:
                return await this._getUsersFromJSON();
        }
    }
    
    // 从API获取用户 (Vercel环境)
    async _getUsersFromAPI() {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/users`);
            if (!response.ok) throw new Error(`API请求失败: ${response.status}`);
            
            const result = await response.json();
            let users = result.success && result.data ? result.data : (Array.isArray(result) ? result : []);
            console.log('✅ [Vercel] 用户获取成功:', users.length, '个');
            return users;
        } catch (error) {
            console.error('❌ [Vercel] API获取用户失败:', error);
            return [];
        }
    }
    
    // 从JSON文件获取用户 (本地/GitHub Pages环境)
    async _getUsersFromJSON() {
        try {
            if (this._jsonDataCache && this._jsonDataCache.users) {
                return this._jsonDataCache.users;
            }
            
            const response = await fetch(`${this.jsonBaseURL}/users.json`);
            if (!response.ok) throw new Error(`JSON文件加载失败: ${response.status}`);
            
            const users = await response.json();
            if (!this._jsonDataCache) this._jsonDataCache = {};
            this._jsonDataCache.users = users;
            
            console.log('✅ [JSON] 用户加载成功:', users.length, '个');
            return users;
        } catch (error) {
            console.error('❌ [JSON] 加载用户失败:', error);
            return [];
        }
    }

    // 根据ID获取用户
    getUserById(id) {
        const users = this.getUsers();
        return users.find(user => user.id === id || String(user.id) === String(id));
    }

    // 根据用户名获取用户
    getUserByUsername(username) {
        const users = this.getUsers();
        return users.find(user => user.username === username);
    }

    // 添加用户
    async addUser(userData) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持添加用户');
        }
        
        const result = await this._apiRequest('users', 'POST', null, userData);
        if (this._jsonDataCache) this._jsonDataCache.users = null;
        return result;
    }

    // 更新用户
    async updateUser(id, updates) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持更新用户');
        }
        
        const result = await this._apiRequest('users', 'PUT', id, updates);
        if (this._jsonDataCache) this._jsonDataCache.users = null;
        return result;
    }

    // 删除用户
    async deleteUser(id) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持删除用户');
        }
        
        const result = await this._apiRequest('users', 'DELETE', id);
        if (this._jsonDataCache) this._jsonDataCache.users = null;
        return result;
    }

    // 应用相关方法
    getApps() {
        if (this._jsonDataCache && this._jsonDataCache.apps) {
            return this._jsonDataCache.apps;
        }
        const data = this.getAllData();
        return data?.apps || [];
    }
    
    // 🔥 异步获取应用 - 根据环境选择数据源
    async getAppsAsync() {
        console.log(`📱 getAppsAsync 调用，环境: ${this.environment}`);
        
        switch (this.environment) {
            case 'vercel':
                return await this._getAppsFromAPI();
            case 'github-pages':
            case 'local':
            default:
                return await this._getAppsFromJSON();
        }
    }
    
    // 从API获取应用 (Vercel环境)
    async _getAppsFromAPI() {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/apps`);
            if (!response.ok) throw new Error(`API请求失败: ${response.status}`);
            
            const result = await response.json();
            let apps = result.success && result.data ? result.data : (Array.isArray(result) ? result : []);
            console.log('✅ [Vercel] 应用获取成功:', apps.length, '个');
            return apps;
        } catch (error) {
            console.error('❌ [Vercel] API获取应用失败:', error);
            return [];
        }
    }
    
    // 从JSON文件获取应用 (本地/GitHub Pages环境)
    async _getAppsFromJSON() {
        try {
            if (this._jsonDataCache && this._jsonDataCache.apps) {
                return this._jsonDataCache.apps;
            }
            
            const response = await fetch(`${this.jsonBaseURL}/apps.json`);
            if (!response.ok) throw new Error(`JSON文件加载失败: ${response.status}`);
            
            const apps = await response.json();
            if (!this._jsonDataCache) this._jsonDataCache = {};
            this._jsonDataCache.apps = apps;
            
            console.log('✅ [JSON] 应用加载成功:', apps.length, '个');
            return apps;
        } catch (error) {
            console.error('❌ [JSON] 加载应用失败:', error);
            return [];
        }
    }

    async addApp(app) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持添加应用');
        }
        
        const appData = {
            ...app,
            createdAt: new Date().toISOString(),
            status: app.status || 'enabled',
            order: app.order || 0
        };
        
        const result = await this._apiRequest('apps', 'POST', null, appData);
        if (this._jsonDataCache) this._jsonDataCache.apps = null;
        return result;
    }

    async updateApp(id, updates) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持更新应用');
        }
        
        const result = await this._apiRequest('apps', 'PUT', id, updates);
        if (this._jsonDataCache) this._jsonDataCache.apps = null;
        return result;
    }

    async deleteApp(id) {
        if (this.environment === 'github-pages') {
            throw new Error('GitHub Pages环境不支持删除应用');
        }
        
        const result = await this._apiRequest('apps', 'DELETE', id);
        if (this._jsonDataCache) this._jsonDataCache.apps = null;
        return result;
    }
}

// 创建全局实例
window.blogDataStore = new BlogDataStore();
