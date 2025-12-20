/* ========================================
   权限管理系统
   ======================================== */

class PermissionManager {
    constructor() {
        this.permissions = this.initializePermissions();
        this.currentUser = null;
        this.initialized = false;
        this.init();
    }

    // 初始化权限配置
    initializePermissions() {
        return {
            // 权限定义：模块 -> 操作 -> 角色列表
            articles: {
                read: ['super_admin', 'admin', 'editor', 'viewer'],
                create: ['super_admin', 'admin', 'editor'],
                update: ['super_admin', 'admin', 'editor'],
                delete: ['super_admin', 'admin']
            },
            categories: {
                read: ['super_admin', 'admin', 'editor', 'viewer'],
                create: ['super_admin', 'admin', 'editor'],
                update: ['super_admin', 'admin', 'editor'],
                delete: ['super_admin', 'admin']
            },
            tags: {
                read: ['super_admin', 'admin', 'editor', 'viewer'],
                create: ['super_admin', 'admin', 'editor'],
                update: ['super_admin', 'admin', 'editor'],
                delete: ['super_admin', 'admin']
            },
            comments: {
                read: ['super_admin', 'admin', 'editor', 'viewer'],
                create: ['super_admin', 'admin', 'editor'],
                update: ['super_admin', 'admin', 'editor'],
                delete: ['super_admin', 'admin'],
                approve: ['super_admin', 'admin', 'editor']
            },
            guestbook: {
                read: ['super_admin', 'admin', 'editor', 'viewer'],
                create: ['super_admin', 'admin', 'editor'],
                update: ['super_admin', 'admin', 'editor'],
                delete: ['super_admin', 'admin']
            },
            media: {
                read: ['super_admin', 'admin', 'editor', 'viewer'],
                upload: ['super_admin', 'admin'],
                update: ['super_admin', 'admin'],
                delete: ['super_admin', 'admin']
            },
            users: {
                read: ['super_admin'],
                create: ['super_admin'],
                update: ['super_admin', 'admin', 'editor', 'viewer'], // 允许用户修改自己的信息
                delete: ['super_admin'],
                change_role: ['super_admin'],
                change_password: ['super_admin', 'admin', 'editor', 'viewer'] // 允许用户修改自己的密码
            },
            settings: {
                read: ['super_admin', 'admin', 'viewer'],
                update: ['super_admin', 'admin']
            },
            apps: {
                read: ['super_admin', 'admin', 'editor', 'viewer'],
                create: ['super_admin', 'admin'],
                update: ['super_admin', 'admin'],
                delete: ['super_admin', 'admin']
            },
            dashboard: {
                read: ['super_admin', 'admin', 'editor', 'viewer']
            },
            events: {
                read: ['super_admin', 'admin', 'editor', 'viewer'],
                create: ['super_admin', 'admin', 'editor'],
                update: ['super_admin', 'admin', 'editor'],
                delete: ['super_admin', 'admin', 'editor']
            }
        };
    }

    // 初始化
    async init() {
        try {
            await this.loadCurrentUser();
            this.setupPermissionUI();
            console.log('🔐 权限管理器初始化完成');
            console.log('👤 当前用户权限:', this.getUserPermissions());
            
            // 标记权限管理器已就绪
            this.initialized = true;
            
            // 延迟执行按钮样式更新，确保DOM已加载
            setTimeout(() => {
                this.updateTableButtonStyles();
                this.updateAllButtonStyles();
            }, 1000);
            
            // 再次延迟更新，确保所有动态内容都已加载
            setTimeout(() => {
                this.updateTableButtonStyles();
                this.updateAllButtonStyles();
            }, 3000);
            
            // 监听页面切换事件
            document.addEventListener('click', (e) => {
                if (e.target.closest('.nav-item')) {
                    setTimeout(() => {
                        this.updateTableButtonStyles();
                        this.updateAllButtonStyles();
                    }, 500);
                }
            });
            
            // 定期检查并更新权限样式（处理动态内容）
            setInterval(() => {
                this.updateTableButtonStyles();
                this.updateAllButtonStyles();
            }, 10000); // 每10秒检查一次
            
        } catch (error) {
            console.error('❌ 权限管理器初始化失败:', error);
            this.initialized = false;
            
            // 重试机制
            setTimeout(() => {
                console.log('🔄 重试权限管理器初始化...');
                this.init();
            }, 2000);
        }
    }

    // 加载当前用户信息
    async loadCurrentUser() {
        const username = localStorage.getItem('admin_username');
        if (!username) {
            throw new Error('用户未登录');
        }

        try {
            // 等待数据存储准备就绪
            let retryCount = 0;
            const maxRetries = 5;
            
            while (!window.blogDataStore && retryCount < maxRetries) {
                console.log(`⏳ 等待数据存储初始化... (${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 500));
                retryCount++;
            }
            
            if (!window.blogDataStore) {
                throw new Error('数据存储未初始化');
            }
            
            // 🔥 使用异步方法从用户数据中获取用户信息
            let users = [];
            if (typeof window.blogDataStore.getUsersAsync === 'function') {
                users = await window.blogDataStore.getUsersAsync();
            } else {
                users = window.blogDataStore.getUsers() || [];
            }
            
            console.log('👥 获取到用户列表:', users.length, '个用户');
            
            const user = users.find(u => u.username === username);
            
            if (!user) {
                console.error('❌ 用户不存在，用户名:', username, '可用用户:', users.map(u => u.username));
                throw new Error('用户不存在');
            }

            this.currentUser = user;
            console.log('👤 当前用户:', user.username, '角色:', user.role);
        } catch (error) {
            console.error('❌ 加载用户信息失败:', error);
            throw error;
        }
    }

    // 检查权限
    hasPermission(module, action) {
        // 如果权限管理器未初始化完成，临时允许访问
        if (!this.initialized) {
            console.warn('⚠️ 权限管理器未初始化完成，临时允许访问');
            return true;
        }
        
        if (!this.currentUser) {
            console.warn('⚠️ 用户未登录，拒绝访问');
            return false;
        }

        const modulePermissions = this.permissions[module];
        if (!modulePermissions) {
            console.warn(`⚠️ 未知模块: ${module}`);
            return false;
        }

        const actionPermissions = modulePermissions[action];
        if (!actionPermissions) {
            console.warn(`⚠️ 未知操作: ${module}.${action}`);
            return false;
        }

        const hasAccess = actionPermissions.includes(this.currentUser.role);
        
        if (!hasAccess) {
            console.warn(`🚫 权限不足: ${this.currentUser.username}(${this.currentUser.role}) 尝试执行 ${module}.${action}`);
        }

        return hasAccess;
    }

    // 检查用户是否可以修改特定用户的信息
    canModifyUser(targetUsername) {
        if (!this.currentUser) return false;
        
        // 超管可以修改任何用户
        if (this.currentUser.role === 'super_admin') return true;
        
        // 用户可以修改自己的信息
        if (this.currentUser.username === targetUsername) return true;
        
        return false;
    }

    // 检查权限并显示错误信息
    checkPermission(module, action, showError = true) {
        const hasAccess = this.hasPermission(module, action);
        
        if (!hasAccess && showError) {
            this.showPermissionError(module, action);
        }
        
        return hasAccess;
    }

    // 显示权限错误信息
    showPermissionError(module, action) {
        const moduleNames = {
            articles: '文章',
            categories: '分类',
            tags: '标签',
            comments: '评论',
            guestbook: '留言',
            media: '媒体库',
            users: '用户管理',
            settings: '系统设置',
            apps: '应用管理',
            dashboard: '仪表盘',
            events: '重要事项'
        };

        const actionNames = {
            read: '查看',
            create: '创建',
            update: '编辑',
            delete: '删除',
            upload: '上传',
            approve: '审核',
            change_role: '修改角色'
        };

        const moduleName = moduleNames[module] || module;
        const actionName = actionNames[action] || action;

        if (typeof showNotification === 'function') {
            showNotification(`🚫 权限不足：您没有${moduleName}${actionName}权限`, 'error');
        } else {
            alert(`权限不足：您没有${moduleName}${actionName}权限`);
        }
    }

    // 设置权限相关的UI
    setupPermissionUI() {
        // 隐藏没有权限的菜单项
        this.hideUnauthorizedMenuItems();
        
        // 为按钮添加权限检查（不隐藏，点击时检查）
        this.addPermissionChecksToButtons();
        
        // 添加权限检查到表单提交
        this.addPermissionChecksToForms();
        
        // 显示当前用户信息
        this.displayCurrentUserInfo();
    }

    // 隐藏没有权限的菜单项
    hideUnauthorizedMenuItems() {
        const menuPermissions = {
            'dashboard-tab': { module: 'dashboard', action: 'read' },
            'articles-tab': { module: 'articles', action: 'read' },
            'categories-tab': { module: 'categories', action: 'read' },
            'tags-tab': { module: 'tags', action: 'read' },
            'comments-tab': { module: 'comments', action: 'read' },
            'guestbook-tab': { module: 'guestbook', action: 'read' },
            'media-tab': { module: 'media', action: 'read' },
            'users-tab': { module: 'users', action: 'read' },
            'settings-tab': { module: 'settings', action: 'read' },
            'apps-tab': { module: 'apps', action: 'read' }
        };

        Object.entries(menuPermissions).forEach(([elementId, permission]) => {
            const element = document.getElementById(elementId);
            if (element) {
                if (!this.hasPermission(permission.module, permission.action)) {
                    element.style.display = 'none';
                    console.log(`🔒 隐藏菜单项: ${elementId}`);
                }
            }
        });
    }

    // 为按钮添加权限检查（不隐藏，点击时检查）
    addPermissionChecksToButtons() {
        // 通用按钮权限映射
        const buttonPermissions = {
            // 文章相关
            'add-article-btn': { module: 'articles', action: 'create' },
            'btnImportMd': { module: 'articles', action: 'create' },
            'btnImportFeishu': { module: 'articles', action: 'create' },
            
            // 分类相关
            'add-category-btn': { module: 'categories', action: 'create' },
            
            // 标签相关
            'add-tag-btn': { module: 'tags', action: 'create' },
            
            // 用户相关
            'add-user-btn': { module: 'users', action: 'create' },
            
            // 媒体相关
            'upload-image-btn': { module: 'media', action: 'upload' },
            'btnAddMusic': { module: 'media', action: 'upload' },
            'btnAddVideo': { module: 'media', action: 'upload' },
            
            // 友情链接相关
            'add-link-btn': { module: 'guestbook', action: 'create' },
            
            // 应用相关
            'add-app-btn': { module: 'apps', action: 'create' },
            
            // 仪表盘相关
            'add-event-btn': { module: 'events', action: 'create' },
            
            // 网易云导入
            'btnNeteaseMusicImport': { module: 'media', action: 'upload' }
        };

        // 为按钮添加权限检查
        Object.entries(buttonPermissions).forEach(([buttonId, permission]) => {
            const button = document.getElementById(buttonId);
            if (button && !button.hasAttribute('data-permission-checked')) {
                button.setAttribute('data-permission-checked', 'true');
                
                // 保存原始点击事件
                const originalOnClick = button.onclick;
                
                // 添加权限检查
                button.onclick = (event) => {
                    if (!this.checkPermission(permission.module, permission.action)) {
                        event.preventDefault();
                        event.stopPropagation();
                        return false;
                    }
                    
                    // 如果有权限，执行原始事件
                    if (originalOnClick) {
                        return originalOnClick.call(button, event);
                    }
                };
                
                // 添加视觉提示
                if (!this.hasPermission(permission.module, permission.action)) {
                    button.style.opacity = '0.6';
                    button.style.cursor = 'not-allowed';
                    button.title = '权限不足：' + this.getPermissionDescription(permission.module, permission.action);
                }
            }
        });

        // 为表格操作按钮添加权限检查
        this.addTableButtonPermissions();
    }

    // 为表格操作按钮添加权限检查
    addTableButtonPermissions() {
        // 为现有的表格按钮添加样式
        this.updateTableButtonStyles();
        
        // 使用事件委托处理动态生成的表格按钮
        document.addEventListener('click', (event) => {
            const button = event.target.closest('.btn-icon');
            if (!button) return;

            const title = button.getAttribute('title');
            let permission = null;

            // 根据按钮标题判断权限
            if (title === '编辑') {
                const page = document.querySelector('.page-content.active');
                if (page) {
                    const pageId = page.id.replace('page-', '');
                    if (pageId === 'articles') permission = { module: 'articles', action: 'update' };
                    else if (pageId === 'categories') permission = { module: 'categories', action: 'update' };
                    else if (pageId === 'tags') permission = { module: 'tags', action: 'update' };
                    else if (pageId === 'users') permission = { module: 'users', action: 'update' };
                    else if (pageId === 'comments') permission = { module: 'comments', action: 'update' };
                    else if (pageId === 'guestbook') permission = { module: 'guestbook', action: 'update' };
                    else if (pageId === 'media') permission = { module: 'media', action: 'delete' };
                    else if (pageId === 'links') permission = { module: 'guestbook', action: 'update' };
                    else if (pageId === 'apps') permission = { module: 'apps', action: 'update' };
                }
            } else if (title === '删除') {
                const page = document.querySelector('.page-content.active');
                if (page) {
                    const pageId = page.id.replace('page-', '');
                    if (pageId === 'articles') permission = { module: 'articles', action: 'delete' };
                    else if (pageId === 'categories') permission = { module: 'categories', action: 'delete' };
                    else if (pageId === 'tags') permission = { module: 'tags', action: 'delete' };
                    else if (pageId === 'users') permission = { module: 'users', action: 'delete' };
                    else if (pageId === 'comments') permission = { module: 'comments', action: 'delete' };
                    else if (pageId === 'guestbook') permission = { module: 'guestbook', action: 'delete' };
                    else if (pageId === 'media') permission = { module: 'media', action: 'delete' };
                    else if (pageId === 'links') permission = { module: 'guestbook', action: 'delete' };
                    else if (pageId === 'apps') permission = { module: 'apps', action: 'delete' };
                }
            } else if (title === '通过') {
                permission = { module: 'comments', action: 'approve' };
            } else if (title === '重置密码') {
                permission = { module: 'users', action: 'update' };
            } else if (title === '置顶' || title === '取消置顶') {
                permission = { module: 'guestbook', action: 'update' };
            } else if (title === '审核通过' || title === '审核拒绝') {
                permission = { module: 'guestbook', action: 'approve' };
            } else if (title === '导出') {
                const page = document.querySelector('.page-content.active');
                if (page) {
                    const pageId = page.id.replace('page-', '');
                    if (pageId === 'articles') permission = { module: 'articles', action: 'read' };
                }
            }

            // 检查权限
            if (permission && !this.checkPermission(permission.module, permission.action)) {
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
        });
    }

    // 更新所有按钮样式
    updateAllButtonStyles() {
        
        // 通用按钮权限映射
        const buttonPermissions = {
            // 文章相关
            'add-article-btn': { module: 'articles', action: 'create' },
            'btnImportMd': { module: 'articles', action: 'create' },
            'btnImportFeishu': { module: 'articles', action: 'create' },
            
            // 分类相关
            'add-category-btn': { module: 'categories', action: 'create' },
            
            // 标签相关
            'add-tag-btn': { module: 'tags', action: 'create' },
            
            // 用户相关
            'add-user-btn': { module: 'users', action: 'create' },
            
            // 媒体相关
            'upload-image-btn': { module: 'media', action: 'upload' },
            'btnAddMusic': { module: 'media', action: 'upload' },
            'btnAddVideo': { module: 'media', action: 'upload' },
            
            // 友情链接相关
            'add-link-btn': { module: 'guestbook', action: 'create' },
            
            // 应用相关
            'add-app-btn': { module: 'apps', action: 'create' },
            
            // 仪表盘相关
            'add-event-btn': { module: 'events', action: 'create' },
            
            // 网易云导入
            'btnNeteaseMusicImport': { module: 'media', action: 'upload' }
        };

        Object.entries(buttonPermissions).forEach(([buttonId, permission]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                if (!this.hasPermission(permission.module, permission.action)) {
                    // 只对特定按钮应用权限样式，不影响所有按钮
                    button.style.setProperty('opacity', '0.4', 'important');
                    button.style.setProperty('cursor', 'not-allowed', 'important');
                    const originalTitle = button.title || button.textContent.trim();
                    if (!originalTitle.includes('权限不足')) {
                        button.title = originalTitle + ' (权限不足)';
                    }
                    button.setAttribute('data-permission-disabled', 'true');
                } else {
                    // 确保有权限的按钮样式正常
                    button.style.removeProperty('opacity');
                    button.style.removeProperty('cursor');
                    button.removeAttribute('data-permission-disabled');
                }
            }
        });
    }

    // 更新表格按钮样式
    updateTableButtonStyles() {
        // 定期更新表格按钮样式（处理动态生成的内容）
        const updateStyles = () => {
            // 查找所有表格按钮，包括动态生成的
            const buttons = document.querySelectorAll('.btn-icon[title], .music-edit-btn, .music-delete-btn, .music-preview-btn, .video-edit-btn, .video-delete-btn, .tag-edit-btn, .tag-delete-btn');
            
            buttons.forEach(button => {
                // 移除重复处理检查，每次都重新应用样式
                // if (button.hasAttribute('data-permission-styled')) return;
                
                const title = button.getAttribute('title');
                let permission = null;

                // 根据按钮类名直接判断权限
                if (button.classList.contains('music-edit-btn') || button.classList.contains('video-edit-btn')) {
                    permission = { module: 'media', action: 'update' };
                } else if (button.classList.contains('music-delete-btn') || button.classList.contains('video-delete-btn')) {
                    permission = { module: 'media', action: 'delete' };
                } else if (button.classList.contains('music-preview-btn')) {
                    permission = { module: 'media', action: 'read' };
                } else if (button.classList.contains('tag-edit-btn')) {
                    permission = { module: 'tags', action: 'update' };
                } else if (button.classList.contains('tag-delete-btn')) {
                    permission = { module: 'tags', action: 'delete' };
                    
                    // 特殊处理：如果标签有文章，禁用删除按钮
                    if (button.hasAttribute('data-has-articles')) {
                        button.style.setProperty('opacity', '0.5', 'important');
                        button.style.setProperty('cursor', 'not-allowed', 'important');
                        button.disabled = true;
                        button.title = '删除标签 (该标签被文章使用，无法删除)';
                        return; // 跳过权限检查，直接禁用
                    }
                } else if (button.hasAttribute('data-action')) {
                    // 应用管理按钮
                    const action = button.getAttribute('data-action');
                    if (action === 'edit') {
                        permission = { module: 'apps', action: 'update' };
                    } else if (action === 'toggle') {
                        permission = { module: 'apps', action: 'update' };
                    } else if (action === 'delete') {
                        permission = { module: 'apps', action: 'delete' };
                    }
                } else {
                    // 根据按钮标题和所在页面判断权限
                    const page = button.closest('.page-content');
                    if (page) {
                    const pageId = page.id.replace('page-', '');
                    
                    if (title === '编辑') {
                        if (pageId === 'articles') permission = { module: 'articles', action: 'update' };
                        else if (pageId === 'categories') permission = { module: 'categories', action: 'update' };
                        else if (pageId === 'tags') permission = { module: 'tags', action: 'update' };
                        else if (pageId === 'users') permission = { module: 'users', action: 'update' };
                        else if (pageId === 'comments') permission = { module: 'comments', action: 'update' };
                        else if (pageId === 'guestbook') permission = { module: 'guestbook', action: 'update' };
                        else if (pageId === 'media') permission = { module: 'media', action: 'update' };
                        else if (pageId === 'links') permission = { module: 'guestbook', action: 'update' };
                        else if (pageId === 'apps') permission = { module: 'apps', action: 'update' };
                    } else if (title === '删除') {
                        if (pageId === 'articles') permission = { module: 'articles', action: 'delete' };
                        else if (pageId === 'categories') permission = { module: 'categories', action: 'delete' };
                        else if (pageId === 'tags') permission = { module: 'tags', action: 'delete' };
                        else if (pageId === 'users') permission = { module: 'users', action: 'delete' };
                        else if (pageId === 'comments') permission = { module: 'comments', action: 'delete' };
                        else if (pageId === 'guestbook') permission = { module: 'guestbook', action: 'delete' };
                        else if (pageId === 'media') permission = { module: 'media', action: 'delete' };
                        else if (pageId === 'links') permission = { module: 'guestbook', action: 'delete' };
                        else if (pageId === 'apps') permission = { module: 'apps', action: 'delete' };
                    } else if (title === '通过') {
                        permission = { module: 'comments', action: 'approve' };
                    } else if (title === '重置密码') {
                        permission = { module: 'users', action: 'update' };
                    } else if (title === '置顶' || title === '取消置顶') {
                        permission = { module: 'guestbook', action: 'update' };
                    } else if (title === '审核通过' || title === '审核拒绝') {
                        permission = { module: 'guestbook', action: 'approve' };
                    } else if (title === '导出') {
                        const page = button.closest('.page-content');
                        if (page) {
                            const pageId = page.id.replace('page-', '');
                            if (pageId === 'articles') permission = { module: 'articles', action: 'read' };
                        }
                    }
                    }
                }

                // 添加视觉提示
                if (permission && !this.hasPermission(permission.module, permission.action)) {
                    console.log(`🔒 禁用按钮: ${button.title || button.textContent.trim()} - ${permission.module}.${permission.action}`);
                    
                    // 1. 默认置灰显示（让用户一眼就知道不能点击）
                    button.style.setProperty('opacity', '0.4', 'important');
                    button.style.setProperty('cursor', 'not-allowed', 'important');
                    
                    // 2. 设置权限不足的提示信息
                    const originalTitle = button.title || button.textContent.trim();
                    if (!originalTitle.includes('权限不足')) {
                        button.title = originalTitle + ' (权限不足)';
                    }
                    
                    button.setAttribute('data-permission-disabled', 'true');
                } else if (permission) {
                    // 确保有权限的按钮样式正常（但不覆盖已被其他逻辑禁用的按钮）
                    if (!button.disabled && !button.hasAttribute('data-has-articles')) {
                        button.removeAttribute('data-permission-disabled');
                        // 恢复正常样式
                        button.style.removeProperty('opacity');
                        button.style.removeProperty('cursor');
                        
                        // 恢复原始title（移除权限不足提示）
                        const currentTitle = button.title || '';
                        if (currentTitle.includes(' (权限不足)')) {
                            button.title = currentTitle.replace(' (权限不足)', '');
                        }
                    }
                }
                
                // 移除重复处理标记，允许每次都重新应用样式
                // button.setAttribute('data-permission-styled', 'true');
            });
        };

        // 立即执行一次
        updateStyles();
        
        // 移除定期检查，避免过多日志输出
        // 改为只在需要时手动调用更新
    }

    // 获取权限描述
    getPermissionDescription(module, action) {
        const moduleNames = {
            articles: '文章',
            categories: '分类',
            tags: '标签',
            comments: '评论',
            guestbook: '留言',
            media: '媒体库',
            users: '用户管理',
            settings: '系统设置',
            apps: '应用管理',
            dashboard: '仪表盘',
            events: '重要事项'
        };

        const actionNames = {
            read: '查看',
            create: '创建',
            update: '编辑',
            delete: '删除',
            upload: '上传',
            approve: '审核',
            change_role: '修改角色'
        };

        const moduleName = moduleNames[module] || module;
        const actionName = actionNames[action] || action;
        return `${moduleName}${actionName}`;
    }

    // 为表单添加权限检查
    addPermissionChecksToForms() {
        // 监听表单提交事件
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const formId = form.id;
            
            // 根据表单ID判断需要的权限
            const formPermissions = {
                'article-form': { module: 'articles', action: 'create' },
                'category-form': { module: 'categories', action: 'create' },
                'tag-form': { module: 'tags', action: 'create' },
                'user-form': { module: 'users', action: 'create' },
                'settings-form': { module: 'settings', action: 'update' }
            };

            const permission = formPermissions[formId];
            if (permission) {
                if (!this.checkPermission(permission.module, permission.action)) {
                    e.preventDefault();
                    return false;
                }
            }
        });
    }

    // 显示当前用户信息
    displayCurrentUserInfo() {
        if (!this.currentUser) return;

        // 更新用户信息显示
        const userInfoElements = document.querySelectorAll('.current-user-info');
        userInfoElements.forEach(element => {
            element.textContent = `${this.currentUser.displayName || this.currentUser.username} (${this.getRoleDisplayName(this.currentUser.role)})`;
        });

        // 更新顶部栏用户名显示
        const usernameElement = document.getElementById('currentUsername');
        if (usernameElement) {
            usernameElement.textContent = this.currentUser.displayName || this.currentUser.username;
        }

        // 添加角色信息到用户下拉菜单
        const userDropdown = document.querySelector('.user-dropdown');
        if (userDropdown && !document.querySelector('.user-role-info')) {
            const roleInfo = document.createElement('div');
            roleInfo.className = 'user-role-info';
            roleInfo.innerHTML = `
                <div style="padding: 0.5rem 1rem; background: #f8f9fa; border-bottom: 1px solid #e0e0e0; font-size: 0.85rem; color: #666;">
                    <div style="font-weight: 600;">${this.getRoleDisplayName(this.currentUser.role)}</div>
                    <div style="font-size: 0.8rem; margin-top: 0.2rem;">权限级别: ${this.getRoleLevel(this.currentUser.role)}</div>
                </div>
            `;
            
            const dropdownMenu = document.getElementById('userDropdownMenu');
            if (dropdownMenu) {
                dropdownMenu.insertBefore(roleInfo, dropdownMenu.firstChild);
            }
        }
    }

    // 获取角色级别描述
    getRoleLevel(role) {
        const levels = {
            super_admin: '最高级别',
            admin: '高级权限',
            editor: '中级权限',
            viewer: '基础权限'
        };
        return levels[role] || '未知';
    }

    // 获取角色显示名称
    getRoleDisplayName(role) {
        const roleNames = {
            super_admin: '超管',
            admin: '管理员',
            editor: '编辑者',
            viewer: '查看者'
        };
        return roleNames[role] || role;
    }

    // 获取当前用户信息
    getCurrentUser() {
        return this.currentUser;
    }

    // 获取用户权限列表
    getUserPermissions() {
        if (!this.currentUser) return [];

        const userPermissions = [];
        
        Object.entries(this.permissions).forEach(([module, actions]) => {
            Object.entries(actions).forEach(([action, roles]) => {
                if (roles.includes(this.currentUser.role)) {
                    userPermissions.push(`${module}.${action}`);
                }
            });
        });

        return userPermissions;
    }

    // 检查是否为管理员
    isAdmin() {
        return this.currentUser && ['super_admin', 'admin'].includes(this.currentUser.role);
    }

    // 检查是否为超级管理员
    isSuperAdmin() {
        return this.currentUser && this.currentUser.role === 'super_admin';
    }

    // 权限装饰器 - 用于包装需要权限检查的函数
    requirePermission(module, action) {
        return (target, propertyKey, descriptor) => {
            const originalMethod = descriptor.value;
            
            descriptor.value = function(...args) {
                if (!window.permissionManager.checkPermission(module, action)) {
                    return Promise.reject(new Error('权限不足'));
                }
                return originalMethod.apply(this, args);
            };
            
            return descriptor;
        };
    }

    // 批量权限检查
    hasAnyPermission(permissions) {
        return permissions.some(({ module, action }) => 
            this.hasPermission(module, action)
        );
    }

    // 批量权限检查 - 需要所有权限
    hasAllPermissions(permissions) {
        return permissions.every(({ module, action }) => 
            this.hasPermission(module, action)
        );
    }

    // 强制更新标签按钮样式
    forceUpdateTagButtons() {
        const tagButtons = document.querySelectorAll('.tag-edit-btn, .tag-delete-btn');
        
        tagButtons.forEach(button => {
            let permission = null;
            
            if (button.classList.contains('tag-edit-btn')) {
                permission = { module: 'tags', action: 'update' };
            } else if (button.classList.contains('tag-delete-btn')) {
                permission = { module: 'tags', action: 'delete' };
                
                // 特殊处理：如果标签有文章，禁用删除按钮
                if (button.hasAttribute('data-has-articles')) {
                    button.style.setProperty('opacity', '0.5', 'important');
                    button.style.setProperty('cursor', 'not-allowed', 'important');
                    button.disabled = true;
                    button.title = '删除标签 (该标签被文章使用，无法删除)';
                    return;
                }
            }
            
            if (permission) {
                if (!this.hasPermission(permission.module, permission.action)) {
                    // 强制应用禁用样式 - 使用多种方法确保生效
                    button.style.setProperty('opacity', '0.4', 'important');
                    button.style.setProperty('cursor', 'not-allowed', 'important');
                    button.style.setProperty('pointer-events', 'auto', 'important');
                    button.style.setProperty('transform', 'none', 'important');
                    button.style.setProperty('background', 'transparent', 'important');
                    button.setAttribute('data-permission-disabled', 'true');
                    button.classList.add('permission-disabled');
                    
                    const originalTitle = button.title || button.textContent.trim();
                    if (!originalTitle.includes('权限不足')) {
                        button.title = originalTitle + ' (权限不足)';
                    }
                    
                    console.log('🔒 应用禁用样式到按钮:', button.className, '最终opacity:', button.style.opacity);
                } else {
                    // 确保有权限的按钮样式正常
                    if (!button.disabled && !button.hasAttribute('data-has-articles')) {
                        button.style.removeProperty('opacity');
                        button.style.removeProperty('cursor');
                        button.style.removeProperty('pointer-events');
                        button.style.removeProperty('transform');
                        button.removeAttribute('data-permission-disabled');
                    }
                }
            }
        });
    }
}

// 权限检查辅助函数
window.checkPermission = function(module, action, showError = true) {
    if (window.permissionManager && window.permissionManager.currentUser) {
        return window.permissionManager.checkPermission(module, action, showError);
    }
    
    // 如果权限管理器未初始化或用户未加载，等待一下再重试
    if (!window.permissionManager) {
        console.warn('⚠️ 权限管理器未初始化，等待初始化...');
        
        // 异步重试机制
        setTimeout(() => {
            if (window.permissionManager && window.permissionManager.currentUser) {
                console.log('✅ 权限管理器已就绪，重新应用权限样式');
                if (window.updatePermissionStyles) {
                    window.updatePermissionStyles();
                }
            }
        }, 1000);
        
        return true; // 临时允许，避免阻塞操作
    }
    
    if (!window.permissionManager.currentUser) {
        console.warn('⚠️ 用户信息未加载完成');
        return true; // 临时允许
    }
    
    return true; // 降级处理
};

window.hasPermission = function(module, action) {
    if (window.permissionManager && window.permissionManager.initialized) {
        return window.permissionManager.hasPermission(module, action);
    }
    console.warn('⚠️ 权限管理器未初始化或未就绪');
    return true; // 降级处理
};

// 权限就绪检查函数
window.isPermissionManagerReady = function() {
    return window.permissionManager && 
           window.permissionManager.initialized && 
           window.permissionManager.currentUser;
};

// 等待权限管理器就绪的函数
window.waitForPermissionManager = function(callback, maxWait = 5000) {
    const startTime = Date.now();
    
    const check = () => {
        if (window.isPermissionManagerReady()) {
            callback();
        } else if (Date.now() - startTime < maxWait) {
            setTimeout(check, 100);
        } else {
            console.warn('⚠️ 权限管理器等待超时');
            callback(); // 超时后仍然执行回调
        }
    };
    
    check();
};

window.requirePermission = function(module, action) {
    if (!window.checkPermission(module, action)) {
        throw new Error(`权限不足: ${module}.${action}`);
    }
};

// 全局函数：手动更新权限样式
window.updatePermissionStyles = function() {
    if (window.permissionManager && window.permissionManager.initialized) {
        console.log('🔄 手动更新权限样式...');
        window.permissionManager.updateTableButtonStyles();
        window.permissionManager.updateAllButtonStyles();
        
        // 强制更新标签按钮样式
        window.permissionManager.forceUpdateTagButtons();
    } else {
        console.log('⏳ 权限管理器未就绪，稍后重试...');
        // 如果权限管理器未就绪，稍后重试
        setTimeout(() => {
            if (window.permissionManager && window.permissionManager.initialized) {
                console.log('🔄 重试更新权限样式...');
                window.permissionManager.updateTableButtonStyles();
                window.permissionManager.updateAllButtonStyles();
                window.permissionManager.forceUpdateTagButtons();
            }
        }, 1000);
    }
};

// 强制更新标签按钮样式的函数
window.forceUpdateTagButtons = function() {
    if (window.permissionManager) {
        window.permissionManager.forceUpdateTagButtons();
    }
};

// 调试函数：检查权限系统状态
window.debugPermissions = function() {
    if (window.permissionManager) {
        const currentUser = window.permissionManager.getCurrentUser();
        console.log('=== 权限系统调试信息 ===');
        console.log('当前用户:', currentUser);
        console.log('用户角色:', currentUser?.role);
        console.log('标签编辑权限:', window.permissionManager.hasPermission('tags', 'update'));
        console.log('标签删除权限:', window.permissionManager.hasPermission('tags', 'delete'));
        
        const tagButtons = document.querySelectorAll('.tag-edit-btn, .tag-delete-btn');
        console.log(`找到 ${tagButtons.length} 个标签按钮`);
        
        tagButtons.forEach((button, index) => {
            console.log(`按钮 ${index + 1}:`, {
                className: button.className,
                title: button.title,
                opacity: button.style.opacity,
                cursor: button.style.cursor,
                disabled: button.disabled,
                hasPermissionDisabled: button.hasAttribute('data-permission-disabled')
            });
        });
    } else {
        console.log('❌ 权限管理器未初始化');
    }
};

// 强制测试权限样式（模拟无权限用户）
window.testTagPermissionStyles = function() {
    console.log('🧪 强制测试标签按钮权限样式...');
    
    const tagButtons = document.querySelectorAll('.tag-edit-btn, .tag-delete-btn');
    console.log(`找到 ${tagButtons.length} 个标签按钮`);
    
    tagButtons.forEach((button, index) => {
        // 强制应用禁用样式进行测试
        button.style.setProperty('opacity', '0.4', 'important');
        button.style.setProperty('cursor', 'not-allowed', 'important');
        button.style.setProperty('pointer-events', 'auto', 'important');
        button.style.setProperty('transform', 'none', 'important');
        button.setAttribute('data-permission-disabled', 'true');
        button.title = button.title + ' (测试权限不足)';
        
        console.log(`🔒 测试置灰按钮 ${index + 1}: ${button.className}`);
    });
};

// 直接强制置灰标签按钮（用于调试）
window.forceGrayTagButtons = function() {
    console.log('🔧 强制置灰标签按钮...');
    
    const tagButtons = document.querySelectorAll('.tag-edit-btn, .tag-delete-btn');
    console.log(`找到 ${tagButtons.length} 个标签按钮`);
    
    tagButtons.forEach((button, index) => {
        // 只对标签按钮应用样式
        button.style.setProperty('opacity', '0.4', 'important');
        button.style.setProperty('cursor', 'not-allowed', 'important');
        button.setAttribute('data-permission-disabled', 'true');
        
        console.log(`🔒 置灰标签按钮 ${index + 1}:`, {
            className: button.className,
            opacity: button.style.opacity,
            cursor: button.style.cursor
        });
    });
    
    console.log('✅ 标签按钮置灰完成');
};

// 检查标签按钮是否存在
window.checkTagButtons = function() {
    const tagButtons = document.querySelectorAll('.tag-edit-btn, .tag-delete-btn');
    console.log('=== 标签按钮检查 ===');
    console.log(`找到 ${tagButtons.length} 个标签按钮`);
    
    tagButtons.forEach((button, index) => {
        console.log(`按钮 ${index + 1}:`, {
            element: button,
            className: button.className,
            title: button.title,
            style: button.style.cssText,
            computedStyle: {
                opacity: window.getComputedStyle(button).opacity,
                cursor: window.getComputedStyle(button).cursor
            }
        });
    });
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PermissionManager;
}