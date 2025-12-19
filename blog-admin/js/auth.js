/* ========================================
   认证管理模块
   ======================================== */

const AuthManager = {
    // 检查是否已登录
    isLoggedIn() {
        const token = localStorage.getItem('admin_token');
        const loginTime = localStorage.getItem('admin_login_time');
        const lastActivity = localStorage.getItem('admin_last_activity');
        
        if (!token || !loginTime) {
            return false;
        }
        
        const now = Date.now();
        const loginTimestamp = parseInt(loginTime);
        const lastActivityTimestamp = parseInt(lastActivity || loginTime);
        
        // 检查登录是否过期（24小时）
        const maxLoginTime = 24 * 60 * 60 * 1000; // 24小时
        if (now - loginTimestamp > maxLoginTime) {
            this.logout('登录已过期（超过24小时）');
            return false;
        }
        
        // 检查是否超过1小时无操作
        const inactivityTimeout = 60 * 60 * 1000; // 1小时
        if (now - lastActivityTimestamp > inactivityTimeout) {
            this.logout('长时间未操作，已自动退出');
            return false;
        }
        
        return true;
    },
    
    // 登录
    async login(username, password) {
        try {
            // 在Vercel环境下，直接使用API验证
            if (window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
                console.log('🌐 Vercel环境：使用KV数据库验证登录');
                
                // 直接调用API验证用户
                const apiBase = window.environmentAdapter ? window.environmentAdapter.apiBase : '/api';
                const response = await fetch(`${apiBase}/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'validate_login',
                        username: username,
                        password: password
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`API请求失败: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    // 生成简单的token
                    const token = btoa(`${username}:${Date.now()}`);
                    const now = Date.now().toString();
                    
                    localStorage.setItem('admin_token', token);
                    localStorage.setItem('admin_username', username);
                    localStorage.setItem('admin_login_time', now);
                    localStorage.setItem('admin_last_activity', now);
                    
                    console.log('✅ Vercel环境登录成功');
                    return {
                        success: true,
                        message: '登录成功',
                        user: result.user
                    };
                }
                
                return result;
            }
            
            // 使用用户管理器验证登录（本地环境）
            if (typeof window.userManager !== 'undefined') {
                const result = await window.userManager.validateLogin(username, password);
                
                if (result.success) {
                    // 生成简单的token
                    const token = btoa(`${username}:${Date.now()}`);
                    const now = Date.now().toString();
                    
                    localStorage.setItem('admin_token', token);
                    localStorage.setItem('admin_username', username);
                    localStorage.setItem('admin_login_time', now);
                    localStorage.setItem('admin_last_activity', now);
                    
                    return {
                        success: true,
                        message: '登录成功',
                        user: result.user
                    };
                }
                
                return result;
            }
            
            // 最后的降级处理：如果用户管理器未加载，使用旧方法
            console.warn('⚠️ 用户管理器未加载，使用降级认证方式');
            
            const correctPassword = this.getPassword(username);
            
            if (!correctPassword) {
                return {
                    success: false,
                    message: '用户名不存在'
                };
            }
            
            if (correctPassword === password) {
                const token = btoa(`${username}:${Date.now()}`);
                const now = Date.now().toString();
                
                localStorage.setItem('admin_token', token);
                localStorage.setItem('admin_username', username);
                localStorage.setItem('admin_login_time', now);
                localStorage.setItem('admin_last_activity', now);
                
                return {
                    success: true,
                    message: '登录成功'
                };
            }
            
            return {
                success: false,
                message: '用户名或密码错误'
            };
        } catch (error) {
            console.error('❌ 登录验证失败:', error);
            return {
                success: false,
                message: '登录失败: ' + error.message
            };
        }
    },
    
    // 登出
    logout(reason = '') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_username');
        localStorage.removeItem('admin_login_time');
        localStorage.removeItem('admin_last_activity');
        
        // 如果有退出原因，保存到sessionStorage
        if (reason) {
            sessionStorage.setItem('logout_reason', reason);
        }
    },
    
    // 获取当前用户信息
    getCurrentUser() {
        if (!this.isLoggedIn()) {
            return null;
        }
        
        return {
            username: localStorage.getItem('admin_username'),
            loginTime: parseInt(localStorage.getItem('admin_login_time'))
        };
    },
    
    // 检查并重定向到登录页
    requireAuth() {
        if (!this.isLoggedIn()) {
            // 保存当前页面URL，登录后可以返回
            const currentPage = window.location.pathname + window.location.search + window.location.hash;
            sessionStorage.setItem('redirect_after_login', currentPage);
            
            // 重定向到登录页
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },
    
    // 更新最后活动时间（用于保持会话活跃）
    updateActivity() {
        if (this.isLoggedIn()) {
            localStorage.setItem('admin_last_activity', Date.now().toString());
        }
    },
    
    // 修改密码
    changePassword(currentPassword, newPassword) {
        if (!this.isLoggedIn()) {
            return {
                success: false,
                message: '请先登录'
            };
        }
        
        const username = localStorage.getItem('admin_username');
        
        // 获取存储的密码（实际项目中应该从后端验证）
        const storedPasswords = JSON.parse(localStorage.getItem('admin_passwords') || '{}');
        
        // 如果没有存储密码，使用默认密码
        const defaultPasswords = {
            'admin': 'admin123',
            'editor': 'editor123'
        };
        
        const currentStoredPassword = storedPasswords[username] || defaultPasswords[username];
        
        // 验证当前密码
        if (currentStoredPassword !== currentPassword) {
            return {
                success: false,
                message: '当前密码错误'
            };
        }
        
        // 验证新密码
        if (!newPassword || newPassword.length < 6) {
            return {
                success: false,
                message: '新密码至少需要6位'
            };
        }
        
        // 保存新密码
        storedPasswords[username] = newPassword;
        localStorage.setItem('admin_passwords', JSON.stringify(storedPasswords));
        
        return {
            success: true,
            message: '密码修改成功'
        };
    },
    
    // 验证密码（用于登录时检查自定义密码）
    getPassword(username) {
        const storedPasswords = JSON.parse(localStorage.getItem('admin_passwords') || '{}');
        const defaultPasswords = {
            'admin': 'admin123',
            'editor': 'editor123',
            'admin1': 'admin123',
            'viewer': 'viewer123'
        };
        
        return storedPasswords[username] || defaultPasswords[username];
    }
};

// 自动更新活动时间和检查会话
if (typeof document !== 'undefined') {
    // 监听用户活动（使用节流避免频繁更新）
    let activityTimer = null;
    const updateActivityThrottled = () => {
        if (activityTimer) return;
        activityTimer = setTimeout(() => {
            AuthManager.updateActivity();
            activityTimer = null;
        }, 5000); // 每5秒最多更新一次
    };
    
    ['click', 'keypress', 'scroll', 'mousemove', 'touchstart'].forEach(event => {
        document.addEventListener(event, updateActivityThrottled, { passive: true });
    });
    
    // 定期检查会话状态（每分钟检查一次）
    setInterval(() => {
        if (window.location.pathname.includes('blog-admin') && 
            !window.location.pathname.includes('login.html')) {
            if (!AuthManager.isLoggedIn()) {
                // 会话已过期，重定向到登录页
                window.location.href = 'login.html';
            }
        }
    }, 60000); // 每分钟检查一次
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}


// 会话状态管理
const SessionManager = {
    warningShown: false,
    
    // 获取剩余时间
    getRemainingTime() {
        const lastActivity = localStorage.getItem('admin_last_activity');
        if (!lastActivity) return 0;
        
        const now = Date.now();
        const lastActivityTimestamp = parseInt(lastActivity);
        const inactivityTimeout = 60 * 60 * 1000; // 1小时
        const remaining = inactivityTimeout - (now - lastActivityTimestamp);
        
        return Math.max(0, remaining);
    },
    
    // 格式化剩余时间
    formatRemainingTime() {
        const remaining = this.getRemainingTime();
        const minutes = Math.floor(remaining / 60000);
        
        if (minutes > 60) {
            return '1小时+';
        } else if (minutes > 0) {
            return `${minutes}分钟`;
        } else {
            return '即将过期';
        }
    },
    
    // 显示会话即将过期提示
    showExpirationWarning() {
        const remaining = this.getRemainingTime();
        const fiveMinutes = 5 * 60 * 1000;
        
        // 剩余5分钟时提示一次
        if (remaining > 0 && remaining <= fiveMinutes && !this.warningShown) {
            this.warningShown = true;
            
            if (typeof showNotification === 'function') {
                showNotification('⏰ 会话即将过期，请保存您的工作', 'warning');
            } else {
                alert('⏰ 会话即将过期（剩余' + Math.floor(remaining / 60000) + '分钟），请保存您的工作');
            }
        }
        
        // 重置警告标志（当剩余时间超过10分钟时）
        if (remaining > 10 * 60 * 1000) {
            this.warningShown = false;
        }
    },
    
    // 启动会话监控
    startMonitoring() {
        // 每30秒检查一次
        setInterval(() => {
            this.showExpirationWarning();
        }, 30000);
    }
};

// 启动会话监控
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('blog-admin') && 
            !window.location.pathname.includes('login.html')) {
            SessionManager.startMonitoring();
        }
    });
}