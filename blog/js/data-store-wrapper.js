/* ========================================
   BlogDataStore 包装器
   让现有代码无缝使用新的数据适配层
   ======================================== */

class BlogDataStoreWrapper {
    constructor() {
        // 使用数据适配层
        this.adapter = window.dataAdapter;
        
        if (!this.adapter) {
            console.warn('⚠️ 数据适配器尚未加载，等待中...');
            // 延迟初始化
            setTimeout(() => {
                this.adapter = window.dataAdapter;
                if (this.adapter) {
                    console.log('✅ BlogDataStore包装器已延迟初始化');
                } else {
                    console.error('❌ 数据适配器加载失败');
                }
            }, 200);
        } else {
            console.log('✅ BlogDataStore包装器已初始化');
        }
    }

    // ========== 文章相关方法 ==========
    
    getArticles(status = null) {
        if (!this.adapter) {
            console.warn('⚠️ 数据适配器未就绪，返回空数组');
            return Promise.resolve([]);
        }
        return this.adapter.getArticles(status);
    }

    getArticleById(id) {
        return this.adapter.getArticleById(id);
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
    
    getCategories() {
        return this.adapter.getCategories();
    }

    addCategory(category) {
        return this.adapter.addCategory(category);
    }

    updateCategory(id, updates) {
        return this.adapter.updateCategory(id, updates);
    }

    deleteCategory(id) {
        return this.adapter.deleteCategory(id);
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
    
    getTags() {
        return this.adapter.getTags();
    }

    addTag(tag) {
        return this.adapter.addTag(tag);
    }

    updateTag(id, updates) {
        return this.adapter.updateTag(id, updates);
    }

    deleteTag(id) {
        return this.adapter.deleteTag(id);
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
    
    getComments(status = null) {
        return this.adapter.getComments(status);
    }

    async getCommentsByArticle(articleId) {
        const allComments = await this.adapter.getComments();
        return allComments.filter(c => c.articleId === parseInt(articleId) && !c.parentId)
            .sort((a, b) => new Date(b.time) - new Date(a.time)); // 按时间倒序
    }

    async getRepliesByComment(commentId) {
        const allComments = await this.adapter.getComments();
        return allComments.filter(c => c.parentId === parseInt(commentId))
            .sort((a, b) => new Date(a.time) - new Date(b.time)); // 回复按时间正序
    }

    addComment(comment) {
        return this.adapter.addComment(comment);
    }

    updateComment(id, updates) {
        return this.adapter.updateComment(id, updates);
    }

    deleteComment(id) {
        return this.adapter.deleteComment(id);
    }

    // 评论点赞相关方法（通过 API）
    async likeComment(commentId) {
        try {
            const response = await fetch(`http://localhost:3001/api/comments/${commentId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                console.log('✅ 评论点赞成功');
                return result.data;
            }
            throw new Error(result.message || '点赞失败');
        } catch (error) {
            console.error('❌ 评论点赞失败:', error);
            throw error;
        }
    }

    async unlikeComment(commentId) {
        try {
            const response = await fetch(`http://localhost:3001/api/comments/${commentId}/unlike`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                console.log('✅ 取消评论点赞成功');
                return result.data;
            }
            throw new Error(result.message || '取消点赞失败');
        } catch (error) {
            console.error('❌ 取消评论点赞失败:', error);
            throw error;
        }
    }

    async dislikeComment(commentId) {
        try {
            const response = await fetch(`http://localhost:3001/api/comments/${commentId}/dislike`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                console.log('✅ 评论差评成功');
                return result.data;
            }
            throw new Error(result.message || '差评失败');
        } catch (error) {
            console.error('❌ 评论差评失败:', error);
            throw error;
        }
    }

    async undislikeComment(commentId) {
        try {
            const response = await fetch(`http://localhost:3001/api/comments/${commentId}/undislike`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                console.log('✅ 取消评论差评成功');
                return result.data;
            }
            throw new Error(result.message || '取消差评失败');
        } catch (error) {
            console.error('❌ 取消评论差评失败:', error);
            throw error;
        }
    }

    // ========== 留言相关方法 ==========
    
    async getGuestbookMessages() {
        const allMessages = await this.adapter.getGuestbookMessages();
        return allMessages.filter(m => !m.parentId); // 只返回一级留言
    }

    async getRepliesByMessage(messageId) {
        const allMessages = await this.adapter.getGuestbookMessages();
        return allMessages.filter(m => m.parentId === parseInt(messageId))
            .sort((a, b) => new Date(a.time) - new Date(b.time)); // 回复按时间正序
    }

    async addGuestbookMessage(message) {
        return this.adapter.addGuestbookMessage(message);
    }

    updateGuestbookMessage(id, updates) {
        return this.adapter.updateGuestbookMessage(id, updates);
    }

    deleteGuestbookMessage(id) {
        return this.adapter.deleteGuestbookMessage(id);
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

    // 点赞相关方法（通过 API）
    async likeGuestbookMessage(id) {
        try {
            const response = await fetch(`http://localhost:3001/api/guestbook/${id}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                console.log('✅ 点赞成功');
                return result.data;
            }
            throw new Error(result.message || '点赞失败');
        } catch (error) {
            console.error('❌ 点赞失败:', error);
            alert('点赞失败，请确保服务器正在运行');
            return null;
        }
    }

    async unlikeGuestbookMessage(id) {
        try {
            const response = await fetch(`http://localhost:3001/api/guestbook/${id}/unlike`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                console.log('✅ 取消点赞成功');
                return result.data;
            }
            throw new Error(result.message || '取消点赞失败');
        } catch (error) {
            console.error('❌ 取消点赞失败:', error);
            return null;
        }
    }

    // 留言差评
    async dislikeGuestbookMessage(id) {
        try {
            const response = await fetch(`http://localhost:3001/api/guestbook/${id}/dislike`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                console.log('✅ 留言差评成功');
                return result.data;
            }
            throw new Error(result.message || '差评失败');
        } catch (error) {
            console.error('❌ 留言差评失败:', error);
            throw error;
        }
    }

    async undislikeGuestbookMessage(id) {
        try {
            const response = await fetch(`http://localhost:3001/api/guestbook/${id}/undislike`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                console.log('✅ 取消留言差评成功');
                return result.data;
            }
            throw new Error(result.message || '取消差评失败');
        } catch (error) {
            console.error('❌ 取消留言差评失败:', error);
            throw error;
        }
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
    
    getSettings() {
        if (!this.adapter) {
            console.warn('⚠️ 数据适配器未就绪，返回空设置');
            return Promise.resolve({});
        }
        return this.adapter.getSettings();
    }

    updateSettings(updates) {
        return this.adapter.updateSettings(updates);
    }

    // ========== 统计方法 ==========
    
    getStats() {
        if (!this.adapter) {
            console.warn('⚠️ 数据适配器未就绪，返回默认统计');
            return Promise.resolve({
                totalWords: 0,
                totalViews: 0,
                totalVisitors: 0,
                runningDays: 0,
                totalArticles: 0,
                totalComments: 0
            });
        }
        return this.adapter.getStats();
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
    
    getImages() {
        return this.adapter.getImages();
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
    getMusic() {
        return this.adapter.getMusic();
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
    getVideos() {
        return this.adapter.getVideos();
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
    getLinks() {
        return this.adapter.getLinks();
    }

    // ========== 应用相关方法 ==========
    
    getApps() {
        return this.adapter.getApps();
    }

    // 获取所有数据的便捷方法
    async getAllData() {
        try {
            const [articles, categories, tags, comments, guestbook, images, music, videos, links, apps, settings] = await Promise.all([
                this.getArticles(),
                this.getCategories(), 
                this.getTags(),
                this.getComments(),
                this.getGuestbookMessages(),
                this.getImages(),
                this.getMusic(),
                this.getVideos(),
                this.getLinks(),
                this.getApps(),
                this.getSettings()
            ]);
            
            return {
                articles,
                categories,
                tags,
                comments,
                guestbook,
                images,
                music,
                videos,
                links,
                apps,
                settings
            };
        } catch (error) {
            console.error('❌ 获取所有数据失败:', error);
            return {
                articles: [],
                categories: [],
                tags: [],
                comments: [],
                guestbook: [],
                images: [],
                music: [],
                videos: [],
                links: [],
                apps: [],
                settings: {}
            };
        }
    }

    async getLinkById(id) {
        const links = await this.adapter.getLinks();
        return links.find(link => link.id === id);
    }

    async addLink(link) {
        const links = await this.adapter.getLinks();
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
        const links = await this.adapter.getLinks();
        const index = links.findIndex(link => link.id === id);
        if (index !== -1) {
            links[index] = { ...links[index], ...updates };
            await this.adapter.saveData('links', links);
            return links[index];
        }
        return null;
    }

    async deleteLink(id) {
        const links = await this.adapter.getLinks();
        const filtered = links.filter(link => link.id !== id);
        await this.adapter.saveData('links', filtered);
    }

    async getLinkCategories() {
        const links = await this.adapter.getLinks();
        const categories = [...new Set(links.map(link => link.category))];
        return categories.length > 0 ? categories : ['默认'];
    }

    async getLinksByCategory(category) {
        const links = await this.adapter.getLinks();
        return links.filter(link => link.category === category && link.status === 'active');
    }

    async getActiveLinks() {
        const links = await this.adapter.getLinks();
        return links.filter(link => link.status === 'active');
    }

    // 兼容旧的方法名
    getMedia() {
        return this.getImages();
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
    
    // ========== 文章点赞方法 ==========
    
    // 增加文章点赞数
    async incrementLikes(articleId) {
        try {
            const articles = await this.adapter.getArticles();
            const article = articles.find(a => a.id === parseInt(articleId));
            
            if (article) {
                article.likes = (article.likes || 0) + 1;
                await this.adapter.updateArticle(article.id, { likes: article.likes });
                console.log(`✅ 文章 ${articleId} 点赞数增加到 ${article.likes}`);
                return article.likes;
            }
        } catch (error) {
            console.error('增加点赞数失败:', error);
            throw error;
        }
    }
    
    // 减少文章点赞数
    async decrementLikes(articleId) {
        try {
            const articles = await this.adapter.getArticles();
            const article = articles.find(a => a.id === parseInt(articleId));
            
            if (article && article.likes > 0) {
                article.likes--;
                await this.adapter.updateArticle(article.id, { likes: article.likes });
                console.log(`✅ 文章 ${articleId} 点赞数减少到 ${article.likes}`);
                return article.likes;
            }
        } catch (error) {
            console.error('减少点赞数失败:', error);
            throw error;
        }
    }
}

// 替换全局实例
window.blogDataStore = new BlogDataStoreWrapper();

console.log('✅ BlogDataStore包装器已替换原实例');
