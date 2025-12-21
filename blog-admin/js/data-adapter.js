/* ========================================
   数据适配层 - 统一localStorage和API调用
   让现有代码无缝切换到JSON文件存储
   ======================================== */

class DataAdapter {
    constructor() {
        // 动态获取API基础URL
        this.apiBaseURL = this.getApiBaseURL();
        
        // 🔥 智能检测 JSON 文件路径
        // 如果当前页面在 blog-admin/pages/ 下，使用 ../../data
        // 如果在 blog-admin/ 下，使用 ../data
        // 否则使用绝对路径 /data
        const currentPath = window.location.pathname;
        if (currentPath.includes('/blog-admin/pages/')) {
            this.jsonBaseURL = '../../data';
            console.log('📍 检测到在 pages/ 目录，使用路径: ../../data');
        } else if (currentPath.includes('/blog-admin/')) {
            this.jsonBaseURL = '../data';
            console.log('📍 检测到在 blog-admin/ 目录，使用路径: ../data');
        } else {
            this.jsonBaseURL = '/data';
            console.log('📍 使用绝对路径: /data');
        }
        
        this.fallbackToLocalStorage = true; // 失败时回退到localStorage
        this.apiChecked = false;
        this.apiAvailable = false;
        
        // 检查用户配置和环境
        const userConfig = localStorage.getItem('use_json_mode');
        
        // 检查环境和用户配置
        const hostname = window.location.hostname;
        const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
        
        if (window.environmentAdapter && window.environmentAdapter.initialized && window.environmentAdapter.environment === 'vercel' && !isLocalhost) {
            // 只有在真正的Vercel环境下且适配器已初始化才使用环境适配器
            this.useJSON = false;
            this.useEnvironmentAdapter = true;
            console.log('🌐 Vercel环境：使用环境适配器');
        } else if (userConfig === 'false') {
            this.useJSON = false;
            this.useEnvironmentAdapter = false;
            console.log('💾 用户设置：使用localStorage存储');
        } else {
            this.useJSON = true;
            this.useEnvironmentAdapter = false;
            console.log('📁 使用JSON文件存储（直接读取模式）');
        }
        
        console.log(`数据适配层初始化 - 当前模式: ${this.useJSON ? 'JSON文件' : 'localStorage'}`);
        console.log(`📁 JSON文件路径: ${this.jsonBaseURL}`);
        console.log(`🌐 API基础URL: ${this.apiBaseURL}`);
        console.log('💡 提示：数据从 data/ 文件夹读取，保存需要API服务器');
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
            hostname.includes('web3v.vip') || 
            hostname.includes('slxhdjy.top')) {
            return '/api'; // Vercel环境
        } else if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
            return 'http://localhost:3001/api'; // 本地环境
        } else {
            return '/api'; // 默认使用相对路径
        }
    }

    // ========== 核心方法 ==========

    // 通用资源创建方法
    async createResourceItem(resource, itemData) {
        // 在Vercel环境下，只使用环境适配器，不回退
        if (this.useEnvironmentAdapter && window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
            console.log(`🌐 Vercel环境：使用环境适配器创建${resource}`);
            const result = await window.environmentAdapter.createItem(resource, itemData);
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.message || `创建${resource}失败`);
            }
        }
        
        // 非Vercel环境的处理
        try {
            const result = await this.createItem(resource, itemData);
            return result.success ? result.data : null;
        } catch (error) {
            console.warn(`API添加${resource}失败，使用本地存储`);
            // 回退到localStorage
            const items = await this.getData(resource);
            const newId = Math.max(...items.map(i => parseInt(i.id) || 0), 0) + 1;
            const newItem = {
                id: String(newId),
                ...itemData,
                createdAt: new Date().toISOString()
            };
            items.push(newItem);
            await this.saveData(resource, items);
            return newItem;
        }
    }

    // 通用资源更新方法
    async updateResourceItem(resource, id, updates) {
        // 在Vercel环境下，只使用环境适配器，不回退
        if (this.useEnvironmentAdapter && window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
            console.log(`🌐 Vercel环境：使用环境适配器更新${resource}`);
            const result = await window.environmentAdapter.updateItem(resource, id, updates);
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.message || `更新${resource}失败`);
            }
        }
        
        // 非Vercel环境的处理
        try {
            const result = await this.updateItem(resource, id, updates);
            return result.success ? result.data : null;
        } catch (error) {
            console.warn(`API更新${resource}失败，使用本地存储`);
            // 回退到localStorage
            const items = await this.getData(resource);
            const index = items.findIndex(item => String(item.id) === String(id));
            if (index !== -1) {
                items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
                await this.saveData(resource, items);
                return items[index];
            }
            return null;
        }
    }

    // 通用资源删除方法
    async deleteResourceItem(resource, id) {
        // 在Vercel环境下，只使用环境适配器，不回退
        if (this.useEnvironmentAdapter && window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
            console.log(`🌐 Vercel环境：使用环境适配器删除${resource}`);
            const result = await window.environmentAdapter.deleteItem(resource, id);
            
            if (result.success) {
                return result;
            } else {
                throw new Error(result.message || `删除${resource}失败`);
            }
        }
        
        // 非Vercel环境的处理
        try {
            const result = await this.deleteItem(resource, id);
            return result;
        } catch (error) {
            console.warn(`API删除${resource}失败，使用本地存储`);
            // 回退到localStorage
            const items = await this.getData(resource);
            const filtered = items.filter(item => String(item.id) !== String(id));
            await this.saveData(resource, filtered);
            return { success: true };
        }
    }

    // 从JSON文件获取数据
    async getDataFromJSON(resource) {
        try {
            const response = await fetch(`${this.jsonBaseURL}/${resource}.json`);
            if (!response.ok) {
                throw new Error(`无法加载 ${resource}.json: ${response.status}`);
            }
            const data = await response.json();
            console.log(`✅ 从JSON文件加载 ${resource}:`, Array.isArray(data) ? data.length + ' 条' : 'object');
            return data;
        } catch (error) {
            console.error(`❌ 加载 ${resource}.json 失败:`, error);
            // 返回空数据
            return resource === 'settings' ? {} : [];
        }
    }

    // 统一的数据获取方法
    async getData(resource) {
        // 优先使用环境适配器
        if (this.useEnvironmentAdapter && window.environmentAdapter) {
            console.log(`🌐 使用环境适配器获取${resource}`);
            return await window.environmentAdapter.getData(resource);
        }
        
        if (this.useJSON) {
            // 直接从JSON文件读取
            try {
                return await this.getDataFromJSON(resource);
            } catch (error) {
                console.warn(`JSON文件获取${resource}失败:`, error);
                if (this.fallbackToLocalStorage) {
                    console.log(`回退到localStorage获取${resource}`);
                    return this.getFromLocalStorage(resource);
                }
                throw error;
            }
        } else {
            return this.getFromLocalStorage(resource);
        }
    }

    // 保存到JSON文件（通过API）
    async saveDataToJSON(resource, data) {
        try {
            // 优先使用环境适配器
            if (window.environmentAdapter && window.environmentAdapter.supportsWrite) {
                return await window.environmentAdapter.saveData(resource, data);
            }
            
            // 回退到直接API调用
            // settings 是对象，使用 PUT；其他资源是数组，使用 POST batch
            let response;
            if (resource === 'settings') {
                response = await fetch(`${this.apiBaseURL}/${resource}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                response = await fetch(`${this.apiBaseURL}/${resource}/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
            
            if (response.ok) {
                console.log(`✅ 保存 ${resource} 到JSON文件成功`);
                return await response.json();
            }
            throw new Error(`API保存失败: ${response.status}`);
        } catch (error) {
            console.error(`❌ 保存 ${resource} 到JSON文件失败:`, error);
            throw error;
        }
    }
    
    // 单项CRUD操作方法
    async createItem(resource, item) {
        // 优先使用环境适配器
        if (this.useEnvironmentAdapter && window.environmentAdapter && window.environmentAdapter.supportsWrite) {
            console.log(`🌐 使用环境适配器创建${resource}`);
            return await window.environmentAdapter.createItem(resource, item);
        }
        
        // 回退到本地方法
        const items = await this.getData(resource);
        const newId = Math.max(...items.map(i => parseInt(i.id) || 0), 0) + 1;
        const newItem = {
            id: String(newId),
            ...item,
            createdAt: new Date().toISOString()
        };
        items.push(newItem);
        await this.saveData(resource, items);
        return { success: true, data: newItem };
    }
    
    async updateItem(resource, id, updates) {
        // 优先使用环境适配器
        if (this.useEnvironmentAdapter && window.environmentAdapter && window.environmentAdapter.supportsWrite) {
            console.log(`🌐 使用环境适配器更新${resource}`);
            return await window.environmentAdapter.updateItem(resource, id, updates);
        }
        
        // 回退到本地方法
        const items = await this.getData(resource);
        const index = items.findIndex(i => String(i.id) === String(id));
        if (index !== -1) {
            items[index] = {
                ...items[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            await this.saveData(resource, items);
            return { success: true, data: items[index] };
        }
        return { success: false, message: '项目未找到' };
    }
    
    async deleteItem(resource, id) {
        // 优先使用环境适配器
        if (this.useEnvironmentAdapter && window.environmentAdapter && window.environmentAdapter.supportsWrite) {
            console.log(`🌐 使用环境适配器删除${resource}`);
            return await window.environmentAdapter.deleteItem(resource, id);
        }
        
        // 回退到本地方法
        const items = await this.getData(resource);
        const filtered = items.filter(i => String(i.id) !== String(id));
        await this.saveData(resource, filtered);
        return { success: true, message: '删除成功' };
    }

    // 统一的数据保存方法
    async saveData(resource, data) {
        // 优先使用环境适配器
        if (this.useEnvironmentAdapter && window.environmentAdapter) {
            console.log(`🌐 使用环境适配器保存${resource}`);
            return await window.environmentAdapter.saveData(resource, data);
        }
        
        if (this.useJSON) {
            // 保存到JSON文件（需要API服务器）
            try {
                return await this.saveDataToJSON(resource, data);
            } catch (error) {
                console.warn(`JSON文件保存${resource}失败:`, error);
                if (this.fallbackToLocalStorage) {
                    console.log(`回退到localStorage保存${resource}`);
                    return this.saveToLocalStorage(resource, data);
                }
                throw error;
            }
        } else {
            return this.saveToLocalStorage(resource, data);
        }
    }

    // 从localStorage获取数据
    getFromLocalStorage(resource) {
        const key = `blog_${resource}`;
        const data = localStorage.getItem(key);
        if (!data) {
            // 如果是settings，返回对象；其他返回数组
            return resource === 'settings' ? {} : [];
        }
        return JSON.parse(data);
    }

    // 保存到localStorage
    saveToLocalStorage(resource, data) {
        const key = `blog_${resource}`;
        localStorage.setItem(key, JSON.stringify(data));
        return { success: true };
    }

    // ========== 文章相关方法 ==========
    
    async getArticles(status = null) {
        const articles = await this.getData('articles');
        if (status) {
            return articles.filter(article => article.status === status);
        }
        return articles;
    }

    async getArticleById(id) {
        console.log('[getArticleById] 开始查找文章');
        console.log('[getArticleById] 输入ID:', id);
        console.log('[getArticleById] ID类型:', typeof id);
        console.log('[getArticleById] useAPI:', this.useAPI);
        
        if (this.useAPI) {
            try {
                console.log('[getArticleById] 使用API模式');
                const url = `${this.apiBaseURL}/articles/${id}`;
                console.log('[getArticleById] 请求URL:', url);
                const response = await fetch(url);
                console.log('[getArticleById] API响应状态:', response.status);
                if (response.ok) {
                    const result = await response.json();
                    console.log('[getArticleById] API返回数据:', result);
                    return result.data;
                }
            } catch (error) {
                console.warn('[getArticleById] API获取文章失败，使用本地数据:', error);
            }
        }
        
        console.log('[getArticleById] 使用localStorage模式');
        const articles = await this.getArticles();
        console.log('[getArticleById] 文章总数:', articles.length);
        console.log('[getArticleById] 所有文章ID:', articles.map(a => `${a.id}(${typeof a.id})`));
        
        // 支持字符串和数字类型的ID比较
        const found = articles.find(article => {
            const match = String(article.id) === String(id);
            console.log(`[getArticleById] 比较: "${article.id}" === "${id}" => ${match}`);
            return match;
        });
        
        console.log('[getArticleById] 查找结果:', found ? `找到: ${found.title}` : '未找到');
        return found;
    }

    async addArticle(article) {
        // 在Vercel环境下，只使用环境适配器，不回退
        if (this.useEnvironmentAdapter && window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
            console.log('🌐 Vercel环境：使用环境适配器创建文章');
            const result = await window.environmentAdapter.createItem('articles', {
                ...article,
                views: 0,
                publishDate: article.publishDate || new Date().toISOString().split('T')[0]
            });
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.message || '创建文章失败');
            }
        }
        
        // 非Vercel环境的处理
        try {
            const result = await this.createItem('articles', {
                ...article,
                views: 0,
                publishDate: article.publishDate || new Date().toISOString().split('T')[0]
            });
            return result.success ? result.data : null;
        } catch (error) {
            console.warn('API添加文章失败，使用本地存储');
            // 回退到localStorage
            const articles = await this.getArticles();
            article.id = Math.max(...articles.map(a => parseInt(a.id) || 0), 0) + 1;
            article.views = 0;
            article.publishDate = article.publishDate || new Date().toISOString().split('T')[0];
            articles.unshift(article);
            await this.saveData('articles', articles);
            return article;
        }
    }

    async updateArticle(id, updates) {
        // 在Vercel环境下，只使用环境适配器，不回退
        if (this.useEnvironmentAdapter && window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
            console.log('🌐 Vercel环境：使用环境适配器更新文章');
            const result = await window.environmentAdapter.updateItem('articles', id, updates);
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.message || '更新文章失败');
            }
        }
        
        // 非Vercel环境的处理
        try {
            const result = await this.updateItem('articles', id, updates);
            return result.success ? result.data : null;
        } catch (error) {
            console.warn('API更新文章失败，使用本地存储');
            // 回退到localStorage
            const articles = await this.getArticles();
            const index = articles.findIndex(article => String(article.id) === String(id));
            if (index !== -1) {
                articles[index] = { ...articles[index], ...updates };
                await this.saveData('articles', articles);
                return articles[index];
            }
            return null;
        }
    }

    async deleteArticle(id) {
        // 在Vercel环境下，只使用环境适配器，不回退
        if (this.useEnvironmentAdapter && window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
            console.log('🌐 Vercel环境：使用环境适配器删除文章');
            const result = await window.environmentAdapter.deleteItem('articles', id);
            
            if (result.success) {
                return result;
            } else {
                throw new Error(result.message || '删除文章失败');
            }
        }
        
        // 非Vercel环境的处理
        try {
            const result = await this.deleteItem('articles', id);
            return result;
        } catch (error) {
            console.warn('API删除文章失败，使用本地存储');
            // 回退到localStorage
            const articles = await this.getArticles();
            const filtered = articles.filter(article => String(article.id) !== String(id));
            await this.saveData('articles', filtered);
            return { success: true };
        }
    }

    // ========== 分类相关方法 ==========
    
    async getCategories() {
        return await this.getData('categories');
    }

    async addCategory(category) {
        return await this.createResourceItem('categories', {
            ...category,
            count: 0
        });
    }

    async updateCategory(id, updates) {
        return await this.updateResourceItem('categories', id, updates);
    }

    async deleteCategory(id) {
        return await this.deleteResourceItem('categories', id);
    }

    // ========== 标签相关方法 ==========
    
    async getTags() {
        return await this.getData('tags');
    }

    async addTag(tag) {
        return await this.createResourceItem('tags', {
            ...tag,
            count: 0
        });
    }

    async updateTag(id, updates) {
        return await this.updateResourceItem('tags', id, updates);
    }

    async deleteTag(id) {
        return await this.deleteResourceItem('tags', id);
    }

    // ========== 评论相关方法 ==========
    
    async getComments(status = null) {
        const comments = await this.getData('comments');
        if (status) {
            return comments.filter(comment => comment.status === status);
        }
        return comments;
    }

    async addComment(comment) {
        const comments = await this.getComments();
        comment.id = Math.max(...comments.map(c => c.id || 0), 0) + 1;
        comment.time = new Date().toISOString();
        comments.unshift(comment);
        await this.saveData('comments', comments);
        return comment;
    }

    async updateComment(id, updates) {
        try {
            // 在Vercel环境下使用单项更新API
            if (window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
                const result = await window.environmentAdapter.updateItem('comments', id, updates);
                if (result.success) {
                    console.log('✅ 评论更新成功 (Vercel):', result.data);
                    return result.data;
                } else {
                    throw new Error(result.message || '更新失败');
                }
            } else {
                // 其他环境使用原有逻辑
                const comments = await this.getComments();
                const index = comments.findIndex(comment => String(comment.id) === String(id));
                if (index !== -1) {
                    comments[index] = { ...comments[index], ...updates };
                    await this.saveData('comments', comments);
                    console.log('✅ 评论更新成功 (本地):', comments[index]);
                    return comments[index];
                }
                return null;
            }
        } catch (error) {
            console.error('❌ 更新评论失败:', error);
            throw error;
        }
    }

    async deleteComment(id) {
        const comments = await this.getComments();
        const filtered = comments.filter(comment => String(comment.id) !== String(id));
        await this.saveData('comments', filtered);
        return { success: true };
    }

    // ========== 留言相关方法 ==========
    
    async getGuestbookMessages() {
        return await this.getData('guestbook');
    }

    async addGuestbookMessage(message) {
        const messages = await this.getGuestbookMessages();
        message.id = Math.max(...messages.map(m => m.id || 0), 0) + 1;
        message.time = new Date().toISOString();
        messages.unshift(message);
        await this.saveData('guestbook', messages);
        return message;
    }

    async updateGuestbookMessage(id, updates) {
        const messages = await this.getGuestbookMessages();
        const index = messages.findIndex(m => String(m.id) === String(id));
        if (index !== -1) {
            messages[index] = { ...messages[index], ...updates };
            await this.saveData('guestbook', messages);
            return messages[index];
        }
        return null;
    }

    async deleteGuestbookMessage(id) {
        const messages = await this.getGuestbookMessages();
        const filtered = messages.filter(m => String(m.id) !== String(id));
        await this.saveData('guestbook', filtered);
        return { success: true };
    }

    // ========== 设置相关方法 ==========
    
    async getSettings() {
        return await this.getData('settings');
    }

    async updateSettings(updates) {
        const settings = await this.getSettings();
        const newSettings = { 
            ...settings, 
            ...updates,
            _adminUpdate: true  // 🔥 标记为后台更新
        };
        await this.saveData('settings', newSettings);
        return newSettings;
    }

    // ========== 媒体相关方法 ==========
    
    async getImages() {
        return await this.getData('images');
    }

    async addImage(image) {
        return await this.createResourceItem('images', {
            ...image,
            uploadDate: new Date().toISOString().split('T')[0],
            usedIn: image.usedIn || []
        });
    }

    async updateImage(id, updates) {
        return await this.updateResourceItem('images', id, updates);
    }

    async deleteImage(id) {
        return await this.deleteResourceItem('images', id);
    }

    async getMusic() {
        return await this.getData('music');
    }

    async addMusic(music) {
        return await this.createResourceItem('music', {
            ...music,
            uploadDate: new Date().toISOString().split('T')[0]
        });
    }

    async updateMusic(id, updates) {
        return await this.updateResourceItem('music', id, updates);
    }

    async deleteMusic(id) {
        return await this.deleteResourceItem('music', id);
    }

    async getVideos() {
        return await this.getData('videos');
    }

    async addVideo(video) {
        return await this.createResourceItem('videos', {
            ...video,
            uploadDate: new Date().toISOString().split('T')[0]
        });
    }

    async updateVideo(id, updates) {
        return await this.updateResourceItem('videos', id, updates);
    }

    async deleteVideo(id) {
        return await this.deleteResourceItem('videos', id);
    }

    async getLinks() {
        return await this.getData('links');
    }

    async addLink(link) {
        return await this.createResourceItem('links', {
            ...link,
            addedDate: new Date().toISOString().split('T')[0],
            status: link.status || 'active'
        });
    }

    async updateLink(id, updates) {
        return await this.updateResourceItem('links', id, updates);
    }

    async deleteLink(id) {
        return await this.deleteResourceItem('links', id);
    }

    async getEvents() {
        return await this.getData('events');
    }

    async addEvent(event) {
        return await this.createResourceItem('events', {
            ...event,
            createdAt: new Date().toISOString()
        });
    }

    async updateEvent(id, updates) {
        return await this.updateResourceItem('events', id, updates);
    }

    async deleteEvent(id) {
        return await this.deleteResourceItem('events', id);
    }

    // ========== 应用管理方法 ==========
    
    async getApps() {
        return await this.getData('apps');
    }

    async addApp(app) {
        return await this.createResourceItem('apps', {
            ...app,
            status: app.status || 'enabled',
            order: app.order || 0,
            createdAt: new Date().toISOString()
        });
    }

    async updateApp(id, updates) {
        return await this.updateResourceItem('apps', id, updates);
    }

    async deleteApp(id) {
        return await this.deleteResourceItem('apps', id);
    }

    // ========== 简历管理方法 ==========
    
    async getResumes() {
        return await this.getData('resumes');
    }

    async addResume(resume) {
        return await this.createResourceItem('resumes', {
            ...resume,
            createdAt: new Date().toISOString()
        });
    }

    async updateResume(id, updates) {
        return await this.updateResourceItem('resumes', id, updates);
    }

    async deleteResume(id) {
        return await this.deleteResourceItem('resumes', id);
    }

    // 兼容旧的媒体方法
    async getMedia() {
        return await this.getImages();
    }

    async addMedia(media) {
        return await this.addImage(media);
    }

    async deleteMedia(id) {
        return await this.deleteImage(id);
    }

    // ========== 用户相关方法 ==========
    
    async getUsers() {
        return await this.getData('users');
    }

    async getUserById(id) {
        const users = await this.getUsers();
        return users.find(u => u.id == id || String(u.id) === String(id));
    }

    async getUserByUsername(username) {
        const users = await this.getUsers();
        return users.find(u => u.username === username);
    }

    async addUser(userData) {
        console.log('🔍 DataAdapter.addUser 开始:', userData);
        
        // 在Vercel环境下，只使用环境适配器，不回退
        if (this.useEnvironmentAdapter && window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
            console.log('🌐 Vercel环境：使用环境适配器创建用户');
            const result = await window.environmentAdapter.createItem('users', {
                ...userData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            
            console.log('📡 DataAdapter.createItem 返回结果:', result);
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.message || '创建用户失败');
            }
        }
        
        // 非Vercel环境的处理
        try {
            // 使用新的CRUD方法
            const result = await this.createItem('users', {
                ...userData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            
            console.log('📡 DataAdapter.createItem 返回结果:', result);
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.message || '创建用户失败');
            }
        } catch (error) {
            console.error('❌ DataAdapter.addUser 失败:', error);
            
            // 只在非Vercel环境下回退到本地方法
            console.log('🔄 回退到本地用户创建方法');
            try {
                const users = await this.getUsers();
                const newUser = {
                    id: `user_${Date.now()}`,
                    ...userData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                users.push(newUser);
                await this.saveData('users', users);
                console.log('✅ 本地用户创建成功:', newUser);
                return newUser;
            } catch (localError) {
                console.error('❌ 本地用户创建也失败:', localError);
                throw new Error('用户创建失败: ' + (error.message || localError.message));
            }
        }
    }

    async updateUser(id, updates) {
        // 在Vercel环境下，使用API直接更新单个用户
        if (this.useEnvironmentAdapter && window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
            console.log('🌐 Vercel环境：使用API更新用户', id);
            try {
                const response = await fetch(`/api/users?id=${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...updates,
                        updatedAt: new Date().toISOString()
                    })
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`更新用户失败: ${response.status} - ${errorText}`);
                }
                
                const result = await response.json();
                if (result.success) {
                    return result.data;
                } else {
                    throw new Error(result.error || '更新用户失败');
                }
            } catch (error) {
                console.error('❌ Vercel用户更新失败:', error);
                throw error;
            }
        }
        
        // 非Vercel环境的处理
        const users = await this.getUsers();
        const index = users.findIndex(u => u.id == id || String(u.id) === String(id));
        
        if (index === -1) {
            throw new Error('用户不存在');
        }
        
        users[index] = {
            ...users[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        await this.saveData('users', users);
        return users[index];
    }

    async deleteUser(id) {
        // 在Vercel环境下，使用API直接删除单个用户
        if (this.useEnvironmentAdapter && window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
            console.log('🌐 Vercel环境：使用API删除用户', id);
            try {
                const response = await fetch(`/api/users?id=${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`删除用户失败: ${response.status} - ${errorText}`);
                }
                
                const result = await response.json();
                if (result.success) {
                    return true;
                } else {
                    throw new Error(result.error || '删除用户失败');
                }
            } catch (error) {
                console.error('❌ Vercel用户删除失败:', error);
                throw error;
            }
        }
        
        // 非Vercel环境的处理
        const users = await this.getUsers();
        const filteredUsers = users.filter(u => u.id != id && String(u.id) !== String(id));
        
        if (filteredUsers.length === users.length) {
            throw new Error('用户不存在');
        }
        
        await this.saveData('users', filteredUsers);
        return true;
    }

    // ========== 统计方法 ==========
    
    async getStats() {
        const [articles, comments, settings] = await Promise.all([
            this.getArticles(),
            this.getComments(),
            this.getSettings()
        ]);
        
        const totalWords = articles
            .filter(a => a.status === 'published')
            .reduce((sum, article) => sum + (article.content?.length || 0), 0);
        
        const totalViews = articles.reduce((sum, article) => sum + (article.views || 0), 0);
        
        const runningDays = Math.floor((Date.now() - new Date(settings.startDate || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
        
        return {
            totalArticles: articles.filter(a => a.status === 'published').length,
            totalComments: comments.length,
            totalViews: totalViews,
            totalVisitors: settings.totalVisitors || 0,
            totalWords: totalWords,
            runningDays: runningDays
        };
    }
}

// 创建全局实例
window.dataAdapter = new DataAdapter();

console.log('✅ 数据适配层已加载');
