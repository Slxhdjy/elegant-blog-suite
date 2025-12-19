/* ========================================
   文件上传工具
   支持上传图片到服务器
   ======================================== */

class FileUploader {
    constructor(serverUrl = null) {
        this.serverUrl = serverUrl || this.getApiBaseURL();
    }

    // 获取API基础URL
    getApiBaseURL() {
        // 优先使用环境适配器（确保已初始化）
        if (window.environmentAdapter && window.environmentAdapter.initialized && window.environmentAdapter.apiBase) {
            return window.environmentAdapter.apiBase.replace('/api', '');
        }
        
        // 根据当前环境动态判断
        const hostname = window.location.hostname;
        if (hostname.includes('vercel.app') || 
            hostname.includes('vercel.com') ||
            hostname.includes('web3v.vip') || 
            hostname.includes('slxhdjy.top')) {
            return ''; // Vercel环境使用相对路径
        } else if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
            return 'http://localhost:3001'; // 本地环境
        } else {
            return ''; // 默认使用相对路径
        }
    }
    
    // 上传单个图片
    async uploadImage(file) {
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch(`${this.serverUrl}/upload/image`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                return {
                    success: true,
                    url: result.data.url,
                    filename: result.data.filename,
                    size: result.data.size
                };
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('上传失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 上传多个图片
    async uploadImages(files) {
        try {
            const formData = new FormData();
            for (let file of files) {
                formData.append('images', file);
            }
            
            const response = await fetch(`${this.serverUrl}/upload/images`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                return {
                    success: true,
                    files: result.data
                };
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('上传失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 删除图片
    async deleteImage(filename) {
        try {
            const response = await fetch(`${this.serverUrl}/upload/image/${filename}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('删除失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 获取图片列表
    async getImages() {
        try {
            const response = await fetch(`${this.serverUrl}/upload/images`);
            const result = await response.json();
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('获取列表失败:', error);
            return [];
        }
    }
    
    // 检查服务器是否可用
    async checkServer() {
        try {
            const response = await fetch(`${this.serverUrl}/upload/images`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
    
    // 上传飞书文档图片（到文档专用文件夹）
    async uploadFeishuImage(file, articleId) {
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('articleId', articleId); // 传递文档ID
            formData.append('type', 'article'); // 标记为文档图片
            
            const response = await fetch(`${this.serverUrl}/upload/article-image`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                return {
                    success: true,
                    url: result.data.url,
                    filename: result.data.filename,
                    size: result.data.size
                };
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('上传飞书图片失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 创建全局实例
window.fileUploader = new FileUploader();
