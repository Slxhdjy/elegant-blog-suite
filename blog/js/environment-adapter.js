/**
 * 环境适配器 - 统一处理不同部署环境
 * 保持现有功能不变，新增Vercel支持
 */

class EnvironmentAdapter {
    constructor() {
        this.environment = this.detectEnvironment();
        this.apiBase = this.getApiBase();
        
        console.log('🌍 环境适配器初始化:', {
            environment: this.environment,
            apiBase: this.apiBase,
            hostname: window.location.hostname
        });
    }
    
    // 检测当前环境
    detectEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname.includes('vercel.app') || hostname.includes('web3v.vip') || hostname.includes('slxhdjy.top')) {
            return 'vercel';
        } else if (hostname.includes('github.io')) {
            return 'github-pages';
        } else if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
            return 'local';
        } else {
            return 'static'; // 其他静态部署
        }
    }
    
    // 获取API基础路径
    getApiBase() {
        const hostname = window.location.hostname;
        
        switch (this.environment) {
            case 'vercel':
                // 特殊处理 slxhdjy.top 域名
                if (hostname.includes('slxhdjy.top')) {
                    return 'https://www.slxhdjy.top/api';
                }
                return '/api'; // 其他 Vercel Functions
            case 'local':
                return 'http://localhost:3001/api'; // 本地服务器
            case 'github-pages':
            case 'static':
            default:
                return null; // 静态模式，直接读取JSON
        }
    }
    
    // 统一的数据获取方法
    async getData(resource) {
        switch (this.environment) {
            case 'vercel':
                return await this.getDataFromVercel(resource);
            case 'local':
                return await this.getDataFromLocal(resource);
            case 'github-pages':
            case 'static':
            default:
                return await this.getDataFromJSON(resource);
        }
    }
    
    // Vercel环境：使用Serverless Functions
    async getDataFromVercel(resource) {
        try {
            const response = await fetch(`${this.apiBase}/${resource}`);
            if (!response.ok) {
                throw new Error(`Vercel API error: ${response.status}`);
            }
            const result = await response.json();
            console.log(`✅ Vercel API获取${resource}成功:`, Array.isArray(result.data) ? `${result.data.length}条` : 'object');
            return result.success ? result.data : (resource === 'settings' ? {} : []);
        } catch (error) {
            console.error(`❌ Vercel API获取${resource}失败:`, error);
            // 降级到JSON文件
            console.log(`🔄 降级到JSON文件模式获取${resource}`);
            return await this.getDataFromJSON(resource);
        }
    }
    
    // 本地环境：使用Express服务器 (保持不变)
    async getDataFromLocal(resource) {
        try {
            const response = await fetch(`${this.apiBase}/${resource}`);
            if (!response.ok) {
                throw new Error(`Local API error: ${response.status}`);
            }
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error(`❌ 本地API获取${resource}失败:`, error);
            // 降级到JSON文件
            return await this.getDataFromJSON(resource);
        }
    }
    
    // 静态环境：直接读取JSON文件 (恢复昨天的工作版本)
    async getDataFromJSON(resource) {
        try {
            const currentPath = window.location.pathname;
            let url;
            
            // 如果是GitHub Pages环境
            if (window.location.hostname.includes('github.io')) {
                // 使用绝对路径，直接指向data目录
                url = `/data/${resource}.json`;
            } else {
                // 本地环境使用相对路径
                let basePath = '../data';
                
                if (currentPath.includes('/blog/pages/')) {
                    basePath = '../../data';
                } else if (currentPath.includes('/blog/')) {
                    basePath = '../data';
                } else {
                    basePath = 'data';
                }
                
                url = `${basePath}/${resource}.json`;
            }
            
            console.log(`🔍 尝试加载${resource}:`, url);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`JSON file error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ 从JSON文件加载${resource}:`, Array.isArray(data) ? `${data.length}条` : 'object');
            return data;
        } catch (error) {
            console.error(`❌ JSON文件获取${resource}失败:`, error);
            return resource === 'settings' ? {} : [];
        }
    }
    
    // 统一的数据保存方法
    async saveData(resource, data) {
        switch (this.environment) {
            case 'vercel':
                return await this.saveDataToVercel(resource, data);
            case 'local':
                return await this.saveDataToLocal(resource, data);
            case 'github-pages':
            case 'static':
            default:
                this.showStaticModeNotice('保存功能在静态部署中不可用');
                return { success: false, message: '静态模式不支持保存' };
        }
    }
    
    // Vercel环境：前台智能写入模式
    async saveDataToVercel(resource, data) {
        // 允许评论和留言的批量保存（用户交互功能）
        if (resource === 'comments' || resource === 'guestbook') {
            try {
                const response = await fetch(`${this.apiBase}/${resource}/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    throw new Error(`Vercel save error: ${response.status}`);
                }
                
                const result = await response.json();
                console.log(`✅ ${resource} 批量保存成功`);
                return result;
            } catch (error) {
                console.error(`❌ Vercel保存${resource}失败:`, error);
                return { success: false, message: error.message };
            }
        }
        
        // 禁止其他资源的批量保存（防止覆盖后台数据）
        console.warn('⚠️ 前台只读模式：禁止保存数据到后端，避免覆盖后台数据');
        console.log('📝 尝试保存的数据 (仅记录，不执行):', { resource, dataLength: Array.isArray(data) ? data.length : 'object' });
        return { success: false, message: '前台只读模式：禁止写入操作' };
    }
    
    // 本地环境：保存到JSON文件 (保持不变)
    async saveDataToLocal(resource, data) {
        try {
            const response = await fetch(`${this.apiBase}/${resource}/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`Local save error: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`❌ 本地保存${resource}失败:`, error);
            return { success: false, message: error.message };
        }
    }
    
    // 更新单个项目
    async updateItem(resource, id, updates) {
        switch (this.environment) {
            case 'vercel':
                return await this.updateItemToVercel(resource, id, updates);
            case 'local':
                return await this.updateItemToLocal(resource, id, updates);
            case 'github-pages':
            case 'static':
            default:
                this.showStaticModeNotice('更新功能在静态部署中不可用');
                return { success: false, message: '静态模式不支持更新' };
        }
    }
    
    // Vercel环境：前台只读模式，禁止更新单个项目
    async updateItemToVercel(resource, id, updates) {
        console.warn('⚠️ 前台只读模式：禁止更新数据到后端，避免覆盖后台数据');
        console.log('📝 尝试更新的数据 (仅记录，不执行):', { resource, id, updates });
        return { success: false, message: '前台只读模式：禁止写入操作' };
    }
    
    // 本地环境：更新单个项目
    async updateItemToLocal(resource, id, updates) {
        try {
            // 🔥 本地服务器使用路径参数格式: /api/resource/:id
            const response = await fetch(`${this.apiBase}/${resource}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                throw new Error(`Local update error: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`❌ 本地更新${resource}失败:`, error);
            return { success: false, message: error.message };
        }
    }
    
    // 显示静态模式提示
    showStaticModeNotice(message) {
        const notice = document.createElement('div');
        notice.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: rgba(255, 193, 7, 0.9); color: #333;
            padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            max-width: 300px;
        `;
        notice.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">⚠️</span>
                <div>
                    <div style="font-weight: 500;">${message}</div>
                    <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">
                        如需完整功能，请使用本地或Vercel部署
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notice);
        setTimeout(() => notice.remove(), 4000);
    }
    
    // 前台智能写入模式：支持用户交互功能，禁止系统数据覆盖
    get supportsWrite() {
        return this.environment === 'vercel' || this.environment === 'local';
    }
    
    // 获取环境信息
    getEnvironmentInfo() {
        return {
            environment: this.environment,
            apiBase: this.apiBase,
            supportsWrite: this.supportsWrite,
            features: {
                dataRead: true,
                dataWrite: this.supportsWrite,
                fileUpload: this.supportsWrite,
                realTimeSync: this.environment === 'vercel' || this.environment === 'local'
            }
        };
    }
}

// 创建全局实例
window.environmentAdapter = new EnvironmentAdapter();

console.log('🌍 环境适配器已加载:', window.environmentAdapter.getEnvironmentInfo());