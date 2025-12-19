// 应用管理调试脚本
console.log('🔍 开始应用管理调试...');

// 检查关键对象是否存在
console.log('🔍 检查关键对象:');
console.log('- window.environmentAdapter:', !!window.environmentAdapter);
console.log('- window.appsAdminManager:', !!window.appsAdminManager);
console.log('- AppsAdminManager class:', typeof AppsAdminManager);
console.log('- initAppsManager function:', typeof initAppsManager);

// 检查DOM元素
console.log('🔍 检查DOM元素:');
const container = document.getElementById('appsManageGrid');
console.log('- appsManageGrid container:', !!container);
if (container) {
    console.log('- container innerHTML:', container.innerHTML.substring(0, 100) + '...');
}

// 测试数据获取
async function testAppsData() {
    console.log('🧪 测试应用数据获取...');
    
    try {
        // 测试直接JSON文件访问
        console.log('📄 测试JSON文件访问...');
        const jsonResponse = await fetch('../data/apps.json');
        console.log('JSON响应状态:', jsonResponse.status, jsonResponse.statusText);
        
        if (jsonResponse.ok) {
            const jsonData = await jsonResponse.json();
            console.log('✅ JSON数据获取成功:', jsonData?.length || 0, '个应用');
        }
        
        // 测试API访问（如果可用）
        if (window.environmentAdapter && window.environmentAdapter.apiBase) {
            console.log('🌐 测试API访问...');
            const apiResponse = await fetch(window.environmentAdapter.apiBase + '/apps');
            console.log('API响应状态:', apiResponse.status, apiResponse.statusText);
            
            if (apiResponse.ok) {
                const apiData = await apiResponse.json();
                console.log('✅ API数据获取成功:', apiData);
            }
        }
        
        // 测试环境适配器
        if (window.environmentAdapter && window.environmentAdapter.getData) {
            console.log('🌍 测试环境适配器...');
            const adapterData = await window.environmentAdapter.getData('apps');
            console.log('✅ 环境适配器数据获取成功:', adapterData?.length || 0, '个应用');
        }
        
    } catch (error) {
        console.error('❌ 数据获取测试失败:', error);
    }
}

// 测试应用管理器初始化
function testAppsManagerInit() {
    console.log('🧪 测试应用管理器初始化...');
    
    try {
        if (typeof AppsAdminManager !== 'undefined') {
            console.log('✅ AppsAdminManager 类可用');
            
            if (!window.appsAdminManager) {
                console.log('🔧 创建应用管理器实例...');
                window.appsAdminManager = new AppsAdminManager();
                console.log('✅ 应用管理器实例创建成功');
            } else {
                console.log('✅ 应用管理器实例已存在');
            }
        } else {
            console.warn('⚠️ AppsAdminManager 类不可用，可能还未加载');
        }
        
        if (typeof initAppsManager === 'function') {
            console.log('✅ initAppsManager 函数可用');
        } else {
            console.warn('⚠️ initAppsManager 函数不可用，可能还未加载');
        }
        
    } catch (error) {
        console.error('❌ 应用管理器初始化测试失败:', error);
    }
}

// 页面加载完成后执行测试
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            testAppsManagerInit();
            testAppsData();
        }, 1000);
    });
} else {
    setTimeout(() => {
        testAppsManagerInit();
        testAppsData();
    }, 1000);
}