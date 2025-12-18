/* ========================================
   文章导入导出功能
   ======================================== */

class ArticleImportExport {
    constructor() {
        this.init();
    }
    
    init() {
        console.log('📄 文章导入导出功能已加载');
    }
    
    // ========== Markdown 导入 ==========
    
    // 显示导入对话框
    showImportDialog() {
        // 检查权限
        if (!window.checkPermission('articles', 'create')) {
            return;
        }
        
        const modalHTML = `
            <div class="modal-overlay" id="importModal">
                <div class="modal-content" style="max-width: 800px; width: 90%;">
                    <div class="modal-header">
                        <h3>📥 导入 Markdown 文件</h3>
                        <button class="modal-close" onclick="articleImportExport.closeImportDialog()">×</button>
                    </div>
                    <div class="modal-body">
                        <div>
                            <p style="color: #666; margin-bottom: 1.5rem; line-height: 1.6;">
                                支持导入标准 Markdown 格式的文件（.md），系统会自动解析文件内容，包括标题、分类、标签等信息。
                            </p>
                            
                            <div class="file-upload-area" id="mdUploadArea" style="
                                border: 2px dashed #4fc3f7;
                                border-radius: 12px;
                                padding: 3rem 2rem;
                                text-align: center;
                                cursor: pointer;
                                transition: all 0.3s;
                                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                            ">
                                <div style="font-size: 4rem; margin-bottom: 1rem;">📄</div>
                                <div style="font-size: 1.2rem; color: #2c5f7c; font-weight: 500; margin-bottom: 0.5rem;">
                                    点击选择或拖拽 Markdown 文件到这里
                                </div>
                                <div style="font-size: 0.95rem; color: #666;">
                                    支持 .md 和 .markdown 格式
                                </div>
                            </div>
                            
                            <input type="file" id="mdFileInput" accept=".md,.markdown" style="display: none;">
                        </div>
                        
                        <div id="importPreview" style="display: none;">
                            <h4 style="margin-bottom: 1rem;">📋 文件预览</h4>
                            <div id="previewContent" style="
                                background: white;
                                padding: 1.5rem;
                                border-radius: 8px;
                                border: 2px solid #e0e0e0;
                                max-height: 350px;
                                overflow-y: auto;
                            "></div>
                        </div>
                        
                        <div class="info-box">
                            <h4>💡 导入说明</h4>
                            <ul>
                                <li>支持标准 Markdown 语法和 Front Matter 元数据</li>
                                <li>系统会自动提取标题、分类、标签等信息</li>
                                <li>如果文件包含 Front Matter，将优先使用其中的元数据</li>
                                <li>导入后的文章默认为草稿状态，可以在编辑器中进一步完善</li>
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="articleImportExport.closeImportDialog()">取消</button>
                        <button class="btn-primary" id="confirmImportBtn" disabled>
                            📥 确认导入
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.importModal = document.getElementById('importModal');
        
        // 点击背景关闭
        this.importModal.addEventListener('click', (e) => {
            if (e.target === this.importModal) {
                this.closeImportDialog();
            }
        });
        
        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.closeImportDialog();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        // 绑定事件
        this.bindImportEvents();
    }
    
    // 关闭导入对话框
    closeImportDialog() {
        if (this.importModal) {
            this.importModal.remove();
            this.importModal = null;
        }
    }
    
    // 绑定导入事件
    bindImportEvents() {
        const uploadArea = document.getElementById('mdUploadArea');
        const fileInput = document.getElementById('mdFileInput');
        const confirmBtn = document.getElementById('confirmImportBtn');
        
        // 点击上传区域
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        // 文件选择
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleMdFile(file);
            }
        });
        
        // 拖拽上传
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#2c5f7c';
            uploadArea.style.background = '#e3f2fd';
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#4fc3f7';
            uploadArea.style.background = '#f8f9fa';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#4fc3f7';
            uploadArea.style.background = '#f8f9fa';
            
            const file = e.dataTransfer.files[0];
            if (file && (file.name.endsWith('.md') || file.name.endsWith('.markdown'))) {
                this.handleMdFile(file);
            } else {
                this.showNotification('请选择 Markdown 文件（.md）', 'error');
            }
        });
        
        // 确认导入
        confirmBtn.addEventListener('click', () => {
            this.confirmImport();
        });
    }
    
    // 处理 Markdown 文件
    async handleMdFile(file) {
        try {
            const content = await this.readFileAsText(file);
            
            // 解析 Markdown
            const parsed = this.parseMdContent(content);
            
            // 显示预览
            this.showImportPreview(parsed);
            
            // 保存解析结果
            this.parsedArticle = parsed;
            
            // 启用确认按钮
            document.getElementById('confirmImportBtn').disabled = false;
            
            this.showNotification('文件解析成功，请检查预览', 'success');
            
        } catch (error) {
            this.showNotification('文件读取失败：' + error.message, 'error');
        }
    }
    
    // 读取文件为文本
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file, 'UTF-8');
        });
    }
    
    // 解析 Markdown 内容
    parseMdContent(content) {
        const lines = content.split('\n');
        let title = '';
        let category = '未分类';
        let tags = [];
        let mainContent = [];
        let inFrontMatter = false;
        let frontMatterEnd = false;
        
        // 解析 Front Matter（如果有）
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 检测 Front Matter
            if (line === '---') {
                if (!inFrontMatter && !frontMatterEnd) {
                    inFrontMatter = true;
                    continue;
                } else if (inFrontMatter) {
                    inFrontMatter = false;
                    frontMatterEnd = true;
                    continue;
                }
            }
            
            // 解析 Front Matter
            if (inFrontMatter) {
                if (line.startsWith('title:')) {
                    title = line.substring(6).trim().replace(/['"]/g, '');
                } else if (line.startsWith('category:') || line.startsWith('categories:')) {
                    category = line.split(':')[1].trim().replace(/['"]/g, '');
                } else if (line.startsWith('tags:')) {
                    const tagStr = line.substring(5).trim();
                    if (tagStr.startsWith('[')) {
                        tags = JSON.parse(tagStr);
                    } else {
                        tags = tagStr.split(',').map(t => t.trim().replace(/['"]/g, ''));
                    }
                }
                continue;
            }
            
            // 如果没有 Front Matter，从第一个 # 标题提取
            if (!title && line.startsWith('# ')) {
                title = line.substring(2).trim();
                continue;
            }
            
            // 收集正文内容
            if (frontMatterEnd || !line.startsWith('---')) {
                mainContent.push(lines[i]);
            }
        }
        
        // 如果还没有标题，使用文件名或默认标题
        if (!title) {
            title = '导入的文章';
        }
        
        // 生成摘要
        const plainText = mainContent.join('\n')
            .replace(/#{1,6}\s/g, '')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/\[(.+?)\]\(.+?\)/g, '$1')
            .trim();
        
        const excerpt = plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');
        
        return {
            title,
            content: mainContent.join('\n').trim(),
            category,
            tags: tags.length > 0 ? tags : ['导入'],
            excerpt
        };
    }
    
    // 显示导入预览
    showImportPreview(parsed) {
        const preview = document.getElementById('importPreview');
        const previewContent = document.getElementById('previewContent');
        
        previewContent.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <strong style="color: #2c5f7c;">标题：</strong>
                <span>${parsed.title}</span>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong style="color: #2c5f7c;">分类：</strong>
                <span>${parsed.category}</span>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong style="color: #2c5f7c;">标签：</strong>
                <span>${parsed.tags.join(', ')}</span>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong style="color: #2c5f7c;">摘要：</strong>
                <div style="color: #666; margin-top: 0.5rem;">${parsed.excerpt}</div>
            </div>
            <div>
                <strong style="color: #2c5f7c;">内容预览：</strong>
                <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; margin-top: 0.5rem; white-space: pre-wrap; font-size: 0.9rem; max-height: 200px; overflow-y: auto;">${parsed.content.substring(0, 500)}${parsed.content.length > 500 ? '...' : ''}</pre>
            </div>
        `;
        
        preview.style.display = 'block';
    }
    
    // 确认导入
    confirmImport() {
        if (!this.parsedArticle) {
            this.showNotification('没有可导入的内容', 'error');
            return;
        }
        
        try {
            // 添加文章
            const article = {
                ...this.parsedArticle,
                publishDate: new Date().toISOString().split('T')[0],
                status: 'draft', // 默认为草稿
                image: `https://picsum.photos/seed/${Date.now()}/800/450`,
                author: '管理员',
                views: 0,
                likes: 0
            };
            
            window.blogDataStore.addArticle(article);
            
            this.showNotification('✅ 文章导入成功！', 'success');
            this.closeImportDialog();
            
            // 刷新文章列表
            if (typeof renderArticlesTable === 'function') {
                renderArticlesTable();
            }
            
            // 询问是否编辑
            setTimeout(() => {
                if (confirm('文章导入成功！是否立即编辑这篇文章？')) {
                    localStorage.setItem('editArticleId', article.id);
                    window.location.href = 'pages/editor.html';
                }
            }, 500);
            
        } catch (error) {
            this.showNotification('导入失败：' + error.message, 'error');
        }
    }
    
    // ========== 文章导出 ==========
    
    // 显示导出对话框
    showExportDialog() {
        const articles = window.blogDataStore.getAllArticles();
        
        if (!articles || articles.length === 0) {
            this.showNotification('暂无文章可导出', 'warning');
            return;
        }
        
        const modalHTML = `
            <div class="modal-overlay" id="exportModal">
                <div class="modal-content" style="max-width: 700px; width: 90%;">
                    <div class="modal-header">
                        <h3>📤 导出文章</h3>
                        <button class="modal-close" onclick="articleImportExport.closeExportDialog()">×</button>
                    </div>
                    <div class="modal-body">
                        <div>
                            <h4>选择要导出的文章</h4>
                            <div style="max-height: 400px; overflow-y: auto; border: 2px solid #e0e0e0; border-radius: 8px; padding: 1rem;">
                                ${articles.map(article => `
                                    <label style="display: flex; align-items: center; padding: 0.75rem; margin-bottom: 0.5rem; background: #f8f9fa; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                                        <input type="checkbox" class="export-article-checkbox" value="${article.id}" style="margin-right: 0.75rem; width: 18px; height: 18px; cursor: pointer;">
                                        <div style="flex: 1;">
                                            <div style="font-weight: 500; color: #333; margin-bottom: 0.25rem;">${article.title}</div>
                                            <div style="font-size: 0.85rem; color: #666;">
                                                ${article.category} · ${article.publishDate}
                                            </div>
                                        </div>
                                    </label>
                                `).join('')}
                            </div>
                            <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                                <button class="btn-secondary" onclick="articleImportExport.selectAllArticles(true)" style="flex: 1;">全选</button>
                                <button class="btn-secondary" onclick="articleImportExport.selectAllArticles(false)" style="flex: 1;">取消全选</button>
                            </div>
                        </div>
                        
                        <div>
                            <h4>选择导出格式</h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                                <button class="export-format-btn" data-format="markdown" style="padding: 1rem; border: 2px solid #4fc3f7; background: white; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📝</div>
                                    <div style="font-weight: 500; color: #2c5f7c;">Markdown</div>
                                    <div style="font-size: 0.85rem; color: #666; margin-top: 0.25rem;">.md 格式</div>
                                </button>
                                <button class="export-format-btn" data-format="word" style="padding: 1rem; border: 2px solid #e0e0e0; background: white; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📄</div>
                                    <div style="font-weight: 500; color: #2c5f7c;">Word</div>
                                    <div style="font-size: 0.85rem; color: #666; margin-top: 0.25rem;">.doc 格式</div>
                                </button>
                                <button class="export-format-btn" data-format="pdf" style="padding: 1rem; border: 2px solid #e0e0e0; background: white; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📕</div>
                                    <div style="font-weight: 500; color: #2c5f7c;">PDF</div>
                                    <div style="font-size: 0.85rem; color: #666; margin-top: 0.25rem;">打印为PDF</div>
                                </button>
                            </div>
                        </div>
                        
                        <div class="info-box">
                            <h4>💡 导出说明</h4>
                            <ul>
                                <li><strong>Markdown</strong>：适合在其他Markdown编辑器中使用，保留原始格式</li>
                                <li><strong>Word</strong>：适合在Microsoft Word中编辑，自动转换格式</li>
                                <li><strong>PDF</strong>：适合打印和分享，使用浏览器打印功能</li>
                                <li>可以同时选择多篇文章批量导出</li>
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="articleImportExport.closeExportDialog()">取消</button>
                        <button class="btn-primary" onclick="articleImportExport.confirmExport()">
                            📤 开始导出
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.exportModal = document.getElementById('exportModal');
        this.selectedFormat = 'markdown'; // 默认格式
        
        // 绑定格式选择事件
        document.querySelectorAll('.export-format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.export-format-btn').forEach(b => {
                    b.style.borderColor = '#e0e0e0';
                    b.style.background = 'white';
                });
                btn.style.borderColor = '#4fc3f7';
                btn.style.background = '#f0f8ff';
                this.selectedFormat = btn.dataset.format;
            });
        });
        
        // 默认选中第一个格式
        document.querySelector('.export-format-btn[data-format="markdown"]').click();
        
        // 点击背景关闭
        this.exportModal.addEventListener('click', (e) => {
            if (e.target === this.exportModal) {
                this.closeExportDialog();
            }
        });
        
        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.closeExportDialog();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }
    
    // 关闭导出对话框
    closeExportDialog() {
        if (this.exportModal) {
            this.exportModal.remove();
            this.exportModal = null;
        }
    }
    
    // 全选/取消全选
    selectAllArticles(select) {
        document.querySelectorAll('.export-article-checkbox').forEach(checkbox => {
            checkbox.checked = select;
        });
    }
    
    // 确认导出
    confirmExport() {
        const selectedIds = Array.from(document.querySelectorAll('.export-article-checkbox:checked'))
            .map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            this.showNotification('请至少选择一篇文章', 'warning');
            return;
        }
        
        // 根据格式导出
        selectedIds.forEach((id, index) => {
            setTimeout(() => {
                switch (this.selectedFormat) {
                    case 'markdown':
                        this.exportToMarkdown(id);
                        break;
                    case 'word':
                        this.exportToWord(id);
                        break;
                    case 'pdf':
                        this.exportToPDF(id);
                        break;
                }
            }, index * 300); // 延迟下载，避免浏览器阻止
        });
        
        this.showNotification(`✅ 正在导出 ${selectedIds.length} 篇文章...`, 'success');
        this.closeExportDialog();
    }
    
    // 导出为 Markdown
    async exportToMarkdown(articleId) {
        const article = await window.blogDataStore.getArticleById(articleId);
        if (!article) {
            showNotification('文章不存在', 'error');
            return;
        }
        
        // 生成 Markdown 内容
        let mdContent = '';
        
        // Front Matter
        mdContent += '---\n';
        mdContent += `title: "${article.title}"\n`;
        mdContent += `date: ${article.publishDate}\n`;
        mdContent += `category: ${article.category}\n`;
        mdContent += `tags: [${article.tags.map(t => `"${t}"`).join(', ')}]\n`;
        mdContent += `author: ${article.author}\n`;
        mdContent += '---\n\n';
        
        // 标题
        mdContent += `# ${article.title}\n\n`;
        
        // 元信息
        mdContent += `> 📅 发布日期：${article.publishDate}\n`;
        mdContent += `> 📂 分类：${article.category}\n`;
        mdContent += `> 🏷️ 标签：${article.tags.join(', ')}\n`;
        mdContent += `> 👤 作者：${article.author}\n\n`;
        
        // 正文
        mdContent += article.content;
        
        // 下载文件
        this.downloadFile(
            mdContent,
            `${article.title}.md`,
            'text/markdown'
        );
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
    
    // 导出为 Word（使用 HTML 格式）
    async exportToWord(articleId) {
        const article = await window.blogDataStore.getArticleById(articleId);
        if (!article) {
            showNotification('文章不存在', 'error');
            return;
        }
        
        // 将 Markdown 转换为 HTML，并处理图片
        const htmlContent = await this.markdownToHtmlWithImages(article.content);
        
        // 生成 Word 文档（使用 HTML 格式）
        const wordContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta charset='utf-8'>
    <!--[if gte mso 9]>
    <xml>
        <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>90</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
    </xml>
    <![endif]-->
    <title>${article.title}</title>
    <style>
        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            line-height: 1.8;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }
        h1 {
            color: #2c5f7c;
            border-bottom: 3px solid #4fc3f7;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        h2 {
            color: #2c5f7c;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        h3 {
            color: #4fc3f7;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        .meta {
            background: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #4fc3f7;
            margin-bottom: 30px;
            color: #666;
        }
        .meta p {
            margin: 5px 0;
        }
        code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', monospace;
            color: #c7254e;
            border: 1px solid #e1e1e8;
        }
        pre {
            background: #f5f5f5;
            color: #333;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border: 1px solid #ddd;
            line-height: 1.6;
        }
        pre code {
            background: transparent;
            color: #333;
            border: none;
            padding: 0;
        }
        blockquote {
            border-left: 4px solid #4fc3f7;
            padding-left: 15px;
            margin-left: 0;
            color: #666;
            background: #f8f9fa;
            padding: 10px 15px;
        }
        img {
            max-width: 600px;
            width: auto;
            height: auto;
            display: block;
            margin: 20px auto;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        th {
            background: #f8f9fa;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>${article.title}</h1>
    
    <div class="meta">
        <p><strong>📅 发布日期：</strong>${article.publishDate}</p>
        <p><strong>📂 分类：</strong>${article.category}</p>
        <p><strong>🏷️ 标签：</strong>${article.tags.join(', ')}</p>
        <p><strong>👤 作者：</strong>${article.author}</p>
    </div>
    
    ${htmlContent}
</body>
</html>
        `;
        
        // 添加UTF-8 BOM以防止乱码
        const BOM = '\uFEFF';
        const contentWithBOM = BOM + wordContent;
        
        // 下载为 Word 文档
        this.downloadFile(
            contentWithBOM,
            `${article.title}.doc`,
            'application/msword;charset=utf-8'
        );
    }
    
    // 导出为 PDF（使用打印功能）
    async exportToPDF(articleId) {
        const article = await window.blogDataStore.getArticleById(articleId);
        if (!article) {
            showNotification('文章不存在', 'error');
            return;
        }
        
        // 将 Markdown 转换为 HTML，并处理图片
        const htmlContent = await this.markdownToHtmlWithImages(article.content);
        
        // 创建打印窗口
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${article.title}</title>
    <style>
        @media print {
            body {
                margin: 0;
                padding: 20mm;
            }
        }
        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            line-height: 1.8;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            color: #333;
        }
        h1 {
            color: #2c5f7c;
            border-bottom: 3px solid #4fc3f7;
            padding-bottom: 10px;
            margin-bottom: 30px;
            page-break-after: avoid;
        }
        h2 {
            color: #2c5f7c;
            margin-top: 30px;
            margin-bottom: 15px;
            page-break-after: avoid;
        }
        h3 {
            color: #4fc3f7;
            margin-top: 20px;
            margin-bottom: 10px;
            page-break-after: avoid;
        }
        .meta {
            background: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #4fc3f7;
            margin-bottom: 30px;
            color: #666;
            page-break-inside: avoid;
        }
        .meta p {
            margin: 5px 0;
        }
        code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
            color: #c7254e;
            border: 1px solid #e1e1e8;
        }
        pre {
            background: #f5f5f5;
            color: #333;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            page-break-inside: avoid;
            border: 1px solid #ddd;
            line-height: 1.6;
        }
        pre code {
            background: transparent;
            color: #333;
            border: none;
            padding: 0;
        }
        blockquote {
            border-left: 4px solid #4fc3f7;
            padding-left: 15px;
            margin-left: 0;
            color: #666;
            background: #f8f9fa;
            padding: 10px 15px;
            page-break-inside: avoid;
        }
        img {
            max-width: 600px;
            width: auto;
            height: auto;
            page-break-inside: avoid;
            display: block;
            margin: 20px auto;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            page-break-inside: avoid;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        th {
            background: #f8f9fa;
            font-weight: bold;
        }
        .print-info {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #999;
            font-size: 0.9em;
            text-align: center;
        }
    </style>
</head>
<body>
    <h1>${article.title}</h1>
    
    <div class="meta">
        <p><strong>📅 发布日期：</strong>${article.publishDate}</p>
        <p><strong>📂 分类：</strong>${article.category}</p>
        <p><strong>🏷️ 标签：</strong>${article.tags.join(', ')}</p>
        <p><strong>👤 作者：</strong>${article.author}</p>
    </div>
    
    ${htmlContent}
    
    <div class="print-info">
        <p>导出时间：${new Date().toLocaleString('zh-CN')}</p>
    </div>
    
    <script>
        // 等待所有图片加载完成后再打印
        window.onload = function() {
            const images = document.querySelectorAll('img');
            let loadedCount = 0;
            const totalImages = images.length;
            
            if (totalImages === 0) {
                // 没有图片，直接打印
                setTimeout(function() {
                    window.print();
                }, 500);
                return;
            }
            
            function checkAllLoaded() {
                loadedCount++;
                if (loadedCount === totalImages) {
                    // 所有图片加载完成，延迟打印
                    setTimeout(function() {
                        window.print();
                    }, 1000);
                }
            }
            
            images.forEach(function(img) {
                if (img.complete) {
                    checkAllLoaded();
                } else {
                    img.onload = checkAllLoaded;
                    img.onerror = function() {
                        console.error('图片加载失败:', img.src);
                        checkAllLoaded(); // 即使失败也继续
                    };
                }
            });
        };
    </script>
</body>
</html>
        `);
        
        printWindow.document.close();
    }
    
    // Markdown 转 HTML（简单实现）
    markdownToHtml(markdown) {
        let html = markdown;
        
        // 先处理代码块（避免被其他规则影响）
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // 处理图片（在段落处理之前，避免被包裹）
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; display: block; margin: 20px auto;">');
        
        // 标题
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // 粗体和斜体
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // 链接（在图片之后处理，避免冲突）
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // 引用
        html = html.replace(/^> (.+)$/gim, '<blockquote>$1</blockquote>');
        
        // 行内代码
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // 无序列表
        html = html.replace(/^\- (.+)$/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // 有序列表
        html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');
        
        // 段落处理（排除已经是HTML标签的行）
        html = html.split('\n\n').map(para => {
            // 如果已经是HTML标签或图片，不包裹p标签
            if (para.match(/^<[hupoli]/) || para.match(/<img/)) {
                return para;
            }
            return '<p>' + para + '</p>';
        }).join('\n');
        
        // 换行（但不影响img标签）
        html = html.replace(/\n(?!<img)/g, '<br>');
        
        return html;
    }
    
    // Markdown 转 HTML（处理图片为绝对路径）
    async markdownToHtmlWithImages(markdown) {
        let html = markdown;
        
        // 提取所有图片
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        const images = [];
        let match;
        
        while ((match = imageRegex.exec(markdown)) !== null) {
            images.push({
                full: match[0],
                alt: match[1],
                src: match[2]
            });
        }
        
        // 转换图片路径为绝对路径
        for (const img of images) {
            let absoluteSrc = img.src;
            
            // 如果是相对路径，转换为绝对路径
            if (!img.src.startsWith('http://') && !img.src.startsWith('https://') && !img.src.startsWith('data:')) {
                // 相对于当前页面的路径
                const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
                
                if (img.src.startsWith('/')) {
                    // 绝对路径（相对于域名）
                    absoluteSrc = window.location.origin + img.src;
                } else if (img.src.startsWith('../')) {
                    // 相对路径（向上）
                    const parts = baseUrl.split('/');
                    const srcParts = img.src.split('/');
                    
                    for (const part of srcParts) {
                        if (part === '..') {
                            parts.pop();
                        } else if (part !== '.') {
                            parts.push(part);
                        }
                    }
                    absoluteSrc = parts.join('/');
                } else {
                    // 相对路径（当前目录）
                    absoluteSrc = baseUrl + '/' + img.src;
                }
            }
            
            // 替换为绝对路径
            html = html.replace(img.full, `![${img.alt}](${absoluteSrc})`);
        }
        
        // 转换为HTML
        return this.markdownToHtml(html);
    }
    
    // 下载文件
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// 初始化
let articleImportExport;
document.addEventListener('DOMContentLoaded', function() {
    articleImportExport = new ArticleImportExport();
    window.articleImportExport = articleImportExport;
});
