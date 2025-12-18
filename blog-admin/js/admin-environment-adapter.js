/**
 * 后台管理界面环境适配器 - 简化版本
 */

class AdminEnvironmentAdapter {
    constructor() {
        this.environment = this.detectEnvironment();
        this.apiBase = this.getApiBase();
        
        console.log('🌍 后台环境适配器初始化:', {
            environment: this.environment,
            apiBase: this.apiBase,
            hostname: window.location.hostname
        });
    }
    
    // 检测当前环境
    detectEnvironment() {
        const hostname = window.location.hostname;
        
        // 更全面的Vercel环境检测
        if (hostname.includes('vercel.app') || 
            hostname.includes('vercel.com') ||
            hostname.includes('web3v.vip') || 
            hostname.includes('slxhdjy.top') ||
            window.location.origin.includes('vercel')) {
            return 'vercel';
        } else if (hostname.includes('github.io')) {
            return 'github-pages';
        } else if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
            return 'local';
        } else {
            return 'static';
        }
    }
    
    // 获取API基础路径
    getApiBase() {
        switch (this.environment) {
            case 'vercel':
                return '/api'; // Vercel Functions
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
            const url = `${this.apiBase}/${resource}`;
            console.log(`🔍 Vercel API请求:`, url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            console.log(`📡 API响应状态:`, response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ API错误响应:`, errorText);
                throw new Error(`Vercel API error: ${response.status} - ${errorText}`);
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
    
    // 本地环境：使用Express服务器
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
    
    // 静态环境：直接读取JSON文件
    async getDataFromJSON(resource) {
        try {
            // 后台管理界面使用相对路径
            const url = `../data/${resource}.json`;
            
            console.log(`🔍 尝试加载${resource}:`, url);
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`⚠️ 无法加载${resource}.json (${response.status})，返回空数据`);
                return resource === 'settings' ? {} : [];
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
    
    // Vercel环境：保存到云存储
    async saveDataToVercel(resource, data) {
        try {
            // settings 使用 PUT，其他资源使用 POST batch
            let url, method;
            if (resource === 'settings') {
                url = `${this.apiBase}/${resource}`;
                method = 'PUT';
            } else {
                url = `${this.apiBase}/${resource}/batch`;
                method = 'POST';
            }
            
            console.log(`🔍 Vercel保存请求:`, { url, method, dataType: typeof data, dataLength: Array.isArray(data) ? data.length : 'object' });
            
            const response = await fetch(url, {
                method: method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            console.log(`📡 保存响应状态:`, response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ 保存错误响应:`, errorText);
                throw new Error(`Vercel save error: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log(`✅ Vercel保存${resource}成功:`, result);
            return result;
        } catch (error) {
            console.error(`❌ Vercel保存${resource}失败:`, error);
            return { success: false, message: error.message };
        }
    }
    
    // 本地环境：保存到JSON文件
    async saveDataToLocal(resource, data) {
        try {
            // settings 使用 PUT，其他资源使用 POST batch
            let response;
            if (resource === 'settings') {
                response = await fetch(`${this.apiBase}/${resource}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                response = await fetch(`${this.apiBase}/${resource}/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
            
            if (!response.ok) {
                throw new Error(`Local save error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`✅ 本地保存${resource}成功:`, result);
            return result;
        } catch (error) {
            console.error(`❌ 本地保存${resource}失败:`, error);
            return { success: false, message: error.message };
        }
    }
    
    // 单项CRUD操作方法
    async createItem(resource, item) {
        try {
            const url = `${this.apiBase}/${resource}`;
            console.log(`🔍 创建${resource}请求:`, { url, item });
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(item)
            });
            
            console.log(`📡 创建响应状态:`, response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ 创建错误响应:`, errorText);
                throw new Error(`Create ${resource} error: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log(`✅ 创建${resource}成功:`, result);
            return result;
        } catch (error) {
            console.error(`❌ 创建${resource}失败:`, error);
            return { success: false, message: error.message };
        }
    }
    
    async updateItem(resource, id, updates) {
        try {
            const url = `${this.apiBase}/${resource}/${id}`;
            console.log(`🔍 更新${resource}请求:`, { url, id, updates });
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            
            console.log(`📡 更新响应状态:`, response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ 更新错误响应:`, errorText);
                throw new Error(`Update ${resource} error: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log(`✅ 更新${resource}成功:`, result);
            return result;
        } catch (error) {
            console.error(`❌ 更新${resource}失败:`, error);
            return { success: false, message: error.message };
        }
    }
    
    async deleteItem(resource, id) {
        try {
            const url = `${this.apiBase}/${resource}/${id}`;
            console.log(`🔍 删除${resource}请求:`, { url, id });
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            console.log(`📡 删除响应状态:`, response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ 删除错误响应:`, errorText);
                throw new Error(`Delete ${resource} error: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log(`✅ 删除${resource}成功:`, result);
            return result;
        } catch (error) {
            console.error(`❌ 删除${resource}失败:`, error);
            return { success: false, message: error.message };
        }
    }
    
    // 显示静态模式提示
    showStaticModeNotice(message) {
        // 避免重复显示相同的通知
        const existingNotice = document.querySelector('.static-mode-notice');
        if (existingNotice) {
            return;
        }
        
        const notice = document.createElement('div');
        notice.className = 'static-mode-notice';
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
                        当前环境: ${this.environment}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notice);
        setTimeout(() => notice.remove(), 5000);
    }
    
    // 检查是否支持写入操作
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
window.environmentAdapter = new AdminEnvironmentAdapter();

console.log('🌍 后台环境适配器已加载:', window.environmentAdapter.getEnvironmentInfo());