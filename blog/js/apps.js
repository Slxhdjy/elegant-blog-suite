/* ========================================
   应用页面逻辑
   ======================================== */

class AppsManager {
    constructor() {
        this.apps = [];
        this.filteredApps = [];
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.init();
    }

    async init() {
        console.log('📱 初始化应用页面...');
        await this.loadApps();
        this.setupEventListeners();
        this.renderApps();
    }

    // 加载应用数据
    async loadApps() {
        try {
            // 使用数据存储包装器获取应用数据
            if (window.blogDataStore) {
                const allData = await window.blogDataStore.getAllData();
                const appsData = allData.apps || [];
                
                // 只显示启用的应用，并按order排序
                this.apps = appsData
                    .filter(app => app.status === 'enabled')
                    .sort((a, b) => (a.order || 0) - (b.order || 0));
                
                this.filteredApps = [...this.apps];
                console.log(`✅ 加载了 ${this.apps.length} 个应用`);
            } else {
                console.error('❌ blogDataStore 未初始化');
                this.apps = [];
                this.filteredApps = [];
            }
        } catch (error) {
            console.error('❌ 加载应用出错:', error);
            this.apps = [];
            this.filteredApps = [];
        }
    }

    // 设置事件监听
    setupEventListeners() {
        // 分类筛选
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 获取按钮或其子元素的category
                const target = e.target.closest('.category-btn');
                const category = target.dataset.category;
                this.filterByCategory(category);
            });
        });

        // 搜索输入
        const searchInput = document.getElementById('appSearch');
        const clearBtn = document.getElementById('searchClearBtn');
        
        if (searchInput) {
            // 实时搜索
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.applyFilters();
                this.updateSearchUI();
            });

            // 回车搜索
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applyFilters();
                }
            });
        }

        // 清除按钮
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }
    }

    // 更新搜索UI
    updateSearchUI() {
        const searchInput = document.getElementById('appSearch');
        const clearBtn = document.getElementById('searchClearBtn');
        const resultsCount = document.getElementById('searchResultsCount');
        const resultsNumber = document.getElementById('resultsNumber');

        // 显示/隐藏清除按钮
        if (clearBtn) {
            clearBtn.style.display = this.searchQuery ? 'flex' : 'none';
        }

        // 显示/隐藏结果计数
        if (resultsCount && resultsNumber) {
            if (this.searchQuery || this.currentCategory !== 'all') {
                resultsCount.style.display = 'block';
                resultsNumber.textContent = this.filteredApps.length;
            } else {
                resultsCount.style.display = 'none';
            }
        }
    }

    // 清除搜索
    clearSearch() {
        const searchInput = document.getElementById('appSearch');
        if (searchInput) {
            searchInput.value = '';
            this.searchQuery = '';
            this.applyFilters();
            this.updateSearchUI();
            searchInput.focus();
        }
    }

    // 按分类筛选
    filterByCategory(category) {
        this.currentCategory = category;
        
        // 更新按钮状态
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === category) {
                btn.classList.add('active');
            }
        });
        
        this.applyFilters();
    }

    // 应用所有筛选条件
    applyFilters() {
        this.filteredApps = this.apps.filter(app => {
            // 分类筛选
            const categoryMatch = this.currentCategory === 'all' || 
                                 app.category === this.currentCategory;
            
            // 搜索筛选
            const searchMatch = !this.searchQuery || 
                               app.name.toLowerCase().includes(this.searchQuery) ||
                               app.description.toLowerCase().includes(this.searchQuery);
            
            return categoryMatch && searchMatch;
        });
        
        this.renderApps();
        this.updateSearchUI();
    }

    // 渲染应用列表
    renderApps() {
        const container = document.getElementById('appsGrid');
        if (!container) return;

        // 显示加载状态
        if (this.apps.length === 0 && this.filteredApps.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📱</div>
                    <h3>暂无应用</h3>
                    <p>还没有添加任何应用，敬请期待...</p>
                </div>
            `;
            return;
        }

        // 显示筛选结果为空
        if (this.filteredApps.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>未找到应用</h3>
                    <p>没有符合条件的应用，试试其他筛选条件吧</p>
                </div>
            `;
            return;
        }

        // 渲染应用卡片
        const html = this.filteredApps.map(app => `
            <div class="app-card" data-id="${app.id}">
                <div class="app-icon">${app.icon || '📱'}</div>
                <h3 class="app-name">${this.escapeHtml(app.name)}</h3>
                <div class="app-category">${this.escapeHtml(app.category || '其他')}</div>
                <p class="app-description">${this.escapeHtml(app.description || '暂无描述')}</p>
                <a href="${app.url}" 
                   class="app-button" 
                   ${this.isExternalUrl(app.url) ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                    打开应用 ${this.isExternalUrl(app.url) ? '↗' : '→'}
                </a>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    // 判断是否为外部链接
    isExternalUrl(url) {
        return url.startsWith('http://') || url.startsWith('https://');
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 获取所有分类
    getCategories() {
        const categories = new Set(this.apps.map(app => app.category));
        return Array.from(categories).filter(Boolean);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.appsManager = new AppsManager();
});
