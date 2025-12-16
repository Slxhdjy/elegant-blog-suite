/* ========================================
   数据适配层 - 统一localStorage和API调用
   让现有代码无缝切换到JSON文件存储
   ======================================== */

class DataAdapter {
    constructor() {
        // 前台博客固定使用JSON文件模式（只读）
        this.useJSON = true;
        this.jsonBaseURL = '../data'; // JSON文件目录（相对于blog目录）
        this.fallbackToLocalStorage = false; // 前台不回退到localStorage
        
        console.log('📖 前台数据适配层初始化 - 使用JSON文件（只读模式）');
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
                // 简化判断：直接检查URL结构
                if (currentPath.endsWith('.html') && currentPath.includes('/pages/')) {
                    // 在pages目录下的页面: ../../data/
                    url = `../../data/${resource}.json`;
                } else if (currentPath.includes('/blog/')) {
                    // 在blog目录下: ../data/
                    url = `../data/${resource}.json`;
                } else {
                    // 在根目录: data/
                    url = `data/${resource}.json`;
                }
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
        return await this.getDataFromJSON(resource);
    }

    // 保存数据（通过 API 保存到 JSON 文件）
    async saveData(resource, data) {
        try {
            // 通过 API 保存到服务器（JSON 文件）
            const response = await fetch(`http://localhost:3001/api/${resource}/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`API 保存失败: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`✅ 数据已保存到 JSON 文件: ${resource}`);
            return { success: true, data: result };
        } catch (error) {
            console.error(`❌ 保存数据失败 (${resource}):`, error);
            console.error('请确保服务器正在运行 (node unified-server.js)');
            return { success: false, message: error.message };
        }
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
            // 通过 API 更新文章
            const response = await fetch(`http://localhost:3001/api/articles/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                throw new Error(`API 更新失败: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`✅ 文章已更新: ${id}`);
            return result.data;
        } catch (error) {
            console.error(`❌ 更新文章失败 (${id}):`, error);
            console.error('请确保服务器正在运行 (node unified-server.js)');
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
        } catch (error) {
            console.error('❌ 添加评论失败:', error);
            throw error;
        }
    }

    async updateComment(id, updates) {
        try {
            const comments = await this.getData('comments');
            const index = comments.findIndex(c => c.id === parseInt(id));
            
            if (index !== -1) {
                comments[index] = { ...comments[index], ...updates };
                await this.saveData('comments', comments);
                console.log('✅ 评论更新成功:', comments[index]);
                return comments[index];
            }
            
            console.warn('⚠️ 未找到评论:', id);
            return null;
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
        if (needUpdate) {
            // 先获取完整的 settings，然后只更新需要的字段
            fetch('http://localhost:3001/api/settings')
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        const fullSettings = result.data;
                        // 只更新计算的字段
                        fullSettings.totalWords = calculatedWords;
                        fullSettings.totalViews = calculatedViews;
                        
                        // 保存完整的 settings
                        return fetch('http://localhost:3001/api/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(fullSettings)
                        });
                    }
                })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        console.log('✅ 统计数据已自动更新到 settings.json');
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
