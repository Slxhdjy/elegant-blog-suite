/* ========================================
   用户管理模块
   ======================================== */

class UserManager {
    constructor() {
        this.init();
    }
    
    init() {
        // 初始化默认用户（如果不存在）
        this.initDefaultUsers();
        console.log('👥 用户管理模块已加载');
    }
    
    // 初始化默认用户
    initDefaultUsers() {
        const users = this.getAllUsers();
        if (users.length === 0) {
            // 创建默认管理员
            this.addUser({
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                email: 'admin@example.com',
                displayName: '管理员',
                status: 'active'
            }, true); // true表示跳过权限检查
        }
    }
    
    // 获取所有用户
    async getAllUsers() {
        try {
            if (window.blogDataStore) {
                return await window.blogDataStore.getUsers();
            } else {
                // 回退到localStorage
                const usersData = localStorage.getItem('blog_users');
                if (!usersData) {
                    return [];
                }
                return JSON.parse(usersData);
            }
        } catch (e) {
            console.error('获取用户数据失败:', e);
            return [];
        }
    }
    
    // 保存用户列表（已废弃，使用addUser/updateUser代替）
    async saveUsers(users) {
        if (window.blogDataStore) {
            // 不再直接保存整个列表
            console.warn('saveUsers已废弃，请使用addUser/updateUser');
        } else {
            localStorage.setItem('blog_users', JSON.stringify(users));
        }
    }
    
    // 获取单个用户
    async getUser(username) {
        if (window.blogDataStore) {
            return await window.blogDataStore.getUserByUsername(username);
        } else {
            const users = await this.getAllUsers();
            return users.find(u => u.username === username);
        }
    }
    
    // 添加用户
    async addUser(userData, skipPermissionCheck = false) {
        try {
            // 权限检查
            if (!skipPermissionCheck) {
                const currentUser = AuthManager.getCurrentUser();
                if (!currentUser) {
                    return {
                        success: false,
                        message: '请先登录'
                    };
                }
                
                const currentUserData = await this.getUser(currentUser.username);
                const canAddUsers = currentUserData && ['admin', 'super_admin'].includes(currentUserData.role);
                if (!canAddUsers) {
                    return {
                        success: false,
                        message: '只有管理员可以添加用户'
                    };
                }
            }
            
            // 验证必填字段
            if (!userData.username || !userData.password) {
                return {
                    success: false,
                    message: '用户名和密码不能为空'
                };
            }
            
            // 验证用户名格式
            if (!/^[a-zA-Z0-9_]{3,20}$/.test(userData.username)) {
                return {
                    success: false,
                    message: '用户名只能包含字母、数字和下划线，长度3-20位'
                };
            }
            
            // 验证密码长度
            if (userData.password.length < 6) {
                return {
                    success: false,
                    message: '密码至少需要6位'
                };
            }
            
            // 检查用户名是否已存在
            const users = await this.getAllUsers();
            if (users.some(u => u.username === userData.username)) {
                return {
                    success: false,
                    message: '用户名已存在'
                };
            }
            
            // 使用blogDataStore添加用户
            if (window.blogDataStore) {
                const newUser = await window.blogDataStore.addUser({
                    username: userData.username,
                    password: userData.password,
                    role: userData.role || 'editor',
                    email: userData.email || '',
                    displayName: userData.displayName || userData.username,
                    status: userData.status || 'active'
                });
                
                return {
                    success: true,
                    message: '用户添加成功',
                    user: newUser
                };
            } else {
                // 回退到localStorage
                const newUser = {
                    id: 'user_' + Date.now(),
                    username: userData.username,
                    password: userData.password,
                    role: userData.role || 'editor',
                    email: userData.email || '',
                    displayName: userData.displayName || userData.username,
                    status: userData.status || 'active',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                users.push(newUser);
                await this.saveUsers(users);
                
                return {
                    success: true,
                    message: '用户添加成功',
                    user: newUser
                };
            }
        } catch (error) {
            console.error('添加用户失败:', error);
            return {
                success: false,
                message: '添加用户失败: ' + error.message
            };
        }
    }
    
    // 更新用户
    async updateUser(username, updates) {
        try {
            // 权限检查
            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) {
                return {
                    success: false,
                    message: '请先登录'
                };
            }
            
            const currentUserData = await this.getUser(currentUser.username);
            
            // 只有管理员或超级管理员可以修改其他用户，或者用户可以修改自己的信息
            const canModifyOthers = ['admin', 'super_admin'].includes(currentUserData.role);
            if (!canModifyOthers && currentUser.username !== username) {
                return {
                    success: false,
                    message: '没有权限修改其他用户信息'
                };
            }
            
            const users = await this.getAllUsers();
            const userIndex = users.findIndex(u => u.username === username);
            
            if (userIndex === -1) {
                return {
                    success: false,
                    message: '用户不存在'
                };
            }
            
            // 不允许修改用户名
            if (updates.username && updates.username !== username) {
                return {
                    success: false,
                    message: '不允许修改用户名'
                };
            }
            
            // 普通用户不能修改自己的角色
            const canModifyRoles = ['admin', 'super_admin'].includes(currentUserData.role);
            if (updates.role && !canModifyRoles && currentUser.username === username) {
                return {
                    success: false,
                    message: '不能修改自己的角色'
                };
            }
            
            // 使用blogDataStore更新用户
            if (window.blogDataStore) {
                const user = users[userIndex];
                await window.blogDataStore.updateUser(user.id, {
                    ...updates,
                    username: username // 保持用户名不变
                });
            } else {
                // 回退到localStorage
                users[userIndex] = {
                    ...users[userIndex],
                    ...updates,
                    username: username,
                    updatedAt: new Date().toISOString()
                };
                await this.saveUsers(users);
            }
            
            return {
                success: true,
                message: '用户信息更新成功',
                user: users[userIndex]
            };
        } catch (error) {
            console.error('更新用户失败:', error);
            return {
                success: false,
                message: '更新用户失败: ' + error.message
            };
        }
    }
    
    // 删除用户
    async deleteUser(username) {
        try {
            // 权限检查
            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) {
                return {
                    success: false,
                    message: '请先登录'
                };
            }
            
            const currentUserData = await this.getUser(currentUser.username);
            const canDeleteUsers = currentUserData && ['admin', 'super_admin'].includes(currentUserData.role);
            if (!canDeleteUsers) {
                return {
                    success: false,
                    message: '只有管理员可以删除用户'
                };
            }
            
            // 不能删除自己
            if (currentUser.username === username) {
                return {
                    success: false,
                    message: '不能删除当前登录的用户'
                };
            }
            
            const users = await this.getAllUsers();
            const userIndex = users.findIndex(u => u.username === username);
            
            if (userIndex === -1) {
                return {
                    success: false,
                    message: '用户不存在'
                };
            }
            
            // 至少保留一个管理员或超级管理员
            const adminUsers = users.filter(u => ['admin', 'super_admin'].includes(u.role));
            if (adminUsers.length === 1 && ['admin', 'super_admin'].includes(users[userIndex].role)) {
                return {
                    success: false,
                    message: '不能删除最后一个管理员'
                };
            }
            
            // 使用blogDataStore删除用户
            if (window.blogDataStore) {
                const user = users[userIndex];
                await window.blogDataStore.deleteUser(user.id);
            } else {
                // 回退到localStorage
                users.splice(userIndex, 1);
                await this.saveUsers(users);
            }
            
            return {
                success: true,
                message: '用户删除成功'
            };
        } catch (error) {
            console.error('删除用户失败:', error);
            return {
                success: false,
                message: '删除用户失败: ' + error.message
            };
        }
    }
    
    // 修改密码
    changePassword(username, oldPassword, newPassword) {
        const user = this.getUser(username);
        
        if (!user) {
            return {
                success: false,
                message: '用户不存在'
            };
        }
        
        // 验证旧密码
        if (user.password !== oldPassword) {
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
        
        // 更新密码
        return this.updateUser(username, { password: newPassword });
    }
    
    // 重置密码（仅管理员）
    async resetPassword(username, newPassword) {
        const currentUser = AuthManager.getCurrentUser();
        if (!currentUser) {
            return {
                success: false,
                message: '请先登录'
            };
        }
        
        const currentUserData = await this.getUser(currentUser.username);
        const canResetPasswords = currentUserData && ['admin', 'super_admin'].includes(currentUserData.role);
        if (!canResetPasswords) {
            return {
                success: false,
                message: '只有管理员可以重置密码'
            };
        }
        
        if (!newPassword || newPassword.length < 6) {
            return {
                success: false,
                message: '新密码至少需要6位'
            };
        }
        
        return await this.updateUser(username, { password: newPassword });
    }
    
    // 验证用户登录
    async validateLogin(username, password) {
        const user = await this.getUser(username);
        
        if (!user) {
            return {
                success: false,
                message: '用户名不存在'
            };
        }
        
        if (user.status !== 'active') {
            return {
                success: false,
                message: '用户已被禁用'
            };
        }
        
        if (user.password !== password) {
            return {
                success: false,
                message: '密码错误'
            };
        }
        
        return {
            success: true,
            message: '登录成功',
            user: {
                username: user.username,
                role: user.role,
                displayName: user.displayName,
                email: user.email
            }
        };
    }
    
    // 获取用户统计
    async getUserStats() {
        const users = await this.getAllUsers();
        
        return {
            total: users.length,
            active: users.filter(u => u.status === 'active').length,
            inactive: users.filter(u => u.status === 'inactive').length,
            admins: users.filter(u => ['admin', 'super_admin'].includes(u.role)).length,
            editors: users.filter(u => u.role === 'editor').length
        };
    }
}

// 初始化用户管理器
let userManager;
document.addEventListener('DOMContentLoaded', function() {
    userManager = new UserManager();
    window.userManager = userManager;
});
