/* ========================================
   API客户端 - 替代localStorage
   ======================================== */

class APIClient {
    constructor(baseURL = null) {
        this.baseURL = baseURL || this.getApiBaseURL();
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

    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || '请求失败');
            }
            return data.data;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }

    // ========== 文章 ==========
    async getArticles() {
        return this.request('/articles');
    }

    async getArticle(id) {
        return this.request(`/articles?id=${id}`);
    }

    async createArticle(article) {
        return this.request('/articles', {
            method: 'POST',
            body: JSON.stringify(article)
        });
    }

    async updateArticle(id, article) {
        return this.request(`/articles?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(article)
        });
    }

    async deleteArticle(id) {
        return this.request(`/articles?id=${id}`, {
            method: 'DELETE'
        });
    }

    // ========== 分类 ==========
    async getCategories() {
        return this.request('/categories');
    }

    async createCategory(category) {
        return this.request('/categories', {
            method: 'POST',
            body: JSON.stringify(category)
        });
    }

    async updateCategory(id, category) {
        return this.request(`/categories?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(category)
        });
    }

    async deleteCategory(id) {
        return this.request(`/categories?id=${id}`, {
            method: 'DELETE'
        });
    }

    // ========== 标签 ==========
    async getTags() {
        return this.request('/tags');
    }

    async createTag(tag) {
        return this.request('/tags', {
            method: 'POST',
            body: JSON.stringify(tag)
        });
    }

    async updateTag(id, tag) {
        return this.request(`/tags?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(tag)
        });
    }

    async deleteTag(id) {
        return this.request(`/tags?id=${id}`, {
            method: 'DELETE'
        });
    }

    // ========== 评论 ==========
    async getComments() {
        return this.request('/comments');
    }

    async createComment(comment) {
        return this.request('/comments', {
            method: 'POST',
            body: JSON.stringify(comment)
        });
    }

    async deleteComment(id) {
        return this.request(`/comments?id=${id}`, {
            method: 'DELETE'
        });
    }

    // ========== 留言 ==========
    async getGuestbook() {
        return this.request('/guestbook');
    }

    async createGuestbookEntry(entry) {
        return this.request('/guestbook', {
            method: 'POST',
            body: JSON.stringify(entry)
        });
    }

    async updateGuestbookEntry(id, entry) {
        return this.request(`/guestbook?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(entry)
        });
    }

    async deleteGuestbookEntry(id) {
        return this.request(`/guestbook?id=${id}`, {
            method: 'DELETE'
        });
    }

    // ========== 用户 ==========
    async getUsers() {
        return this.request('/users');
    }

    async createUser(user) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(user)
        });
    }

    async updateUser(id, user) {
        return this.request(`/users?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(user)
        });
    }

    async deleteUser(id) {
        return this.request(`/users?id=${id}`, {
            method: 'DELETE'
        });
    }

    // ========== 设置 ==========
    async getSettings() {
        return this.request('/settings');
    }

    async updateSettings(settings) {
        return this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify({
                ...settings,
                _adminUpdate: true  // 🔥 标记为后台更新
            })
        });
    }

    // ========== 媒体 ==========
    async getImages() {
        return this.request('/images');
    }

    async createImage(image) {
        return this.request('/images', {
            method: 'POST',
            body: JSON.stringify(image)
        });
    }

    async deleteImage(id) {
        return this.request(`/images?id=${id}`, {
            method: 'DELETE'
        });
    }

    async getMusic() {
        return this.request('/music');
    }

    async createMusic(music) {
        return this.request('/music', {
            method: 'POST',
            body: JSON.stringify(music)
        });
    }

    async updateMusic(id, music) {
        return this.request(`/music?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(music)
        });
    }

    async deleteMusic(id) {
        return this.request(`/music?id=${id}`, {
            method: 'DELETE'
        });
    }

    async getVideos() {
        return this.request('/videos');
    }

    async createVideo(video) {
        return this.request('/videos', {
            method: 'POST',
            body: JSON.stringify(video)
        });
    }

    async deleteVideo(id) {
        return this.request(`/videos?id=${id}`, {
            method: 'DELETE'
        });
    }

    // ========== 友链 ==========
    async getLinks() {
        return this.request('/links');
    }

    async createLink(link) {
        return this.request('/links', {
            method: 'POST',
            body: JSON.stringify(link)
        });
    }

    async updateLink(id, link) {
        return this.request(`/links?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(link)
        });
    }

    async deleteLink(id) {
        return this.request(`/links?id=${id}`, {
            method: 'DELETE'
        });
    }

    // ========== 事项 ==========
    async getEvents() {
        return this.request('/events');
    }

    async createEvent(event) {
        return this.request('/events', {
            method: 'POST',
            body: JSON.stringify(event)
        });
    }

    async updateEvent(id, event) {
        return this.request(`/events?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(event)
        });
    }

    async deleteEvent(id) {
        return this.request(`/events?id=${id}`, {
            method: 'DELETE'
        });
    }

    // ========== 健康检查 ==========
    async checkHealth() {
        return this.request('/health');
    }
}

// 创建全局实例
window.apiClient = new APIClient();

console.log('✅ API客户端已加载');
