/* ========================================
   应用管理器 - 后台卡片式管理
   ======================================== */

class AppsAdminManager {
    constructor() {
        this.apps = [];
        this.currentApp = null;
        this.boundHandleClick = null; // 存储绑定的事件处理器引用
        this.init();
    }

    async init() {
        console.log('📱 初始化应用管理器...');
        await this.loadApps();
        this.renderApps();
    }

    // 加载应用数据
    async loadApps() {
        try {
            console.log('📱 开始加载应用数据...');
            
            // 优先使用环境适配器
            if (window.environmentAdapter && window.environmentAdapter.initialized) {
                console.log('🌍 使用环境适配器加载应用数据');
                this.apps = await window.environmentAdapter.getData('apps');
                this.apps = this.apps.sort((a, b) => (a.order || 0) - (b.order || 0));
                console.log(`✅ 从环境适配器加载了 ${this.apps.length} 个应用`);
                return;
            }
            
            // 回退到直接API调用
            const hostname = window.location.hostname;
            let url;
            
            if (hostname.includes('vercel.app') || 
                hostname.includes('vercel.com') ||
                hostname.includes('web3v.vip') || 
                hostname.includes('slxhdjy.top')) {
                // Vercel环境：使用API
                url = '/api/apps';
                console.log('🌐 Vercel环境：使用API加载');
            } else if (hostname.includes('github.io')) {
                // GitHub Pages：使用绝对路径
                url = '/data/apps.json';
                console.log('📄 GitHub Pages：使用JSON文件');
            } else if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
                // 本地环境：优先尝试API
                try {
                    const apiResponse = await fetch('/api/apps');
                    if (apiResponse.ok) {
                        url = '/api/apps';
                        console.log('🏠 本地环境：使用API');
                    } else {
                        throw new Error('API不可用');
                    }
                } catch (e) {
                    url = '../data/apps.json';
                    console.log('🏠 本地环境：回退到JSON文件');
                }
            } else {
                // 其他环境：使用相对路径
                url = '../data/apps.json';
                console.log('📁 其他环境：使用相对路径JSON文件');
            }
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            if (url.includes('/api/')) {
                // API响应
                const result = await response.json();
                if (result.success) {
                    this.apps = result.data;
                } else {
                    throw new Error(result.error || 'API返回失败');
                }
            } else {
                // JSON文件响应
                this.apps = await response.json();
            }
            
            this.apps = this.apps.sort((a, b) => (a.order || 0) - (b.order || 0));
            console.log(`✅ 成功加载了 ${this.apps.length} 个应用`);
            
        } catch (error) {
            console.error('❌ 加载应用出错:', error);
            this.apps = [];
            
            // 显示用户友好的错误信息
            const container = document.getElementById('appsManageGrid');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">⚠️</div>
                        <p>应用数据加载失败</p>
                        <p style="font-size: 0.9rem; color: #666;">${error.message}</p>
                        <button class="btn-primary" onclick="window.appsAdminManager?.loadApps().then(() => window.appsAdminManager?.renderApps())">
                            🔄 重试
                        </button>
                    </div>
                `;
            }
        }
    }

    // 渲染应用卡片
    renderApps() {
        const container = document.getElementById('appsManageGrid');
        if (!container) return;

        if (this.apps.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📱</div>
                    <p>还没有添加任何应用</p>
                    <button class="btn-primary" data-action="add-app">
                        + 添加第一个应用
                    </button>
                </div>
            `;
        } else {
            const html = this.apps.map(app => `
                <div class="app-manage-card ${app.status === 'disabled' ? 'disabled' : ''}" data-id="${app.id}">
                    <div class="app-card-header">
                        <div class="app-card-icon">${app.icon || '📱'}</div>
                        <div class="app-card-status ${app.status}">
                            ${app.status === 'enabled' ? '✓ 已启用' : '✗ 已禁用'}
                        </div>
                    </div>
                    <div class="app-card-body">
                        <h3 class="app-card-title">${this.escapeHtml(app.name)}</h3>
                        <div class="app-card-category">${this.escapeHtml(app.category || '未分类')}</div>
                        <p class="app-card-desc">${this.escapeHtml(app.description || '暂无描述')}</p>
                        <div class="app-card-url">
                            <span class="url-label">链接:</span>
                            <span class="url-value">${this.escapeHtml(app.url)}</span>
                        </div>
                    </div>
                    <div class="app-card-footer">
                        <button class="btn-icon" data-action="edit" data-app-id="${app.id}" title="编辑">
                            ✏️
                        </button>
                        <button class="btn-icon" data-action="toggle" data-app-id="${app.id}" title="${app.status === 'enabled' ? '禁用' : '启用'}">
                            ${app.status === 'enabled' ? '🔒' : '🔓'}
                        </button>
                        <button class="btn-icon btn-danger" data-action="delete" data-app-id="${app.id}" title="删除">
                            🗑️
                        </button>
                    </div>
                </div>
            `).join('');

            container.innerHTML = html;
        }

        // 绑定事件委托
        this.bindEvents();
    }

    // 绑定事件委托
    bindEvents() {
        const container = document.getElementById('appsManageGrid');
        if (!container) return;

        // 如果已经绑定过，先移除旧的事件监听器
        if (this.boundHandleClick) {
            container.removeEventListener('click', this.boundHandleClick);
        }
        
        // 绑定新的事件监听器
        this.boundHandleClick = this.handleClick.bind(this);
        container.addEventListener('click', this.boundHandleClick);
    }

    // 处理点击事件
    handleClick(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const appId = button.dataset.appId;

        switch (action) {
            case 'add-app':
                this.showAppModal();
                break;
            case 'edit':
                this.editApp(appId);
                break;
            case 'toggle':
                this.toggleStatus(appId);
                break;
            case 'delete':
                this.deleteApp(appId);
                break;
        }
    }

    // 显示添加/编辑模态框
    showAppModal(appId = null) {
        console.log('📝 showAppModal 被调用, appId:', appId);
        
        const modal = document.getElementById('appModal');
        const title = document.getElementById('appModalTitle');
        const form = document.getElementById('appForm');
        
        console.log('🔍 查找元素:', {
            modal: !!modal,
            title: !!title,
            form: !!form
        });
        
        if (!modal || !form) {
            console.error('❌ 模态框元素不存在:', { modal: !!modal, form: !!form });
            return;
        }

        // 重置表单
        form.reset();
        this.currentApp = null;

        if (appId) {
            // 编辑模式
            const app = this.apps.find(a => a.id === appId);
            if (!app) return;
            
            this.currentApp = app;
            title.textContent = '编辑应用';
            
            // 填充表单
            document.getElementById('appName').value = app.name || '';
            document.getElementById('appIcon').value = app.icon || '';
            document.getElementById('appCategory').value = app.category || '';
            document.getElementById('appUrl').value = app.url || '';
            document.getElementById('appDescription').value = app.description || '';
            document.getElementById('appStatus').value = app.status || 'enabled';
            document.getElementById('appOrder').value = app.order || 0;
        } else {
            // 添加模式
            title.textContent = '添加应用';
            document.getElementById('appStatus').value = 'enabled';
            document.getElementById('appOrder').value = this.apps.length + 1;
        }

        console.log('✅ 显示模态框');
        modal.style.display = 'flex';
        
        // 添加点击背景关闭功能
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.hideAppModal();
            }
        };
        
        console.log('🎉 模态框已显示');
    }

    // 隐藏模态框
    hideAppModal() {
        const modal = document.getElementById('appModal');
        if (modal) {
            modal.style.display = 'none';
            modal.onclick = null; // 移除事件监听
        }
        this.currentApp = null;
    }

    // 保存应用
    async saveApp(event) {
        event.preventDefault();
        
        // 检查权限
        const action = this.currentApp ? 'update' : 'create';
        if (!window.checkPermission('apps', action)) {
            return;
        }
        
        const formData = {
            name: document.getElementById('appName').value.trim(),
            icon: document.getElementById('appIcon').value.trim(),
            category: document.getElementById('appCategory').value.trim(),
            url: document.getElementById('appUrl').value.trim(),
            description: document.getElementById('appDescription').value.trim(),
            status: document.getElementById('appStatus').value,
            order: parseInt(document.getElementById('appOrder').value) || 0
        };

        if (!formData.name || !formData.url) {
            alert('请填写应用名称和链接');
            return;
        }

        try {
            // 检查是否为静态环境
            const isStatic = window.location.hostname.includes('github.io') || 
                            window.location.hostname.includes('vercel.app') ||
                            !window.location.hostname.includes('localhost');
            
            if (isStatic) {
                // 静态环境：显示提示信息
                alert('静态部署环境下无法保存应用，请在本地环境使用完整功能');
                return;
            }
            
            let response;
            
            // 在Vercel环境下，只使用环境适配器，不回退
            if (window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
                console.log('🌐 Vercel环境：使用环境适配器保存应用');
                
                if (this.currentApp) {
                    // 更新现有应用
                    const result = await window.environmentAdapter.updateItem('apps', this.currentApp.id, formData);
                    if (!result.success) {
                        throw new Error(result.message || '更新应用失败');
                    }
                } else {
                    // 创建新应用
                    formData.createdAt = new Date().toISOString();
                    const result = await window.environmentAdapter.createItem('apps', formData);
                    if (!result.success) {
                        throw new Error(result.message || '创建应用失败');
                    }
                }
                
                // 模拟response对象
                response = { ok: true, json: async () => ({ success: true }) };
            } else {
                // 非Vercel环境的处理
                if (this.currentApp) {
                    // 更新现有应用
                    const apiBase = window.environmentAdapter ? window.environmentAdapter.apiBase : '/api';
                    response = await fetch(`${apiBase}/apps/${this.currentApp.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                } else {
                    // 创建新应用
                    formData.createdAt = new Date().toISOString();
                    const apiBase = window.environmentAdapter ? window.environmentAdapter.apiBase : '/api';
                    response = await fetch(`${apiBase}/apps`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                }
            }

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ 应用保存成功');
                await this.loadApps();
                this.renderApps();
                this.hideAppModal();
            } else {
                alert('保存失败: ' + (result.message || '未知错误'));
            }
        } catch (error) {
            console.error('❌ 保存应用出错:', error);
            alert('保存失败，请重试');
        }
    }

    // 编辑应用
    editApp(appId) {
        // 检查权限
        if (!window.checkPermission('apps', 'update')) {
            return;
        }
        
        this.showAppModal(appId);
    }

    // 切换应用状态
    async toggleStatus(appId) {
        // 检查权限
        if (!window.checkPermission('apps', 'update')) {
            return;
        }
        
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;

        const newStatus = app.status === 'enabled' ? 'disabled' : 'enabled';
        
        try {
            // 在Vercel环境下，只使用环境适配器，不回退
            if (window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
                console.log('🌐 Vercel环境：使用环境适配器切换应用状态');
                const result = await window.environmentAdapter.updateItem('apps', appId, { ...app, status: newStatus });
                if (result.success) {
                    console.log(`✅ 应用状态已更新为: ${newStatus}`);
                    await this.loadApps();
                    this.renderApps();
                } else {
                    throw new Error(result.message || '状态更新失败');
                }
            } else {
                // 非Vercel环境的处理
                const apiBase = window.environmentAdapter ? window.environmentAdapter.apiBase : '/api';
                const response = await fetch(`${apiBase}/apps/${appId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...app, status: newStatus })
                });

                const result = await response.json();
                
                if (result.success) {
                    console.log(`✅ 应用状态已更新为: ${newStatus}`);
                    await this.loadApps();
                    this.renderApps();
                } else {
                    alert('状态更新失败');
                }
            }
        } catch (error) {
            console.error('❌ 更新状态出错:', error);
            alert('状态更新失败，请重试');
        }
    }

    // 删除应用
    async deleteApp(appId) {
        // 检查权限
        if (!window.checkPermission('apps', 'delete')) {
            return;
        }
        
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;

        if (!confirm(`确定要删除应用"${app.name}"吗？`)) {
            return;
        }

        try {
            // 在Vercel环境下，只使用环境适配器，不回退
            if (window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
                console.log('🌐 Vercel环境：使用环境适配器删除应用');
                const result = await window.environmentAdapter.deleteItem('apps', appId);
                if (result.success) {
                    console.log('✅ 应用已删除');
                    await this.loadApps();
                    this.renderApps();
                } else {
                    throw new Error(result.message || '删除应用失败');
                }
            } else {
                // 非Vercel环境的处理
                // 检查是否为静态环境
                const isStatic = window.location.hostname.includes('github.io') || 
                                !window.location.hostname.includes('localhost');
                
                if (isStatic) {
                    // 静态环境：显示提示信息
                    alert('静态部署环境下无法删除应用，请在本地环境使用完整功能');
                    return;
                }
                
                const apiBase = window.environmentAdapter ? window.environmentAdapter.apiBase : '/api';
                const response = await fetch(`${apiBase}/apps/${appId}`, {
                    method: 'DELETE'
                });

                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ 应用已删除');
                    await this.loadApps();
                    this.renderApps();
                } else {
                    alert('删除失败');
                }
            }
        } catch (error) {
            console.error('❌ 删除应用出错:', error);
            alert('删除失败，请重试');
        }
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 全局实例
window.appsAdminManager = null;

// 初始化
function initAppsManager() {
    if (!window.appsAdminManager) {
        window.appsAdminManager = new AppsAdminManager();
    } else {
        // 如果已经存在，重新绑定事件以确保正常工作
        window.appsAdminManager.bindEvents();
    }
}

// 安全的显示应用模态框函数
function safeShowAppModal() {
    console.log('🎯 safeShowAppModal 被调用');
    
    // 检查权限
    if (!window.checkPermission('apps', 'create')) {
        return;
    }
    
    if (!window.appsAdminManager) {
        console.log('⚠️ appsAdminManager 不存在，正在初始化...');
        initAppsManager();
    }
    
    if (window.appsAdminManager && typeof window.appsAdminManager.showAppModal === 'function') {
        console.log('✅ 调用 appsAdminManager.showAppModal()');
        window.appsAdminManager.showAppModal();
    } else {
        console.error('❌ appsAdminManager 或 showAppModal 方法不存在');
        alert('应用管理器初始化失败，请刷新页面重试');
    }
}

// 将函数添加到全局作用域
window.safeShowAppModal = safeShowAppModal;
