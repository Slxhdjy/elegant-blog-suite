// 后台管理系统数据渲染
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 后台管理系统初始化...');
    
    try {
        // 并行加载所有数据
        await Promise.all([
            renderDashboard(),
            renderArticlesTable(),
            renderCategoriesTable(),
            renderTagsGrid(),
            renderCommentsTable(),
            renderGuestbookMessages(),
            renderMediaGrid(),
            renderLinksTable()
        ]);
        
        console.log('✅ 所有数据加载完成');
    } catch (error) {
        console.error('❌ 数据加载失败:', error);
    }
    
    // 初始化按钮事件
    initButtonEvents();
    
    // 每5秒刷新一次仪表盘统计数据
    setInterval(() => {
        renderDashboard();
    }, 5000);
});

// 渲染仪表盘
async function renderDashboard() {
    try {
        const stats = await window.blogDataStore.getStats();
        const articles = await window.blogDataStore.getArticles('published');
        const comments = await window.blogDataStore.getComments();

    // 更新统计卡片（带动画效果）
    const statCards = document.querySelectorAll('#page-dashboard .stat-card');
    if (statCards.length >= 4) {
        animateStatNumber(statCards[0].querySelector('.stat-value'), stats.totalArticles);
        animateStatNumber(statCards[1].querySelector('.stat-value'), stats.totalComments);
        animateStatNumber(statCards[2].querySelector('.stat-value'), stats.totalViews);
        animateStatNumber(statCards[3].querySelector('.stat-value'), stats.totalVisitors);
    }

    // 渲染最近文章 - 显示所有文章
    const recentArticles = articles; // 显示所有文章
    const recentArticlesList = document.querySelector('#page-dashboard .dashboard-grid .dashboard-card:first-child .recent-list');
    if (recentArticlesList) {
        recentArticlesList.innerHTML = recentArticles.map(article => `
            <div class="recent-item">
                <span class="item-title">${article.title}</span>
                <span class="item-date">${article.publishDate}</span>
            </div>
        `).join('');
    }

    // 渲染最新评论 - 显示所有评论
    const recentComments = comments; // 显示所有评论
    const recentCommentsList = document.querySelector('#page-dashboard .dashboard-grid .dashboard-card:last-child .recent-list');
    if (recentCommentsList) {
        recentCommentsList.innerHTML = recentComments.map(comment => {
            const timeAgo = getTimeAgo(new Date(comment.time));
            return `
                <div class="recent-item">
                    <span class="item-title">${comment.content}</span>
                    <span class="item-date">${timeAgo}</span>
                </div>
            `;
        }).join('');
    }
    } catch (error) {
        console.error('渲染仪表盘失败:', error);
    }
}

// 渲染文章表格
// 文章分页变量
let articlesCurrentPage = 1;
let articlesPerPage = 10;
let allArticlesData = [];

async function renderArticlesTable(page = 1) {
    const tbody = document.getElementById('articlesTable');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#999;">加载中...</td></tr>';
    
    try {
        // 只在第一次或需要刷新时加载所有文章
        if (page === 1 || allArticlesData.length === 0) {
            allArticlesData = await window.blogDataStore.getArticles();
        }
        
        articlesCurrentPage = page;
        
        // 计算分页
        const totalArticles = allArticlesData.length;
        const totalPages = Math.ceil(totalArticles / articlesPerPage);
        const startIndex = (page - 1) * articlesPerPage;
        const endIndex = startIndex + articlesPerPage;
        const currentArticles = allArticlesData.slice(startIndex, endIndex);
        
        if (currentArticles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#999;">暂无文章</td></tr>';
            renderArticlesPagination(0, 0);
            return;
        }

        tbody.innerHTML = currentArticles.map(article => `
            <tr data-id="${article.id}">
                <td>${article.title}</td>
                <td>${article.category}</td>
                <td>${article.tags.join(', ')}</td>
                <td><span class="badge badge-${article.status === 'published' ? 'success' : 'warning'}">${article.status === 'published' ? '已发布' : '草稿'}</span></td>
                <td>${article.publishDate}</td>
                <td style="white-space: nowrap;">
                    <button class="btn-icon" title="编辑" onclick="editArticle(${article.id})">✏️</button>
                    <button class="btn-icon" title="导出" onclick="showExportMenu(${article.id}, event)">📤</button>
                    <button class="btn-icon" title="删除" onclick="deleteArticleConfirm(${article.id})">🗑️</button>
                </td>
            </tr>
        `).join('');
        
        // 渲染分页控件
        renderArticlesPagination(totalPages, totalArticles);
    } catch (error) {
        console.error('加载文章失败:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#f44336;">加载失败，请刷新重试</td></tr>';
    }
}

// 渲染文章分页控件
function renderArticlesPagination(totalPages, totalArticles) {
    let paginationContainer = document.querySelector('#page-articles .pagination-container');
    
    if (!paginationContainer) {
        // 在表格后创建分页容器
        const tableContainer = document.querySelector('#page-articles .table-container');
        if (tableContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.className = 'pagination-container';
            tableContainer.parentNode.insertBefore(paginationContainer, tableContainer.nextSibling);
        } else {
            return;
        }
    }
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<div class="pagination-info">共 ' + totalArticles + ' 篇文章，第 ' + articlesCurrentPage + '/' + totalPages + ' 页</div>';
    paginationHTML += '<div class="pagination">';
    
    // 首页
    if (articlesCurrentPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="renderArticlesTable(1)">首页</button>`;
    }
    
    // 上一页
    if (articlesCurrentPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="renderArticlesTable(${articlesCurrentPage - 1})">上一页</button>`;
    }
    
    // 页码按钮（智能显示）
    const maxVisiblePages = 5;
    let startPage = Math.max(1, articlesCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="renderArticlesTable(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === articlesCurrentPage) {
            paginationHTML += `<button class="page-btn active">${i}</button>`;
        } else {
            paginationHTML += `<button class="page-btn" onclick="renderArticlesTable(${i})">${i}</button>`;
        }
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="page-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="page-btn" onclick="renderArticlesTable(${totalPages})">${totalPages}</button>`;
    }
    
    // 下一页
    if (articlesCurrentPage < totalPages) {
        paginationHTML += `<button class="page-btn" onclick="renderArticlesTable(${articlesCurrentPage + 1})">下一页</button>`;
    }
    
    // 末页
    if (articlesCurrentPage < totalPages) {
        paginationHTML += `<button class="page-btn" onclick="renderArticlesTable(${totalPages})">末页</button>`;
    }
    
    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;
}

// 渲染分类表格
async function renderCategoriesTable() {
    const tbody = document.getElementById('categoriesTable');
    if (!tbody) return;
    
    // 显示加载状态
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:#999;">加载中...</td></tr>';
    
    try {
        const categories = await window.blogDataStore.getCategories();
        
        // 按文章数量降序排序
        const sortedCategories = [...categories].sort((a, b) => b.count - a.count);

        tbody.innerHTML = sortedCategories.map(category => `
            <tr data-id="${category.id}">
                <td>
                    <strong>${category.name}</strong>
                    ${category.count === 0 ? '<span style="color: #999; font-size: 0.85rem; margin-left: 0.5rem;">(空)</span>' : ''}
                </td>
                <td>${category.description || '<span style="color: #ccc; font-style: italic;">暂无描述</span>'}</td>
                <td>
                    <span style="display: inline-block; padding: 0.25rem 0.75rem; background: ${category.count > 0 ? '#e3f2fd' : '#f5f5f5'}; color: ${category.count > 0 ? '#1976d2' : '#999'}; border-radius: 12px; font-weight: 500;">
                        ${category.count} 篇
                    </span>
                </td>
                <td>
                    <button class="btn-icon" title="编辑" onclick="editCategory(${category.id})">✏️</button>
                    <button class="btn-icon" title="删除" onclick="deleteCategoryConfirm(${category.id})" ${category.count > 0 ? 'style="opacity: 0.5;" disabled' : ''}>🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载分类失败:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:#f44336;">加载失败，请刷新重试</td></tr>';
    }
}

// 渲染标签网格
async function renderTagsGrid() {
    const tagsGrid = document.querySelector('#page-tags .tags-grid');
    if (!tagsGrid) return;
    
    // 显示加载状态
    tagsGrid.innerHTML = '<div style="text-align:center; padding:2rem; color:#999;">加载中...</div>';
    
    try {
        const tags = await window.blogDataStore.getTags();
        
        // 按文章数量降序排序
        const sortedTags = [...tags].sort((a, b) => b.count - a.count);

        tagsGrid.innerHTML = sortedTags.map(tag => `
            <div class="tag-card" data-tag-id="${tag.id}" style="position: relative; ${tag.count === 0 ? 'opacity: 0.6;' : ''}">
                <div class="tag-name" style="font-size: 1.1rem; font-weight: 600; color: ${tag.count > 0 ? '#2c5f7c' : '#999'};">
                    ${tag.name}
                </div>
                <div class="tag-count" style="color: ${tag.count > 0 ? '#4fc3f7' : '#ccc'}; font-size: 0.9rem; margin-top: 0.5rem;">
                    ${tag.count} 篇文章
                </div>
                <div class="tag-actions" style="margin-top: 1rem;">
                    <button class="btn-icon tag-edit-btn" data-tag-id="${tag.id}" title="编辑标签">✏️</button>
                    <button class="btn-icon tag-delete-btn" data-tag-id="${tag.id}" title="删除标签" ${tag.count > 0 ? 'style="opacity: 0.5;" disabled' : ''}>🗑️</button>
                </div>
                ${tag.count === 0 ? '<div style="position: absolute; top: 0.5rem; right: 0.5rem; background: #ff9800; color: white; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.7rem;">未使用</div>' : ''}
            </div>
        `).join('');
        
        // 使用事件委托处理按钮点击
        setupTagButtonHandlers();
    } catch (error) {
        console.error('加载标签失败:', error);
        tagsGrid.innerHTML = '<div style="text-align:center; padding:2rem; color:#f44336;">加载失败，请刷新重试</div>';
    }
}

// 设置标签按钮事件处理器（使用事件委托）
function setupTagButtonHandlers() {
    const tagsGrid = document.querySelector('#page-tags .tags-grid');
    if (!tagsGrid) return;
    
    // 移除旧的事件监听器标记
    if (tagsGrid.dataset.hasListener === 'true') {
        return; // 已经添加过监听器，不重复添加
    }
    
    // 标记已添加监听器
    tagsGrid.dataset.hasListener = 'true';
    
    // 添加事件委托
    tagsGrid.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.tag-edit-btn');
        const deleteBtn = e.target.closest('.tag-delete-btn');
        
        if (editBtn) {
            const tagId = editBtn.dataset.tagId; // 保持原始格式，不转换
            console.log('编辑标签按钮被点击, ID:', tagId, 'Type:', typeof tagId);
            await editTag(tagId);
        } else if (deleteBtn && !deleteBtn.disabled) {
            const tagId = deleteBtn.dataset.tagId; // 保持原始格式，不转换
            console.log('删除标签按钮被点击, ID:', tagId, 'Type:', typeof tagId);
            await deleteTagConfirm(tagId);
        }
    });
}

// 渲染评论表格
async function renderCommentsTable() {
    const tbody = document.getElementById('commentsTable');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#999;">加载中...</td></tr>';
    
    try {
        const comments = await window.blogDataStore.getComments();

        tbody.innerHTML = comments.map(comment => {
            const timeAgo = getTimeAgo(new Date(comment.time));
            // 如果没有status字段，默认为pending
            const status = comment.status || 'pending';
            const isApproved = status === 'approved';
            const isPending = status === 'pending' || !comment.status;
            
            return `
                <tr data-id="${comment.id}">
                    <td>${comment.content}</td>
                    <td>${comment.articleTitle}</td>
                    <td>${comment.author}</td>
                    <td>${timeAgo}</td>
                    <td><span class="badge badge-${isApproved ? 'success' : 'warning'}">${isApproved ? '已通过' : '待审核'}</span></td>
                    <td>
                        ${isPending ? `<button class="btn-icon" title="通过" onclick="approveComment(${comment.id})">✅</button>` : ''}
                        <button class="btn-icon" title="删除" onclick="deleteCommentConfirm(${comment.id})">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('加载评论失败:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#f44336;">加载失败，请刷新重试</td></tr>';
    }
}

// 编辑文章
function editArticle(id) {
    localStorage.setItem('editArticleId', id);
    window.location.href = 'pages/editor.html';
}

// 删除文章确认
async function deleteArticleConfirm(id) {
    if (confirm('确定要删除这篇文章吗？此操作不可恢复。')) {
        try {
            await window.blogDataStore.deleteArticle(id);
            showNotification('文章删除成功', 'success');
            // 清空缓存，重新加载
            allArticlesData = [];
            await renderArticlesTable(1);
            await renderDashboard();
        } catch (error) {
            showNotification('删除失败: ' + error.message, 'error');
        }
    }
}

// 编辑分类
async function editCategory(id) {
    const categories = await window.blogDataStore.getCategories();
    const category = categories.find(c => c.id === id);
    if (!category) return;

    const form = `
        <div class="modal-form">
            <div class="form-group">
                <label>分类名称</label>
                <input type="text" class="form-control" id="categoryName" value="${category.name}">
            </div>
            <div class="form-group">
                <label>分类描述</label>
                <textarea class="form-control" rows="3" id="categoryDesc">${category.description}</textarea>
            </div>
            <div class="modal-actions">
                <button class="btn-primary" id="saveCategoryBtn">保存</button>
                <button class="btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </div>
    `;
    showModal('编辑分类', form);
    
    // 使用事件监听器而不是onclick
    setTimeout(() => {
        const saveBtn = document.getElementById('saveCategoryBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                await updateCategory(id);
            });
        }
    }, 0);
}
// 确保函数在全局作用域可访问
window.editCategory = editCategory;

// 更新分类
async function updateCategory(id) {
    const name = document.getElementById('categoryName').value;
    const description = document.getElementById('categoryDesc').value;
    
    if (!name) {
        showNotification('请输入分类名称', 'error');
        return;
    }

    try {
        await window.blogDataStore.updateCategory(id, { name, description });
        showNotification('分类更新成功', 'success');
        closeModal();
        await renderCategoriesTable();
    } catch (error) {
        showNotification('更新失败: ' + error.message, 'error');
    }
}

// 删除分类确认
async function deleteCategoryConfirm(id) {
    const categories = await window.blogDataStore.getCategories();
    const category = categories.find(c => c.id === id);
    if (!category) return;
    
    if (category.count > 0) {
        showNotification(`无法删除"${category.name}"分类，该分类下还有 ${category.count} 篇文章`, 'error');
        return;
    }
    
    if (confirm(`确定要删除"${category.name}"分类吗？`)) {
        try {
            await window.blogDataStore.deleteCategory(id);
            showNotification('分类删除成功', 'success');
            await renderCategoriesTable();
        } catch (error) {
            showNotification('删除失败: ' + error.message, 'error');
        }
    }
}
// 确保函数在全局作用域可访问
window.deleteCategoryConfirm = deleteCategoryConfirm;

// 编辑标签
async function editTag(id) {
    console.log('editTag 函数被调用, ID:', id, 'Type:', typeof id);
    
    try {
        const tags = await window.blogDataStore.getTags();
        console.log('所有标签:', tags.map(t => ({ id: t.id, type: typeof t.id })));
        
        // 兼容字符串和数字ID
        const tag = tags.find(t => t.id == id || t.id === parseInt(id) || String(t.id) === String(id));
        
        if (!tag) {
            console.error('未找到标签, ID:', id, '可用的标签IDs:', tags.map(t => t.id));
            showNotification('未找到该标签', 'error');
            return;
        }
        
        console.log('找到标签:', tag);

        const form = `
            <div class="modal-form">
                <div class="form-group">
                    <label>标签名称</label>
                    <input type="text" class="form-control" id="tagName" value="${tag.name}">
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" id="saveTagBtn">保存</button>
                    <button class="btn-secondary" onclick="closeModal()">取消</button>
                </div>
            </div>
        `;
        showModal('编辑标签', form);
        
        // 使用事件监听器
        setTimeout(() => {
            const saveBtn = document.getElementById('saveTagBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', async () => {
                    await updateTag(id);
                });
            }
        }, 0);
    } catch (error) {
        console.error('编辑标签失败:', error);
        showNotification('编辑失败: ' + error.message, 'error');
    }
}

// 更新标签
async function updateTag(id) {
    const name = document.getElementById('tagName').value;
    
    if (!name) {
        showNotification('请输入标签名称', 'error');
        return;
    }

    try {
        await window.blogDataStore.updateTag(id, { name });
        showNotification('标签更新成功', 'success');
        closeModal();
        await renderTagsGrid();
    } catch (error) {
        showNotification('更新失败: ' + error.message, 'error');
    }
}

// 删除标签确认
async function deleteTagConfirm(id) {
    console.log('deleteTagConfirm 函数被调用, ID:', id, 'Type:', typeof id);
    
    try {
        const tags = await window.blogDataStore.getTags();
        console.log('所有标签:', tags.map(t => ({ id: t.id, type: typeof t.id })));
        
        // 兼容字符串和数字ID
        const tag = tags.find(t => t.id == id || t.id === parseInt(id) || String(t.id) === String(id));
        
        if (!tag) {
            console.error('未找到标签, ID:', id, '可用的标签IDs:', tags.map(t => t.id));
            showNotification('未找到该标签', 'error');
            return;
        }
        
        console.log('找到标签:', tag);
        
        if (tag.count > 0) {
            showNotification(`无法删除"${tag.name}"标签，该标签被 ${tag.count} 篇文章使用`, 'error');
            return;
        }
        
        if (confirm(`确定要删除"${tag.name}"标签吗？`)) {
            await window.blogDataStore.deleteTag(id);
            showNotification('标签删除成功', 'success');
            await renderTagsGrid();
        }
    } catch (error) {
        console.error('删除标签失败:', error);
        showNotification('删除失败: ' + error.message, 'error');
    }
}

// 将函数绑定到window对象（用于调试和兼容性）
window.editTag = editTag;
window.deleteTagConfirm = deleteTagConfirm;

// 通过评论
async function approveComment(id) {
    try {
        await window.blogDataStore.updateComment(id, { status: 'approved' });
        showNotification('评论已通过', 'success');
        await renderCommentsTable();
        await renderDashboard();
    } catch (error) {
        showNotification('操作失败: ' + error.message, 'error');
    }
}

// 删除评论确认
async function deleteCommentConfirm(id) {
    if (confirm('确定要删除这条评论吗？')) {
        try {
            await window.blogDataStore.deleteComment(id);
            showNotification('评论删除成功', 'success');
            await renderCommentsTable();
            await renderDashboard();
        } catch (error) {
            showNotification('删除失败: ' + error.message, 'error');
        }
    }
}

// 计算时间差
function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
        return `${minutes}分钟前`;
    } else if (hours < 24) {
        return `${hours}小时前`;
    } else {
        return `${days}天前`;
    }
}

// 统计数字动画
function animateStatNumber(element, targetValue) {
    if (!element) return;
    
    const startValue = 0;
    const duration = 1500;
    const startTime = Date.now();
    
    function update() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用缓动函数
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);
        
        element.textContent = currentValue.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = targetValue.toLocaleString();
        }
    }
    
    update();
}

// 初始化按钮事件
function initButtonEvents() {
    // 新建文章按钮
    const btnNewArticle = document.getElementById('btnNewArticle');
    if (btnNewArticle && !btnNewArticle.dataset.initialized) {
        btnNewArticle.dataset.initialized = 'true';
        btnNewArticle.addEventListener('click', function() {
            localStorage.removeItem('editArticleId');
            window.location.href = 'pages/editor.html';
        });
    }

    // 新建分类按钮
    const btnNewCategory = document.getElementById('btnNewCategory');
    if (btnNewCategory && !btnNewCategory.dataset.initialized) {
        btnNewCategory.dataset.initialized = 'true';
        btnNewCategory.addEventListener('click', function() {
            const form = `
                <div class="modal-form">
                    <div class="form-group">
                        <label>分类名称</label>
                        <input type="text" class="form-control" id="newCategoryName" placeholder="请输入分类名称">
                    </div>
                    <div class="form-group">
                        <label>分类描述</label>
                        <textarea class="form-control" rows="3" id="newCategoryDesc" placeholder="请输入分类描述"></textarea>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-primary" id="createCategoryBtn">保存</button>
                        <button class="btn-secondary" onclick="closeModal()">取消</button>
                    </div>
                </div>
            `;
            showModal('新建分类', form);
            
            // 使用事件监听器
            setTimeout(() => {
                const createBtn = document.getElementById('createCategoryBtn');
                if (createBtn) {
                    createBtn.addEventListener('click', async () => {
                        await createCategory();
                    });
                }
            }, 0);
        });
    }

    // 新建标签按钮
    const btnNewTag = document.getElementById('btnNewTag');
    if (btnNewTag && !btnNewTag.dataset.initialized) {
        btnNewTag.dataset.initialized = 'true';
        console.log('✅ 找到新建标签按钮，绑定事件');
        btnNewTag.addEventListener('click', function() {
            console.log('=== 点击新建标签按钮 ===');
            
            const form = `
                <div class="modal-form">
                    <div class="form-group">
                        <label>标签名称</label>
                        <input type="text" class="form-control" id="newTagName" placeholder="请输入标签名称">
                    </div>
                    <div class="modal-actions">
                        <button class="btn-primary" id="createTagBtn">保存</button>
                        <button class="btn-secondary" onclick="closeModal()">取消</button>
                    </div>
                </div>
            `;
            
            console.log('显示新建标签模态框');
            showModal('新建分类', form);
            
            // 为输入框添加回车键支持和自动聚焦，为按钮添加事件监听器
            setTimeout(() => {
                const input = document.getElementById('newTagName');
                const createBtn = document.getElementById('createTagBtn');
                
                if (input) {
                    console.log('输入框已找到，设置焦点');
                    input.focus();
                    input.addEventListener('keypress', async function(e) {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            console.log('按下回车键，调用 createTag');
                            await createTag();
                        }
                    });
                } else {
                    console.error('❌ 找不到输入框 #newTagName');
                }
                
                if (createBtn) {
                    createBtn.addEventListener('click', async () => {
                        await createTag();
                    });
                }
            }, 100);
        });
    } else if (!btnNewTag) {
        console.error('❌ 找不到新建标签按钮 #btnNewTag');
    }
}

// 创建分类
async function createCategory() {
    const name = document.getElementById('newCategoryName').value;
    const description = document.getElementById('newCategoryDesc').value;
    
    if (!name) {
        showNotification('请输入分类名称', 'error');
        return;
    }

    try {
        await window.blogDataStore.addCategory({ name, description });
        showNotification('分类创建成功', 'success');
        closeModal();
        await renderCategoriesTable();
    } catch (error) {
        showNotification('创建失败: ' + error.message, 'error');
    }
}

// 新建标签按钮
document.getElementById('btnNewTag')?.addEventListener('click', function() {
    const form = `
        <div class="modal-form">
            <div class="form-group">
                <label>标签名称</label>
                <input type="text" class="form-control" id="newTagName" placeholder="请输入标签名称">
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="createTag()">保存</button>
                <button class="btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </div>
    `;
    showModal('新建标签', form);
    
    // 为输入框添加回车键支持和自动聚焦
    setTimeout(() => {
        const input = document.getElementById('newTagName');
        if (input) {
            input.focus();
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    createTag();
                }
            });
        }
    }, 100);
});

// 创建标签
async function createTag() {
    console.log('=== 创建标签 ===');
    
    const nameInput = document.getElementById('newTagName');
    console.log('输入框元素:', nameInput);
    
    if (!nameInput) {
        console.error('❌ 找不到输入框元素');
        showNotification('系统错误：找不到输入框', 'error');
        return;
    }
    
    const name = nameInput.value.trim();
    console.log('标签名称:', name);
    
    if (!name) {
        console.warn('⚠️ 标签名称为空');
        showNotification('请输入标签名称', 'error');
        return;
    }
    
    // 检查是否已存在
    const existingTags = await window.blogDataStore.getTags();
    const exists = existingTags.find(t => t.name === name);
    
    if (exists) {
        console.warn('⚠️ 标签已存在:', name);
        showNotification('标签已存在', 'warning');
        return;
    }

    try {
        console.log('正在添加标签到数据库...');
        const newTag = await window.blogDataStore.addTag({ name });
        console.log('✅ 标签创建成功:', newTag);
        
        showNotification('标签创建成功', 'success');
        closeModal();
        await renderTagsGrid();
    } catch (error) {
        console.error('❌ 创建标签失败:', error);
        showNotification('创建失败：' + error.message, 'error');
    }
}

// 媒体库标签切换
document.querySelectorAll('.media-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const type = this.dataset.type;
        
        // 更新标签样式
        document.querySelectorAll('.media-tab').forEach(t => {
            t.style.borderBottomColor = 'transparent';
            t.style.color = '#999';
            t.style.fontWeight = 'normal';
            t.classList.remove('active');
        });
        this.style.borderBottomColor = '#4fc3f7';
        this.style.color = '#2c5f7c';
        this.style.fontWeight = '600';
        this.classList.add('active');
        
        // 切换面板
        document.querySelectorAll('.media-panel').forEach(panel => {
            panel.style.display = 'none';
        });
        document.getElementById(`panel-${type}`).style.display = 'block';
        
        // 渲染对应内容
        if (type === 'images') renderImagesGrid();
        else if (type === 'music') renderMusicTable();
        else if (type === 'videos') renderVideosTable();
    });
});

// 渲染图片网格
async function renderImagesGrid() {
    const images = await window.blogDataStore.getImages();
    const grid = document.getElementById('imagesGrid');
    const countEl = document.getElementById('imagesCount');
    
    if (countEl) countEl.textContent = images.length;
    if (!grid) return;

    if (images.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #999;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🖼️</div>
                <div>暂无图片，点击"上传图片"开始添加</div>
            </div>
        `;
        return;
    }

    grid.innerHTML = images.map(item => `
        <div class="media-item" data-id="${item.id}">
            <img src="${item.thumbnail || item.url}" alt="${item.name}" onclick="previewImage(${item.id})" style="cursor: pointer;">
            <div class="media-info">
                <div class="media-name" title="${item.name}">${item.name}</div>
                <div class="media-meta">
                    ${window.blogDataStore.formatFileSize(item.size)} · ${item.uploadDate}
                </div>
                <div class="media-actions">
                    <button class="btn-icon" title="编辑" onclick="editImage(${item.id})">✏️</button>
                    <button class="btn-icon" title="复制链接" onclick="copyImageUrl(${item.id})">📋</button>
                    <button class="btn-icon" title="删除" onclick="deleteImageConfirm(${item.id})">🗑️</button>
                </div>
                ${item.description ? `<div class="media-description" title="${item.description}">${item.description}</div>` : '<div class="media-description" style="color: #ccc; font-style: italic;">暂无描述</div>'}
            </div>
        </div>
    `).join('');
}

// 渲染音乐表格
async function renderMusicTable() {
    const music = await window.blogDataStore.getMusic();
    const table = document.getElementById('musicTable');
    const countEl = document.getElementById('musicCount');
    
    if (countEl) countEl.textContent = music.length;
    if (!table) return;

    if (music.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 3rem; color: #999;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">🎵</div>
                    <div>暂无音乐，点击"添加音乐"开始添加</div>
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = music.map((item, index) => {
        const hasLyrics = item.lrc && item.lrc.trim().length > 0;
        const isValidUrl = item.url && (item.url.startsWith('http') || /^\d+$/.test(item.url));
        
        // 截断过长的文本
        const truncate = (text, maxLength) => {
            if (!text) return '';
            return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        };
        
        return `
        <tr data-id="${item.id}">
            <td style="text-align: center; color: #999; font-weight: bold;">${index + 1}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${item.cover}" alt="${item.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex-shrink: 0;"
                         onerror="this.src='https://via.placeholder.com/50x50/667eea/ffffff?text=🎵'">
                    <div style="min-width: 0; flex: 1;">
                        <div style="font-weight: 500; color: #333; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.name}">
                            ${truncate(item.name, 20)}
                        </div>
                        <div style="font-size: 0.85rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            <span title="${item.artist}">🎤 ${truncate(item.artist, 12)}</span>
                            ${item.album ? `<span style="margin-left: 6px;" title="${item.album}">💿 ${truncate(item.album, 10)}</span>` : ''}
                        </div>
                    </div>
                </div>
            </td>
            <td style="text-align: center;">
                <span style="font-family: 'Courier New', monospace; font-weight: 500; color: #667eea;">
                    ${formatDuration(item.duration)}
                </span>
            </td>
            <td style="text-align: center;">
                <span style="display: inline-block; padding: 3px 6px; border-radius: 3px; font-size: 0.8rem; white-space: nowrap; ${hasLyrics ? 'background: #d4edda; color: #155724;' : 'background: #f8f9fa; color: #999;'}">
                    ${hasLyrics ? '✅' : '❌'}
                </span>
            </td>
            <td style="text-align: center;">
                <span style="display: inline-block; padding: 3px 6px; border-radius: 3px; font-size: 0.8rem; white-space: nowrap; ${isValidUrl ? 'background: #d1ecf1; color: #0c5460;' : 'background: #f8d7da; color: #721c24;'}">
                    ${isValidUrl ? (/^\d+$/.test(item.url) ? '🎵' : '🔗') : '⚠️'}
                </span>
            </td>
            <td style="font-size: 0.8rem; color: #999; text-align: center;">
                ${item.uploadDate || '-'}
            </td>
            <td style="text-align: center; white-space: nowrap;">
                <button class="btn-icon music-edit-btn" data-music-id="${item.id}" title="编辑音乐" style="font-size: 1.1rem; padding: 0.3rem;">✏️</button>
                <button class="btn-icon music-preview-btn" data-music-id="${item.id}" title="预览播放" style="font-size: 1.1rem; padding: 0.3rem;">▶️</button>
                <button class="btn-icon music-delete-btn" data-music-id="${item.id}" title="删除音乐" style="font-size: 1.1rem; padding: 0.3rem;">🗑️</button>
            </td>
        </tr>
    `}).join('');
    
    // 添加音乐按钮事件委托
    setupMusicButtonHandlers();
}

// 设置音乐按钮事件处理器
function setupMusicButtonHandlers() {
    const table = document.getElementById('musicTable');
    if (!table || table.dataset.hasListener === 'true') return;
    
    table.dataset.hasListener = 'true';
    
    table.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.music-edit-btn');
        const previewBtn = e.target.closest('.music-preview-btn');
        const deleteBtn = e.target.closest('.music-delete-btn');
        
        if (editBtn) {
            const musicId = editBtn.dataset.musicId;
            await editMusic(musicId);
        } else if (previewBtn) {
            const musicId = previewBtn.dataset.musicId;
            previewMusic(musicId);
        } else if (deleteBtn) {
            const musicId = deleteBtn.dataset.musicId;
            await deleteMusicConfirm(musicId);
        }
    });
}

// 渲染视频表格
async function renderVideosTable() {
    const videos = await window.blogDataStore.getVideos();
    const table = document.getElementById('videosTable');
    const countEl = document.getElementById('videosCount');
    
    if (countEl) countEl.textContent = videos.length;
    if (!table) return;

    if (videos.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem; color: #999;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">🎬</div>
                    <div>暂无视频，点击"添加视频"开始添加</div>
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = videos.map(item => `
        <tr data-id="${item.id}">
            <td><img src="${item.cover}" alt="${item.name}" style="width: 100px; height: 60px; object-fit: cover; border-radius: 8px;"></td>
            <td>${item.name}</td>
            <td>${item.category || '-'}</td>
            <td>${formatDuration(item.duration)}</td>
            <td title="${item.description}">${item.description?.substring(0, 30)}${item.description?.length > 30 ? '...' : ''}</td>
            <td>
                <button class="btn-icon video-edit-btn" data-video-id="${item.id}" title="编辑">✏️</button>
                <button class="btn-icon video-delete-btn" data-video-id="${item.id}" title="删除">🗑️</button>
            </td>
        </tr>
    `).join('');
    
    // 添加视频按钮事件委托
    setupVideoButtonHandlers();
}

// 设置视频按钮事件处理器
function setupVideoButtonHandlers() {
    const table = document.getElementById('videosTable');
    if (!table || table.dataset.hasListener === 'true') return;
    
    table.dataset.hasListener = 'true';
    
    table.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.video-edit-btn');
        const deleteBtn = e.target.closest('.video-delete-btn');
        
        if (editBtn) {
            const videoId = editBtn.dataset.videoId;
            await editVideo(videoId);
        } else if (deleteBtn) {
            const videoId = deleteBtn.dataset.videoId;
            await deleteVideoConfirm(videoId);
        }
    });
}

// 格式化时长
function formatDuration(seconds) {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 渲染媒体库（兼容旧代码）
async function renderMediaGrid() {
    await renderImagesGrid();
    await renderMusicTable();
    await renderVideosTable();
}

// ========== 图片管理 ==========

// 上传图片
document.getElementById('btnUploadImage')?.addEventListener('click', function() {
    document.getElementById('imageInput').click();
});

document.getElementById('imageInput')?.addEventListener('change', async function(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // 如果只上传一个文件，显示描述输入框
    if (files.length === 1) {
        showImageUploadForm(files[0]);
    } else {
        // 批量上传，不添加描述
        uploadMultipleImages(files);
    }

    e.target.value = '';
});

// 显示图片上传表单（单个文件）
function showImageUploadForm(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = `
            <div class="modal-form">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <img src="${e.target.result}" alt="预览" style="max-width: 100%; max-height: 200px; border-radius: 8px;">
                </div>
                <div class="form-group">
                    <label>文件名</label>
                    <input type="text" class="form-control" value="${file.name}" readonly style="background: #f5f5f5;">
                </div>
                <div class="form-group">
                    <label>描述</label>
                    <textarea class="form-control" rows="3" id="uploadImageDesc" placeholder="请输入图片描述（可选）"></textarea>
                </div>
                <div class="form-group">
                    <label>文件信息</label>
                    <div style="padding: 0.8rem; background: #f5f5f5; border-radius: 6px; font-size: 0.9rem;">
                        <div style="margin-bottom: 0.3rem;"><strong>大小：</strong>${window.blogDataStore.formatFileSize(file.size)}</div>
                        <div><strong>类型：</strong>${file.type}</div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" onclick="confirmImageUpload()">上传</button>
                    <button class="btn-secondary" onclick="closeModal()">取消</button>
                </div>
            </div>
        `;
        showModal('上传图片', content);
        
        // 保存文件到临时变量
        window.tempUploadFile = file;
    };
    reader.readAsDataURL(file);
}

// 确认上传图片
async function confirmImageUpload() {
    const file = window.tempUploadFile;
    const description = document.getElementById('uploadImageDesc').value.trim();
    
    if (!file) return;
    
    try {
        const image = await window.blogDataStore.uploadImage(file);
        
        // 更新描述
        if (description) {
            window.blogDataStore.updateImage(image.id, { description });
        }
        
        showNotification('图片上传成功', 'success');
        closeModal();
        renderImagesGrid();
        
        delete window.tempUploadFile;
    } catch (error) {
        showNotification('上传失败：' + error.message, 'error');
    }
}

// 批量上传图片
async function uploadMultipleImages(files) {
    showNotification(`正在上传 ${files.length} 个文件...`, 'info');

    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
        try {
            await window.blogDataStore.uploadImage(file);
            successCount++;
        } catch (error) {
            errorCount++;
            console.error('上传失败:', file.name, error);
        }
    }

    if (successCount > 0) {
        showNotification(`成功上传 ${successCount} 个文件`, 'success');
        renderImagesGrid();
    }
    
    if (errorCount > 0) {
        showNotification(`${errorCount} 个文件上传失败`, 'error');
    }
}

// 编辑图片
async function editImage(id) {
    const image = await window.blogDataStore.getImageById(id);
    if (!image) {
        showNotification('图片不存在', 'error');
        return;
    }

    const content = `
        <div class="modal-form">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <img src="${image.thumbnail || image.url}" alt="${image.name}" style="max-width: 100%; max-height: 200px; border-radius: 8px;">
            </div>
            <div class="form-group">
                <label>文件名</label>
                <input type="text" class="form-control" id="editImageName" value="${image.name}" readonly style="background: #f5f5f5;">
            </div>
            <div class="form-group">
                <label>描述</label>
                <textarea class="form-control" rows="3" id="editImageDesc" placeholder="请输入图片描述">${image.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label>文件信息</label>
                <div style="padding: 0.8rem; background: #f5f5f5; border-radius: 6px; font-size: 0.9rem;">
                    <div style="margin-bottom: 0.3rem;"><strong>大小：</strong>${window.blogDataStore.formatFileSize(image.size)}</div>
                    <div style="margin-bottom: 0.3rem;"><strong>类型：</strong>${image.type}</div>
                    <div><strong>上传日期：</strong>${image.uploadDate}</div>
                </div>
            </div>
            <div class="form-group">
                <label>图片 URL</label>
                <input type="text" class="form-control" value="${image.url}" readonly onclick="this.select()" style="background: #f5f5f5;">
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="updateImageData(${id})">保存</button>
                <button class="btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </div>
    `;
    showModal('编辑图片', content);
}

// 更新图片数据
async function updateImageData(id) {
    const description = document.getElementById('editImageDesc').value.trim();
    
    try {
        await window.blogDataStore.updateImage(id, { description });
        showNotification('图片信息更新成功', 'success');
        closeModal();
        await renderImagesGrid();
    } catch (error) {
        showNotification('更新失败: ' + error.message, 'error');
    }
}

// 预览图片
async function previewImage(id) {
    const image = await window.blogDataStore.getImageById(id);
    if (!image) return;

    const content = `
        <div style="text-align: center;">
            <img src="${image.url}" alt="${image.name}" style="max-width: 100%; max-height: 60vh; border-radius: 8px;">
            <div style="margin-top: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 8px; text-align: left;">
                <div style="margin-bottom: 0.5rem;"><strong>文件名：</strong>${image.name}</div>
                ${image.description ? `<div style="margin-bottom: 0.5rem;"><strong>描述：</strong>${image.description}</div>` : ''}
                <div style="margin-bottom: 0.5rem;"><strong>大小：</strong>${window.blogDataStore.formatFileSize(image.size)}</div>
                <div style="margin-bottom: 0.5rem;"><strong>类型：</strong>${image.type}</div>
                <div style="margin-bottom: 0.5rem;"><strong>上传日期：</strong>${image.uploadDate}</div>
                <div style="margin-top: 1rem;">
                    <input type="text" value="${image.url}" readonly style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" onclick="this.select()">
                </div>
            </div>
        </div>
    `;
    showModal('图片预览', content);
}

// 复制图片链接
async function copyImageUrl(id) {
    const image = await window.blogDataStore.getImageById(id);
    if (!image) return;

    const input = document.createElement('input');
    input.value = image.url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);

    showNotification('链接已复制到剪贴板', 'success');
}

// 删除图片确认
async function deleteImageConfirm(id) {
    const image = await window.blogDataStore.getImageById(id);
    if (!image) return;

    if (confirm(`确定要删除 "${image.name}" 吗？此操作不可恢复。`)) {
        try {
            await window.blogDataStore.deleteImage(id);
            showNotification('图片删除成功', 'success');
            await renderImagesGrid();
        } catch (error) {
            showNotification('删除失败: ' + error.message, 'error');
        }
    }
}

// ========== 音乐管理 ==========

// 添加音乐
document.getElementById('btnAddMusic')?.addEventListener('click', function() {
    showMusicForm();
});

function showMusicForm(music = null) {
    const isEdit = !!music;
    const title = isEdit ? '🎵 编辑音乐' : '🎵 添加音乐';
    
    const content = `
        <div class="modal-form">
            <div class="form-tip">
                填写音乐信息，支持网易云音乐ID或直链MP3。带 <span style="color: #e74c3c; font-weight: bold;">*</span> 的为必填项。
            </div>
            
            <div class="form-section">
                <h4>📝 基本信息</h4>
                <div class="form-row">
                    <div class="form-group" style="flex: 2;">
                        <label>歌曲名称 <span style="color: #e74c3c;">*</span></label>
                        <input type="text" class="form-control" id="musicName" value="${music?.name || ''}" placeholder="例如：起风了">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>歌手 <span style="color: #e74c3c;">*</span></label>
                        <input type="text" class="form-control" id="musicArtist" value="${music?.artist || ''}" placeholder="例如：买辣椒也用券">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex: 1;">
                        <label>专辑</label>
                        <input type="text" class="form-control" id="musicAlbum" value="${music?.album || ''}" placeholder="例如：热门单曲">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>时长（秒）<span style="color: #e74c3c;">*</span></label>
                        <input type="number" class="form-control" id="musicDuration" value="${music?.duration || ''}" placeholder="例如：240" min="1">
                        <small style="color: #666;">提示：3分钟 = 180秒，5分钟 = 300秒</small>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h4>🎵 音频资源</h4>
                <div class="form-group">
                    <label>音乐 URL <span style="color: #e74c3c;">*</span></label>
                    <input type="url" class="form-control" id="musicUrl" value="${music?.url || ''}" placeholder="https://example.com/music.mp3 或网易云音乐ID">
                    <small style="color: #666;">支持直链 MP3 或网易云音乐歌曲 ID（如：1868553）</small>
                </div>
                <div class="form-group">
                    <label>封面图片 URL <span style="color: #e74c3c;">*</span></label>
                    <input type="url" class="form-control" id="musicCover" value="${music?.cover || ''}" placeholder="https://example.com/cover.jpg">
                    <small style="color: #666;">建议尺寸：300x300 或更大的正方形图片</small>
                </div>
            </div>

            <div class="form-section">
                <h4>📜 歌词信息</h4>
                <div class="form-group">
                    <label>歌词（LRC 格式）</label>
                    <textarea class="form-control" rows="8" id="musicLrc" placeholder="[00:00.00]这一路上走走停停&#10;[00:03.00]顺着少年漂流的痕迹&#10;[00:06.00]迈出车站的前一刻&#10;[00:09.00]竟有些犹豫" style="font-family: 'Courier New', monospace; font-size: 0.9rem;">${music?.lrc || ''}</textarea>
                    <small style="color: #666;">
                        格式说明：[分:秒.毫秒]歌词内容，每行一句<br>
                        示例：[00:15.50]风吹起了从前
                    </small>
                </div>
            </div>

            <div class="form-section">
                <h4>💬 其他信息</h4>
                <div class="form-group">
                    <label>描述</label>
                    <textarea class="form-control" rows="3" id="musicDesc" placeholder="歌曲简介、推荐理由等...">${music?.description || ''}</textarea>
                </div>
            </div>

            <div class="modal-actions">
                <button class="btn-primary" onclick="${isEdit ? 'updateMusicData(' + music.id + ')' : 'saveMusicData()'}">
                    ${isEdit ? '💾 更新音乐' : '✅ 保存音乐'}
                </button>
                <button class="btn-secondary" onclick="closeModal()">
                    ❌ 取消
                </button>
            </div>
        </div>
    `;
    showModal(title, content);
}

async function saveMusicData() {
    const name = document.getElementById('musicName').value.trim();
    const artist = document.getElementById('musicArtist').value.trim();
    const album = document.getElementById('musicAlbum').value.trim();
    const url = document.getElementById('musicUrl').value.trim();
    const cover = document.getElementById('musicCover').value.trim();
    const duration = parseInt(document.getElementById('musicDuration').value);
    const lrc = document.getElementById('musicLrc').value.trim();
    const description = document.getElementById('musicDesc').value.trim();

    // 验证必填项
    if (!name) {
        showNotification('❌ 请输入歌曲名称', 'error');
        document.getElementById('musicName').focus();
        return;
    }
    if (!artist) {
        showNotification('❌ 请输入歌手名称', 'error');
        document.getElementById('musicArtist').focus();
        return;
    }
    if (!url) {
        showNotification('❌ 请输入音乐 URL 或网易云音乐 ID', 'error');
        document.getElementById('musicUrl').focus();
        return;
    }
    if (!cover) {
        showNotification('❌ 请输入封面图片 URL', 'error');
        document.getElementById('musicCover').focus();
        return;
    }
    if (!duration || duration <= 0) {
        showNotification('❌ 请输入有效的时长（秒）', 'error');
        document.getElementById('musicDuration').focus();
        return;
    }

    // 验证 URL 格式
    if (url && !url.startsWith('http') && !/^\d+$/.test(url)) {
        showNotification('⚠️ 音乐 URL 格式可能不正确，应为完整链接或纯数字 ID', 'warning');
    }

    try {
        await window.blogDataStore.addMusic({
            name, artist, album, url, cover, duration, lrc, description
        });
        showNotification('✅ 音乐添加成功', 'success');
        closeModal();
        await renderMusicTable();
    } catch (error) {
        showNotification('添加失败: ' + error.message, 'error');
    }
}

async function editMusic(id) {
    console.log('editMusic 被调用, ID:', id);
    try {
        const music = await window.blogDataStore.getMusicById(id);
        console.log('获取到的音乐数据:', music);
        
        if (!music) {
            console.error('未找到音乐, ID:', id);
            showNotification('未找到该音乐', 'error');
            return;
        }
        
        showMusicForm(music);
    } catch (error) {
        console.error('编辑音乐失败:', error);
        showNotification('编辑失败: ' + error.message, 'error');
    }
}

async function updateMusicData(id) {
    const name = document.getElementById('musicName').value.trim();
    const artist = document.getElementById('musicArtist').value.trim();
    const album = document.getElementById('musicAlbum').value.trim();
    const url = document.getElementById('musicUrl').value.trim();
    const cover = document.getElementById('musicCover').value.trim();
    const duration = parseInt(document.getElementById('musicDuration').value);
    const lrc = document.getElementById('musicLrc').value.trim();
    const description = document.getElementById('musicDesc').value.trim();

    // 验证必填项
    if (!name) {
        showNotification('❌ 请输入歌曲名称', 'error');
        document.getElementById('musicName').focus();
        return;
    }
    if (!artist) {
        showNotification('❌ 请输入歌手名称', 'error');
        document.getElementById('musicArtist').focus();
        return;
    }
    if (!url) {
        showNotification('❌ 请输入音乐 URL 或网易云音乐 ID', 'error');
        document.getElementById('musicUrl').focus();
        return;
    }
    if (!cover) {
        showNotification('❌ 请输入封面图片 URL', 'error');
        document.getElementById('musicCover').focus();
        return;
    }
    if (!duration || duration <= 0) {
        showNotification('❌ 请输入有效的时长（秒）', 'error');
        document.getElementById('musicDuration').focus();
        return;
    }

    // 验证 URL 格式
    if (url && !url.startsWith('http') && !/^\d+$/.test(url)) {
        showNotification('⚠️ 音乐 URL 格式可能不正确，应为完整链接或纯数字 ID', 'warning');
    }

    try {
        await window.blogDataStore.updateMusic(id, {
            name, artist, album, url, cover, duration, lrc, description
        });
        showNotification('✅ 音乐更新成功', 'success');
        closeModal();
        await renderMusicTable();
    } catch (error) {
        showNotification('更新失败: ' + error.message, 'error');
    }
}

// 预览音乐
function previewMusic(id) {
    const music = window.blogDataStore.getMusicById(id);
    if (!music) return;

    const isNetEaseId = /^\d+$/.test(music.url);
    const audioUrl = isNetEaseId 
        ? `https://music.163.com/song/media/outer/url?id=${music.url}.mp3`
        : music.url;

    const content = `
        <div class="music-preview" style="text-align: center;">
            <img src="${music.cover}" alt="${music.name}" 
                 style="width: 200px; height: 200px; object-fit: cover; border-radius: 12px; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
                 onerror="this.src='https://via.placeholder.com/200x200/667eea/ffffff?text=🎵'">
            
            <h3 style="margin-bottom: 0.5rem; color: #333;">${music.name}</h3>
            <p style="color: #666; margin-bottom: 1rem;">
                <span>🎤 ${music.artist}</span>
                ${music.album ? `<span style="margin-left: 1rem;">💿 ${music.album}</span>` : ''}
            </p>
            
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <audio controls style="width: 100%; max-width: 400px;" autoplay>
                    <source src="${audioUrl}" type="audio/mpeg">
                    您的浏览器不支持音频播放
                </audio>
            </div>

            ${music.lrc ? `
                <div style="text-align: left; max-height: 200px; overflow-y: auto; background: #f8f9fa; padding: 1rem; border-radius: 8px; font-size: 0.9rem; line-height: 1.8;">
                    <strong style="display: block; margin-bottom: 0.5rem; color: #667eea;">📜 歌词预览：</strong>
                    <pre style="margin: 0; white-space: pre-wrap; font-family: inherit; color: #666;">${music.lrc}</pre>
                </div>
            ` : '<p style="color: #999;">暂无歌词</p>'}

            ${music.description ? `
                <div style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-radius: 8px; text-align: left;">
                    <strong style="color: #856404;">💬 描述：</strong>
                    <p style="margin: 0.5rem 0 0 0; color: #856404;">${music.description}</p>
                </div>
            ` : ''}

            <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #eee; color: #999; font-size: 0.85rem;">
                <p>时长: ${formatDuration(music.duration)} | 上传日期: ${music.uploadDate || '未知'}</p>
                <p>音源: ${isNetEaseId ? '网易云音乐 ID: ' + music.url : '直链 URL'}</p>
            </div>

            <div class="modal-actions" style="margin-top: 1.5rem;">
                <button class="btn-primary" onclick="editMusic(${id}); closeModal();">✏️ 编辑</button>
                <button class="btn-secondary" onclick="closeModal()">关闭</button>
            </div>
        </div>
    `;

    showModal(`🎵 ${music.name}`, content);
}

async function deleteMusicConfirm(id) {
    const music = await window.blogDataStore.getMusicById(id);
    if (!music) return;

    if (confirm(`确定要删除 "${music.name}" 吗？此操作不可恢复。`)) {
        try {
            await window.blogDataStore.deleteMusic(id);
            showNotification('音乐删除成功', 'success');
            await renderMusicTable();
        } catch (error) {
            showNotification('删除失败: ' + error.message, 'error');
        }
    }
}

// ========== 视频管理 ==========

// 添加视频
document.getElementById('btnAddVideo')?.addEventListener('click', function() {
    showVideoForm();
});

function showVideoForm(video = null) {
    const isEdit = !!video;
    const title = isEdit ? '🎬 编辑视频' : '🎬 添加视频';
    
    const content = `
        <div class="modal-form">
            <div class="form-tip">
                填写视频信息，支持MP4等常见视频格式。带 <span style="color: #e74c3c; font-weight: bold;">*</span> 的为必填项。
            </div>
            
            <div class="form-section">
                <h4>📝 基本信息</h4>
                <div class="form-row">
                    <div class="form-group" style="flex: 2;">
                        <label>视频名称 <span style="color: #e74c3c;">*</span></label>
                        <input type="text" class="form-control" id="videoName" value="${video?.name || ''}" placeholder="例如：Vue3入门教程">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>分类</label>
                        <input type="text" class="form-control" id="videoCategory" value="${video?.category || ''}" placeholder="例如：教程">
                    </div>
                </div>
                <div class="form-group">
                    <label>时长（秒）<span style="color: #e74c3c;">*</span></label>
                    <input type="number" class="form-control" id="videoDuration" value="${video?.duration || ''}" placeholder="例如：300" min="1">
                    <small>提示：5分钟 = 300秒，10分钟 = 600秒</small>
                </div>
            </div>
            
            <div class="form-section">
                <h4>🎥 视频资源</h4>
                <div class="form-group">
                    <label>视频 URL <span style="color: #e74c3c;">*</span></label>
                    <input type="url" class="form-control" id="videoUrl" value="${video?.url || ''}" placeholder="https://example.com/video.mp4">
                    <small>支持 MP4、WebM 等常见视频格式</small>
                </div>
                <div class="form-group">
                    <label>封面图片 URL <span style="color: #e74c3c;">*</span></label>
                    <input type="url" class="form-control" id="videoCover" value="${video?.cover || ''}" placeholder="https://example.com/cover.jpg">
                    <small>建议尺寸：16:9 比例，如 1280x720 或更高</small>
                </div>
            </div>
            
            <div class="form-section">
                <h4>💬 视频描述</h4>
                <div class="form-group">
                    <label>描述</label>
                    <textarea class="form-control" rows="4" id="videoDesc" placeholder="视频简介、内容概要等...">${video?.description || ''}</textarea>
                </div>
            </div>
            
            <div class="modal-actions">
                <button class="btn-primary" onclick="${isEdit ? 'updateVideoData(' + video.id + ')' : 'saveVideoData()'}">
                    ${isEdit ? '💾 更新视频' : '✅ 保存视频'}
                </button>
                <button class="btn-secondary" onclick="closeModal()">
                    ❌ 取消
                </button>
            </div>
        </div>
    `;
    showModal(title, content);
}

async function saveVideoData() {
    const name = document.getElementById('videoName').value.trim();
    const url = document.getElementById('videoUrl').value.trim();
    const cover = document.getElementById('videoCover').value.trim();
    const category = document.getElementById('videoCategory').value.trim();
    const duration = parseInt(document.getElementById('videoDuration').value);
    const description = document.getElementById('videoDesc').value.trim();

    if (!name || !url || !cover || !duration) {
        showNotification('请填写所有必填项', 'error');
        return;
    }

    try {
        await window.blogDataStore.addVideo({
            name, url, cover, category, duration, description
        });
        showNotification('视频添加成功', 'success');
        closeModal();
        await renderVideosTable();
    } catch (error) {
        showNotification('添加失败: ' + error.message, 'error');
    }
}

async function editVideo(id) {
    console.log('editVideo 被调用, ID:', id);
    try {
        const video = await window.blogDataStore.getVideoById(id);
        console.log('获取到的视频数据:', video);
        
        if (!video) {
            console.error('未找到视频, ID:', id);
            showNotification('未找到该视频', 'error');
            return;
        }
        
        showVideoForm(video);
    } catch (error) {
        console.error('编辑视频失败:', error);
        showNotification('编辑失败: ' + error.message, 'error');
    }
}

async function updateVideoData(id) {
    const name = document.getElementById('videoName').value.trim();
    const url = document.getElementById('videoUrl').value.trim();
    const cover = document.getElementById('videoCover').value.trim();
    const category = document.getElementById('videoCategory').value.trim();
    const duration = parseInt(document.getElementById('videoDuration').value);
    const description = document.getElementById('videoDesc').value.trim();

    if (!name || !url || !cover || !duration) {
        showNotification('请填写所有必填项', 'error');
        return;
    }

    try {
        await window.blogDataStore.updateVideo(id, {
            name, url, cover, category, duration, description
        });
        showNotification('视频更新成功', 'success');
        closeModal();
        await renderVideosTable();
    } catch (error) {
        showNotification('更新失败: ' + error.message, 'error');
    }
}

async function deleteVideoConfirm(id) {
    const video = await window.blogDataStore.getVideoById(id);
    if (!video) return;

    if (confirm(`确定要删除 "${video.name}" 吗？此操作不可恢复。`)) {
        try {
            await window.blogDataStore.deleteVideo(id);
            showNotification('视频删除成功', 'success');
            await renderVideosTable();
        } catch (error) {
            showNotification('删除失败: ' + error.message, 'error');
        }
    }
}


// ========== 头像管理 ==========

// 加载设置
async function loadSettings() {
    try {
        const settings = await window.blogDataStore.getSettings();
        
        // 加载头像
        if (settings.avatar) {
            document.getElementById('avatarPreview').src = settings.avatar;
            document.getElementById('avatarUrl').value = settings.avatar;
            // 更新顶部栏头像
            const topBarAvatar = document.getElementById('topBarAvatar');
            if (topBarAvatar) {
                topBarAvatar.src = settings.avatar;
            }
        }
        
        // 加载其他设置
        document.getElementById('siteName').value = settings.siteName || '';
        document.getElementById('siteDescription').value = settings.siteDescription || '';
        document.getElementById('postsPerPage').value = settings.postsPerPage || 10;
        document.getElementById('commentModeration').checked = settings.commentModeration || false;
        
        // 加载相册特效设置
        const galleryEffect = settings.galleryEffect || 'grid';
        const effectRadio = document.querySelector(`input[name="galleryEffect"][value="${galleryEffect}"]`);
        if (effectRadio) {
            effectRadio.checked = true;
        }
        
        // 加载主题系统开关
        const enableThemeSystem = settings.enableThemeSystem !== false; // 默认启用
        const enableThemeCheckbox = document.getElementById('enableThemeSystem');
        if (enableThemeCheckbox) {
            enableThemeCheckbox.checked = enableThemeSystem;
        }
        
        // 加载主题设置
        const frontendTheme = settings.frontendTheme || 'ocean';
        const frontendThemeRadio = document.querySelector(`input[name="frontendTheme"][value="${frontendTheme}"]`);
        if (frontendThemeRadio) {
            frontendThemeRadio.checked = true;
        }
        
        const backendTheme = settings.backendTheme || 'ocean';
        const backendThemeRadio = document.querySelector(`input[name="backendTheme"][value="${backendTheme}"]`);
        if (backendThemeRadio) {
            backendThemeRadio.checked = true;
        }
        
        // 加载数据源模式设置
        const useApiMode = settings.useApiMode !== undefined ? settings.useApiMode : (localStorage.getItem('use_api_mode') !== 'false');
        const useApiCheckbox = document.getElementById('useApiMode');
        if (useApiCheckbox) {
            useApiCheckbox.checked = useApiMode;
            updateDataSourceStatus();
        }
        
        // 加载视频背景设置
        const enableFrontendVideoBackground = settings.enableFrontendVideoBackground !== false; // 默认启用
        const enableBackendVideoBackground = settings.enableBackendVideoBackground !== false; // 默认启用
        const frontendVideoCheckbox = document.getElementById('enableFrontendVideoBackground');
        const backendVideoCheckbox = document.getElementById('enableBackendVideoBackground');
        if (frontendVideoCheckbox) {
            frontendVideoCheckbox.checked = enableFrontendVideoBackground;
        }
        if (backendVideoCheckbox) {
            backendVideoCheckbox.checked = enableBackendVideoBackground;
        }
        
        console.log('✅ 设置加载成功', settings);
    } catch (error) {
        console.error('❌ 加载设置失败:', error);
        showNotification('加载设置失败', 'error');
    }
}

// 上传头像文件
function uploadAvatarFile() {
    document.getElementById('avatarFileInput').click();
}

// 处理头像文件
function handleAvatarFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
        showNotification('❌ 请选择图片文件', 'error');
        return;
    }
    
    // 检查文件大小（最大2MB）
    if (file.size > 2 * 1024 * 1024) {
        showNotification('❌ 图片大小不能超过2MB', 'error');
        return;
    }
    
    // 读取文件并转换为Base64
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        document.getElementById('avatarUrl').value = base64;
        document.getElementById('avatarPreview').src = base64;
        showNotification('✅ 图片已加载，点击"应用头像"保存', 'success');
    };
    reader.onerror = function() {
        showNotification('❌ 文件读取失败', 'error');
    };
    reader.readAsDataURL(file);
}

// 更新头像预览
function updateAvatar() {
    const avatarUrl = document.getElementById('avatarUrl').value.trim();
    
    if (!avatarUrl) {
        showNotification('❌ 请输入头像URL或上传图片', 'error');
        return;
    }
    
    // 更新预览
    const preview = document.getElementById('avatarPreview');
    preview.src = avatarUrl;
    
    // 测试图片是否能加载
    preview.onload = function() {
        showNotification('✅ 头像预览已更新，记得保存设置', 'success');
    };
    
    preview.onerror = function() {
        showNotification('❌ 图片加载失败，请检查URL是否正确', 'error');
    };
}

// 保存所有设置
async function saveSettings() {
    const avatarUrl = document.getElementById('avatarUrl').value.trim();
    const siteName = document.getElementById('siteName').value.trim();
    const siteDescription = document.getElementById('siteDescription').value.trim();
    const postsPerPage = parseInt(document.getElementById('postsPerPage').value);
    const commentModeration = document.getElementById('commentModeration').checked;
    
    if (!siteName) {
        showNotification('❌ 请输入网站标题', 'error');
        return;
    }
    
    if (!avatarUrl) {
        showNotification('❌ 请设置头像', 'error');
        return;
    }
    
    try {
        // 获取相册特效设置
        const galleryEffect = document.querySelector('input[name="galleryEffect"]:checked')?.value || 'grid';
        
        // 获取主题设置
        const enableThemeSystem = document.getElementById('enableThemeSystem').checked;
        const frontendTheme = document.querySelector('input[name="frontendTheme"]:checked')?.value || 'ocean';
        const backendTheme = document.querySelector('input[name="backendTheme"]:checked')?.value || 'ocean';
        
        // 获取数据源模式
        const useApiMode = document.getElementById('useApiMode')?.checked || false;
        
        // 获取视频背景设置
        const enableFrontendVideoBackground = document.getElementById('enableFrontendVideoBackground')?.checked !== false;
        const enableBackendVideoBackground = document.getElementById('enableBackendVideoBackground')?.checked !== false;
        
        // 保存设置
        await window.blogDataStore.updateSettings({
            avatar: avatarUrl,
            siteName: siteName,
            siteDescription: siteDescription,
            postsPerPage: postsPerPage,
            commentModeration: commentModeration,
            galleryEffect: galleryEffect,
            enableThemeSystem: enableThemeSystem,
            frontendTheme: frontendTheme,
            backendTheme: backendTheme,
            useApiMode: useApiMode,
            enableFrontendVideoBackground: enableFrontendVideoBackground,
            enableBackendVideoBackground: enableBackendVideoBackground
        });
        
        console.log('✅ 设置已保存到数据源');
        
        // 应用或禁用主题
        if (enableThemeSystem) {
            // 应用前台主题
            if (window.themeManager) {
                window.themeManager.applyTheme(frontendTheme);
            }
            
            // 应用后台主题
            if (window.adminThemeManager) {
                window.adminThemeManager.applyTheme(backendTheme);
            }
        } else {
            // 禁用主题
            document.documentElement.removeAttribute('data-theme');
        }
        
        // 应用后台视频背景设置
        if (window.adminVideoBackgroundManager) {
            const videoElement = document.querySelector('.admin-video-background');
            if (enableBackendVideoBackground) {
                // 如果启用但视频不存在，重新初始化
                if (!videoElement) {
                    window.adminVideoBackgroundManager.init();
                } else if (videoElement.style.display === 'none') {
                    videoElement.style.display = 'block';
                }
            } else {
                // 如果禁用，隐藏视频
                if (videoElement) {
                    videoElement.style.display = 'none';
                }
            }
        }
        
        // 更新顶部栏头像
        const topBarAvatar = document.getElementById('topBarAvatar');
        if (topBarAvatar) {
            topBarAvatar.src = avatarUrl;
        }
        
        showNotification('✅ 设置保存成功！视频背景设置将在刷新页面后生效', 'success');
    } catch (error) {
        console.error('❌ 保存设置失败:', error);
        showNotification('❌ 保存设置失败: ' + error.message, 'error');
    }
}

// 页面加载时加载设置
document.addEventListener('DOMContentLoaded', function() {
    // 延迟加载设置，确保数据存储已初始化
    setTimeout(loadSettings, 100);
});

// ========== 文章导出菜单 ==========

// 显示导出菜单
function showExportMenu(articleId, event) {
    event.stopPropagation();
    
    // 移除已有菜单
    const existingMenu = document.querySelector('.export-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // 创建菜单
    const menu = document.createElement('div');
    menu.className = 'export-menu';
    menu.style.cssText = `
        position: fixed;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 150px;
        overflow: hidden;
    `;
    
    menu.innerHTML = `
        <div class="export-menu-item" onclick="articleImportExport.exportToMarkdown(${articleId}); closeExportMenu();" style="padding: 0.8rem 1rem; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; gap: 0.5rem;">
            <span>📝</span>
            <span>导出为 Markdown</span>
        </div>
        <div class="export-menu-item" onclick="articleImportExport.exportToWord(${articleId}); closeExportMenu();" style="padding: 0.8rem 1rem; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; gap: 0.5rem; border-top: 1px solid #f0f0f0;">
            <span>📄</span>
            <span>导出为 Word</span>
        </div>
        <div class="export-menu-item" onclick="articleImportExport.exportToPDF(${articleId}); closeExportMenu();" style="padding: 0.8rem 1rem; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; gap: 0.5rem; border-top: 1px solid #f0f0f0;">
            <span>📕</span>
            <span>导出为 PDF</span>
        </div>
    `;
    
    // 添加悬停效果
    menu.querySelectorAll('.export-menu-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.background = '#f0f8ff';
        });
        item.addEventListener('mouseleave', () => {
            item.style.background = 'white';
        });
    });
    
    // 定位菜单
    const rect = event.target.getBoundingClientRect();
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + 5) + 'px';
    
    document.body.appendChild(menu);
    
    // 点击其他地方关闭菜单
    setTimeout(() => {
        document.addEventListener('click', closeExportMenu);
    }, 100);
}

// 关闭导出菜单
function closeExportMenu() {
    const menu = document.querySelector('.export-menu');
    if (menu) {
        menu.remove();
    }
    document.removeEventListener('click', closeExportMenu);
}

// ========== 留言管理 ==========

// 渲染留言列表
async function renderGuestbookMessages() {
    const messages = await window.blogDataStore.getGuestbookMessages();
    const messagesList = document.getElementById('adminMessagesList');
    
    if (!messagesList) return;
    
    // 更新统计
    document.getElementById('totalMessages').textContent = messages.length;
    document.getElementById('pinnedMessages').textContent = messages.filter(m => m.pinned).length;
    document.getElementById('totalLikes').textContent = messages.reduce((sum, m) => sum + (m.likes || 0), 0);
    
    if (messages.length === 0) {
        messagesList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #999;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
                <p>暂无留言</p>
            </div>
        `;
        return;
    }
    
    // 分离置顶和普通留言
    const pinnedMessages = messages.filter(m => m.pinned);
    const normalMessages = messages.filter(m => !m.pinned);
    
    messagesList.innerHTML = [
        ...pinnedMessages.map(msg => renderAdminMessage(msg)),
        ...normalMessages.map(msg => renderAdminMessage(msg))
    ].join('');
}

// 渲染单条留言（后台）
function renderAdminMessage(message) {
    // 兼容 time 和 createdAt 两种字段名
    const messageTime = message.time || message.createdAt;
    const timeAgo = getTimeAgo(new Date(messageTime));
    const initial = message.author.charAt(0).toUpperCase();
    
    return `
        <div class="admin-message-item guestbook-item ${message.pinned ? 'pinned' : ''}" data-id="${message.id}">
            <div class="message-content-wrapper">
                <div class="message-avatar">${initial}</div>
                <div class="message-body">
                    <div class="message-header">
                        <div class="message-author-info">
                            <div class="message-author-name">
                                ${message.author}
                                ${message.pinned ? '<span class="pinned-badge">📌 置顶</span>' : ''}
                            </div>
                            <div class="message-meta">
                                ${timeAgo}
                                ${message.email ? ` · ${message.email}` : ''}
                            </div>
                        </div>
                        <div class="message-actions">
                            <button class="btn-icon" title="${message.pinned ? '取消置顶' : '置顶'}" onclick="toggleMessagePin(${message.id})">
                                ${message.pinned ? '📌' : '📍'}
                            </button>
                            <button class="btn-icon" title="删除" onclick="deleteMessageConfirm(${message.id})">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="message-text">
                        ${escapeHtml(message.content)}
                    </div>
                    <div class="message-footer">
                        <span class="message-likes">
                            <span>❤️</span>
                            <span>${message.likes || 0} 个赞</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 切换留言置顶
function toggleMessagePin(id) {
    const message = window.blogDataStore.toggleGuestbookPin(id);
    if (message) {
        showNotification(message.pinned ? '已置顶' : '已取消置顶', 'success');
        renderGuestbookMessages();
    }
}

// 删除留言确认
async function deleteMessageConfirm(id) {
    if (confirm('确定要删除这条留言吗？此操作不可恢复。')) {
        try {
            await window.blogDataStore.deleteGuestbookMessage(id);
            showNotification('留言删除成功', 'success');
            await renderGuestbookMessages();
        } catch (error) {
            showNotification('删除失败: ' + error.message, 'error');
        }
    }
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== 友情链接管理 ==========

// 渲染友情链接表格
async function renderLinksTable() {
    const links = await window.blogDataStore.getLinks();
    const tbody = document.getElementById('linksTable');
    if (!tbody) return;

    if (links.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 3rem; color: #999;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔗</div>
                    <div>暂无友情链接</div>
                    <div style="font-size: 0.9rem; margin-top: 0.5rem;">点击上方按钮添加第一个友情链接</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = links.map(link => `
        <tr data-id="${link.id}">
            <td>
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <img src="${link.avatar}" alt="${link.name}" 
                         style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <strong>${link.name}</strong>
                </div>
            </td>
            <td>
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" 
                   style="color: #2c5f7c; text-decoration: none;">
                    ${link.url.length > 40 ? link.url.substring(0, 40) + '...' : link.url}
                </a>
            </td>
            <td><span class="badge badge-info">${link.category}</span></td>
            <td>${link.description || '<span style="color: #ccc; font-style: italic;">暂无描述</span>'}</td>
            <td>
                <span class="badge badge-${link.status === 'active' ? 'success' : 'warning'}">
                    ${link.status === 'active' ? '启用' : '禁用'}
                </span>
            </td>
            <td>${link.addedDate}</td>
            <td style="white-space: nowrap;">
                <button class="btn-icon" title="编辑" onclick="editLink(${link.id})">✏️</button>
                <button class="btn-icon" title="删除" onclick="deleteLinkConfirm(${link.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// 显示添加友情链接模态框
function showAddLinkModal() {
    document.getElementById('linkModalTitle').textContent = '添加友情链接';
    document.getElementById('linkForm').reset();
    document.getElementById('linkId').value = '';
    document.getElementById('linkCategory').value = '默认';
    document.getElementById('linkStatus').value = 'active';
    document.getElementById('linkModal').style.display = 'block';
}

// 编辑友情链接
async function editLink(id) {
    const link = await window.blogDataStore.getLinkById(id);
    if (!link) {
        showNotification('❌ 友情链接不存在', 'error');
        return;
    }

    document.getElementById('linkModalTitle').textContent = '编辑友情链接';
    document.getElementById('linkId').value = link.id;
    document.getElementById('linkName').value = link.name;
    document.getElementById('linkUrl').value = link.url;
    document.getElementById('linkAvatar').value = link.avatar;
    document.getElementById('linkCategory').value = link.category;
    document.getElementById('linkDescription').value = link.description || '';
    document.getElementById('linkStatus').value = link.status;
    document.getElementById('linkModal').style.display = 'block';
}

// 保存友情链接表单
async function saveLinkForm(event) {
    event.preventDefault();

    const id = document.getElementById('linkId').value;
    const linkData = {
        name: document.getElementById('linkName').value.trim(),
        url: document.getElementById('linkUrl').value.trim(),
        avatar: document.getElementById('linkAvatar').value.trim(),
        category: document.getElementById('linkCategory').value.trim() || '默认',
        description: document.getElementById('linkDescription').value.trim(),
        status: document.getElementById('linkStatus').value
    };

    if (!linkData.name) {
        showNotification('❌ 请输入网站名称', 'error');
        return;
    }

    if (!linkData.url) {
        showNotification('❌ 请输入网站地址', 'error');
        return;
    }

    // 验证URL格式
    try {
        new URL(linkData.url);
    } catch (e) {
        showNotification('❌ 请输入有效的网站地址', 'error');
        return;
    }

    try {
        if (id) {
            // 更新
            await window.blogDataStore.updateLink(parseInt(id), linkData);
            showNotification('✅ 友情链接更新成功！', 'success');
        } else {
            // 添加
            await window.blogDataStore.addLink(linkData);
            showNotification('✅ 友情链接添加成功！', 'success');
        }

        closeLinkModal();
        // 等待数据保存完成后再刷新界面
        await renderLinksTable();
    } catch (error) {
        console.error('保存友情链接失败:', error);
        showNotification('❌ 保存失败，请重试', 'error');
    }
}

// 关闭友情链接模态框
function closeLinkModal() {
    document.getElementById('linkModal').style.display = 'none';
}

// 删除友情链接确认
async function deleteLinkConfirm(id) {
    const link = await window.blogDataStore.getLinkById(id);
    if (!link) return;

    if (confirm(`确定要删除友情链接"${link.name}"吗？`)) {
        try {
            await window.blogDataStore.deleteLink(id);
            showNotification('✅ 友情链接已删除', 'success');
            // 等待删除完成后再刷新界面
            await renderLinksTable();
        } catch (error) {
            console.error('删除友情链接失败:', error);
            showNotification('❌ 删除失败，请重试', 'error');
        }
    }
}


// ========== 数据源模式切换 ==========

// 初始化数据源模式开关
function initDataSourceMode() {
    const userConfig = localStorage.getItem('use_api_mode');
    let useApiMode = false; // 默认false
    
    if (userConfig === 'true') {
        useApiMode = true;
    } else if (userConfig === 'false') {
        useApiMode = false;
    } else {
        // 未设置时，默认false（localStorage模式）
        useApiMode = false;
        console.log('💡 首次使用，默认使用localStorage模式');
    }
    
    const checkbox = document.getElementById('useApiMode');
    if (checkbox) {
        checkbox.checked = useApiMode;
        updateDataSourceStatus();
    }
}

// 切换数据源模式
async function toggleDataSourceMode() {
    const checkbox = document.getElementById('useApiMode');
    const useApi = checkbox.checked;
    
    if (useApi) {
        // 切换到API模式前，先检查API服务器
        const apiAvailable = await checkApiServerStatus(true);
        if (!apiAvailable) {
            checkbox.checked = false;
            showNotification('❌ API服务器未运行，无法切换到API模式', 'error');
            return;
        }
        
        // 询问是否同步数据
        if (confirm('切换到API模式后，建议先同步数据到JSON文件。\n\n是否现在同步？')) {
            await syncDataToJson();
        }
    }
    
    // 保存设置
    localStorage.setItem('use_api_mode', useApi ? 'true' : 'false');
    
    // 更新适配器
    if (window.dataAdapter) {
        window.dataAdapter.useAPI = useApi;
    }
    
    // 更新状态显示
    updateDataSourceStatus();
    
    showNotification(
        useApi ? '✅ 已切换到JSON API模式' : '✅ 已切换到localStorage模式',
        'success'
    );
}

// 更新数据源状态显示
function updateDataSourceStatus() {
    const statusDiv = document.getElementById('apiModeStatus');
    if (!statusDiv) return;
    
    const useApi = localStorage.getItem('use_api_mode') !== 'false';
    
    if (useApi) {
        statusDiv.innerHTML = `
            <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="font-size: 1.2rem;">🌐</span>
                    <strong style="color: #1976d2;">当前模式：JSON API</strong>
                </div>
                <div style="color: #555; font-size: 0.9rem;">
                    ✅ 数据保存到JSON文件<br>
                    ✅ 支持多端同步<br>
                    ✅ 数据永久保存
                </div>
            </div>
        `;
    } else {
        statusDiv.innerHTML = `
            <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="font-size: 1.2rem;">💾</span>
                    <strong style="color: #f57c00;">当前模式：localStorage</strong>
                </div>
                <div style="color: #555; font-size: 0.9rem;">
                    ⚠️ 数据保存在浏览器中<br>
                    ⚠️ 清除缓存会丢失数据<br>
                    💡 建议定期备份
                </div>
            </div>
        `;
    }
}

// 检查API服务器状态
async function checkApiServerStatus(silent = false) {
    try {
        // 获取API基础URL
        const apiBase = window.environmentAdapter ? window.environmentAdapter.apiBase : '/api';
        const response = await fetch(`${apiBase}/health`, {
            method: 'GET',
            timeout: 3000
        });
        
        if (response.ok) {
            if (!silent) {
                const data = await response.json();
                showNotification('✅ API服务器运行正常', 'success');
                console.log('API服务器状态:', data);
            }
            return true;
        } else {
            if (!silent) {
                showNotification('❌ API服务器响应异常', 'error');
            }
            return false;
        }
    } catch (error) {
        if (!silent) {
            showNotification('❌ API服务器未运行\n请执行: node api-server.js', 'error');
        }
        return false;
    }
}

// 同步数据到JSON
async function syncDataToJson() {
    // 检查API服务器
    const apiAvailable = await checkApiServerStatus(true);
    if (!apiAvailable) {
        showNotification('❌ API服务器未运行，无法同步数据', 'error');
        return;
    }
    
    showNotification('🔄 正在同步数据...', 'info');
    
    try {
        const dataTypes = [
            { key: 'blog_articles', endpoint: 'articles', name: '文章' },
            { key: 'blog_categories', endpoint: 'categories', name: '分类' },
            { key: 'blog_tags', endpoint: 'tags', name: '标签' },
            { key: 'blog_comments', endpoint: 'comments', name: '评论' },
            { key: 'blog_guestbook', endpoint: 'guestbook', name: '留言' },
            { key: 'blog_music', endpoint: 'music', name: '音乐' },
            { key: 'blog_videos', endpoint: 'videos', name: '视频' },
            { key: 'blog_gallery', endpoint: 'gallery', name: '图库' },
            { key: 'blog_links', endpoint: 'links', name: '友链' },
            { key: 'blog_settings', endpoint: 'settings', name: '设置' }
        ];
        
        let successCount = 0;
        let totalItems = 0;
        
        for (const type of dataTypes) {
            const data = JSON.parse(localStorage.getItem(type.key) || (type.key === 'blog_settings' ? '{}' : '[]'));
            
            // 跳过空数据
            if ((Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0)) {
                continue;
            }
            
            try {
                const endpoint = type.key === 'blog_settings' ? type.endpoint : `${type.endpoint}/batch`;
                const method = type.key === 'blog_settings' ? 'PUT' : 'POST';
                
                // 获取API基础URL
                const apiBase = window.environmentAdapter ? window.environmentAdapter.apiBase : '/api';
                const response = await fetch(`${apiBase}/${endpoint}`, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    successCount++;
                    totalItems += Array.isArray(data) ? data.length : 1;
                    console.log(`✅ ${type.name}: 同步成功`);
                } else {
                    console.error(`❌ ${type.name}: 同步失败`);
                }
            } catch (error) {
                console.error(`❌ ${type.name}: ${error.message}`);
            }
        }
        
        if (successCount > 0) {
            showNotification(`✅ 同步完成！成功同步 ${successCount} 类数据，共 ${totalItems} 条`, 'success');
        } else {
            showNotification('⚠️ 没有数据需要同步', 'warning');
        }
    } catch (error) {
        showNotification(`❌ 同步失败: ${error.message}`, 'error');
    }
}

// 页面加载时初始化数据源模式
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initDataSourceMode();
    }, 200);
});
