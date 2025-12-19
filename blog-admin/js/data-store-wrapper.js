/* ========================================
   BlogDataStore 包装器
   让现有代码无缝使用新的数据适配层
   ======================================== */

class BlogDataStoreWrapper {
    constructor() {
        // 使用数据适配层
        this.adapter = window.dataAdapter || new DataAdapter();
        // 🔥 添加配置属性（编辑器需要）
        this.useJSONFiles = this.adapter.useJSON || true;
        this.jsonBaseURL = this.adapter.jsonBaseURL || '../data';
        this.dataLoaded = false;
        console.log('✅ BlogDataStore包装器已初始化');
        console.log('🔍 使用的适配器:', {
            adapterType: this.adapter.constructor.name,
            useJSON: this.adapter.useJSON,
            useEnvironmentAdapter: this.adapter.useEnvironmentAdapter,
            apiBaseURL: this.adapter.apiBaseURL
        });
    }

    // ========== 文章相关方法 ==========
    
    // 🔥 所有方法都改为异步，因为 DataAdapter 返回 Promise
    async getArticles(status = null) {
        return await this.adapter.getArticles(status);
    }

    async getArticleById(id) {
        return await this.adapter.getArticleById(id);
    }
    
    // 🔥 异步获取文章（编辑器需要）
    async getArticleByIdAsync(id) {
        return await this.adapter.getArticleById(id);
    }
    
    // 🔥 异步获取所有数据（编辑器需要）
    async getAllDataAsync() {
        // 加载所有数据
        const [articles, categories, tags, settings] = await Promise.all([
            this.adapter.getArticles(),
            this.adapter.getCategories(),
            this.adapter.getTags(),
            this.adapter.getSettings()
        ]);
        
        return {
            articles,
            categories,
            tags,
            settings
        };
    }

    async addArticle(article) {
        const result = await this.adapter.addArticle(article);
        // 同步分类和标签统计
        await this.syncCategoryStats();
        await this.syncTagStats();
        return result;
    }

    async updateArticle(id, updates) {
        const result = await this.adapter.updateArticle(id, updates);
        // 同步分类和标签统计
        await this.syncCategoryStats();
        await this.syncTagStats();
        return result;
    }

    async deleteArticle(id) {
        const result = await this.adapter.deleteArticle(id);
        // 同步分类和标签统计
        await this.syncCategoryStats();
        await this.syncTagStats();
        return result;
    }

    // ========== 分类相关方法 ==========
    
    // 🔥 所有方法都改为异步
    async getCategories() {
        return await this.adapter.getCategories();
    }
    
    // 🔥 异步获取分类（编辑器需要）
    async getCategoriesAsync() {
        return await this.adapter.getCategories();
    }

    async addCategory(category) {
        return await this.adapter.addCategory(category);
    }

    async updateCategory(id, updates) {
        return await this.adapter.updateCategory(id, updates);
    }

    async deleteCategory(id) {
        return await this.adapter.deleteCategory(id);
    }

    // 同步分类统计
    async syncCategoryStats() {
        const [articles, categories] = await Promise.all([
            this.adapter.getArticles(),
            this.adapter.getCategories()
        ]);
        
        // 统计每个分类的文章数
        const categoryCounts = {};
        articles.forEach(article => {
            const category = article.category || '未分类';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        
        // 更新现有分类的计数
        let updated = false;
        categories.forEach(cat => {
            const newCount = categoryCounts[cat.name] || 0;
            if (cat.count !== newCount) {
                cat.count = newCount;
                updated = true;
            }
        });
        
        // 添加新出现的分类
        for (const categoryName of Object.keys(categoryCounts)) {
            const exists = categories.find(cat => cat.name === categoryName);
            if (!exists) {
                categories.push({
                    id: Math.max(...categories.map(c => c.id || 0), 0) + 1,
                    name: categoryName,
                    description: '',
                    count: categoryCounts[categoryName]
                });
                updated = true;
            }
        }
        
        if (updated) {
            await this.adapter.saveData('categories', categories);
        }
    }

    // ========== 标签相关方法 ==========
    
    // 🔥 所有方法都改为异步
    async getTags() {
        return await this.adapter.getTags();
    }
    
    // 🔥 异步获取标签（编辑器需要）
    async getTagsAsync() {
        return await this.adapter.getTags();
    }

    async addTag(tag) {
        return await this.adapter.addTag(tag);
    }

    async updateTag(id, updates) {
        return await this.adapter.updateTag(id, updates);
    }

    async deleteTag(id) {
        return await this.adapter.deleteTag(id);
    }

    // 同步标签统计
    async syncTagStats() {
        const [articles, tags] = await Promise.all([
            this.adapter.getArticles(),
            this.adapter.getTags()
        ]);
        
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
        let updated = false;
        tags.forEach(tag => {
            const newCount = tagCounts[tag.name] || 0;
            if (tag.count !== newCount) {
                tag.count = newCount;
                updated = true;
            }
        });
        
        // 添加新出现的标签
        for (const tagName of Object.keys(tagCounts)) {
            const exists = tags.find(t => t.name === tagName);
            if (!exists) {
                tags.push({
                    id: Math.max(...tags.map(t => t.id || 0), 0) + 1,
                    name: tagName,
                    count: tagCounts[tagName]
                });
                updated = true;
            }
        }
        
        if (updated) {
            await this.adapter.saveData('tags', tags);
        }
    }

    // ========== 评论相关方法 ==========
    
    // 🔥 所有方法都改为异步
    async getComments(status = null) {
        return await this.adapter.getComments(status);
    }

    async addComment(comment) {
        return await this.adapter.addComment(comment);
    }

    async updateComment(id, updates) {
        return await this.adapter.updateComment(id, updates);
    }

    async deleteComment(id) {
        return await this.adapter.deleteComment(id);
    }

    // ========== 留言相关方法 ==========
    
    // 🔥 所有方法都改为异步
    async getGuestbookMessages() {
        return await this.adapter.getGuestbookMessages();
    }

    async addGuestbookMessage(message) {
        return await this.adapter.addGuestbookMessage(message);
    }

    async updateGuestbookMessage(id, updates) {
        return await this.adapter.updateGuestbookMessage(id, updates);
    }

    async deleteGuestbookMessage(id) {
        return await this.adapter.deleteGuestbookMessage(id);
    }

    async toggleGuestbookLike(id) {
        const message = await this.adapter.getGuestbookMessages().then(messages => 
            messages.find(m => m.id === parseInt(id))
        );
        if (message) {
            message.likes = (message.likes || 0) + 1;
            return await this.adapter.updateGuestbookMessage(id, { likes: message.likes });
        }
        return null;
    }

    async toggleGuestbookPin(id) {
        const message = await this.adapter.getGuestbookMessages().then(messages => 
            messages.find(m => m.id === parseInt(id))
        );
        if (message) {
            message.pinned = !message.pinned;
            return await this.adapter.updateGuestbookMessage(id, { pinned: message.pinned });
        }
        return null;
    }

    // ========== 设置相关方法 ==========
    
    // 🔥 所有方法都改为异步
    async getSettings() {
        return await this.adapter.getSettings();
    }

    async updateSettings(updates) {
        return await this.adapter.updateSettings(updates);
    }

    // ========== 统计方法 ==========
    
    // 🔥 所有方法都改为异步
    async getStats() {
        return await this.adapter.getStats();
    }

    async incrementViews(articleId = null) {
        const settings = await this.adapter.getSettings();
        settings.totalViews = (settings.totalViews || 0) + 1;
        await this.adapter.updateSettings({ totalViews: settings.totalViews });
        
        if (articleId) {
            const article = await this.adapter.getArticleById(articleId);
            if (article) {
                article.views = (article.views || 0) + 1;
                await this.adapter.updateArticle(articleId, { views: article.views });
            }
        }
    }

    // ========== 媒体相关方法 ==========
    
    // 🔥 所有方法都改为异步
    async getImages() {
        return await this.adapter.getImages();
    }

    async getImageById(id) {
        const images = await this.adapter.getImages();
        return images.find(img => img.id === parseInt(id));
    }

    async addImage(image) {
        const images = await this.adapter.getImages();
        image.id = Math.max(...images.map(m => m.id || 0), 0) + 1;
        image.uploadDate = new Date().toISOString().split('T')[0];
        image.usedIn = image.usedIn || [];
        images.unshift(image);
        await this.adapter.saveData('images', images);
        return image;
    }

    async updateImage(id, updates) {
        const images = await this.adapter.getImages();
        const index = images.findIndex(img => img.id === parseInt(id));
        if (index !== -1) {
            images[index] = { ...images[index], ...updates };
            await this.adapter.saveData('images', images);
            return images[index];
        }
        return null;
    }

    async deleteImage(id) {
        const images = await this.adapter.getImages();
        const filtered = images.filter(img => img.id !== parseInt(id));
        await this.adapter.saveData('images', filtered);
    }

    // 音乐相关
    // 🔥 所有方法都改为异步
    async getMusic() {
        return await this.adapter.getMusic();
    }

    async getMusicById(id) {
        const music = await this.adapter.getMusic();
        return music.find(m => m.id === parseInt(id));
    }

    async addMusic(music) {
        const musicList = await this.adapter.getMusic();
        music.id = Math.max(...musicList.map(m => m.id || 0), 0) + 1;
        music.uploadDate = new Date().toISOString().split('T')[0];
        musicList.unshift(music);
        await this.adapter.saveData('music', musicList);
        return music;
    }

    async updateMusic(id, updates) {
        const musicList = await this.adapter.getMusic();
        const index = musicList.findIndex(m => m.id === parseInt(id));
        if (index !== -1) {
            musicList[index] = { ...musicList[index], ...updates };
            await this.adapter.saveData('music', musicList);
            return musicList[index];
        }
        return null;
    }

    async deleteMusic(id) {
        const musicList = await this.adapter.getMusic();
        const filtered = musicList.filter(m => m.id !== parseInt(id));
        await this.adapter.saveData('music', filtered);
    }

    // 视频相关
    // 🔥 所有方法都改为异步
    async getVideos() {
        return await this.adapter.getVideos();
    }

    async getVideoById(id) {
        const videos = await this.adapter.getVideos();
        return videos.find(v => v.id === parseInt(id));
    }

    async addVideo(video) {
        const videos = await this.adapter.getVideos();
        video.id = Math.max(...videos.map(v => v.id || 0), 0) + 1;
        video.uploadDate = new Date().toISOString().split('T')[0];
        videos.unshift(video);
        await this.adapter.saveData('videos', videos);
        return video;
    }

    async updateVideo(id, updates) {
        const videos = await this.adapter.getVideos();
        const index = videos.findIndex(v => v.id === parseInt(id));
        if (index !== -1) {
            videos[index] = { ...videos[index], ...updates };
            await this.adapter.saveData('videos', videos);
            return videos[index];
        }
        return null;
    }

    async deleteVideo(id) {
        const videos = await this.adapter.getVideos();
        const filtered = videos.filter(v => v.id !== parseInt(id));
        await this.adapter.saveData('videos', filtered);
    }

    // 友情链接相关
    // 🔥 所有方法都改为异步
    async getLinks() {
        const result = await this.adapter.getData('links');
        return result.success ? result.data : result;
    }

    async getLinkById(id) {
        const links = await this.getLinks();
        return links.find(link => link.id === id);
    }

    async addLink(link) {
        const links = await this.getLinks();
        const newLink = {
            id: Date.now(),
            name: link.name || '未命名',
            url: link.url || '',
            description: link.description || '',
            avatar: link.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(link.name || 'Link') + '&size=200&background=4fc3f7&color=fff&bold=true',
            category: link.category || '默认',
            status: link.status || 'active',
            addedDate: new Date().toISOString().split('T')[0]
        };
        links.push(newLink);
        await this.adapter.saveData('links', links);
        return newLink;
    }

    async updateLink(id, updates) {
        const links = await this.getLinks();
        const index = links.findIndex(link => link.id === id);
        if (index !== -1) {
            links[index] = { ...links[index], ...updates };
            await this.adapter.saveData('links', links);
            return links[index];
        }
        return null;
    }

    async deleteLink(id) {
        const links = await this.getLinks();
        const filtered = links.filter(link => link.id !== id);
        await this.adapter.saveData('links', filtered);
    }

    async getLinkCategories() {
        const links = await this.getLinks();
        const categories = [...new Set(links.map(link => link.category))];
        return categories.length > 0 ? categories : ['默认'];
    }

    async getLinksByCategory(category) {
        const links = await this.getLinks();
        return links.filter(link => link.category === category && link.status === 'active');
    }

    async getActiveLinks() {
        const links = await this.getLinks();
        return links.filter(link => link.status === 'active');
    }

    // 兼容旧的方法名
    // 🔥 所有方法都改为异步
    async getMedia() {
        return await this.getImages();
    }

    async getMediaById(id) {
        return await this.getImageById(id);
    }

    async addMedia(media) {
        return await this.addImage(media);
    }

    async deleteMedia(id) {
        return await this.deleteImage(id);
    }

    // 上传图片方法（保持兼容）
    async uploadImage(file) {
        // 这里保持原有的上传逻辑
        // 不限制文件大小
        console.log('上传文件大小:', (file.size / 1024 / 1024).toFixed(2) + 'MB');

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
                        return await this.addMedia(media);
                    }
                }
            } catch (error) {
                console.warn('服务器上传失败，使用 Base64 备用方案:', error);
            }
        }

        // 备用方案：使用 Base64
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const media = {
                    name: file.name,
                    url: e.target.result,
                    thumbnail: e.target.result,
                    size: file.size,
                    type: file.type,
                    uploadMethod: 'base64'
                };
                const savedMedia = await this.addMedia(media);
                resolve(savedMedia);
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // 获取存储信息（兼容方法）
    async getStorageInfo() {
        try {
            const [articles, images] = await Promise.all([
                this.adapter.getArticles(),
                this.adapter.getImages()
            ]);
            
            const articlesSize = (new Blob([JSON.stringify(articles)]).size / 1024).toFixed(2);
            const imagesSize = (new Blob([JSON.stringify(images)]).size / 1024).toFixed(2);
            const totalSize = parseFloat(articlesSize) + parseFloat(imagesSize);
            
            return {
                totalSize: totalSize * 1024,
                totalSizeMB: (totalSize / 1024).toFixed(2),
                maxSizeMB: 'unlimited',
                usagePercent: 0,
                articlesKB: articlesSize,
                imagesKB: imagesSize,
                articleCount: articles.length
            };
        } catch (error) {
            console.error('获取存储信息失败:', error);
            return null;
        }
    }

    // ========== 用户相关方法 ==========
    
    // 🔥 所有方法都改为异步
    async getUsers() {
        return await this.adapter.getUsers();
    }

    async getUserById(id) {
        return await this.adapter.getUserById(id);
    }

    async getUserByUsername(username) {
        return await this.adapter.getUserByUsername(username);
    }

    async addUser(userData) {
        console.log('🔍 BlogDataStoreWrapper.addUser 调用:', userData);
        console.log('🔍 使用适配器:', this.adapter.constructor.name);
        try {
            const result = await this.adapter.addUser(userData);
            console.log('📡 适配器返回结果:', result);
            return result;
        } catch (error) {
            console.error('❌ BlogDataStoreWrapper.addUser 失败:', error);
            throw error;
        }
    }

    async updateUser(id, updates) {
        return await this.adapter.updateUser(id, updates);
    }

    async deleteUser(id) {
        return await this.adapter.deleteUser(id);
    }
}

// 替换全局实例
window.blogDataStore = new BlogDataStoreWrapper();

console.log('✅ BlogDataStore包装器已替换原实例');
