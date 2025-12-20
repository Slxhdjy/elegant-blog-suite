// 仪表盘调试脚本
console.log('🔍 开始仪表盘调试...');

// 检查关键对象是否存在
console.log('🔍 检查关键对象:');
console.log('- window.environmentAdapter:', !!window.environmentAdapter);
console.log('- window.dataAdapter:', !!window.dataAdapter);
console.log('- window.blogDataStore:', !!window.blogDataStore);

if (window.environmentAdapter) {
    console.log('🌍 环境适配器信息:', {
        environment: window.environmentAdapter.environment,
        apiBase: window.environmentAdapter.apiBase,
        initialized: window.environmentAdapter.initialized
    });
}

if (window.blogDataStore) {
    console.log('📊 数据存储信息:', {
        adapter: window.blogDataStore.adapter?.constructor?.name,
        useJSON: window.blogDataStore.adapter?.useJSON,
        useEnvironmentAdapter: window.blogDataStore.adapter?.useEnvironmentAdapter
    });
}

// 测试数据获取
async function testDataFetch() {
    console.log('🧪 测试数据获取...');
    
    try {
        // 测试获取文章
        console.log('📝 测试获取文章...');
        const articles = await window.blogDataStore.getArticles();
        console.log('✅ 文章获取成功:', articles?.length || 0, '篇');
        
        // 测试获取评论
        console.log('💬 测试获取评论...');
        const comments = await window.blogDataStore.getComments();
        console.log('✅ 评论获取成功:', comments?.length || 0, '条');
        
        // 测试获取统计
        console.log('📊 测试获取统计...');
        const stats = await window.blogDataStore.getStats();
        console.log('✅ 统计获取成功:', stats);
        
        // 测试仪表盘渲染
        console.log('🎨 测试仪表盘渲染...');
        
        // 检查函数是否存在
        console.log('🔍 检查updateDashboardUI函数:', {
            exists: typeof updateDashboardUI !== 'undefined',
            type: typeof updateDashboardUI,
            inWindow: typeof window.updateDashboardUI !== 'undefined',
            inGlobal: 'updateDashboardUI' in window
        });
        
        // 尝试多种方式调用函数
        let uiUpdateSuccess = false;
        
        if (typeof updateDashboardUI === 'function') {
            try {
                updateDashboardUI(stats, articles, comments);
                console.log('✅ 仪表盘UI更新成功 (直接调用)');
                uiUpdateSuccess = true;
            } catch (error) {
                console.error('❌ 直接调用updateDashboardUI失败:', error);
            }
        } else if (typeof window.updateDashboardUI === 'function') {
            try {
                window.updateDashboardUI(stats, articles, comments);
                console.log('✅ 仪表盘UI更新成功 (window调用)');
                uiUpdateSuccess = true;
            } catch (error) {
                console.error('❌ window调用updateDashboardUI失败:', error);
            }
        } else {
            console.error('❌ updateDashboardUI 函数不存在');
            
            // 尝试手动调用renderDashboard
            if (typeof renderDashboard === 'function') {
                console.log('🔄 尝试调用renderDashboard函数...');
                try {
                    await renderDashboard();
                    console.log('✅ renderDashboard调用成功');
                    uiUpdateSuccess = true;
                } catch (error) {
                    console.error('❌ renderDashboard调用失败:', error);
                }
            } else if (typeof window.renderDashboard === 'function') {
                console.log('🔄 尝试调用window.renderDashboard函数...');
                try {
                    await window.renderDashboard();
                    console.log('✅ window.renderDashboard调用成功');
                    uiUpdateSuccess = true;
                } catch (error) {
                    console.error('❌ window.renderDashboard调用失败:', error);
                }
            }
        }
        
        if (!uiUpdateSuccess) {
            console.warn('⚠️ 所有UI更新尝试都失败了，可能需要手动刷新页面');
        }
        
    } catch (error) {
        console.error('❌ 数据获取测试失败:', error);
        
        // 详细错误分析
        if (error.message.includes('KV')) {
            console.error('💡 这是KV数据库配置问题');
        } else if (error.message.includes('fetch')) {
            console.error('💡 这是网络请求问题');
        } else if (error.message.includes('undefined')) {
            console.error('💡 这是对象未定义问题');
        }
    }
}

// 页面加载完成后执行测试
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(testDataFetch, 1000);
    });
} else {
    setTimeout(testDataFetch, 1000);
}