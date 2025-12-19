// 博客数据存储管理
class BlogDataStore {
    constructor() {
        this.useJSONFiles = true; // 默认使用 JSON 文件
        this.jsonBaseURL = '../data'; // JSON 文件目录
        this.dataLoaded = false; // 数据是否已加载
        this.initializeData();
    }

    // 获取API基础URL
    getApiBaseURL() {
        // 优先使用环境适配器（确保已初始化）
        if (window.environmentAdapter && window.environmentAdapter.initialized && window.environmentAdapter.apiBase) {
            return window.environmentAdapter.apiBase;
        }
        
        // 根据当前环境动态判断
        const hostname = window.location.hostname;
        if (hostname.includes('vercel.app') || 
            hostname.includes('vercel.com') ||
            hostname.includes('web3v.vip')) {
            return '/api'; // Vercel环境
        } else if (hostname.includes('slxhdjy.top')) {
            return 'https://www.slxhdjy.top/api'; // 特定域名使用完整URL
        } else if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
            return 'http://localhost:3001/api'; // 本地环境
        } else {
            return '/api'; // 默认使用相对路径
        }
    }

    // 初始化数据
    initializeData() {
        // 检查用户配置
        const userConfig = localStorage.getItem('use_json_mode');
        if (userConfig === 'false') {
            this.useJSONFiles = false;
            console.log('💾 使用 localStorage 存储');
        } else {
            this.useJSONFiles = true;
            console.log('📁 使用 JSON 文件存储');
        }
        
        if (!localStorage.getItem('blogData')) {
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
        
        for (const resource of resources) {
            try {
                const response = await fetch(`${this.jsonBaseURL}/${resource}.json`);
                if (response.ok) {
                    data[resource] = await response.json();
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
        
        // 保存到 localStorage 作为缓存
        localStorage.setItem('blogData', JSON.stringify(data));
        this.dataLoaded = true;
        
        console.log('✅ 数据加载完成');
        return data;
    }
    
    // 获取所有数据
    getAllData() {
        return JSON.parse(localStorage.getItem('blogData'));
    }
    
    // 🔥 异步获取所有数据（优先从 JSON 文件）
    async getAllDataAsync() {
        if (this.useJSONFiles && !this.dataLoaded) {
            return await this.loadDataFromJSON();
        }
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

    // 文章相关方法
    getArticles(status = null) {
        const data = this.getAllData();
        if (status) {
            return data.articles.filter(article => article.status === status);
        }
        return data.articles;
    }

    getArticleById(id) {
        const data = this.getAllData();
        return data.articles.find(article => article.id === parseInt(id));
    }
    
    // 🔥 异步获取文章（优先从 JSON 文件）
    async getArticleByIdAsync(id) {
        const data = await this.getAllDataAsync();
        return data.articles.find(article => article.id === parseInt(id));
    }

    async addArticle(article) {
        try {
            const apiBase = this.getApiBaseURL();
            const articleData = {
                ...article,
                views: 0,
                publishDate: article.publishDate || new Date().toISOString().split('T')[0],
                likes: article.likes || 0
            };
            
            const response = await fetch(`${apiBase}/articles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(articleData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 文章已保存到KV数据库:', result.data.id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API保存失败:', response.status, errorText);
                throw new Error(`文章创建失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 添加文章失败:', error);
            throw error;
        }
    }

    async updateArticle(id, updates) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/articles?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 文章已更新到KV数据库:', id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API更新失败:', response.status, errorText);
                throw new Error(`文章更新失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 更新文章失败:', error);
            throw error;
        }
    }

    async deleteArticle(id) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/articles?id=${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log('✅ 文章已从KV数据库删除:', id);
                return { success: true };
            } else {
                const errorText = await response.text();
                console.error('❌ API删除失败:', response.status, errorText);
                throw new Error(`文章删除失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 删除文章失败:', error);
            throw error;
        }
    }

    // 分类相关方法
    getCategories() {
        const data = this.getAllData();
        // 同步分类统计
        this.syncCategoryStats();
        return data.categories;
    }
    
    // 🔥 异步获取分类（优先从 JSON 文件）
    async getCategoriesAsync() {
        const data = await this.getAllDataAsync();
        return data.categories || [];
    }
    
    // 同步分类统计（独立调用版本）
    syncCategoryStats() {
        const data = this.getAllData();
        this.syncCategoryStatsWithData(data);
        this.saveAllData(data);
    }
    
    // 同步分类统计（传入data对象，不保存）
    syncCategoryStatsWithData(data) {
        const articles = data.articles;
        
        // 统计每个分类的文章数
        const categoryCounts = {};
        articles.forEach(article => {
            const category = article.category || '未分类';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        
        // 更新现有分类的计数
        data.categories.forEach(cat => {
            cat.count = categoryCounts[cat.name] || 0;
        });
        
        // 添加新出现的分类
        Object.keys(categoryCounts).forEach(categoryName => {
            const exists = data.categories.find(cat => cat.name === categoryName);
            if (!exists) {
                const newCategory = {
                    id: Math.max(...data.categories.map(c => c.id), 0) + 1,
                    name: categoryName,
                    description: '',
                    count: categoryCounts[categoryName]
                };
                data.categories.push(newCategory);
            }
        });
    }

    async addCategory(category) {
        try {
            const apiBase = this.getApiBaseURL();
            const categoryData = {
                ...category,
                count: 0
            };
            
            const response = await fetch(`${apiBase}/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 分类已保存到KV数据库:', result.data.id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API保存失败:', response.status, errorText);
                throw new Error(`分类创建失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 添加分类失败:', error);
            throw error;
        }
    }

    async updateCategory(id, updates) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/categories?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 分类已更新到KV数据库:', id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API更新失败:', response.status, errorText);
                throw new Error(`分类更新失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 更新分类失败:', error);
            throw error;
        }
    }

    async deleteCategory(id) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/categories?id=${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log('✅ 分类已从KV数据库删除:', id);
                return { success: true };
            } else {
                const errorText = await response.text();
                console.error('❌ API删除失败:', response.status, errorText);
                throw new Error(`分类删除失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 删除分类失败:', error);
            throw error;
        }
    }

    // 标签相关方法
    getTags() {
        const data = this.getAllData();
        // 同步标签统计
        this.syncTagStats();
        return data.tags;
    }
    
    // 🔥 异步获取标签（优先从 JSON 文件）
    async getTagsAsync() {
        const data = await this.getAllDataAsync();
        return data.tags || [];
    }
    
    // 同步标签统计（独立调用版本）
    syncTagStats() {
        const data = this.getAllData();
        this.syncTagStatsWithData(data);
        this.saveAllData(data);
    }
    
    // 同步标签统计（传入data对象，不保存）
    syncTagStatsWithData(data) {
        const articles = data.articles;
        
        // 统计每个标签的文章数
        const tagCounts = {};
        articles.forEach(article => {
            if (article.tags && Array.isArray(article.tags)) {
                article.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });
        
        // 更新现有标签的计数
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
        try {
            const apiBase = this.getApiBaseURL();
            const tagData = {
                ...tag,
                count: 0
            };
            
            const response = await fetch(`${apiBase}/tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tagData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 标签已保存到KV数据库:', result.data.id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API保存失败:', response.status, errorText);
                throw new Error(`标签创建失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 添加标签失败:', error);
            throw error;
        }
    }

    async updateTag(id, updates) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/tags?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 标签已更新到KV数据库:', id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API更新失败:', response.status, errorText);
                throw new Error(`标签更新失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 更新标签失败:', error);
            throw error;
        }
    }

    async deleteTag(id) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/tags?id=${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log('✅ 标签已从KV数据库删除:', id);
                return { success: true };
            } else {
                const errorText = await response.text();
                console.error('❌ API删除失败:', response.status, errorText);
                throw new Error(`标签删除失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 删除标签失败:', error);
            throw error;
        }
    }

    // 评论相关方法
    getComments(status = null) {
        const data = this.getAllData();
        if (status) {
            return data.comments.filter(comment => comment.status === status);
        }
        return data.comments;
    }

    async addComment(comment) {
        try {
            const apiBase = this.getApiBaseURL();
            const commentData = {
                ...comment,
                time: new Date().toISOString(),
                status: 'pending' // 默认待审核
            };
            
            const response = await fetch(`${apiBase}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commentData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 评论已保存到KV数据库:', result.data.id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API保存失败:', response.status, errorText);
                throw new Error(`评论创建失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 添加评论失败:', error);
            throw error;
        }
    }

    async updateComment(id, updates) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/comments?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 评论已更新到KV数据库:', id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API更新失败:', response.status, errorText);
                throw new Error(`评论更新失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 更新评论失败:', error);
            throw error;
        }
    }

    async deleteComment(id) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/comments?id=${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log('✅ 评论已从KV数据库删除:', id);
                return { success: true };
            } else {
                const errorText = await response.text();
                console.error('❌ API删除失败:', response.status, errorText);
                throw new Error(`评论删除失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 删除评论失败:', error);
            throw error;
        }
    }

    // 留言相关方法
    getGuestbookMessages() {
        const data = this.getAllData();
        return data.guestbook || [];
    }
    
    // 🔥 异步获取留言（优先从 API）
    async getGuestbookMessagesAsync() {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/guestbook`);
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 从API获取留言数据:', result.data?.length || 0, '条');
                return result.data || [];
            } else {
                console.warn('⚠️ API获取留言失败，使用缓存数据');
                return this.getGuestbookMessages();
            }
        } catch (error) {
            console.warn('⚠️ API获取留言失败，使用缓存数据:', error.message);
            return this.getGuestbookMessages();
        }
    }
    
    async addGuestbookMessage(message) {
        try {
            const apiBase = this.getApiBaseURL();
            const timestamp = new Date().toISOString();
            const messageData = {
                ...message,
                time: timestamp,
                createdAt: timestamp,
                likes: 0,
                pinned: false
            };
            
            const response = await fetch(`${apiBase}/guestbook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messageData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 留言已保存到KV数据库:', result.data.id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API保存失败:', response.status, errorText);
                throw new Error(`留言创建失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 添加留言失败:', error);
            throw error;
        }
    }
    
    async updateGuestbookMessage(id, updates) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/guestbook?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 留言已更新到KV数据库:', id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API更新失败:', response.status, errorText);
                throw new Error(`留言更新失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 更新留言失败:', error);
            throw error;
        }
    }
    
    async deleteGuestbookMessage(id) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/guestbook?id=${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log('✅ 留言已从KV数据库删除:', id);
                return { success: true };
            } else {
                const errorText = await response.text();
                console.error('❌ API删除失败:', response.status, errorText);
                throw new Error(`留言删除失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 删除留言失败:', error);
            throw error;
        }
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

    // 设置相关方法
    async getSettings() {
        if (this.useApi) {
            try {
                const response = await fetch(`${this.apiUrl}/settings`);
                if (!response.ok) throw new Error('获取设置失败');
                return await response.json();
            } catch (error) {
                console.error('API获取设置失败，使用localStorage:', error);
                const data = this.getAllData();
                return data.settings;
            }
        }
        const data = this.getAllData();
        return data.settings;
    }

    async updateSettings(updates) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 设置已更新到KV数据库');
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API更新失败:', response.status, errorText);
                throw new Error(`设置更新失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 更新设置失败:', error);
            throw error;
        }
    }

    // 统计方法
    getStats() {
        const data = this.getAllData();
        
        // 计算总字数（所有已发布文章的字数总和）
        const totalWords = data.articles
            .filter(a => a.status === 'published')
            .reduce((sum, article) => sum + (article.content?.length || 0), 0);
        
        // 计算总浏览量（所有文章的浏览量总和）
        const totalViews = data.articles.reduce((sum, article) => sum + (article.views || 0), 0);
        
        // 计算运行天数
        const runningDays = Math.floor((Date.now() - new Date(data.settings.startDate).getTime()) / (1000 * 60 * 60 * 24));
        
        // 更新设置中的统计数据
        data.settings.totalWords = totalWords;
        data.settings.totalViews = totalViews;
        this.saveAllData(data);
        
        return {
            totalArticles: data.articles.filter(a => a.status === 'published').length,
            totalComments: data.comments.length,
            totalViews: totalViews,
            totalVisitors: data.settings.totalVisitors,
            totalWords: totalWords,
            runningDays: runningDays
        };
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

    // 图片管理方法
    async getImages() {
        // 优先从 data-adapter 读取（JSON文件）
        if (window.dataAdapter) {
            try {
                const images = await window.dataAdapter.getImages();
                // 同时更新localStorage作为缓存
                localStorage.setItem('blog_media', JSON.stringify(images));
                return images;
            } catch (error) {
                console.warn('⚠️ 从JSON读取失败，使用localStorage:', error.message);
            }
        }
        
        // 回退到localStorage
        try {
            const mediaData = JSON.parse(localStorage.getItem('blog_media') || '[]');
            return mediaData.filter(item => item.type === 'image' || item.type?.startsWith('image/'));
        } catch (error) {
            console.error('读取图片数据失败:', error);
            return [];
        }
    }

    async getImageById(id) {
        const images = await this.getImages();
        return images.find(img => img.id === parseInt(id));
    }

    async addImage(image) {
        try {
            // 准备图片数据
            image.uploadDate = new Date().toISOString().split('T')[0];
            image.usedIn = image.usedIn || [];
            image.type = image.type || 'image';
            
            // 尝试通过API保存到JSON文件
            try {
                const apiBase = this.getApiBaseURL();
                const response = await fetch(`${apiBase}/images`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(image)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ 图片记录已保存到 images.json:', result.data.id);
                    
                    // 同时保存到localStorage作为备份
                    const mediaData = JSON.parse(localStorage.getItem('blog_media') || '[]');
                    mediaData.unshift(result.data);
                    localStorage.setItem('blog_media', JSON.stringify(mediaData));
                    
                    return result.data;
                } else {
                    throw new Error('API保存失败');
                }
            } catch (apiError) {
                console.warn('⚠️ API保存失败，使用localStorage:', apiError.message);
                
                // 回退到localStorage
                const mediaData = JSON.parse(localStorage.getItem('blog_media') || '[]');
                image.id = Math.max(...mediaData.map(m => m.id || 0), 0) + 1;
                mediaData.unshift(image);
                localStorage.setItem('blog_media', JSON.stringify(mediaData));
                return image;
            }
        } catch (error) {
            console.error('❌ 添加图片失败:', error);
            return null;
        }
    }

    async updateImage(id, updates) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/images?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 图片已更新到KV数据库:', id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API更新失败:', response.status, errorText);
                throw new Error(`图片更新失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 更新图片失败:', error);
            throw error;
        }
    }

    async deleteImage(id) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/images?id=${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log('✅ 图片已从KV数据库删除:', id);
                return { success: true };
            } else {
                const errorText = await response.text();
                console.error('❌ API删除失败:', response.status, errorText);
                throw new Error(`图片删除失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 删除图片失败:', error);
            throw error;
        }
    }

    // 音乐管理方法
    getMusic() {
        const data = this.getAllData();
        return data.music || [];
    }

    getMusicById(id) {
        const data = this.getAllData();
        return data.music?.find(m => m.id === parseInt(id));
    }

    async addMusic(music) {
        try {
            const apiBase = this.getApiBaseURL();
            const musicData = {
                ...music,
                uploadDate: new Date().toISOString().split('T')[0]
            };
            
            const response = await fetch(`${apiBase}/music`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(musicData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 音乐已保存到KV数据库:', result.data.id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API保存失败:', response.status, errorText);
                throw new Error(`音乐创建失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 添加音乐失败:', error);
            throw error;
        }
    }

    async updateMusic(id, updates) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/music?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 音乐已更新到KV数据库:', id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API更新失败:', response.status, errorText);
                throw new Error(`音乐更新失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 更新音乐失败:', error);
            throw error;
        }
    }

    async deleteMusic(id) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/music?id=${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log('✅ 音乐已从KV数据库删除:', id);
                return { success: true };
            } else {
                const errorText = await response.text();
                console.error('❌ API删除失败:', response.status, errorText);
                throw new Error(`音乐删除失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 删除音乐失败:', error);
            throw error;
        }
    }

    // 视频管理方法
    getVideos() {
        const data = this.getAllData();
        return data.videos || [];
    }

    getVideoById(id) {
        const data = this.getAllData();
        return data.videos?.find(v => v.id === parseInt(id));
    }

    async addVideo(video) {
        try {
            const apiBase = this.getApiBaseURL();
            const videoData = {
                ...video,
                uploadDate: new Date().toISOString().split('T')[0]
            };
            
            const response = await fetch(`${apiBase}/videos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(videoData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 视频已保存到KV数据库:', result.data.id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API保存失败:', response.status, errorText);
                throw new Error(`视频创建失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 添加视频失败:', error);
            throw error;
        }
    }

    async updateVideo(id, updates) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/videos?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 视频已更新到KV数据库:', id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API更新失败:', response.status, errorText);
                throw new Error(`视频更新失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 更新视频失败:', error);
            throw error;
        }
    }

    async deleteVideo(id) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/videos?id=${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log('✅ 视频已从KV数据库删除:', id);
                return { success: true };
            } else {
                const errorText = await response.text();
                console.error('❌ API删除失败:', response.status, errorText);
                throw new Error(`视频删除失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 删除视频失败:', error);
            throw error;
        }
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
    
    // 获取所有友情链接
    getLinks() {
        const data = this.getAllData();
        return data.links || [];
    }

    // 根据ID获取友情链接
    getLinkById(id) {
        const links = this.getLinks();
        return links.find(link => link.id === id);
    }

    // 添加友情链接
    async addLink(link) {
        try {
            const apiBase = this.getApiBaseURL();
            const linkData = {
                name: link.name || '未命名',
                url: link.url || '',
                description: link.description || '',
                avatar: link.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(link.name || 'Link') + '&size=200&background=4fc3f7&color=fff&bold=true',
                category: link.category || '默认',
                status: link.status || 'active',
                addedDate: new Date().toISOString().split('T')[0]
            };
            
            const response = await fetch(`${apiBase}/links`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(linkData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 友情链接已保存到KV数据库:', result.data.id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API保存失败:', response.status, errorText);
                throw new Error(`友情链接创建失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 添加友情链接失败:', error);
            throw error;
        }
    }

    // 更新友情链接
    async updateLink(id, updates) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/links?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 友情链接已更新到KV数据库:', id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API更新失败:', response.status, errorText);
                throw new Error(`友情链接更新失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 更新友情链接失败:', error);
            throw error;
        }
    }

    // 删除友情链接
    async deleteLink(id) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/links?id=${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log('✅ 友情链接已从KV数据库删除:', id);
                return { success: true };
            } else {
                const errorText = await response.text();
                console.error('❌ API删除失败:', response.status, errorText);
                throw new Error(`友情链接删除失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 删除友情链接失败:', error);
            throw error;
        }
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
    
    // 获取所有用户
    getUsers() {
        const data = this.getAllData();
        return data.users || [];
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
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 用户已保存到KV数据库:', result.data.id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API保存失败:', response.status, errorText);
                throw new Error(`用户创建失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 添加用户失败:', error);
            throw error;
        }
    }

    // 更新用户
    async updateUser(id, updates) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/users?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 用户已更新到KV数据库:', id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API更新失败:', response.status, errorText);
                throw new Error(`用户更新失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 更新用户失败:', error);
            throw error;
        }
    }

    // 删除用户
    async deleteUser(id) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/users?id=${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log('✅ 用户已从KV数据库删除:', id);
                return { success: true };
            } else {
                const errorText = await response.text();
                console.error('❌ API删除失败:', response.status, errorText);
                throw new Error(`用户删除失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 删除用户失败:', error);
            throw error;
        }
    }

    // 应用相关方法
    getApps() {
        const data = this.getAllData();
        return data.apps || [];
    }
    
    // 🔥 异步获取应用（优先从 API）
    async getAppsAsync() {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/apps`);
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 从API获取应用数据:', result.data?.length || 0, '个');
                return result.data || [];
            } else {
                console.warn('⚠️ API获取应用失败，使用缓存数据');
                return this.getApps();
            }
        } catch (error) {
            console.warn('⚠️ API获取应用失败，使用缓存数据:', error.message);
            return this.getApps();
        }
    }

    async addApp(app) {
        try {
            const apiBase = this.getApiBaseURL();
            const appData = {
                ...app,
                createdAt: new Date().toISOString(),
                status: app.status || 'enabled',
                order: app.order || 0
            };
            
            const response = await fetch(`${apiBase}/apps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 应用已保存到KV数据库:', result.data.id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API保存失败:', response.status, errorText);
                throw new Error(`应用创建失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 添加应用失败:', error);
            throw error;
        }
    }

    async updateApp(id, updates) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/apps?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 应用已更新到KV数据库:', id);
                return result.data;
            } else {
                const errorText = await response.text();
                console.error('❌ API更新失败:', response.status, errorText);
                throw new Error(`应用更新失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 更新应用失败:', error);
            throw error;
        }
    }

    async deleteApp(id) {
        try {
            const apiBase = this.getApiBaseURL();
            const response = await fetch(`${apiBase}/apps?id=${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log('✅ 应用已从KV数据库删除:', id);
                return { success: true };
            } else {
                const errorText = await response.text();
                console.error('❌ API删除失败:', response.status, errorText);
                throw new Error(`应用删除失败: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ 删除应用失败:', error);
            throw error;
        }
    }
}

// 创建全局实例
window.blogDataStore = new BlogDataStore();
