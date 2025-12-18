// 页面状态管理
const PageStateManager = {
    states: {},
    
    // 保存当前页面状态
    saveState(pageName) {
        const page = document.getElementById('page-' + pageName);
        if (!page) return;
        
        this.states[pageName] = {
            scrollPosition: page.scrollTop || 0,
            formData: this.getFormData(page),
            timestamp: Date.now()
        };
    },
    
    // 恢复页面状态
    restoreState(pageName) {
        const state = this.states[pageName];
        if (!state) return;
        
        const page = document.getElementById('page-' + pageName);
        if (!page) return;
        
        // 恢复滚动位置
        setTimeout(() => {
            page.scrollTop = state.scrollPosition || 0;
        }, 50);
        
        // 恢复表单数据
        this.setFormData(page, state.formData);
    },
    
    // 获取页面内所有表单数据
    getFormData(page) {
        const formData = {};
        const inputs = page.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            if (input.id || input.name) {
                const key = input.id || input.name;
                if (input.type === 'checkbox') {
                    formData[key] = input.checked;
                } else if (input.type === 'radio') {
                    if (input.checked) {
                        formData[key] = input.value;
                    }
                } else {
                    formData[key] = input.value;
                }
            }
        });
        
        return formData;
    },
    
    // 设置页面表单数据
    setFormData(page, formData) {
        if (!formData) return;
        
        Object.keys(formData).forEach(key => {
            const input = page.querySelector(`#${key}, [name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = formData[key];
                } else if (input.type === 'radio') {
                    if (input.value === formData[key]) {
                        input.checked = true;
                    }
                } else {
                    input.value = formData[key];
                }
            }
        });
    },
    
    // 清除指定页面状态
    clearState(pageName) {
        delete this.states[pageName];
    },
    
    // 清除所有状态
    clearAllStates() {
        this.states = {};
    }
};

// 页面导航
document.addEventListener('DOMContentLoaded', function() {
    // 初始化权限管理器
    if (typeof PermissionManager !== 'undefined') {
        window.permissionManager = new PermissionManager();
        console.log('🔐 权限管理器已初始化');
        
        // 测试权限系统
        setTimeout(() => {
            testPermissionSystem();
        }, 1000);
    } else {
        console.warn('⚠️ 权限管理器类未找到');
    }
    // 背景图片按钮事件监听
    const refreshBtn = document.getElementById('refreshBackgroundBtn');
    const previousBtn = document.getElementById('previousBackgroundBtn');
    const nextBtn = document.getElementById('nextBackgroundBtn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (window.adminBackgroundManager) {
                window.adminBackgroundManager.refreshBackground();
            }
        });
    }
    
    if (previousBtn) {
        previousBtn.addEventListener('click', () => {
            if (window.adminBackgroundManager) {
                window.adminBackgroundManager.previousBackground();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (window.adminBackgroundManager) {
                window.adminBackgroundManager.nextBackground();
            }
        });
    }
    
    // 导航切换
    const navItems = document.querySelectorAll('.nav-item');
    const pageContents = document.querySelectorAll('.page-content');
    const currentPageTitle = document.getElementById('currentPage');
    let currentPage = null;

    // 切换到指定页面的函数
    function switchToPage(pageName) {
        // 保存当前页面状态
        if (currentPage) {
            PageStateManager.saveState(currentPage);
        }
        
        // 移除所有活动状态
        navItems.forEach(nav => nav.classList.remove('active'));
        pageContents.forEach(page => page.classList.remove('active'));
        
        // 找到对应的导航项并激活
        const targetNavItem = document.querySelector(`.nav-item[data-page="${pageName}"]`);
        if (targetNavItem) {
            targetNavItem.classList.add('active');
            
            // 更新顶部标题和图标
            const pageIcon = targetNavItem.querySelector('.icon');
            const pageTitle = targetNavItem.querySelector('span:last-child');
            
            const currentPageIconEl = document.getElementById('currentPageIcon');
            const currentPageTitleEl = document.getElementById('currentPageTitle');
            
            if (pageIcon && currentPageIconEl) {
                currentPageIconEl.textContent = pageIcon.textContent;
            }
            if (pageTitle && currentPageTitleEl) {
                currentPageTitleEl.textContent = pageTitle.textContent;
            }
            
            // 更新旧的面包屑（如果存在）
            if (pageTitle && currentPageTitle) {
                currentPageTitle.textContent = pageTitle.textContent;
            }
        }
        
        // 显示对应页面
        const targetPage = document.getElementById('page-' + pageName);
        if (targetPage) {
            targetPage.classList.add('active');
            
            // 恢复页面状态
            PageStateManager.restoreState(pageName);
        }
        
        // 更新当前页面
        currentPage = pageName;
    }

    navItems.forEach(item => {
        // 防止重复绑定
        if (!item.hasAttribute('data-nav-bound')) {
            item.setAttribute('data-nav-bound', 'true');
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const pageName = this.dataset.page;
                switchToPage(pageName);
            });
        }
    });
    
    // 初始化当前页面
    const activePage = document.querySelector('.page-content.active');
    if (activePage) {
        currentPage = activePage.id.replace('page-', '');
    }
    
    // 检查 URL hash，从编辑器返回时恢复页面
    const hash = window.location.hash.substring(1);
    if (hash && hash !== currentPage) {
        switchToPage(hash);
        // 清除hash，避免下次进入时自动跳转
        history.replaceState(null, null, ' ');
    }
    
    // 监听 hash 变化
    window.addEventListener('hashchange', function() {
        const newHash = window.location.hash.substring(1);
        if (newHash) {
            switchToPage(newHash);
        }
    });

    // 新建文章按钮
    const btnNewArticle = document.getElementById('add-article-btn');
    if (btnNewArticle) {
        btnNewArticle.addEventListener('click', function() {
            // 检查权限
            if (!checkPermission('articles', 'create')) {
                return;
            }
            
            // 保存当前页面信息，以便返回
            sessionStorage.setItem('adminReturnPage', currentPage || 'articles');
            // 跳转到编辑器
            window.location.href = 'pages/editor.html';
        });
    }

    // 注意：新建分类和标签按钮事件已在 admin-render.js 的 initButtonEvents() 中处理
    // 避免重复绑定事件导致冲突

    // 上传媒体按钮
    const btnUploadMedia = document.getElementById('btnUploadMedia');
    if (btnUploadMedia) {
        btnUploadMedia.addEventListener('click', function() {
            showNotification('打开文件上传对话框...', 'info');
        });
    }

    // 退出登录
    const btnLogout = document.querySelector('.btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm('确定要退出登录吗？')) {
                // 使用 AuthManager 退出登录
                AuthManager.logout();
                showNotification('退出成功', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            }
        });
    }
    
    // 显示当前登录用户信息
    const currentUser = AuthManager.getCurrentUser();
    if (currentUser) {
        // 只更新用户名元素，不影响退出按钮
        const usernameDisplay = document.querySelector('.username');
        if (usernameDisplay) {
            usernameDisplay.textContent = currentUser.username;
        }
    }

    // 表格操作按钮
    setupTableActions();
});

// 设置表格操作
function setupTableActions() {
    // 只绑定非应用管理页面的按钮，避免与应用管理器冲突
    const excludeSelectors = [
        '#page-apps .btn-icon', // 排除应用管理页面的按钮
        '#appsManageGrid .btn-icon' // 排除应用管理网格的按钮
    ];
    
    // 编辑按钮 - 排除应用管理页面
    document.querySelectorAll('.btn-icon[title="编辑"]:not(#page-apps .btn-icon):not(#appsManageGrid .btn-icon)').forEach(btn => {
        // 检查是否已经绑定过事件
        if (btn.hasAttribute('data-table-action-bound')) return;
        btn.setAttribute('data-table-action-bound', 'true');
        
        btn.addEventListener('click', function() {
            // 获取当前激活的页面
            const activePage = document.querySelector('.page-content.active');
            const currentPage = activePage ? activePage.id.replace('page-', '') : 'articles';
            
            // 保存当前页面信息
            sessionStorage.setItem('adminReturnPage', currentPage);
            
            // 跳转到编辑器（这里可以根据实际情况传递文章ID）
            showNotification('打开编辑界面...', 'info');
            setTimeout(() => {
                window.location.href = 'pages/editor.html';
            }, 500);
        });
    });

    // 删除按钮 - 排除应用管理页面
    document.querySelectorAll('.btn-icon[title="删除"]:not(#page-apps .btn-icon):not(#appsManageGrid .btn-icon)').forEach(btn => {
        // 检查是否已经绑定过事件
        if (btn.hasAttribute('data-table-action-bound')) return;
        btn.setAttribute('data-table-action-bound', 'true');
        
        btn.addEventListener('click', function() {
            if (confirm('确定要删除吗？此操作不可恢复。')) {
                const row = this.closest('tr') || this.closest('.tag-card') || this.closest('.media-item');
                if (row) {
                    row.style.opacity = '0';
                    setTimeout(() => {
                        row.remove();
                        showNotification('删除成功', 'success');
                    }, 300);
                }
            }
        });
    });

    // 回复按钮
    document.querySelectorAll('.btn-icon[title="回复"]:not(#page-apps .btn-icon):not(#appsManageGrid .btn-icon)').forEach(btn => {
        // 检查是否已经绑定过事件
        if (btn.hasAttribute('data-table-action-bound')) return;
        btn.setAttribute('data-table-action-bound', 'true');
        
        btn.addEventListener('click', function() {
            showModal('回复评论', createReplyForm());
        });
    });

    // 通过按钮
    document.querySelectorAll('.btn-icon[title="通过"]:not(#page-apps .btn-icon):not(#appsManageGrid .btn-icon)').forEach(btn => {
        // 检查是否已经绑定过事件
        if (btn.hasAttribute('data-table-action-bound')) return;
        btn.setAttribute('data-table-action-bound', 'true');
        
        btn.addEventListener('click', function() {
            const badge = this.closest('tr').querySelector('.badge');
            if (badge) {
                badge.className = 'badge badge-success';
                badge.textContent = '已通过';
                showNotification('评论已通过', 'success');
            }
        });
    });
}

// 创建分类表单
function createCategoryForm() {
    return `
        <div class="modal-form">
            <div class="form-group">
                <label>分类名称</label>
                <input type="text" class="form-control" placeholder="请输入分类名称">
            </div>
            <div class="form-group">
                <label>分类描述</label>
                <textarea class="form-control" rows="3" placeholder="请输入分类描述"></textarea>
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="saveCategory()">保存</button>
                <button class="btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </div>
    `;
}

// 创建标签表单
function createTagForm() {
    return `
        <div class="modal-form">
            <div class="form-group">
                <label>标签名称</label>
                <input type="text" class="form-control" placeholder="请输入标签名称">
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="saveTag()">保存</button>
                <button class="btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </div>
    `;
}

// 创建回复表单
function createReplyForm() {
    return `
        <div class="modal-form">
            <div class="form-group">
                <label>回复内容</label>
                <textarea class="form-control" rows="4" placeholder="请输入回复内容"></textarea>
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="sendReply()">发送</button>
                <button class="btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </div>
    `;
}

// 显示模态框
function showModal(title, content) {
    console.log('🔍 showModal 被调用:', { title, content: content.substring(0, 100) + '...' });
    console.log('📋 传入的标题参数:', `"${title}"`);
    
    // 只移除动态创建的模态框，不影响静态HTML模态框
    const existingModals = document.querySelectorAll('.modal-overlay:not([id])');
    console.log('🗑️ 移除现有动态模态框数量:', existingModals.length);
    existingModals.forEach(modal => modal.remove());

    // 确保标题被正确转义和设置
    const safeTitle = String(title).trim();
    console.log('🔒 安全处理后的标题:', `"${safeTitle}"`);

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-container" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>${safeTitle}</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        </div>
    `;
    
    console.log('📝 生成的模态框HTML标题部分:', modalHTML.match(/<h3>.*?<\/h3>/)[0]);

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 立即验证模态框是否正确创建
    setTimeout(() => {
        const newModal = document.querySelector('.modal-overlay:not([id])');
        if (newModal) {
            const titleEl = newModal.querySelector('.modal-header h3');
            if (titleEl) {
                console.log('✅ 模态框创建成功，最终标题:', `"${titleEl.textContent}"`);
                
                // 双重检查标题是否正确
                if (titleEl.textContent !== safeTitle) {
                    console.error('❌ 标题不匹配！期望:', safeTitle, '实际:', titleEl.textContent);
                    console.log('🔧 尝试强制修正标题...');
                    titleEl.textContent = safeTitle;
                    console.log('✅ 标题已修正为:', titleEl.textContent);
                }
            } else {
                console.error('❌ 未找到标题元素');
            }
        } else {
            console.error('❌ 未找到新创建的模态框');
        }
    }, 50);

    // 添加模态框样式
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                animation: fadeIn 0.3s;
            }

            .modal-container {
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                max-height: 90vh;
                overflow: auto;
                animation: slideUp 0.3s;
            }

            .modal-header {
                padding: 1.5rem;
                border-bottom: 1px solid #f0f0f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .modal-header h3 {
                color: #2c5f7c;
                margin: 0;
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 2rem;
                color: #999;
                cursor: pointer;
                line-height: 1;
            }

            .modal-close:hover {
                color: #333;
            }

            .modal-body {
                padding: 1.5rem;
            }

            .modal-form .form-group {
                margin-bottom: 1.5rem;
            }

            .modal-actions {
                display: flex;
                gap: 1rem;
                margin-top: 1.5rem;
            }

            .btn-secondary {
                padding: 0.8rem 1.5rem;
                background: #e0e0e0;
                color: #333;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s;
            }

            .btn-secondary:hover {
                background: #d0d0d0;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// 关闭模态框
function closeModal() {
    // 只关闭动态创建的模态框，不影响静态HTML模态框
    const modals = document.querySelectorAll('.modal-overlay:not([id])');
    modals.forEach(modal => {
        modal.style.animation = 'fadeOut 0.3s';
        setTimeout(() => modal.remove(), 300);
    });
}

// 保存分类
async function saveCategory() {
    // 检查权限
    if (!checkPermission('categories', 'create')) {
        return;
    }
    
    try {
        const form = document.querySelector('.modal-form');
        const nameInput = form.querySelector('input[type="text"]');
        const descInput = form.querySelector('textarea');
        
        if (!nameInput.value.trim()) {
            showNotification('请输入分类名称', 'error');
            return;
        }
        
        const categoryData = {
            name: nameInput.value.trim(),
            description: descInput.value.trim()
        };
        
        // 显示加载状态
        showNotification('正在保存分类...', 'info');
        
        // 使用数据适配器保存
        const result = await window.dataAdapter.addCategory(categoryData);
        
        if (result && result.id) {
            showNotification('分类保存成功', 'success');
            closeModal();
            // 刷新分类列表（如果在分类页面）
            const activePage = document.querySelector('.page-content.active');
            if (activePage && activePage.id === 'page-categories') {
                await loadCategoriesList();
            }
        } else {
            const errorMsg = result && result.message ? result.message : '分类保存失败';
            showNotification(errorMsg, 'error');
        }
    } catch (error) {
        console.error('保存分类失败:', error);
        const errorMsg = error.message.includes('KV数据库') ? 
            'Vercel数据库配置问题，请联系管理员' : 
            '分类保存失败: ' + error.message;
        showNotification(errorMsg, 'error');
    }
}

// 保存标签
async function saveTag() {
    // 检查权限
    if (!checkPermission('tags', 'create')) {
        return;
    }
    
    try {
        const form = document.querySelector('.modal-form');
        const nameInput = form.querySelector('input[type="text"]');
        
        if (!nameInput.value.trim()) {
            showNotification('请输入标签名称', 'error');
            return;
        }
        
        const tagData = {
            name: nameInput.value.trim()
        };
        
        // 显示加载状态
        showNotification('正在保存标签...', 'info');
        
        // 使用数据适配器保存
        const result = await window.dataAdapter.addTag(tagData);
        
        if (result && result.id) {
            showNotification('标签保存成功', 'success');
            closeModal();
            // 刷新标签列表（如果在标签页面）
            const activePage = document.querySelector('.page-content.active');
            if (activePage && activePage.id === 'page-tags') {
                await loadTagsList();
            }
        } else {
            const errorMsg = result && result.message ? result.message : '标签保存失败';
            showNotification(errorMsg, 'error');
        }
    } catch (error) {
        console.error('保存标签失败:', error);
        const errorMsg = error.message.includes('KV数据库') ? 
            'Vercel数据库配置问题，请联系管理员' : 
            '标签保存失败: ' + error.message;
        showNotification(errorMsg, 'error');
    }
}

// 发送回复
function sendReply() {
    showNotification('回复发送成功', 'success');
    closeModal();
}

// 修改密码
function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // 验证输入
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('请填写所有密码字段', 'error');
        return;
    }
    
    // 验证新密码长度
    if (newPassword.length < 6) {
        showNotification('新密码至少需要6位', 'error');
        return;
    }
    
    // 验证两次输入是否一致
    if (newPassword !== confirmPassword) {
        showNotification('两次输入的新密码不一致', 'error');
        return;
    }
    
    // 调用 AuthManager 修改密码
    const result = AuthManager.changePassword(currentPassword, newPassword);
    
    if (result.success) {
        showNotification(result.message, 'success');
        
        // 清空输入框
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        // 提示用户下次登录使用新密码
        setTimeout(() => {
            showNotification('下次登录请使用新密码', 'info');
        }, 2000);
    } else {
        showNotification(result.message, 'error');
    }
}

// 清空密码字段
function clearPasswordFields() {
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    showNotification('密码字段已清空', 'info');
}

// 显示通知
function showNotification(message, type = 'info') {
    // 移除已存在的通知
    const existingNotif = document.querySelector('.notification');
    if (existingNotif) {
        existingNotif.remove();
    }

    const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
    };

    const notifHTML = `
        <div class="notification" style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 100000;
            animation: slideInRight 0.3s;
        ">
            ${message}
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', notifHTML);

    // 添加动画样式
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // 3秒后自动移除
    setTimeout(() => {
        const notif = document.querySelector('.notification');
        if (notif) {
            notif.style.animation = 'fadeOut 0.3s';
            setTimeout(() => notif.remove(), 300);
        }
    }, 3000);
}

// 添加表格行动画
document.addEventListener('DOMContentLoaded', function() {
    const rows = document.querySelectorAll('.data-table tbody tr');
    rows.forEach((row, index) => {
        row.style.opacity = '0';
        row.style.animation = `fadeInUp 0.5s ${index * 0.1}s forwards`;
    });

    // 添加动画样式
    if (!document.getElementById('table-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'table-animation-styles';
        style.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
});


// ========================================
// 用户下拉菜单功能
// ========================================

// 切换用户下拉菜单
function toggleUserDropdown() {
    const dropdown = document.querySelector('.user-dropdown');
    const menu = document.getElementById('userDropdownMenu');
    
    dropdown.classList.toggle('active');
    menu.classList.toggle('active');
}

// 点击外部关闭下拉菜单
document.addEventListener('click', function(e) {
    const dropdown = document.querySelector('.user-dropdown');
    const menu = document.getElementById('userDropdownMenu');
    
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
        menu.classList.remove('active');
    }
});

// 显示修改密码模态框
function showChangePasswordModal() {
    // 检查权限 - 用户可以修改自己的密码
    if (!window.checkPermission('users', 'update') && !AuthManager.isLoggedIn()) {
        return;
    }
    
    // 关闭下拉菜单
    const dropdown = document.querySelector('.user-dropdown');
    const menu = document.getElementById('userDropdownMenu');
    if (dropdown) dropdown.classList.remove('active');
    if (menu) menu.classList.remove('active');
    
    // 显示模态框
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'flex';
        // 清空表单
        const form = document.getElementById('changePasswordForm');
        if (form) form.reset();
    }
}

// 关闭修改密码模态框
function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 处理修改密码
async function handleChangePassword(event) {
    event.preventDefault();
    
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPasswordInput').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    // 验证新密码
    if (newPassword !== confirmPassword) {
        showNotification('两次输入的密码不一致', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('密码长度至少为6位', 'error');
        return;
    }
    
    // 获取当前用户
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
        showNotification('请先登录', 'error');
        return;
    }
    
    // 验证旧密码
    try {
        const loginResult = await AuthManager.login(currentUser.username, oldPassword);
        if (!loginResult.success) {
            showNotification('当前密码错误', 'error');
            return;
        }
    } catch (error) {
        showNotification('验证密码失败', 'error');
        return;
    }
    
    // 修改密码
    if (typeof userManager !== 'undefined') {
        const result = userManager.resetPassword(currentUser.username, newPassword);
        
        if (result.success) {
            showNotification('密码修改成功，请重新登录', 'success');
            closeChangePasswordModal();
            
            // 延迟后退出登录
            setTimeout(() => {
                handleLogout();
            }, 1500);
        } else {
            showNotification(result.message, 'error');
        }
    } else {
        showNotification('用户管理器未加载', 'error');
    }
}

// 处理退出登录
function handleLogout() {
    if (confirm('确定要退出登录吗？')) {
        AuthManager.logout();
        window.location.href = 'login.html';
    }
}

// 更新顶部栏用户名显示
function updateCurrentUsername() {
    const currentUser = AuthManager.getCurrentUser();
    if (currentUser) {
        const usernameElement = document.getElementById('currentUsername');
        if (usernameElement) {
            usernameElement.textContent = currentUser.username;
        }
    }
}

// 页面加载时更新用户名
document.addEventListener('DOMContentLoaded', function() {
    updateCurrentUsername();
});

// 点击模态框背景关闭
document.addEventListener('click', function(e) {
    if (e.target.id === 'changePasswordModal') {
        closeChangePasswordModal();
    }
});

// ESC键关闭模态框
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeChangePasswordModal();
        closeUserModal();
        closeResetPasswordModal();
    }
});


// ========================================
// 用户管理功能
// ========================================

// 加载用户列表
async function loadUsersList() {
    if (typeof userManager === 'undefined') {
        console.error('用户管理器未加载');
        return;
    }
    
    try {
        const users = await userManager.getAllUsers();
        const tbody = document.getElementById('usersTableBody');
        
        if (!tbody) return;
        
        // 更新统计数据
        const stats = await userManager.getUserStats();
        const totalUsersEl = document.getElementById('totalUsers');
        const activeUsersEl = document.getElementById('activeUsers');
        const adminUsersEl = document.getElementById('adminUsers');
        const editorUsersEl = document.getElementById('editorUsers');
        
        if (totalUsersEl) totalUsersEl.textContent = stats.total;
        if (activeUsersEl) activeUsersEl.textContent = stats.active;
        if (adminUsersEl) adminUsersEl.textContent = stats.admins;
        if (editorUsersEl) editorUsersEl.textContent = stats.editors;
    
        // 生成表格行
        tbody.innerHTML = users.map((user, index) => {
            const roleIcons = {
                'super_admin': '👑',
                'admin': '🛡️',
                'editor': '✏️',
                'viewer': '👁️'
            };
            const roleNames = {
                'super_admin': '超管',
                'admin': '管理员',
                'editor': '编辑者',
                'viewer': '查看者'
            };
            const roleIcon = roleIcons[user.role] || '❓';
            const roleName = roleNames[user.role] || user.role;
            const roleText = `${roleIcon} ${roleName}`;
            
            const statusBadge = user.status === 'active' 
                ? '<span class="badge badge-success">启用</span>' 
                : '<span class="badge badge-warning">禁用</span>';
            
            const createdDate = new Date(user.createdAt).toLocaleDateString('zh-CN');
            
            const currentUser = AuthManager.getCurrentUser();
            const isCurrentUser = currentUser && currentUser.username === user.username;
            
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${user.username}</strong></td>
                    <td>${user.displayName || '-'}</td>
                    <td>${user.email || '-'}</td>
                    <td>${roleText}</td>
                    <td>${statusBadge}</td>
                    <td>${createdDate}</td>
                    <td>
                        <button class="btn-icon" title="编辑" data-action="edit-user" data-username="${user.username}">✏️</button>
                        <button class="btn-icon" title="重置密码" data-action="reset-password" data-username="${user.username}">🔑</button>
                        ${!isCurrentUser ? `<button class="btn-icon" title="删除" data-action="delete-user" data-username="${user.username}">🗑️</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');

        // 绑定用户管理事件委托
        bindUserManagementEvents();
    } catch (error) {
        console.error('加载用户列表失败:', error);
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:2rem; color:#f44336;">加载失败，请刷新重试</td></tr>';
        }
    }
}

// 显示添加用户模态框
function showAddUserModal() {
    // 检查权限
    if (!checkPermission('users', 'create')) {
        return;
    }
    
    const modal = document.getElementById('userModal');
    const title = document.getElementById('userModalTitle');
    const form = document.getElementById('userForm');
    const passwordGroup = document.getElementById('passwordGroup');
    const passwordInput = document.getElementById('newUserPassword');
    const usernameInput = document.getElementById('newUsername');
    
    if (!modal) return;
    
    // 重置表单
    form.reset();
    document.getElementById('editUserId').value = '';
    document.getElementById('editUsername').value = '';
    
    // 设置标题
    title.textContent = '👤 添加用户';
    
    // 显示密码字段并设为必填
    passwordGroup.style.display = 'block';
    passwordInput.required = true;
    
    // 启用用户名输入
    usernameInput.disabled = false;
    usernameInput.style.background = '';
    usernameInput.style.cursor = '';
    
    // 显示模态框
    modal.style.display = 'flex';
}

// 显示编辑用户模态框
async function showEditUserModal(username) {
    // 检查权限
    if (!checkPermission('users', 'update')) {
        return;
    }
    
    if (typeof userManager === 'undefined') return;
    
    try {
        const user = await userManager.getUser(username);
        if (!user) {
            showNotification('用户不存在', 'error');
            return;
        }
        
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        const form = document.getElementById('userForm');
        const passwordGroup = document.getElementById('passwordGroup');
        const passwordInput = document.getElementById('newUserPassword');
        const usernameInput = document.getElementById('newUsername');
        
        if (!modal) return;
        
        // 设置标题
        title.textContent = '✏️ 编辑用户';
        
        // 填充表单
        document.getElementById('editUserId').value = user.id || '';
        document.getElementById('editUsername').value = user.username;
        usernameInput.value = user.username;
        document.getElementById('displayName').value = user.displayName || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userRole').value = user.role;
        document.getElementById('userStatus').value = user.status;
        
        // 隐藏密码字段（编辑时不修改密码）
        passwordGroup.style.display = 'none';
        passwordInput.required = false;
        
        // 禁用用户名输入
        usernameInput.disabled = true;
        usernameInput.style.background = '#f5f5f5';
        usernameInput.style.cursor = 'not-allowed';
        
        // 显示模态框
        modal.style.display = 'flex';
    } catch (error) {
        console.error('加载用户信息失败:', error);
        showNotification('加载用户信息失败: ' + error.message, 'error');
    }
}

// 关闭用户模态框
function closeUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 保存用户
async function handleSaveUser(event) {
    event.preventDefault();
    
    if (typeof userManager === 'undefined') {
        showNotification('用户管理器未加载', 'error');
        return;
    }
    
    try {
        const editUsername = document.getElementById('editUsername').value;
        const isEdit = !!editUsername;
        
        const formData = {
            username: document.getElementById('newUsername').value.trim(),
            displayName: document.getElementById('displayName').value.trim(),
            email: document.getElementById('userEmail').value.trim(),
            role: document.getElementById('userRole').value,
            status: document.getElementById('userStatus').value
        };
        
        // 添加用户时需要密码
        if (!isEdit) {
            formData.password = document.getElementById('newUserPassword').value;
        }
        
        let result;
        if (isEdit) {
            // 编辑用户
            result = await userManager.updateUser(editUsername, formData);
        } else {
            // 添加用户
            result = await userManager.addUser(formData);
        }
        
        if (result.success) {
            showNotification(result.message, 'success');
            closeUserModal();
            await loadUsersList();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('保存用户失败:', error);
        showNotification('保存用户失败: ' + error.message, 'error');
    }
}

// 删除用户
async function deleteUser(username) {
    // 检查权限
    if (!checkPermission('users', 'delete')) {
        return;
    }
    
    if (typeof userManager === 'undefined') {
        showNotification('用户管理器未加载', 'error');
        return;
    }
    
    try {
        const user = await userManager.getUser(username);
        if (!user) {
            showNotification('用户不存在', 'error');
            return;
        }
        
        if (!confirm(`确定要删除用户 "${user.displayName || username}" 吗？\n此操作不可恢复！`)) {
            return;
        }
        
        const result = await userManager.deleteUser(username);
        
        if (result.success) {
            showNotification(result.message, 'success');
            await loadUsersList();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('删除用户失败:', error);
        showNotification('删除用户失败: ' + error.message, 'error');
    }
}

// 显示重置密码模态框
async function showResetPasswordModal(username) {
    if (typeof userManager === 'undefined') return;
    
    try {
        const user = await userManager.getUser(username);
        if (!user) {
            showNotification('用户不存在', 'error');
            return;
        }
        
        const modal = document.getElementById('resetPasswordModal');
        const form = document.getElementById('resetPasswordForm');
        
        if (!modal) return;
        
        // 重置表单
        form.reset();
        
        // 设置用户名
        document.getElementById('resetUsername').value = username;
        document.getElementById('resetUsernameDisplay').value = user.displayName || username;
        
        // 显示模态框
        modal.style.display = 'flex';
    } catch (error) {
        console.error('加载用户信息失败:', error);
        showNotification('加载用户信息失败: ' + error.message, 'error');
    }
}

// 关闭重置密码模态框
function closeResetPasswordModal() {
    const modal = document.getElementById('resetPasswordModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 处理重置密码
async function handleResetPassword(event) {
    event.preventDefault();
    
    if (typeof userManager === 'undefined') {
        showNotification('用户管理器未加载', 'error');
        return;
    }
    
    const username = document.getElementById('resetUsername').value;
    const newPassword = document.getElementById('resetNewPassword').value;
    const confirmPassword = document.getElementById('resetConfirmPassword').value;
    
    // 验证密码
    if (newPassword !== confirmPassword) {
        showNotification('两次输入的密码不一致', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('密码至少需要6位', 'error');
        return;
    }
    
    try {
        // 重置密码
        const result = await userManager.resetPassword(username, newPassword);
        
        if (result.success) {
            showNotification(result.message, 'success');
            closeResetPasswordModal();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('重置密码失败:', error);
        showNotification('重置密码失败: ' + error.message, 'error');
    }
}

// 绑定用户管理事件委托
function bindUserManagementEvents() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    // 移除旧的事件监听器
    tbody.removeEventListener('click', handleUserManagementClick);
    
    // 绑定新的事件监听器
    tbody.addEventListener('click', handleUserManagementClick);
}

// 处理用户管理点击事件
function handleUserManagementClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const username = button.dataset.username;

    switch (action) {
        case 'edit-user':
            showEditUserModal(username);
            break;
        case 'reset-password':
            showResetPasswordModal(username);
            break;
        case 'delete-user':
            deleteUser(username);
            break;
    }
}

// 加载分类列表
async function loadCategoriesList() {
    try {
        const categories = await window.dataAdapter.getCategories();
        const tbody = document.getElementById('categoriesTable');
        
        if (!tbody) return;
        
        tbody.innerHTML = categories.map(category => `
            <tr>
                <td>${category.name}</td>
                <td>${category.description || '-'}</td>
                <td>${category.count || 0}</td>
                <td>
                    <button class="btn-icon" title="编辑" onclick="editCategory('${category.id}')">✏️</button>
                    <button class="btn-icon" title="删除" onclick="deleteCategory('${category.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载分类列表失败:', error);
        showNotification('加载分类列表失败', 'error');
    }
}

// 加载标签列表
async function loadTagsList() {
    try {
        const tags = await window.dataAdapter.getTags();
        const tagsGrid = document.querySelector('.tags-grid');
        
        if (!tagsGrid) return;
        
        tagsGrid.innerHTML = tags.map(tag => `
            <div class="tag-card">
                <div class="tag-name">${tag.name}</div>
                <div class="tag-count">${tag.count || 0} 篇文章</div>
                <div class="tag-actions">
                    <button class="btn-icon" onclick="editTag('${tag.id}')">✏️</button>
                    <button class="btn-icon" onclick="deleteTag('${tag.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载标签列表失败:', error);
        showNotification('加载标签列表失败', 'error');
    }
}

// 编辑分类
async function editCategory(id) {
    try {
        const categories = await window.dataAdapter.getCategories();
        const category = categories.find(c => String(c.id) === String(id));
        
        if (!category) {
            showNotification('分类不存在', 'error');
            return;
        }
        
        const categoryForm = `
            <div class="modal-form">
                <div class="form-group">
                    <label>分类名称</label>
                    <input type="text" class="form-control" value="${category.name}" placeholder="请输入分类名称">
                </div>
                <div class="form-group">
                    <label>分类描述</label>
                    <textarea class="form-control" rows="3" placeholder="请输入分类描述">${category.description || ''}</textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" onclick="updateCategory('${id}')">保存</button>
                    <button class="btn-secondary" onclick="closeModal()">取消</button>
                </div>
            </div>
        `;
        
        showModal('编辑分类', categoryForm);
    } catch (error) {
        console.error('加载分类信息失败:', error);
        showNotification('加载分类信息失败', 'error');
    }
}

// 更新分类
async function updateCategory(id) {
    try {
        const form = document.querySelector('.modal-form');
        const nameInput = form.querySelector('input[type="text"]');
        const descInput = form.querySelector('textarea');
        
        if (!nameInput.value.trim()) {
            showNotification('请输入分类名称', 'error');
            return;
        }
        
        const updates = {
            name: nameInput.value.trim(),
            description: descInput.value.trim()
        };
        
        const result = await window.dataAdapter.updateCategory(id, updates);
        
        if (result) {
            showNotification('分类更新成功', 'success');
            closeModal();
            await loadCategoriesList();
        } else {
            showNotification('分类更新失败', 'error');
        }
    } catch (error) {
        console.error('更新分类失败:', error);
        showNotification('更新分类失败: ' + error.message, 'error');
    }
}

// 删除分类
async function deleteCategory(id) {
    try {
        if (!confirm('确定要删除这个分类吗？此操作不可恢复。')) {
            return;
        }
        
        const result = await window.dataAdapter.deleteCategory(id);
        
        if (result && result.success) {
            showNotification('分类删除成功', 'success');
            await loadCategoriesList();
        } else {
            showNotification('分类删除失败', 'error');
        }
    } catch (error) {
        console.error('删除分类失败:', error);
        showNotification('删除分类失败: ' + error.message, 'error');
    }
}

// 编辑标签
async function editTag(id) {
    // 检查权限
    if (!window.checkPermission('tags', 'update')) {
        return;
    }
    
    try {
        const tags = await window.dataAdapter.getTags();
        const tag = tags.find(t => String(t.id) === String(id));
        
        if (!tag) {
            showNotification('标签不存在', 'error');
            return;
        }
        
        const tagForm = `
            <div class="modal-form">
                <div class="form-group">
                    <label>标签名称</label>
                    <input type="text" class="form-control" value="${tag.name}" placeholder="请输入标签名称">
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" onclick="updateTag('${id}')">保存</button>
                    <button class="btn-secondary" onclick="closeModal()">取消</button>
                </div>
            </div>
        `;
        
        showModal('编辑标签', tagForm);
    } catch (error) {
        console.error('加载标签信息失败:', error);
        showNotification('加载标签信息失败', 'error');
    }
}

// 更新标签
async function updateTag(id) {
    try {
        const form = document.querySelector('.modal-form');
        const nameInput = form.querySelector('input[type="text"]');
        
        if (!nameInput.value.trim()) {
            showNotification('请输入标签名称', 'error');
            return;
        }
        
        const updates = {
            name: nameInput.value.trim()
        };
        
        const result = await window.dataAdapter.updateTag(id, updates);
        
        if (result) {
            showNotification('标签更新成功', 'success');
            closeModal();
            await loadTagsList();
        } else {
            showNotification('标签更新失败', 'error');
        }
    } catch (error) {
        console.error('更新标签失败:', error);
        showNotification('更新标签失败: ' + error.message, 'error');
    }
}

// 删除标签
async function deleteTag(id) {
    // 检查权限
    if (!window.checkPermission('tags', 'delete')) {
        return;
    }
    
    try {
        if (!confirm('确定要删除这个标签吗？此操作不可恢复。')) {
            return;
        }
        
        const result = await window.dataAdapter.deleteTag(id);
        
        if (result && result.success) {
            showNotification('标签删除成功', 'success');
            await loadTagsList();
        } else {
            showNotification('标签删除失败', 'error');
        }
    } catch (error) {
        console.error('删除标签失败:', error);
        showNotification('删除标签失败: ' + error.message, 'error');
    }
}

// 页面加载时初始化用户管理
document.addEventListener('DOMContentLoaded', function() {
    // 防止重复绑定的标记
    if (window.adminEventsBound) {
        return;
    }
    window.adminEventsBound = true;
    
    // 监听页面切换到用户管理时加载列表
    const usersNavItem = document.querySelector('.nav-item[data-page="users"]');
    if (usersNavItem && !usersNavItem.hasAttribute('data-users-bound')) {
        usersNavItem.setAttribute('data-users-bound', 'true');
        usersNavItem.addEventListener('click', function() {
            setTimeout(loadUsersList, 100);
        });
    }
    
    // 监听页面切换到分类管理时加载列表
    const categoriesNavItem = document.querySelector('.nav-item[data-page="categories"]');
    if (categoriesNavItem && !categoriesNavItem.hasAttribute('data-categories-bound')) {
        categoriesNavItem.setAttribute('data-categories-bound', 'true');
        categoriesNavItem.addEventListener('click', function() {
            setTimeout(loadCategoriesList, 100);
        });
    }
    
    // 监听页面切换到标签管理时加载列表
    const tagsNavItem = document.querySelector('.nav-item[data-page="tags"]');
    if (tagsNavItem && !tagsNavItem.hasAttribute('data-tags-bound')) {
        tagsNavItem.setAttribute('data-tags-bound', 'true');
        tagsNavItem.addEventListener('click', function() {
            setTimeout(loadTagsList, 100);
        });
    }
    
    // 监听页面切换到应用管理时初始化
    const appsNavItem = document.querySelector('.nav-item[data-page="apps"]');
    if (appsNavItem && !appsNavItem.hasAttribute('data-apps-bound')) {
        appsNavItem.setAttribute('data-apps-bound', 'true');
        appsNavItem.addEventListener('click', function() {
            setTimeout(initAppsManager, 100);
        });
    }
});


// ========================================
// 🔥 数据备份功能
// ========================================

// 备份数据
async function backupData() {
    // 检查权限
    if (!window.checkPermission('settings', 'update')) {
        return;
    }
    
    const statusDiv = document.getElementById('backupStatus');
    statusDiv.style.display = 'block';
    statusDiv.style.background = '#e3f2fd';
    statusDiv.style.color = '#1976d2';
    statusDiv.innerHTML = '⏳ 正在备份数据...';
    
    try {
        // 获取API基础URL
        const apiBase = window.environmentAdapter ? window.environmentAdapter.apiBase : '/api';
        const response = await fetch(`${apiBase}/backup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            statusDiv.style.background = '#e8f5e9';
            statusDiv.style.color = '#2e7d32';
            statusDiv.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 0.5rem;">✅ 备份成功！</div>
                <div style="font-size: 0.9rem;">
                    📁 备份位置: <code>${result.data.backupPath}</code><br>
                    📊 文件数量: ${result.data.filesCount} 个<br>
                    💾 总大小: ${result.data.totalSizeMB} MB<br>
                    🕐 备份时间: ${new Date(result.data.timestamp).toLocaleString('zh-CN')}
                </div>
            `;
            
            showNotification('数据备份成功！', 'success');
        } else {
            throw new Error(result.message || '备份失败');
        }
    } catch (error) {
        console.error('备份失败:', error);
        statusDiv.style.background = '#ffebee';
        statusDiv.style.color = '#c62828';
        statusDiv.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 0.5rem;">❌ 备份失败</div>
            <div style="font-size: 0.9rem;">
                错误信息: ${error.message}<br>
                <br>
                💡 请确保：<br>
                1. API服务器正在运行（<code>node simple-server.js</code>）<br>
                2. 有足够的磁盘空间<br>
                3. 有写入权限
            </div>
        `;
        
        showNotification('备份失败: ' + error.message, 'error');
    }
}

// 显示备份列表
async function showBackupList() {
    // 检查权限
    if (!window.checkPermission('settings', 'read')) {
        return;
    }
    
    try {
        // 获取API基础URL
        const apiBase = window.environmentAdapter ? window.environmentAdapter.apiBase : '/api';
        const response = await fetch(`${apiBase}/backups`);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || '获取备份列表失败');
        }
        
        const backups = result.data;
        
        // 创建模态框
        const modalHTML = `
            <div class="modal-overlay" id="backupListModal" style="z-index: 10000;">
                <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3>📋 数据备份列表</h3>
                        <button class="modal-close" onclick="closeBackupListModal()">×</button>
                    </div>
                    <div class="modal-body">
                        ${backups.length === 0 ? `
                            <div style="text-align: center; padding: 3rem; color: #999;">
                                <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
                                <div>暂无备份记录</div>
                                <div style="font-size: 0.9rem; margin-top: 0.5rem;">点击"立即备份数据"创建第一个备份</div>
                            </div>
                        ` : `
                            <div style="margin-bottom: 1rem; padding: 1rem; background: #e3f2fd; border-radius: 8px; color: #1976d2;">
                                💡 共找到 <strong>${backups.length}</strong> 个备份
                            </div>
                            <div style="display: grid; gap: 1rem;">
                                ${backups.map(backup => `
                                    <div style="padding: 1.5rem; background: #f8f9fa; border-radius: 12px; border: 2px solid #e0e0e0;">
                                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                                            <div>
                                                <div style="font-weight: 600; font-size: 1.1rem; color: #333; margin-bottom: 0.5rem;">
                                                    📁 ${backup.name}
                                                </div>
                                                <div style="font-size: 0.9rem; color: #666;">
                                                    🕐 ${new Date(backup.createTime).toLocaleString('zh-CN')}
                                                </div>
                                            </div>
                                            <div style="text-align: right;">
                                                <div style="font-size: 1.2rem; font-weight: 600; color: #4CAF50;">
                                                    ${backup.totalSizeMB} MB
                                                </div>
                                                <div style="font-size: 0.85rem; color: #999;">
                                                    ${backup.filesCount} 个文件
                                                </div>
                                            </div>
                                        </div>
                                        <div style="padding: 0.75rem; background: white; border-radius: 8px; font-size: 0.85rem; color: #666; font-family: monospace;">
                                            📂 ${backup.path}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="closeBackupListModal()">关闭</button>
                    </div>
                </div>
            </div>
        `;
        
        // 移除旧的模态框
        const oldModal = document.getElementById('backupListModal');
        if (oldModal) {
            oldModal.remove();
        }
        
        // 添加新模态框
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 点击背景关闭
        document.getElementById('backupListModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeBackupListModal();
            }
        });
        
    } catch (error) {
        console.error('获取备份列表失败:', error);
        showNotification('获取备份列表失败: ' + error.message, 'error');
    }
}

// 关闭备份列表模态框
function closeBackupListModal() {
    const modal = document.getElementById('backupListModal');
    if (modal) {
        modal.remove();
    }
}

// ========================================
// 权限系统测试函数
// ========================================

function testPermissionSystem() {
    if (!window.permissionManager) {
        console.error('❌ 权限管理器未初始化');
        return;
    }
    
    console.log('🧪 开始测试权限系统...');
    
    const currentUser = window.permissionManager.getCurrentUser();
    if (currentUser) {
        console.log('👤 当前用户:', currentUser.username, '角色:', currentUser.role);
        
        // 测试各种权限
        const testCases = [
            { module: 'articles', action: 'read' },
            { module: 'articles', action: 'create' },
            { module: 'articles', action: 'update' },
            { module: 'articles', action: 'delete' },
            { module: 'users', action: 'read' },
            { module: 'users', action: 'create' },
            { module: 'users', action: 'update' },
            { module: 'users', action: 'delete' },
            { module: 'settings', action: 'read' },
            { module: 'settings', action: 'update' }
        ];
        
        console.log('🔍 权限测试结果:');
        testCases.forEach(test => {
            const hasPermission = window.permissionManager.hasPermission(test.module, test.action);
            const status = hasPermission ? '✅' : '❌';
            console.log(`${status} ${test.module}.${test.action}: ${hasPermission}`);
        });
        
        // 显示权限统计
        const permissions = window.permissionManager.getUserPermissions();
        console.log(`📊 总权限数: ${permissions.length}`);
        console.log('📋 权限列表:', permissions);
        
        // 更新权限状态卡片
        updatePermissionStatusCard();
    } else {
        console.error('❌ 未找到当前用户信息');
    }
}

// 更新权限状态卡片
function updatePermissionStatusCard() {
    const card = document.getElementById('permission-status-card');
    if (!card || !window.permissionManager) return;
    
    const currentUser = window.permissionManager.getCurrentUser();
    if (!currentUser) return;
    
    const roleDisplayName = window.permissionManager.getRoleDisplayName(currentUser.role);
    const permissions = window.permissionManager.getUserPermissions();
    
    const valueElement = card.querySelector('.stat-value');
    if (valueElement) {
        valueElement.textContent = roleDisplayName;
        valueElement.title = `拥有 ${permissions.length} 项权限`;
    }
    
    // 根据角色设置不同的颜色
    const roleColors = {
        'super_admin': 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
        'admin': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'editor': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'viewer': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    };
    
    const color = roleColors[currentUser.role] || roleColors.viewer;
    card.style.background = color;
}