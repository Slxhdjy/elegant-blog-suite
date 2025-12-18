// 热榜API配置模态框管理
class HotlistConfigModal {
    constructor() {
        this.modal = null;
        this.currentConfig = null;
        this.scrollY = 0;
        this.init();
    }

    init() {
        // 创建模态框HTML
        this.createModal();
        // 加载配置
        this.loadConfig();
    }

    createModal() {
        const modalHTML = `
            <div id="hotlistConfigModal" class="modal" style="display: none;">
                <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 750px !important; width: 750px !important;">
                    <div class="modal-header">
                        <h2>🔥 热榜API配置</h2>
                        <button class="modal-close" onclick="hotlistConfigModal.close()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="hotlist-config-tabs">
                            <button class="hotlist-tab active" data-type="douyin">📱 抖音</button>
                            <button class="hotlist-tab" data-type="weibo">🐦 微博</button>
                            <button class="hotlist-tab" data-type="zhihu">🐧 知乎</button>
                            <button class="hotlist-tab" data-type="toutiao">📰 今日头条</button>
                            <button class="hotlist-tab" data-type="bilibili">📺 B站</button>
                        </div>
                        <div id="hotlistConfigForm" class="hotlist-config-form">
                            <!-- 配置表单将动态生成 -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="hotlistConfigModal.resetCurrent()">🔄 重置当前</button>
                        <button class="btn-secondary" onclick="hotlistConfigModal.testCurrent()">🧪 测试API</button>
                        <button class="btn-primary" onclick="hotlistConfigModal.save()">💾 保存配置</button>
                    </div>
                </div>
            </div>
        `;

        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('hotlistConfigModal');
        
        // 点击模态框背景关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // 初始化标签切换
        this.initTabs();
    }

    loadConfig() {
        // 检查是否需要升级配置
        this.checkAndUpgradeConfig();
        
        if (typeof loadHotlistConfig === 'function') {
            this.currentConfig = loadHotlistConfig();
            console.log('✅ 热榜配置已加载:', Object.keys(this.currentConfig));
        } else {
            console.error('❌ 配置加载函数未找到');
            // 使用默认配置
            if (typeof HotlistAPIConfig !== 'undefined') {
                this.currentConfig = HotlistAPIConfig;
                console.log('✅ 使用默认热榜配置');
            } else {
                console.error('❌ 默认配置也未找到');
            }
        }
    }

    // 检查并升级旧配置
    checkAndUpgradeConfig() {
        try {
            const savedConfig = localStorage.getItem('hotlistAPIConfig');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                let needsUpgrade = false;
                
                // 检查是否使用旧API（非UAPIS）
                for (const key in config) {
                    if (config[key].apiUrl) {
                        // 检查是否是旧的API地址或本地代理
                        if (config[key].apiUrl.includes('v2.xxapi.cn') || 
                            config[key].apiUrl.includes('tenapi.cn') ||
                            config[key].apiUrl.includes('api.vvhan.com') ||
                            config[key].apiUrl.includes('localhost:3001')) {
                            needsUpgrade = true;
                            console.log(`⚠️ 检测到${key}使用旧配置: ${config[key].apiUrl}`);
                            break;
                        }
                    }
                }
                
                if (needsUpgrade) {
                    console.log('🔄 检测到旧配置，正在升级到UAPIS API...');
                    // 清除旧配置
                    localStorage.removeItem('hotlistAPIConfig');
                    console.log('✅ 已清除旧配置，将使用新的UAPIS API（直接调用）');
                }
            }
        } catch (error) {
            console.error('检查配置时出错:', error);
        }
    }

    initTabs() {
        const tabs = document.querySelectorAll('.hotlist-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // 移除所有active
                tabs.forEach(t => t.classList.remove('active'));
                // 添加当前active
                tab.classList.add('active');
                // 渲染表单
                const type = tab.getAttribute('data-type');
                this.renderForm(type);
            });
        });
    }

    renderForm(type) {
        if (!this.currentConfig || !this.currentConfig[type]) {
            console.error(`未找到${type}的配置`);
            return;
        }

        const config = this.currentConfig[type];
        const formContainer = document.getElementById('hotlistConfigForm');

        formContainer.innerHTML = `
            <div class="form-group">
                <label>📡 API地址</label>
                <input type="url" 
                       id="config-apiUrl" 
                       class="form-control"
                       value="${config.apiUrl}"
                       placeholder="https://api.example.com/hotlist">
                <small>热搜数据的API接口地址</small>
            </div>

            <div class="form-group">
                <label>🔧 请求方法</label>
                <select id="config-method" class="form-control">
                    <option value="GET" ${config.method === 'GET' ? 'selected' : ''}>GET</option>
                    <option value="POST" ${config.method === 'POST' ? 'selected' : ''}>POST</option>
                </select>
            </div>

            <div class="form-group">
                <label>📂 数据路径</label>
                <input type="text" 
                       id="config-dataPath" 
                       class="form-control"
                       value="${config.responseParser.dataPath}"
                       placeholder="data">
                <small>响应数据中热搜列表的字段名（如：data、list等）</small>
            </div>

            <div id="testResult" class="test-result" style="display: none;"></div>
        `;

        // 保存当前编辑的类型
        formContainer.setAttribute('data-current-type', type);
    }

    open() {
        if (!this.modal) {
            console.error('模态框未初始化');
            return;
        }
        
        // 保存当前滚动位置
        this.scrollY = window.scrollY;
        
        // 防止背景滚动
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.scrollY}px`;
        document.body.style.width = '100%';
        
        // 渲染第一个标签的表单
        this.renderForm('douyin');
        
        // 显示模态框
        this.modal.style.display = 'flex';
        
        // 强制重排
        this.modal.offsetHeight;
        
        // 添加show类触发动画
        requestAnimationFrame(() => {
            this.modal.classList.add('show');
        });
    }

    close() {
        if (!this.modal) return;
        
        // 移除show类触发淡出动画
        this.modal.classList.remove('show');
        
        // 等待动画完成后隐藏
        setTimeout(() => {
            this.modal.style.display = 'none';
            
            // 恢复滚动
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            
            // 恢复滚动位置
            if (this.scrollY !== undefined) {
                window.scrollTo(0, this.scrollY);
            }
        }, 300);
    }

    getCurrentType() {
        const formContainer = document.getElementById('hotlistConfigForm');
        return formContainer.getAttribute('data-current-type');
    }

    async testCurrent() {
        const type = this.getCurrentType();
        const apiUrl = document.getElementById('config-apiUrl').value;
        const resultDiv = document.getElementById('testResult');

        resultDiv.style.display = 'block';
        resultDiv.className = 'test-result';
        resultDiv.innerHTML = '<div class="loading">测试中...</div>';

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            resultDiv.className = 'test-result success';
            resultDiv.innerHTML = `
                <strong>✓ API测试成功</strong><br>
                状态码: ${response.status}<br>
                返回数据预览: ${JSON.stringify(data).substring(0, 200)}...
            `;
        } catch (error) {
            resultDiv.className = 'test-result error';
            resultDiv.innerHTML = `
                <strong>✗ API测试失败</strong><br>
                错误信息: ${error.message}
            `;
        }
    }

    save() {
        const type = this.getCurrentType();
        const apiUrl = document.getElementById('config-apiUrl').value;
        const method = document.getElementById('config-method').value;
        const dataPath = document.getElementById('config-dataPath').value;

        // 更新配置
        this.currentConfig[type].apiUrl = apiUrl;
        this.currentConfig[type].method = method;
        this.currentConfig[type].responseParser.dataPath = dataPath;

        // 保存到localStorage
        if (typeof saveHotlistConfig === 'function') {
            if (saveHotlistConfig(this.currentConfig)) {
                alert(`${this.currentConfig[type].name}热搜配置已保存！\n\n刷新页面后生效。`);
                this.close();
                
                // 提示用户刷新
                if (confirm('配置已保存，是否立即刷新页面使配置生效？')) {
                    location.reload();
                }
            } else {
                alert('保存失败，请重试');
            }
        }
    }

    resetCurrent() {
        const type = this.getCurrentType();
        if (confirm(`确定要重置${this.currentConfig[type].name}热搜的配置吗？`)) {
            // 重新加载默认配置
            if (typeof HotlistAPIConfig !== 'undefined') {
                this.currentConfig[type] = JSON.parse(JSON.stringify(HotlistAPIConfig[type]));
                this.renderForm(type);
                alert('已重置为默认配置');
            }
        }
    }
}

// 初始化
let hotlistConfigModal;

// 确保在DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        hotlistConfigModal = new HotlistConfigModal();
        console.log('✅ 热榜配置模态框已初始化');
    });
} else {
    // DOM已经加载完成
    hotlistConfigModal = new HotlistConfigModal();
    console.log('✅ 热榜配置模态框已初始化');
}

// 提供全局打开函数
window.openHotlistConfig = function() {
    // 检查权限
    if (!window.checkPermission('settings', 'update')) {
        return;
    }
    
    if (hotlistConfigModal) {
        hotlistConfigModal.open();
    } else {
        console.error('热榜配置模态框未初始化');
        alert('配置功能正在加载中，请稍后再试');
    }
};
