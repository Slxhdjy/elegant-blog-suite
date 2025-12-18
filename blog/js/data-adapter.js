/* ========================================
   数据适配层 - 统一localStorage和API调用
   让现有代码无缝切换到JSON文件存储
   ======================================== */

class DataAdapter {
    constructor() {
        // 使用环境适配器
        this.environmentAdapter = window.environmentAdapter;
        
        if (!this.environmentAdapter) {
            console.error('❌ 环境适配器未找到，请确保 environment-adapter.js 已正确加载');
            // 创建一个基本的适配器作为后备
            this.environmentAdapter = {
                getData: this.getDataFromJSON.bind(this),
                saveData: () => Promise.resolve({ success: false, message: '环境适配器未加载' }),
                getEnvironmentInfo: () => ({ environment: 'unknown', supportsWrite: false })
            };
        }
        
        console.log('📖 数据适配层初始化 - 多环境支持:', this.environmentAdapter.getEnvironmentInfo());
    }

    // ========== 核心方法 ==========
    
    // 从JSON文件获取数据
    async getDataFromJSON(resource) {
        try {
            // 根据当前页面位置调整路径
            const currentPath = window.location.pathname;
            let url;
            
            console.log(`🔍 当前路径: ${currentPath}`);
            console.log(`🔍 是否包含/blog/pages/: ${currentPath.includes('/blog/pages/')}`);
            console.log(`🔍 是否包含/blog/: ${currentPath.includes('/blog/')}`);
            
            // 如果是GitHub Pages环境
            if (window.location.hostname.includes('github.io')) {
                // GitHub Pages: data和blog是同级目录
                // 获取仓库名称
                const pathParts = currentPath.split('/').filter(p => p);
                const repoName = pathParts.length > 0 ? pathParts[0] : '';
                
                // 直接使用绝对路径，避免相对路径混乱
                url = `/${repoName}/data/${resource}.json`;
            } else {
                // 本地环境使用相对路径
                if (currentPath.includes('/blog/pages/')) {
                    url = `../../data/${resource}.json`;
                } else if (currentPath.includes('/blog/')) {
                    url = `../data/${resource}.json`;
                } else {
                    url = `data/${resource}.json`;
                }
            }
            
            console.log(`📊 尝试加载 ${resource} 从:`, url);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`无法加载 ${resource}.json: ${response.status}`);
            }
            const data = await response.json();
            console.log(`✅ 从JSON文件加载 ${resource}:`, Array.isArray(data) ? `${data.length}条记录` : 'object');
            return data;
        } catch (error) {
            console.error(`❌ 加载 ${resource}.json 失败:`, error);
            // 返回空数据
            return resource === 'settings' ? {} : [];
        }
    }

    // 统一的数据获取方法
    async getData(resource) {
        return await this.environmentAdapter.getData(resource);
    }

    // 保存数据（通过环境适配器）
    async saveData(resource, data) {
        return await this.environmentAdapter.saveData(resource, data);
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
        const articles = await this.getArticles();
        return articles.find(article => article.id === parseInt(id));
    }

    // 前台只读，不支持添加
    async addArticle(article) {
        console.warn('⚠️ 前台只读模式，无法添加文章');
        return null;
    }

    // 更新文章（支持点赞等操作）
    async updateArticle(id, updates) {
        try {
            if (!this.environmentAdapter.supportsWrite) {
                console.warn('⚠️ 当前环境不支持写入操作');
                return null;
            }
            
            // 获取当前文章列表
            const articles = await this.getData('articles');
            const index = articles.findIndex(article => article.id === parseInt(id));
            
            if (index !== -1) {
                // 更新文章
                articles[index] = { ...articles[index], ...updates };
                
                // 保存更新后的数据
                const result = await this.saveData('articles', articles);
                if (result.success) {
                    console.log(`✅ 文章已更新: ${id}`);
                    return articles[index];
                }
            }
            
            console.warn('⚠️ 未找到文章:', id);
            return null;
        } catch (error) {
            console.error(`❌ 更新文章失败 (${id}):`, error);
            return null;
        }
    }

    // 前台只读，不支持删除
    async deleteArticle(id) {
        console.warn('⚠️ 前台只读模式，无法删除文章');
        return { success: false };
    }

    // ========== 分类相关方法 ==========
    
    async getCategories() {
        return await this.getData('categories');
    }

    async addCategory(category) {
        console.warn('⚠️ 前台只读模式，无法添加分类');
        return null;
    }

    async updateCategory(id, updates) {
        console.warn('⚠️ 前台只读模式，无法更新分类');
        return null;
    }

    async deleteCategory(id) {
        console.warn('⚠️ 前台只读模式，无法删除分类');
        return { success: false };
    }

    // ========== 标签相关方法 ==========
    
    async getTags() {
        return await this.getData('tags');
    }

    async addTag(tag) {
        console.warn('⚠️ 前台只读模式，无法添加标签');
        return null;
    }

    async updateTag(id, updates) {
        console.warn('⚠️ 前台只读模式，无法更新标签');
        return null;
    }

    async deleteTag(id) {
        console.warn('⚠️ 前台只读模式，无法删除标签');
        return { success: false };
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
        try {
            // 直接使用环境适配器的单项添加API
            if (this.environmentAdapter.environment === 'vercel') {
                const response = await fetch('/api/comments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(comment)
                });
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const result = await response.json();
                if (result.success) {
                    console.log('✅ 评论添加成功:', result.data);
                    return result.data;
                }
                throw new Error(result.error || '添加失败');
            } else {
                // 本地和静态环境的原有逻辑
                const comments = await this.getData('comments');
                
                // 生成新ID
                const newId = comments.length > 0 
                    ? Math.max(...comments.map(c => c.id || 0)) + 1 
                    : 1;
                
                // 添加ID和时间戳
                const newComment = {
                    id: newId,
                    ...comment,
                    time: comment.time || new Date().toISOString()
                };
                
                comments.push(newComment);
                await this.saveData('comments', comments);
                
                console.log('✅ 评论添加成功:', newComment);
                return newComment;
            }
        } catch (error) {
            console.error('❌ 添加评论失败:', error);
            throw error;
        }
    }

    async updateComment(id, updates) {
        try {
            // 在Vercel环境下使用单项更新API
            if (this.environmentAdapter.environment === 'vercel') {
                const result = await this.environmentAdapter.updateItem('comments', id, updates);
                if (result.success) {
                    console.log('✅ 评论更新成功 (Vercel):', result.data);
                    return result.data;
                } else {
                    throw new Error(result.message || '更新失败');
                }
            } else {
                // 其他环境使用原有逻辑
                const comments = await this.getData('comments');
                const index = comments.findIndex(c => c.id === parseInt(id));
                
                if (index !== -1) {
                    comments[index] = { ...comments[index], ...updates };
                    await this.saveData('comments', comments);
                    console.log('✅ 评论更新成功 (本地):', comments[index]);
                    return comments[index];
                }
                
                console.warn('⚠️ 未找到评论:', id);
                return null;
            }
        } catch (error) {
            console.error('❌ 更新评论失败:', error);
            throw error;
        }
    }

    async deleteComment(id) {
        try {
            const comments = await this.getData('comments');
            const filteredComments = comments.filter(c => c.id !== parseInt(id));
            
            if (filteredComments.length < comments.length) {
                await this.saveData('comments', filteredComments);
                console.log('✅ 评论删除成功:', id);
                return { success: true };
            }
            
            console.warn('⚠️ 未找到评论:', id);
            return { success: false };
        } catch (error) {
            console.error('❌ 删除评论失败:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== 留言相关方法 ==========
    
    async getGuestbookMessages() {
        return await this.getData('guestbook');
    }

    async addGuestbookMessage(message) {
        try {
            // 直接使用环境适配器的单项添加API
            if (this.environmentAdapter.environment === 'vercel') {
                const response = await fetch('/api/guestbook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(message)
                });
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const result = await response.json();
                if (result.success) {
                    console.log('✅ 留言添加成功:', result.data);
                    return result.data;
                }
                throw new Error(result.error || '添加失败');
            } else {
                // 本地和静态环境的原有逻辑
                const messages = await this.getData('guestbook');
                
                // 生成新ID
                const newId = messages.length > 0 
                    ? Math.max(...messages.map(m => m.id || 0)) + 1 
                    : 1;
                
                // 添加ID和时间戳
                const newMessage = {
                    id: newId,
                    ...message,
                    time: message.time || new Date().toISOString(),
                    likes: 0,
                    dislikes: 0
                };
                
                messages.push(newMessage);
                await this.saveData('guestbook', messages);
                
                console.log('✅ 留言添加成功:', newMessage);
                return newMessage;
            }
        } catch (error) {
            console.error('❌ 添加留言失败:', error);
            throw error;
        }
    }

    async updateGuestbookMessage(id, updates) {
        try {
            const messages = await this.getData('guestbook');
            const index = messages.findIndex(m => m.id === parseInt(id));
            
            if (index !== -1) {
                messages[index] = { ...messages[index], ...updates };
                await this.saveData('guestbook', messages);
                console.log('✅ 留言更新成功:', messages[index]);
                return messages[index];
            }
            
            console.warn('⚠️ 未找到留言:', id);
            return null;
        } catch (error) {
            console.error('❌ 更新留言失败:', error);
            throw error;
        }
    }

    async deleteGuestbookMessage(id) {
        try {
            const messages = await this.getData('guestbook');
            const filteredMessages = messages.filter(m => m.id !== parseInt(id));
            
            if (filteredMessages.length < messages.length) {
                await this.saveData('guestbook', filteredMessages);
                console.log('✅ 留言删除成功:', id);
                return { success: true };
            }
            
            console.warn('⚠️ 未找到留言:', id);
            return { success: false };
        } catch (error) {
            console.error('❌ 删除留言失败:', error);
            throw error;
        }
    }

    async addGuestbookMessage(message) {
        console.warn('⚠️ 前台只读模式，无法添加留言');
        return null;
    }

    async updateGuestbookMessage(id, updates) {
        console.warn('⚠️ 前台只读模式，无法更新留言');
        return null;
    }

    async deleteGuestbookMessage(id) {
        console.warn('⚠️ 前台只读模式，无法删除留言');
        return { success: false };
    }

    // ========== 设置相关方法 ==========
    
    async getSettings() {
        return await this.getData('settings');
    }

    async updateSettings(updates) {
        console.warn('⚠️ 前台只读模式，无法更新设置');
        return null;
    }

    // ========== 媒体相关方法 ==========
    
    async getImages() {
        const images = await this.getData('images');
        // 路径已经是绝对路径（以 / 开头），直接返回，不需要转换
        return images;
    }

    async getMusic() {
        return await this.getData('music');
    }

    async getVideos() {
        return await this.getData('videos');
    }

    async getLinks() {
        return await this.getData('links');
    }

    async getApps() {
        return await this.getData('apps');
    }

    // ========== 统计方法 ==========
    
    async getStats() {
        const [articles, comments, settings] = await Promise.all([
            this.getArticles(),
            this.getComments(),
            this.getSettings()
        ]);
        
        // 实时计算总字数
        const calculatedWords = articles
            .filter(a => a.status === 'published')
            .reduce((sum, article) => sum + (article.content?.length || 0), 0);
        
        // 实时计算文章总浏览量
        const calculatedViews = articles.reduce((sum, article) => sum + (article.views || 0), 0);
        
        // 计算运行天数
        const runningDays = Math.floor((Date.now() - new Date(settings.startDate || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
        
        // 如果计算值与 settings 中的值不同，则更新 settings
        let needUpdate = false;
        if (settings.totalWords !== calculatedWords) {
            settings.totalWords = calculatedWords;
            needUpdate = true;
        }
        if (settings.totalViews !== calculatedViews) {
            settings.totalViews = calculatedViews;
            needUpdate = true;
        }
        
        // 异步更新 settings（不阻塞返回）
        if (needUpdate && this.environmentAdapter.supportsWrite) {
            this.environmentAdapter.saveData('settings', settings)
                .then(result => {
                    if (result.success) {
                        console.log('✅ 统计数据已自动更新');
                        console.log(`   总字数: ${calculatedWords}, 总访问量: ${calculatedViews}`);
                    }
                })
                .catch(err => {
                    console.error('❌ 更新统计数据失败:', err);
                });
        }
        
        return {
            totalArticles: articles.filter(a => a.status === 'published').length,
            totalComments: comments.length,
            totalViews: calculatedViews,      // 使用计算值
            totalVisitors: settings.totalVisitors || 0,
            totalWords: calculatedWords,      // 使用计算值
            runningDays: runningDays
        };
    }
}

// 创建全局实例
window.dataAdapter = new DataAdapter();

console.log('✅ 数据适配层已加载');
