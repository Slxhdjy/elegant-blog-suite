/* ========================================
   文章编辑器功能
   ======================================== */

class ArticleEditor {
    constructor() {
        this.editingArticleId = null;
        this.currentArticle = null;
        this.tags = [];
        this.currentFeaturedImageUrl = '';
        
        this.init();
    }
    
    async init() {
        this.initElements();
        
        // 🔥 在Vercel环境下完全禁用JSON文件加载，避免覆盖KV数据
        console.log('=== 编辑器初始化 ===');
        
        // 强化环境检测：多重检查确保在Vercel环境下不加载JSON
        const hostname = window.location.hostname;
        const isVercelEnv = hostname.includes('vercel.app') || 
                           hostname.includes('vercel.com') ||
                           hostname.includes('web3v.vip') || 
                           hostname.includes('slxhdjy.top') ||
                           (window.environmentAdapter && window.environmentAdapter.environment === 'vercel');
        
        console.log('🔍 编辑器环境检测:', {
            hostname: hostname,
            environmentAdapter: window.environmentAdapter?.environment,
            isVercelEnv: isVercelEnv,
            useJSONFiles: window.blogDataStore.useJSONFiles
        });
        
        if (isVercelEnv) {
            console.log('🚫 Vercel环境：强制禁用JSON文件加载，避免覆盖KV数据');
            // 强制设置为不使用JSON文件
            window.blogDataStore.useJSONFiles = false;
        } else if (window.blogDataStore.useJSONFiles) {
            console.log('📁 本地环境：从 JSON 文件加载数据...');
            await window.blogDataStore.getAllDataAsync();
            console.log('✅ 数据加载完成');
        }
        
        await this.loadCategories(); // 先加载分类列表
        await this.loadTags(); // 先加载标签列表
        await this.loadArticleData(); // 然后加载文章数据（会设置分类和标签）
        this.bindEvents();
        this.setDefaultPublishTime();
    }
    
    // 初始化DOM元素
    initElements() {
        this.titleInput = document.querySelector('.editor-title');
        this.contentTextarea = document.querySelector('.editor-textarea');
        this.categorySelect = document.querySelector('.editor-sidebar select');
        this.excerptTextarea = document.querySelector('textarea[placeholder="文章摘要（可选）"]');
        this.publishTimeInput = document.getElementById('publishTime');
        this.featuredImageDiv = document.getElementById('featuredImage');
        this.tagSelect = document.getElementById('tagSelect');
        this.tagsDisplay = document.getElementById('tagsDisplay');
        this.newTagInput = document.getElementById('newTagInput');
        
        this.publishBtn = document.querySelector('.btn-publish');
        this.draftBtn = document.querySelector('.btn-draft');
        this.previewBtn = document.querySelector('.btn-preview');
    }
    
    // 加载文章数据（编辑模式）
    async loadArticleData() {
        console.log('=== 加载文章数据 ===');
        console.log('window.blogDataStore 存在:', !!window.blogDataStore);
        console.log('window.dataAdapter 存在:', !!window.dataAdapter);
        if (window.dataAdapter) {
            console.log('dataAdapter.useAPI:', window.dataAdapter.useAPI);
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        const storageId = localStorage.getItem('editArticleId');
        console.log('URL参数ID:', urlId);
        console.log('localStorage ID:', storageId);
        
        this.editingArticleId = urlId || storageId;
        console.log('最终使用的ID:', this.editingArticleId);
        console.log('ID类型:', typeof this.editingArticleId);
        
        // 检查是否有导入的草稿
        const draftData = localStorage.getItem('article_draft');
        console.log('草稿数据:', draftData);
        
        if (draftData) {
            try {
                const draft = JSON.parse(draftData);
                console.log('解析的草稿:', draft);
                
                // 加载草稿数据
                if (draft.title) {
                    this.titleInput.value = draft.title;
                    console.log('设置标题:', draft.title);
                }
                
                if (draft.content) {
                    this.contentTextarea.value = draft.content;
                    console.log('设置内容，长度:', draft.content.length);
                }
                
                if (draft.excerpt) {
                    this.excerptTextarea.value = draft.excerpt;
                }
                
                // 设置分类
                if (draft.category) {
                    console.log('草稿分类:', draft.category);
                    // 检查分类是否在选项中
                    const categoryExists = Array.from(this.categorySelect.options).some(
                        option => option.value === draft.category
                    );
                    
                    if (categoryExists) {
                        this.categorySelect.value = draft.category;
                        console.log('✅ 草稿分类已设置:', draft.category);
                    } else {
                        // 如果分类不存在，添加它
                        console.warn('⚠️ 草稿分类不在列表中，添加:', draft.category);
                        const option = document.createElement('option');
                        option.value = draft.category;
                        option.textContent = draft.category;
                        this.categorySelect.insertBefore(option, this.categorySelect.options[1]);
                        this.categorySelect.value = draft.category;
                    }
                }
                
                // 加载标签
                if (draft.tags && draft.tags.length > 0) {
                    draft.tags.forEach(tag => this.addTag(tag));
                }
                
                // 加载特色图片
                if (draft.image) {
                    this.currentFeaturedImageUrl = draft.image;
                    this.featuredImageDiv.innerHTML = `<img src="${draft.image}" alt="特色图片">`;
                }
                
                // 清除草稿数据和编辑状态
                localStorage.removeItem('article_draft');
                localStorage.removeItem('editArticleId'); // 清除旧的编辑ID
                this.editingArticleId = null; // 确保不会更新旧文章
                console.log('已清除草稿数据和编辑状态');
                
                // 更新页面标题
                document.querySelector('.breadcrumb span').textContent = '新建文章（从导入）';
                
                return; // 加载草稿后直接返回
            } catch (error) {
                console.error('解析草稿数据失败:', error);
            }
        }
        
        // 如果没有草稿，检查是否是编辑模式
        if (this.editingArticleId) {
            console.log('✅ 进入编辑模式');
            console.log('文章ID:', this.editingArticleId);
            console.log('调用 getArticleByIdAsync...');
            
            try {
                this.currentArticle = await window.blogDataStore.getArticleByIdAsync(this.editingArticleId);
                console.log('getArticleByIdAsync 返回:', this.currentArticle);
                console.log('返回类型:', typeof this.currentArticle);
                console.log('是否为null:', this.currentArticle === null);
                console.log('是否为undefined:', this.currentArticle === undefined);
            } catch (error) {
                console.error('❌ getArticleByIdAsync 出错:', error);
                console.error('错误堆栈:', error.stack);
            }
            
            if (this.currentArticle) {
                console.log('加载文章:', this.currentArticle.title);
                console.log('文章分类:', this.currentArticle.category);
                
                this.titleInput.value = this.currentArticle.title;
                this.contentTextarea.value = this.currentArticle.content;
                this.excerptTextarea.value = this.currentArticle.excerpt || '';
                
                // 设置分类
                if (this.currentArticle.category) {
                    // 检查分类是否在选项中
                    const categoryExists = Array.from(this.categorySelect.options).some(
                        option => option.value === this.currentArticle.category
                    );
                    
                    if (categoryExists) {
                        this.categorySelect.value = this.currentArticle.category;
                        console.log('✅ 分类已设置:', this.currentArticle.category);
                    } else {
                        // 如果分类不存在，添加它
                        console.warn('⚠️ 分类不在列表中，添加:', this.currentArticle.category);
                        const option = document.createElement('option');
                        option.value = this.currentArticle.category;
                        option.textContent = this.currentArticle.category;
                        // 插入到"选择分类"之后
                        this.categorySelect.insertBefore(option, this.categorySelect.options[1]);
                        this.categorySelect.value = this.currentArticle.category;
                    }
                } else {
                    console.warn('⚠️ 文章没有分类');
                }
                
                // 加载标签
                if (this.currentArticle.tags && this.currentArticle.tags.length > 0) {
                    this.currentArticle.tags.forEach(tag => this.addTag(tag));
                }
                
                // 加载特色图片
                if (this.currentArticle.image) {
                    this.currentFeaturedImageUrl = this.currentArticle.image;
                    this.featuredImageDiv.innerHTML = `<img src="${this.currentArticle.image}" alt="特色图片">`;
                }
                
                // 加载发布时间
                if (this.currentArticle.publishDate) {
                    const date = new Date(this.currentArticle.publishDate);
                    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                    this.publishTimeInput.value = date.toISOString().slice(0, 16);
                }
                
                // 更新页面标题
                document.querySelector('.breadcrumb span').textContent = '编辑文章';
            } else {
                console.warn('未找到文章，ID:', this.editingArticleId);
            }
        } else {
            console.log('新建文章模式');
        }
    }
    
    // 绑定事件
    bindEvents() {
        // 返回按钮
        const btnBackToAdmin = document.getElementById('btnBackToAdmin');
        if (btnBackToAdmin) {
            btnBackToAdmin.addEventListener('click', (e) => {
                e.preventDefault();
                // 获取来源页面，默认返回文章管理页
                const returnPage = sessionStorage.getItem('adminReturnPage') || 'articles';
                sessionStorage.removeItem('adminReturnPage');
                window.location.href = `index.html#${returnPage}`;
            });
        }
        
        // 标签下拉选择
        this.tagSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.addTag(e.target.value);
                e.target.value = ''; // 重置选择
            }
        });
        
        // 新标签输入回车
        this.newTagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addNewTag();
            }
        });
        
        // 特色图片上传
        this.featuredImageDiv.addEventListener('click', () => {
            this.showImageSelector();
        });
        
        // 工具栏按钮
        const toolbarBtns = document.querySelectorAll('.toolbar-btn');
        toolbarBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const title = btn.getAttribute('title');
                this.insertMarkdown(title);
            });
        });
        
        // 发布按钮
        this.publishBtn.addEventListener('click', () => {
            this.saveArticle('published');
        });
        
        // 保存草稿
        this.draftBtn.addEventListener('click', () => {
            this.saveArticle('draft');
        });
        
        // 预览
        this.previewBtn.addEventListener('click', () => {
            this.previewArticle();
        });
        
        // 下载飞书图片
        const downloadFeishuBtn = document.querySelector('.btn-download-feishu-images');
        if (downloadFeishuBtn) {
            downloadFeishuBtn.addEventListener('click', () => {
                this.downloadFeishuImages();
            });
        }
        
        // 自动保存（每30秒）
        setInterval(() => {
            this.autoSave();
        }, 30000);
        
        // 快捷键
        document.addEventListener('keydown', (e) => {
            // Ctrl+S 保存
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveArticle('draft');
            }
            // Ctrl+Enter 发布
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.saveArticle('published');
            }
        });
    }
    
    // 加载分类列表
    async loadCategories() {
        // 从分类管理中获取所有分类（使用异步方法）
        const categories = await window.blogDataStore.getCategoriesAsync();
        
        this.categorySelect.innerHTML = '<option value="">选择分类</option>';
        
        // 添加已有分类
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = `${cat.name} (${cat.count})`;
            this.categorySelect.appendChild(option);
        });
        
        // 添加常用分类（如果不存在）
        const defaultCategories = ['技术', '生活', '设计', '随笔', '教程'];
        const existingNames = categories.map(c => c.name);
        
        defaultCategories.forEach(cat => {
            if (!existingNames.includes(cat)) {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                this.categorySelect.appendChild(option);
            }
        });
        
        // 添加"新建分类"选项
        const newOption = document.createElement('option');
        newOption.value = '__new__';
        newOption.textContent = '+ 新建分类';
        newOption.style.color = '#4fc3f7';
        newOption.style.fontWeight = 'bold';
        this.categorySelect.appendChild(newOption);
        
        // 监听选择变化
        this.categorySelect.addEventListener('change', (e) => {
            if (e.target.value === '__new__') {
                this.createNewCategory();
            }
        });
    }
    
    // 创建新分类
    async createNewCategory() {
        const categoryName = prompt('请输入新分类名称：');
        if (categoryName && categoryName.trim()) {
            const trimmedName = categoryName.trim();
            
            // 检查是否已存在
            const categories = await window.blogDataStore.getCategoriesAsync();
            const exists = categories.find(c => c.name === trimmedName);
            
            if (exists) {
                this.showNotification('该分类已存在', 'warning');
                this.categorySelect.value = trimmedName;
            } else {
                // 添加新分类
                await window.blogDataStore.addCategory({
                    name: trimmedName,
                    description: ''
                });
                
                // 重新加载分类列表
                await this.loadCategories();
                
                // 选中新分类
                this.categorySelect.value = trimmedName;
                
                this.showNotification('分类创建成功', 'success');
            }
        } else {
            // 取消，重置选择
            this.categorySelect.value = '';
        }
    }
    
    // 加载标签列表
    async loadTags() {
        const tags = await window.blogDataStore.getTagsAsync();
        
        // 清空并重新填充下拉框
        this.tagSelect.innerHTML = '<option value="">-- 选择标签 --</option>';
        
        // 按使用频率排序
        const sortedTags = [...tags].sort((a, b) => b.count - a.count);
        
        sortedTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.name;
            option.textContent = `${tag.name} (${tag.count})`;
            this.tagSelect.appendChild(option);
        });
    }
    
    // 设置默认发布时间
    setDefaultPublishTime() {
        if (!this.publishTimeInput.value) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            this.publishTimeInput.value = now.toISOString().slice(0, 16);
        }
    }
    
    // 添加标签
    addTag(tagName) {
        if (!tagName || !tagName.trim()) {
            return;
        }
        
        tagName = tagName.trim();
        
        if (this.tags.includes(tagName)) {
            this.showNotification('标签已存在', 'warning');
            return;
        }
        
        this.tags.push(tagName);
        this.renderTags();
        this.showNotification(`标签"${tagName}"已添加`, 'success');
    }
    
    // 添加新标签
    async addNewTag() {
        const tagName = this.newTagInput.value.trim();
        
        if (!tagName) {
            this.showNotification('请输入标签名称', 'warning');
            return;
        }
        
        // 检查标签是否已存在于标签库
        const allTags = await window.blogDataStore.getTags();
        const existingTag = allTags.find(t => t.name === tagName);
        
        if (!existingTag) {
            // 添加到标签库
            await window.blogDataStore.addTag({ name: tagName });
            // 重新加载标签列表
            await this.loadTags();
            this.showNotification(`新标签"${tagName}"已创建`, 'success');
        }
        
        // 添加到当前文章
        this.addTag(tagName);
        this.newTagInput.value = '';
    }
    
    // 渲染标签显示
    renderTags() {
        this.tagsDisplay.innerHTML = '';
        
        if (this.tags.length === 0) {
            this.tagsDisplay.innerHTML = '<div style="color: #999; font-size: 0.9rem; padding: 0.5rem;">暂无标签</div>';
            return;
        }
        
        this.tags.forEach(tagName => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag-item';
            tagElement.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                background: #e8f4f8;
                color: #2c5f7c;
                padding: 0.4rem 0.8rem;
                border-radius: 15px;
                font-size: 0.9rem;
                margin: 0.25rem;
            `;
            tagElement.innerHTML = `
                <span>${tagName}</span>
                <span class="tag-remove" style="cursor: pointer; font-weight: bold; font-size: 1.1rem; line-height: 1;">×</span>
            `;
            
            // 绑定删除事件
            tagElement.querySelector('.tag-remove').addEventListener('click', () => {
                this.removeTag(tagName);
            });
            
            this.tagsDisplay.appendChild(tagElement);
        });
    }
    
    // 移除标签
    removeTag(tagName) {
        const index = this.tags.indexOf(tagName);
        if (index > -1) {
            this.tags.splice(index, 1);
            this.renderTags();
            this.showNotification(`标签"${tagName}"已移除`, 'info');
        }
    }
    
    // 显示图片选择器
    showImageSelector() {
        const media = window.blogDataStore.getMedia().filter(m => m.type === 'image');
        
        let content = `
            <div style="max-height: 60vh; overflow-y: auto;">
                <div style="margin-bottom: 1rem;">
                    <button class="btn-primary" onclick="editor.uploadNewImage()" style="width: 100%; padding: 0.8rem; background: linear-gradient(135deg, #4fc3f7 0%, #2c5f7c 100%); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        📤 上传新图片
                    </button>
                </div>
        `;
        
        if (media.length > 0) {
            content += `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem;">
                    ${media.map(item => `
                        <div style="cursor: pointer; border: 2px solid transparent; border-radius: 8px; overflow: hidden; transition: all 0.3s;" 
                             onclick="editor.selectImage('${item.url}')" 
                             onmouseover="this.style.borderColor='#4fc3f7'" 
                             onmouseout="this.style.borderColor='transparent'">
                            <img src="${item.thumbnail || item.url}" alt="${item.name}" style="width: 100%; height: 120px; object-fit: cover;">
                            <div style="padding: 0.5rem; font-size: 0.8rem; text-align: center; background: #f5f5f5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            content += `
                <div style="text-align: center; padding: 3rem; color: #999;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📷</div>
                    <p>还没有上传任何图片</p>
                    <p style="font-size: 0.9rem;">点击上方按钮上传图片</p>
                </div>
            `;
        }
        
        content += '</div>';
        
        this.showModal('选择特色图片', content);
    }
    
    // 选择图片
    selectImage(url) {
        this.currentFeaturedImageUrl = url;
        this.featuredImageDiv.innerHTML = `<img src="${url}" alt="特色图片">`;
        this.closeModal();
        this.showNotification('图片已选择', 'success');
    }
    
    // 上传新图片
    uploadNewImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    this.showNotification('正在上传...', 'info');
                    const media = await window.blogDataStore.uploadImage(file);
                    this.currentFeaturedImageUrl = media.url;
                    this.featuredImageDiv.innerHTML = `<img src="${media.url}" alt="特色图片">`;
                    this.closeModal();
                    this.showNotification('图片上传成功！', 'success');
                } catch (error) {
                    this.showNotification('上传失败：' + error.message, 'error');
                }
            }
        };
        input.click();
    }
    
    // 插入Markdown语法
    insertMarkdown(type) {
        const start = this.contentTextarea.selectionStart;
        const end = this.contentTextarea.selectionEnd;
        const selectedText = this.contentTextarea.value.substring(start, end);
        let replacement = '';
        let cursorOffset = 0;

        switch(type) {
            case '加粗':
                replacement = `**${selectedText || '粗体文字'}**`;
                cursorOffset = selectedText ? replacement.length : 2;
                break;
            case '斜体':
                replacement = `*${selectedText || '斜体文字'}*`;
                cursorOffset = selectedText ? replacement.length : 1;
                break;
            case '标题':
                replacement = `\n## ${selectedText || '标题'}\n`;
                cursorOffset = selectedText ? replacement.length : 4;
                break;
            case '引用':
                replacement = `\n> ${selectedText || '引用内容'}\n`;
                cursorOffset = selectedText ? replacement.length : 3;
                break;
            case '代码':
                if (selectedText.includes('\n')) {
                    replacement = `\n\`\`\`\n${selectedText || '代码块'}\n\`\`\`\n`;
                    cursorOffset = selectedText ? replacement.length : 5;
                } else {
                    replacement = `\`${selectedText || '代码'}\``;
                    cursorOffset = selectedText ? replacement.length : 1;
                }
                break;
            case '链接':
                replacement = `[${selectedText || '链接文字'}](url)`;
                cursorOffset = replacement.length - 4;
                break;
            case '图片':
                replacement = `![${selectedText || '图片描述'}](图片URL)`;
                cursorOffset = replacement.length - 5;
                break;
            case '列表':
                replacement = `\n- ${selectedText || '列表项'}\n`;
                cursorOffset = selectedText ? replacement.length : 3;
                break;
        }

        this.contentTextarea.value = 
            this.contentTextarea.value.substring(0, start) + 
            replacement + 
            this.contentTextarea.value.substring(end);
        
        this.contentTextarea.focus();
        this.contentTextarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }
    
    // 保存文章
    saveArticle(status) {
        const title = this.titleInput.value.trim();
        const content = this.contentTextarea.value.trim();
        const category = this.categorySelect.value;
        const excerpt = this.excerptTextarea.value.trim();
        const publishDateTime = this.publishTimeInput.value;
        
        // 验证
        if (!title) {
            this.showNotification('请输入文章标题', 'error');
            this.titleInput.focus();
            return;
        }
        
        if (!content) {
            this.showNotification('请输入文章内容', 'error');
            this.contentTextarea.focus();
            return;
        }
        
        if (!category) {
            this.showNotification('请选择文章分类', 'error');
            this.categorySelect.focus();
            return;
        }
        
        // 生成摘要
        const autoExcerpt = this.generateExcerpt(content);
        
        // 构建文章数据
        const articleData = {
            title,
            content,
            excerpt: excerpt || autoExcerpt,
            category,
            tags: this.tags.length > 0 ? this.tags : ['未分类'],
            status,
            publishDate: publishDateTime ? new Date(publishDateTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            image: this.currentFeaturedImageUrl || this.generateRandomImage(),
            author: '管理员',
            views: this.currentArticle?.views || 0,
            likes: this.currentArticle?.likes || 0
        };
        
        try {
            // 检查存储空间
            const storageInfo = window.blogDataStore.getStorageInfo();
            if (storageInfo && parseFloat(storageInfo.usagePercent) > 90) {
                const confirmSave = confirm(
                    `⚠️ 存储空间即将用尽 (${storageInfo.usagePercent}%)\n\n` +
                    `当前使用: ${storageInfo.totalSizeMB} MB / ${storageInfo.maxSizeMB} MB\n\n` +
                    `建议：\n` +
                    `1. 删除一些旧文章\n` +
                    `2. 使用图床替代Base64图片\n` +
                    `3. 压缩图片大小\n\n` +
                    `是否继续保存？`
                );
                if (!confirmSave) {
                    return;
                }
            }
            
            if (this.editingArticleId) {
                // 更新文章
                window.blogDataStore.updateArticle(this.editingArticleId, articleData);
                this.showNotification('文章更新成功！', 'success');
            } else {
                // 新建文章
                window.blogDataStore.addArticle(articleData);
                this.showNotification('文章创建成功！', 'success');
            }
            
            // 清除编辑状态和草稿
            localStorage.removeItem('editArticleId');
            localStorage.removeItem('article_draft');
            
            // 延迟跳转
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
            
        } catch (error) {
            console.error('保存失败:', error);
            
            // 特殊处理存储空间错误
            if (error.message.includes('存储空间') || error.message.includes('quota')) {
                this.showNotification(
                    '❌ ' + error.message + '\n\n建议：使用图床上传图片，或删除一些旧文章',
                    'error'
                );
                
                // 显示存储信息
                const storageInfo = window.blogDataStore.getStorageInfo();
                if (storageInfo) {
                    console.log('存储使用情况:', storageInfo);
                    alert(
                        `存储空间详情：\n\n` +
                        `总使用: ${storageInfo.totalSizeMB} MB (${storageInfo.usagePercent}%)\n` +
                        `文章数据: ${storageInfo.articlesKB} KB\n` +
                        `图片数据: ${storageInfo.imagesKB} KB\n` +
                        `文章数量: ${storageInfo.articleCount} 篇\n\n` +
                        `建议删除一些文章或使用外部图床`
                    );
                }
            } else {
                this.showNotification('保存失败：' + error.message, 'error');
            }
        }
    }
    
    // 自动保存
    autoSave() {
        const title = this.titleInput.value.trim();
        const content = this.contentTextarea.value.trim();
        
        if (title && content) {
            try {
                localStorage.setItem('article_draft', JSON.stringify({
                    title,
                    content,
                    category: this.categorySelect.value,
                    excerpt: this.excerptTextarea.value.trim(),
                    tags: this.tags,
                    image: this.currentFeaturedImageUrl,
                    savedAt: new Date().toISOString()
                }));
                
                console.log('✅ 自动保存成功', new Date().toLocaleTimeString());
            } catch (error) {
                console.error('❌ 自动保存失败', error);
            }
        }
    }
    
    // 生成摘要
    generateExcerpt(content, maxLength = 150) {
        // 移除Markdown语法
        let text = content
            .replace(/#{1,6}\s/g, '')           // 标题
            .replace(/\*\*(.+?)\*\*/g, '$1')    // 粗体
            .replace(/\*(.+?)\*/g, '$1')        // 斜体
            .replace(/\[(.+?)\]\(.+?\)/g, '$1') // 链接
            .replace(/`(.+?)`/g, '$1')          // 代码
            .replace(/>\s/g, '')                // 引用
            .replace(/\n/g, ' ')                // 换行
            .trim();
        
        if (text.length > maxLength) {
            text = text.substring(0, maxLength) + '...';
        }
        
        return text;
    }
    
    // 生成随机图片
    generateRandomImage() {
        const seed = Date.now();
        return `https://picsum.photos/seed/${seed}/800/450`;
    }
    
    // 预览文章
    previewArticle() {
        const title = this.titleInput.value || '无标题';
        const content = this.contentTextarea.value || '无内容';
        const category = this.categorySelect.value || '未分类';
        const tags = this.tags.length > 0 ? this.tags : ['无标签'];
        const author = '管理员'; // 预览模式使用默认作者
        
        // 创建临时预览文章对象
        const previewArticle = {
            id: 'preview-' + Date.now(),
            title: title,
            content: content,
            category: category,
            tags: tags,
            author: author,
            date: new Date().toISOString().split('T')[0],
            publishDate: new Date().toISOString().split('T')[0],
            views: 0,
            likes: 0,
            status: 'preview',
            isPreview: true
        };
        
        // 保存到 sessionStorage（临时存储，关闭标签页后自动清除）
        sessionStorage.setItem('previewArticle', JSON.stringify(previewArticle));
        
        // 在新标签页打开前台文章页面
        // 从 blog-admin/pages/editor.html 到 blog/pages/article.html
        const previewUrl = `../../blog/pages/article.html?id=${previewArticle.id}&preview=true`;
        console.log('预览URL:', previewUrl);
        window.open(previewUrl, '_blank');
        
        return; // 不再使用旧的预览方式
        
        // 以下代码保留但不执行
        const htmlContent = this.simpleMarkdownToHtml(content);
        
        const previewWindow = window.open('', '_blank');
        previewWindow.document.write(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title} - 预览</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        max-width: 800px; 
                        margin: 0 auto; 
                        padding: 2rem; 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                        line-height: 1.8;
                        color: #333;
                        background: #f5f5f5;
                    }
                    .article-header {
                        background: white;
                        padding: 2rem;
                        border-radius: 12px;
                        margin-bottom: 2rem;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                    }
                    h1 { 
                        color: #2c5f7c; 
                        font-size: 2rem;
                        margin-bottom: 1rem;
                    }
                    .meta {
                        display: flex;
                        gap: 1rem;
                        color: #666;
                        font-size: 0.9rem;
                        margin-bottom: 1rem;
                    }
                    .category {
                        background: #e3f2fd;
                        color: #1976d2;
                        padding: 0.25rem 0.75rem;
                        border-radius: 12px;
                    }
                    .tags {
                        display: flex;
                        gap: 0.5rem;
                        flex-wrap: wrap;
                    }
                    .tag {
                        background: #f0f8ff;
                        color: #4fc3f7;
                        padding: 0.25rem 0.75rem;
                        border-radius: 12px;
                        font-size: 0.85rem;
                    }
                    .article-content {
                        background: white;
                        padding: 2rem;
                        border-radius: 12px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                    }
                    .article-content h2 { 
                        color: #2c5f7c; 
                        margin: 1.5rem 0 1rem;
                        font-size: 1.5rem;
                    }
                    .article-content h3 { 
                        color: #4fc3f7; 
                        margin: 1.2rem 0 0.8rem;
                        font-size: 1.2rem;
                    }
                    .article-content p { 
                        margin-bottom: 1rem; 
                    }
                    .article-content blockquote {
                        border-left: 4px solid #4fc3f7;
                        padding-left: 1rem;
                        margin: 1rem 0;
                        color: #666;
                        background: #f8f9fa;
                        padding: 1rem;
                        border-radius: 4px;
                    }
                    .article-content pre { 
                        background: #2d2d2d; 
                        color: #f8f8f2;
                        padding: 1rem; 
                        border-radius: 8px; 
                        overflow-x: auto;
                        margin: 1rem 0;
                    }
                    .article-content code {
                        background: #f5f5f5;
                        padding: 0.2rem 0.4rem;
                        border-radius: 3px;
                        font-family: 'Consolas', 'Monaco', monospace;
                        font-size: 0.9em;
                    }
                    .article-content pre code {
                        background: transparent;
                        padding: 0;
                    }
                    .article-content ul, .article-content ol {
                        margin-left: 2rem;
                        margin-bottom: 1rem;
                    }
                    .article-content li {
                        margin-bottom: 0.5rem;
                    }
                    .article-content img {
                        max-width: 100%;
                        height: auto;
                        border-radius: 8px;
                        margin: 1rem 0;
                    }
                    .article-content a {
                        color: #4fc3f7;
                        text-decoration: none;
                    }
                    .article-content a:hover {
                        text-decoration: underline;
                    }
                    .preview-notice {
                        background: #fff3cd;
                        color: #856404;
                        padding: 1rem;
                        border-radius: 8px;
                        margin-bottom: 2rem;
                        text-align: center;
                        border: 1px solid #ffeaa7;
                    }
                </style>
            </head>
            <body>
                <div class="preview-notice">
                    📝 这是文章预览模式，实际显示效果可能略有不同
                </div>
                <div class="article-header">
                    <h1>${title}</h1>
                    <div class="meta">
                        <span class="category">📂 ${category}</span>
                        <span>📅 ${new Date().toLocaleDateString('zh-CN')}</span>
                        <span>👤 管理员</span>
                    </div>
                    <div class="tags">
                        ${tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                    </div>
                </div>
                <div class="article-content">
                    ${htmlContent}
                </div>
            </body>
            </html>
        `);
    }
    
    // 简单的Markdown转HTML
    simpleMarkdownToHtml(markdown) {
        if (!markdown) return '';
        
        let html = markdown;
        
        console.log('=== 预览 Markdown 转 HTML ===');
        console.log('原始内容长度:', markdown.length);
        
        // 使用占位符保护特殊内容
        const protectedBlocks = [];
        let blockIndex = 0;
        
        // 1. 保护代码块
        html = html.replace(/```([\s\S]*?)```/g, function(match) {
            const placeholder = `___CODE_BLOCK_${blockIndex}___`;
            protectedBlocks[blockIndex] = '<pre><code>' + match.slice(3, -3) + '</code></pre>';
            blockIndex++;
            return placeholder;
        });
        
        // 2. 保护并转换图片（必须在链接之前）
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(match, alt, src) {
            console.log('找到图片:', { alt, src: src.substring(0, 100) });
            
            const placeholder = `___IMAGE_BLOCK_${blockIndex}___`;
            const imgHtml = `<img src="${src}" alt="${alt}" style="max-width: 100%; height: auto; display: block; margin: 1rem auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">`;
            
            protectedBlocks[blockIndex] = imgHtml;
            blockIndex++;
            return placeholder;
        });
        
        // 3. 标题
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // 4. 粗体和斜体
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // 5. 链接
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // 6. 引用
        html = html.replace(/^> (.+)$/gim, '<blockquote>$1</blockquote>');
        
        // 7. 行内代码
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // 8. 有序列表
        html = html.replace(/^\d+\.\s+(.+)$/gim, '<li>$1</li>');
        
        // 9. 无序列表
        html = html.replace(/^[\-\*]\s+(.+)$/gim, '<li>$1</li>');
        
        // 10. 包裹列表
        html = html.replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>');
        
        // 11. 段落处理（不要包裹HTML标签和占位符）
        html = html.split('\n\n').map(para => {
            para = para.trim();
            if (!para) return '';
            
            // 跳过HTML标签和占位符
            if (para.match(/^<(h[1-6]|ul|ol|li|pre|blockquote|div)/i) || 
                para.match(/^___\w+_BLOCK_\d+___$/)) {
                return para;
            }
            
            return '<p>' + para + '</p>';
        }).join('\n');
        
        // 12. 换行
        html = html.replace(/\n/g, '<br>');
        
        // 13. 恢复保护的内容
        protectedBlocks.forEach((block, index) => {
            html = html.replace(`___CODE_BLOCK_${index}___`, block);
            html = html.replace(`___IMAGE_BLOCK_${index}___`, block);
        });
        
        console.log('转换后HTML长度:', html.length);
        console.log('包含 <img 标签数量:', (html.match(/<img/g) || []).length);
        console.log('=== 预览转换完成 ===');
        
        return html;
        return html;
    }
    
    // 显示模态框
    showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="editor.closeModal()">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }
    
    // 关闭模态框
    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }
    
    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '100000',
            opacity: '0',
            transform: 'translateY(-20px)',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        });
        
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // 下载飞书图片到本地
    async downloadFeishuImages() {
        const content = this.contentTextarea.value;
        
        if (!content.trim()) {
            this.showNotification('内容为空', 'warning');
            return;
        }
        
        // 检查是否有飞书图片
        const feishuImages = window.feishuImageDownloader.extractFeishuImages(content);
        
        if (feishuImages.length === 0) {
            this.showNotification('未检测到飞书图片', 'info');
            return;
        }
        
        // 生成文档ID（如果是编辑模式使用现有ID，否则生成新ID）
        const articleId = this.currentArticleId || 'article_' + Date.now();
        
        // 确认对话框
        if (!confirm(`检测到 ${feishuImages.length} 个飞书图片，是否自动下载并上传到本地？\n\n图片将保存到：uploads/articles/${articleId}/\n这将替换文章中的飞书图片链接为本地链接。`)) {
            return;
        }
        
        // 显示进度对话框
        const progressDialog = window.feishuImageDownloader.showProgressDialog();
        
        try {
            // 处理所有图片（传入文档ID）
            const result = await window.feishuImageDownloader.processAllImages(
                content,
                articleId,
                (progress) => {
                    progressDialog.updateProgress(progress.current, progress.total);
                    progressDialog.updateCurrentImage(progress.currentImage);
                }
            );
            
            // 关闭进度对话框
            progressDialog.close();
            
            // 更新编辑器内容
            if (result.success || result.processed > 0) {
                this.contentTextarea.value = result.markdown;
                this.showNotification(
                    `✅ 处理完成！${result.message}`,
                    result.success ? 'success' : 'warning'
                );
            } else {
                this.showNotification('❌ 处理失败：' + result.message, 'error');
            }
        } catch (error) {
            progressDialog.close();
            console.error('处理飞书图片失败:', error);
            this.showNotification('处理失败：' + error.message, 'error');
        }
    }
}

// 初始化编辑器
let editor;

// 确保在DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditor);
} else {
    initEditor();
}

function initEditor() {
    try {
        editor = new ArticleEditor();
        window.editor = editor; // 暴露到全局
        console.log('✅ 编辑器初始化成功');
    } catch (error) {
        console.error('❌ 编辑器初始化失败:', error);
    }
}
