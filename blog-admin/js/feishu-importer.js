/* ========================================
   飞书文档导入器
   ======================================== */

class FeishuImporter {
    constructor() {
        this.modal = null;
    }
    
    // 显示导入对话框
    showImportDialog() {
        // 检查权限
        if (!window.checkPermission('articles', 'create')) {
            return;
        }
        
        const modalHTML = `
            <div class="modal-overlay" id="feishuImportModal">
                <div class="modal-content" style="max-width: 900px; width: 90%;">
                    <div class="modal-header">
                        <h3>📄 导入飞书文档</h3>
                        <button class="modal-close" 
                                type="button"
                                onclick="feishuImporter.closeDialog()"
                                aria-label="关闭对话框"
                                title="关闭">×</button>
                    </div>
                    <div class="modal-body">
                        <div>
                            <label for="feishuUrl">
                                <h4>方式一：粘贴飞书文档URL</h4>
                            </label>
                            <input type="url" 
                                   id="feishuUrl" 
                                   name="feishuUrl"
                                   placeholder="https://example.feishu.cn/docx/..."
                                   aria-label="飞书文档URL"
                                   title="输入飞书文档URL">
                            <p>⚠️ 注意：需要文档设置为"任何人可查看"权限（需要后端API支持）</p>
                        </div>
                        
                        <div>
                            <label for="feishuPasteArea">
                                <h4>方式二：粘贴飞书文档内容（推荐）</h4>
                            </label>
                            <div id="feishuPasteArea" 
                                 contenteditable="true" 
                                 class="feishu-paste-area"
                                 role="textbox"
                                 aria-label="飞书文档内容粘贴区域"
                                 aria-multiline="true"
                                 title="粘贴飞书文档内容"
                                 data-placeholder="直接从飞书文档复制内容粘贴到这里（支持富文本格式和图片）...">
                            </div>
                            <p style="font-size: 0.85rem; color: #666; margin-top: 0.5rem;">
                                💡 提示：直接粘贴可保留格式和图片，系统会自动转换为Markdown
                            </p>
                        </div>
                        
                        <div class="info-box">
                            <h4>💡 使用说明</h4>
                            <ul>
                                <li><strong>推荐使用方式二</strong>在飞书文档中全选（Ctrl+A）→ 复制（Ctrl+C）→ 粘贴到上方编辑框</li>
                                <li><strong>支持富文本格式</strong>标题、段落、列表、代码块、粗体、斜体、链接、引用、表格等</li>
                                <li><strong>图片处理选项</strong>
                                    <label style="display: block; margin-top: 0.5rem;">
                                        <input type="radio" name="imageMode" id="autoUpload" value="upload" checked>
                                        🚀 自动上传到服务器（推荐） - 自动下载飞书图片并上传到本地服务器，无需手动操作
                                    </label>
                                    <label style="display: block; margin-top: 0.3rem;">
                                        <input type="radio" name="imageMode" id="convertToBase64" value="base64">
                                        转换为Base64 - 占用localStorage空间，但无需服务器
                                    </label>
                                    <label style="display: block; margin-top: 0.3rem;">
                                        <input type="radio" name="imageMode" id="keepUrls" value="keep">
                                        保留飞书图片URL - 不处理图片（可能无法访问）
                                    </label>
                                </li>
                                <li><strong>智能识别</strong>根据字体大小和样式自动识别标题层级</li>
                                <li><strong>自动转换</strong>所有格式会自动转换为标准Markdown语法</li>
                                <li><strong>⚠️ 重要提示</strong>
                                    <ul style="margin-top: 0.5rem;">
                                        <li><strong>自动上传模式（推荐）</strong> 需要启动上传服务器（upload-server.js），图片自动下载并上传到 <code>uploads/articles/文档ID/</code></li>
                                        <li><strong>Base64模式</strong> 图片直接嵌入，但会占用存储空间，适合图片较少的情况</li>
                                        <li><strong>保留URL模式</strong> 不处理图片，保留原始飞书链接（可能因权限问题无法访问）</li>
                                        <li><strong>💡 建议</strong> 图片较多时使用自动上传模式，图片较少时使用Base64模式</li>
                                    </ul>
                                </li>
                                <li>转换完成后会跳转到编辑器，可以进一步调整内容</li>
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" 
                                type="button"
                                onclick="feishuImporter.closeDialog()"
                                aria-label="取消导入">
                            取消
                        </button>
                        <button class="btn-primary" 
                                type="button"
                                onclick="feishuImporter.importDocument()"
                                aria-label="导入并转换飞书文档">
                            <span id="importBtnText">📥 导入并转换</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('feishuImportModal');
        
        // 点击背景关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeDialog();
            }
        });
        
        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.closeDialog();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        // 🔥 监听粘贴事件，确保保留富文本格式
        const pasteArea = document.getElementById('feishuPasteArea');
        pasteArea.addEventListener('paste', (e) => {
            console.log('=== 飞书粘贴事件触发 ===');
            
            const clipboardData = e.clipboardData || window.clipboardData;
            const htmlData = clipboardData.getData('text/html');
            const textData = clipboardData.getData('text/plain');
            
            console.log('HTML数据长度:', htmlData ? htmlData.length : 0);
            console.log('文本数据长度:', textData ? textData.length : 0);
            
            if (htmlData) {
                console.log('✅ 检测到HTML格式，将保留富文本');
                console.log('HTML预览:', htmlData.substring(0, 300));
                
                // 阻止默认粘贴
                e.preventDefault();
                
                // 清理并插入HTML
                pasteArea.innerHTML = '';
                
                // 创建临时容器解析HTML
                const temp = document.createElement('div');
                temp.innerHTML = htmlData;
                
                // 将解析后的内容插入
                pasteArea.appendChild(temp);
                
                console.log('✅ 富文本已插入，子节点数量:', pasteArea.childNodes.length);
                console.log('第一个子节点:', pasteArea.firstChild);
            } else {
                console.log('⚠️ 未检测到HTML格式，使用默认粘贴');
            }
        });
    }
    
    // 关闭对话框
    closeDialog() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
    
    // 导入文档
    async importDocument() {
        const url = document.getElementById('feishuUrl').value.trim();
        const pasteArea = document.getElementById('feishuPasteArea');
        const btnText = document.getElementById('importBtnText');
        
        console.log('开始导入...');
        console.log('粘贴区域 HTML:', pasteArea.innerHTML);
        console.log('粘贴区域文本:', pasteArea.textContent);
        
        if (!url && !pasteArea.innerHTML.trim()) {
            this.showNotification('请输入飞书文档URL或粘贴文档内容', 'warning');
            return;
        }
        
        try {
            btnText.textContent = '⏳ 转换中...';
            
            let markdown = '';
            
            if (url) {
                // 方式一：从URL获取（实际项目中需要后端API支持）
                this.showNotification('URL导入功能需要后端API支持，请使用方式二直接粘贴内容', 'warning');
                btnText.textContent = '📥 导入并转换';
                return;
            } else {
                // 方式二：从富文本内容转换
                console.log('开始转换 HTML 到 Markdown...');
                
                // 优先尝试复杂解析（保留格式）
                try {
                    console.log('尝试复杂 DOM 解析（保留格式）...');
                    markdown = await this.convertHtmlToMarkdown(pasteArea);
                    console.log('复杂解析结果长度:', markdown.length);
                    
                    // 如果复杂解析失败，使用简单方法
                    if (!markdown || markdown.trim().length === 0) {
                        console.log('复杂解析失败，使用简单文本提取...');
                        markdown = this.simpleHtmlToMarkdown(pasteArea);
                        console.log('简单提取结果长度:', markdown.length);
                    }
                } catch (error) {
                    console.error('复杂解析出错:', error);
                    console.log('降级到简单文本提取...');
                    markdown = this.simpleHtmlToMarkdown(pasteArea);
                    console.log('简单提取结果长度:', markdown.length);
                }
                
                // 最后的保障：直接使用文本内容
                if (!markdown || markdown.trim().length === 0) {
                    console.log('所有方法失败，直接使用文本内容...');
                    markdown = pasteArea.textContent || pasteArea.innerText || '';
                    console.log('直接文本长度:', markdown.length);
                }
                
                console.log('最终转换结果预览:', markdown.substring(0, 200));
                console.log('最终转换结果长度:', markdown.length);
            }
            
            if (!markdown || markdown.trim().length === 0) {
                console.error('转换结果为空');
                this.showNotification('转换失败，内容为空。请检查粘贴的内容格式。', 'error');
                btnText.textContent = '📥 导入并转换';
                return;
            }
            
            // 🔥 根据用户选择处理飞书图片
            console.log('🔍 检查图片处理选项...');
            
            // 获取用户选择的图片处理模式
            const imageModeRadios = document.getElementsByName('imageMode');
            let imageMode = 'upload'; // 默认自动上传
            for (const radio of imageModeRadios) {
                if (radio.checked) {
                    imageMode = radio.value;
                    break;
                }
            }
            
            console.log(`📸 图片处理模式: ${imageMode}`);
            
            // 检测飞书图片
            const feishuImages = window.feishuImageDownloader.extractFeishuImages(markdown);
            
            if (feishuImages.length > 0) {
                console.log(`📥 检测到 ${feishuImages.length} 个飞书图片`);
                
                if (imageMode === 'upload') {
                    // 模式1：自动上传到服务器
                    console.log('🚀 使用自动上传模式...');
                    
                    // 检查服务器是否可用
                    if (!window.fileUploader) {
                        this.showNotification('⚠️ 上传模块未加载，切换到Base64模式', 'warning');
                        imageMode = 'base64';
                    } else {
                        const serverAvailable = await window.fileUploader.checkServer();
                        if (!serverAvailable) {
                            const useBase64 = confirm(
                                '⚠️ 上传服务器未启动！\n\n' +
                                '检测到 ' + feishuImages.length + ' 个飞书图片\n\n' +
                                '点击"确定"使用Base64模式（占用存储空间）\n' +
                                '点击"取消"保留飞书URL（可能无法访问）\n\n' +
                                '建议：启动服务器后重新导入'
                            );
                            imageMode = useBase64 ? 'base64' : 'keep';
                            console.log(`切换到 ${imageMode} 模式`);
                        }
                    }
                    
                    if (imageMode === 'upload') {
                        // 生成文档ID
                        const articleId = 'article_' + Date.now();
                        
                        console.log(`🚀 开始处理 ${feishuImages.length} 个飞书图片...`);
                        console.log(`📁 文档ID: ${articleId}`);
                        
                        // 更新按钮状态
                        btnText.textContent = '📥 正在处理图片...';
                        
                        // 显示进度对话框
                        let progressDialog = null;
                        try {
                            progressDialog = window.feishuImageDownloader.showProgressDialog();
                            console.log('✅ 进度对话框已显示');
                        } catch (dialogError) {
                            console.error('❌ 显示进度对话框失败:', dialogError);
                            this.showNotification('⚠️ 无法显示进度对话框，但处理将继续', 'warning');
                        }
                        
                        try {
                            // 自动处理所有飞书图片
                            const result = await window.feishuImageDownloader.processAllImages(
                                markdown,
                                articleId,
                                (progress) => {
                                    console.log(`📊 进度更新: ${progress.current}/${progress.total} - ${progress.currentImage}`);
                                    
                                    // 更新按钮文本显示进度
                                    btnText.textContent = `📥 处理图片 ${progress.current}/${progress.total}`;
                                    
                                    // 更新进度对话框（如果存在）
                                    if (progressDialog) {
                                        try {
                                            progressDialog.updateProgress(progress.current, progress.total);
                                            progressDialog.updateCurrentImage(progress.currentImage);
                                        } catch (updateError) {
                                            console.warn('⚠️ 更新进度对话框失败:', updateError);
                                        }
                                    }
                                }
                            );
                            
                            // 关闭进度对话框
                            if (progressDialog) {
                                try {
                                    progressDialog.close();
                                    console.log('✅ 进度对话框已关闭');
                                } catch (closeError) {
                                    console.warn('⚠️ 关闭进度对话框失败:', closeError);
                                }
                            }
                            
                            // 更新 markdown 为处理后的内容
                            if (result.success || result.processed > 0) {
                                markdown = result.markdown;
                                console.log(`✅ 飞书图片上传完成：成功 ${result.processed} 个，失败 ${result.failed} 个`);
                                
                                // 显示详细的成功消息
                                const successMessage = result.failed > 0 
                                    ? `✅ 图片处理完成！成功 ${result.processed} 个，失败 ${result.failed} 个`
                                    : `✅ 所有 ${result.processed} 个飞书图片已成功上传！`;
                                
                                this.showNotification(successMessage, result.success ? 'success' : 'warning');
                            } else {
                                console.warn('⚠️ 飞书图片处理失败:', result.message);
                                this.showNotification('⚠️ 图片处理失败: ' + result.message, 'warning');
                            }
                        } catch (error) {
                            // 确保进度对话框被关闭
                            if (progressDialog) {
                                try {
                                    progressDialog.close();
                                } catch (closeError) {
                                    console.warn('⚠️ 关闭进度对话框失败:', closeError);
                                }
                            }
                            
                            console.error('❌ 飞书图片处理出错:', error);
                            this.showNotification('⚠️ 图片处理出错: ' + error.message, 'warning');
                        }
                    }
                } else if (imageMode === 'base64') {
                    // 模式2：转换为Base64（保持原有逻辑）
                    console.log('📦 使用Base64模式（原有逻辑）');
                    this.showNotification(`ℹ️ 检测到 ${feishuImages.length} 个飞书图片，将转换为Base64`, 'info');
                } else if (imageMode === 'keep') {
                    // 模式3：保留URL
                    console.log('🔗 保留飞书图片URL');
                    this.showNotification(`ℹ️ 保留 ${feishuImages.length} 个飞书图片URL（可能无法访问）`, 'info');
                }
            } else {
                console.log('ℹ️ 未检测到飞书图片');
            }
            
            // 保存到localStorage，然后跳转到编辑器
            console.log('=== 最终 Markdown 内容预览 ===');
            console.log(markdown.substring(0, 500));
            console.log('=== Markdown 长度:', markdown.length, '===');
            
            const articleDraft = {
                title: this.extractTitle(markdown) || '从飞书导入的文章',
                content: markdown,
                category: '',
                excerpt: '',
                tags: [],
                image: '',
                savedAt: new Date().toISOString(),
                source: 'feishu'
            };
            
            console.log('保存草稿:', articleDraft);
            console.log('草稿内容前500字符:', articleDraft.content.substring(0, 500));
            localStorage.setItem('article_draft', JSON.stringify(articleDraft));
            
            // 显示成功消息
            this.showNotification('✅ 文档导入成功！正在跳转到编辑器...', 'success');
            
            setTimeout(() => {
                // 判断当前页面位置，决定跳转路径
                const currentPath = window.location.pathname;
                if (currentPath.includes('/pages/editor.html')) {
                    // 已经在编辑器页面，直接刷新
                    window.location.reload();
                } else {
                    // 在其他页面，跳转到编辑器
                    window.location.href = 'pages/editor.html';
                }
            }, 1500);
            
        } catch (error) {
            console.error('导入失败:', error);
            console.error('错误堆栈:', error.stack);
            this.showNotification('导入失败: ' + error.message, 'error');
            btnText.textContent = '📥 导入并转换';
        }
    }
    
    // 将HTML内容转换为Markdown（支持富文本和图片）
    async convertHtmlToMarkdown(element) {
        console.log('=== 开始 DOM 解析转换 ===');
        console.log('子节点数量:', element.childNodes.length);
        
        // 如果没有内容，直接返回空
        if (!element.textContent.trim()) {
            console.warn('⚠️ 元素没有文本内容');
            return '';
        }
        
        let markdown = '';
        
        // 递归处理节点
        const processNode = async (node) => {
            // 文本节点：直接返回文本
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent || '';
            }
            
            // 非元素节点：返回空
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }
            
            const tagName = node.tagName.toLowerCase();
            let result = '';
            
            switch (tagName) {
                case 'h1':
                    result = '# ' + node.textContent.trim() + '\n\n';
                    break;
                case 'h2':
                    result = '## ' + node.textContent.trim() + '\n\n';
                    break;
                case 'h3':
                    result = '### ' + node.textContent.trim() + '\n\n';
                    break;
                case 'h4':
                    result = '#### ' + node.textContent.trim() + '\n\n';
                    break;
                case 'h5':
                    result = '##### ' + node.textContent.trim() + '\n\n';
                    break;
                case 'h6':
                    result = '###### ' + node.textContent.trim() + '\n\n';
                    break;
                    
                case 'p':
                case 'div':
                    // 检查是否包含特殊样式（可能是标题）
                    try {
                        const style = window.getComputedStyle(node);
                        const fontSize = parseFloat(style.fontSize);
                        const fontWeight = style.fontWeight;
                        let text = node.textContent.trim();
                        
                        // 🔥 检查是否有 data-* 属性包含序号信息（飞书可能使用）
                        const dataText = node.getAttribute('data-text') || '';
                        if (dataText) {
                            console.log(`检测到 data-text: "${dataText}"`);
                        }
                        
                        // 🔥 检查 innerHTML 是否包含序号标记
                        const innerHTML = node.innerHTML;
                        if (innerHTML.includes('data-list-type') || innerHTML.includes('list-item')) {
                            console.log(`检测到列表标记: ${innerHTML.substring(0, 100)}`);
                        }
                        
                        // 排除：包含句号的长文本（明显是段落）
                        const isSentence = text.match(/[。！？.!?]$/);
                        
                        if (text.length > 0 && text.length < 100 && !isSentence) {
                            let headingLevel = null;
                            
                            // 输出调试信息
                            console.log(`检查文本: "${text.substring(0, 30)}", 字体: ${fontSize}px, 粗细: ${fontWeight}`);
                            
                            // 🔥 先根据字体大小判断是否是标题（不管有没有序号）
                            if (fontSize >= 26 || (fontSize >= 22 && (fontWeight === 'bold' || fontWeight >= 700))) {
                                headingLevel = 1; // 一级标题
                            } else if (fontSize >= 20 || (fontSize >= 18 && (fontWeight === 'bold' || fontWeight >= 600))) {
                                headingLevel = 2; // 二级标题
                            } else if (fontSize >= 16 && (fontWeight === 'bold' || fontWeight >= 600)) {
                                // 三级标题：必须同时满足字体大小和加粗
                                headingLevel = 3;
                            }
                            
                            if (headingLevel) {
                                // 🔥 清理标题文本：去除开头的序号
                                // 注意：必须先匹配更具体的模式（如 1.1.1），再匹配通用的模式（如 1.）
                                let cleanText = text
                                    // 去除多级数字序号（带点号）
                                    .replace(/^\d+\.\d+\.\d+[\s\u3000\u00A0]+/, '')   // "1.1.1 "（三级，必须有空格）
                                    .replace(/^\d+\.\d+[\s\u3000\u00A0]+/, '')        // "1.1 "（二级，必须有空格）
                                    .replace(/^\d+\.[\s\u3000\u00A0]+/, '')           // "1. "（一级，必须有空格）
                                    // 去除单独的数字（如果后面有空格或中文）
                                    .replace(/^\d+[\s\u3000\u00A0]+(?=[\u4e00-\u9fa5])/, '')  // "1 替代"（数字+空格+中文）
                                    // 去除中文序号
                                    .replace(/^[一二三四五六七八九十百千万]+[、.][\s\u3000\u00A0]*/, '')  // "一、" 或 "一."
                                    // 去除括号序号
                                    .replace(/^[（(]\d+[)）][\s\u3000\u00A0]*/, '')   // "(1) " 或 "（1）"
                                    // 去除特殊 Unicode 字符（飞书可能使用的标记）
                                    .replace(/^[\u200B-\u200D\uFEFF]+/, '')            // 零宽字符
                                    .replace(/^[•●○◆◇■□▪▫][\s\u3000\u00A0]*/, '')  // 项目符号
                                    .trim();
                                
                                // 如果清理后为空，使用原文本
                                if (!cleanText) {
                                    cleanText = text;
                                }
                                
                                const prefix = '#'.repeat(headingLevel);
                                result = prefix + ' ' + cleanText + '\n\n';
                                
                                if (cleanText !== text) {
                                    console.log(`✅ 识别为 ${headingLevel} 级标题: "${text}" → "${cleanText}"`);
                                } else {
                                    console.log(`✅ 识别为 ${headingLevel} 级标题: "${text}"`);
                                }
                            } else {
                                // 不是标题，按普通段落处理
                                if (node.childNodes.length > 0) {
                                    for (let child of node.childNodes) {
                                        result += await processNode(child);
                                    }
                                } else if (text) {
                                    result = text;
                                }
                                
                                if (result.trim()) {
                                    result += '\n\n';
                                }
                            }
                        } else {
                            // 处理子节点
                            if (node.childNodes.length > 0) {
                                for (let child of node.childNodes) {
                                    result += await processNode(child);
                                }
                            } else if (node.textContent.trim()) {
                                // 如果没有子节点但有文本内容
                                result = node.textContent.trim();
                            }
                            
                            // 只在有内容时添加换行
                            if (result.trim()) {
                                result += '\n\n';
                            }
                        }
                    } catch (e) {
                        console.warn('处理 p/div 标签时出错:', e);
                        // 降级处理：直接使用文本内容
                        if (node.textContent.trim()) {
                            result = node.textContent.trim() + '\n\n';
                        }
                    }
                    break;
                    
                case 'strong':
                case 'b':
                    if (node.textContent.trim()) {
                        result = '**' + node.textContent.trim() + '**';
                    }
                    break;
                    
                case 'em':
                case 'i':
                    if (node.textContent.trim()) {
                        result = '*' + node.textContent.trim() + '*';
                    }
                    break;
                    
                case 'code':
                    if (node.parentElement.tagName.toLowerCase() === 'pre') {
                        result = '```\n' + node.textContent + '\n```\n\n';
                    } else {
                        result = '`' + node.textContent + '`';
                    }
                    break;
                    
                case 'pre':
                    const codeNode = node.querySelector('code');
                    if (codeNode) {
                        result = '```\n' + codeNode.textContent + '\n```\n\n';
                    } else {
                        result = '```\n' + node.textContent + '\n```\n\n';
                    }
                    break;
                    
                case 'a':
                    const href = node.getAttribute('href') || '';
                    const linkText = node.textContent.trim();
                    if (linkText) {
                        result = '[' + linkText + '](' + href + ')';
                    }
                    break;
                    
                case 'img':
                    const src = node.getAttribute('src') || '';
                    const alt = node.getAttribute('alt') || '图片';
                    
                    console.log('处理图片:', { src: src.substring(0, 50), alt });
                    
                    if (!src) {
                        console.warn('图片没有 src 属性');
                        break;
                    }
                    
                    // 检查用户选择的图片处理方式
                    const convertImages = document.getElementById('convertImages')?.checked !== false;
                    const keepUrls = document.getElementById('keepImageUrls')?.checked === true;
                    
                    // 如果是base64图片，直接保留
                    if (src.startsWith('data:image')) {
                        console.log('✅ Base64 图片');
                        result = '![' + alt + '](' + src + ')\n\n';
                    } 
                    // 如果是 HTTP/HTTPS URL（包括飞书图片）
                    else if (src.startsWith('http://') || src.startsWith('https://')) {
                        // 获取用户选择的图片处理模式
                        const imageModeRadios = document.getElementsByName('imageMode');
                        let imageMode = 'upload'; // 默认自动上传
                        for (const radio of imageModeRadios) {
                            if (radio.checked) {
                                imageMode = radio.value;
                                break;
                            }
                        }
                        
                        // 判断是否是飞书图片
                        const isFeishuUrl = src.includes('feishu.cn') || 
                                          src.includes('larksuite.com') || 
                                          src.includes('bytedance.net') ||
                                          src.includes('lf-static.bytednsdoc.com') ||
                                          src.includes('lf1-ttcdn-tos.pstatp.com');
                        
                        if (isFeishuUrl) {
                            console.log('🔄 检测到飞书图片:', src.substring(0, 80));
                            
                            if (imageMode === 'upload') {
                                // 模式1：自动上传 - 先保留URL，稍后在importDocument中统一处理
                                console.log('📌 保留飞书URL，稍后自动上传');
                                result = '![' + alt + '](' + src + ')\n\n';
                            } else if (imageMode === 'base64') {
                                // 模式2：转换为Base64
                                console.log('🔄 转换为Base64...');
                                try {
                                    const base64 = await this.downloadImageToBase64(src);
                                    const sizeMB = (base64.length / (1024 * 1024)).toFixed(2);
                                    console.log(`✅ 飞书图片转换成功，大小: ${sizeMB} MB`);
                                    
                                    if (sizeMB > 1) {
                                        console.warn(`⚠️ 图片较大 (${sizeMB} MB)，建议压缩后重新导入`);
                                    }
                                    
                                    result = '![' + alt + '](' + base64 + ')\n\n';
                                } catch (e) {
                                    console.error('❌ 飞书图片下载失败:', e);
                                    result = `\n> ⚠️ 飞书图片下载失败，请手动上传：${alt}\n\n`;
                                }
                            } else {
                                // 模式3：保留URL
                                console.log('📎 保留飞书 URL');
                                result = '![' + alt + '](' + src + ')\n\n';
                            }
                        }
                        // 非飞书URL，根据用户选择处理
                        else {
                            if (imageMode === 'keep') {
                                console.log('📎 保留原始 URL');
                                result = '![' + alt + '](' + src + ')\n\n';
                            } else if (imageMode === 'base64') {
                                console.log('🔄 下载并转换 URL 图片:', src);
                                try {
                                    const base64 = await this.downloadImageToBase64(src);
                                    const sizeMB = (base64.length / (1024 * 1024)).toFixed(2);
                                    console.log(`✅ URL 图片转换成功，大小: ${sizeMB} MB`);
                                    
                                    if (sizeMB > 1) {
                                        console.warn(`⚠️ 图片较大 (${sizeMB} MB)，建议使用图床`);
                                    }
                                    
                                    result = '![' + alt + '](' + base64 + ')\n\n';
                                } catch (e) {
                                    console.error('❌ URL 图片下载失败:', e);
                                    console.log('⚠️ 保留原始 URL');
                                    result = '![' + alt + '](' + src + ')\n\n';
                                }
                            } else {
                                // 默认保留URL（自动上传模式）
                                result = '![' + alt + '](' + src + ')\n\n';
                            }
                        }
                    }
                    // 如果是 blob URL，尝试转换为 base64
                    else if (src.startsWith('blob:')) {
                        console.log('🔄 转换 Blob URL...');
                        try {
                            const base64 = await this.blobToBase64(src);
                            console.log('✅ Blob 转换成功，长度:', base64.length);
                            result = '![' + alt + '](' + base64 + ')\n\n';
                        } catch (e) {
                            console.error('❌ Blob 转换失败:', e);
                            // 添加占位符，提示用户手动上传
                            result = `\n> ⚠️ 图片需要手动上传：${alt}\n\n`;
                        }
                    }
                    // 相对路径或其他格式
                    else {
                        console.warn('⚠️ 未知图片格式:', src.substring(0, 50));
                        result = `\n> ⚠️ 图片需要手动上传：${alt}\n\n`;
                    }
                    break;
                    
                case 'ul':
                    for (let child of node.children) {
                        if (child.tagName.toLowerCase() === 'li') {
                            result += '- ' + child.textContent.trim() + '\n';
                        }
                    }
                    result += '\n';
                    break;
                    
                case 'ol':
                    let index = 1;
                    for (let child of node.children) {
                        if (child.tagName.toLowerCase() === 'li') {
                            result += index + '. ' + child.textContent.trim() + '\n';
                            index++;
                        }
                    }
                    result += '\n';
                    break;
                    
                case 'blockquote':
                    const lines = node.textContent.trim().split('\n');
                    result = lines.map(line => '> ' + line.trim()).join('\n') + '\n\n';
                    break;
                    
                case 'hr':
                    result = '---\n\n';
                    break;
                    
                case 'br':
                    result = '\n';
                    break;
                    
                case 'table':
                    result = await this.convertTableToMarkdown(node);
                    break;
                    
                case 'span':
                    // span 标签处理子节点或文本
                    if (node.childNodes.length > 0) {
                        for (let child of node.childNodes) {
                            result += await processNode(child);
                        }
                    } else if (node.textContent.trim()) {
                        result = node.textContent;
                    }
                    break;
                    
                default:
                    // 处理其他标签的子节点
                    if (node.childNodes.length > 0) {
                        for (let child of node.childNodes) {
                            result += await processNode(child);
                        }
                    } else if (node.textContent.trim()) {
                        // 如果没有子节点但有文本，直接使用文本
                        result = node.textContent;
                    }
                    break;
            }
            
            return result;
        };
        
        // 处理所有子节点
        try {
            for (let child of element.childNodes) {
                try {
                    const childResult = await processNode(child);
                    if (childResult) {
                        markdown += childResult;
                    }
                } catch (nodeError) {
                    console.error('处理节点出错:', nodeError);
                    // 继续处理其他节点
                }
            }
        } catch (error) {
            console.error('❌ DOM 解析失败:', error);
            // 降级方案：使用简单的文本提取
            console.log('🔄 使用降级方案...');
            return this.simpleHtmlToMarkdown(element);
        }
        
        // 如果 markdown 仍然为空，使用最简单的方法
        if (!markdown.trim()) {
            console.warn('⚠️ DOM 解析结果为空，使用文本提取');
            return this.simpleHtmlToMarkdown(element);
        }
        
        // 清理多余的空行
        markdown = markdown.replace(/\n{3,}/g, '\n\n');
        
        const result = markdown.trim();
        console.log('✅ DOM 解析完成，长度:', result.length);
        console.log('✅ DOM 解析结果前500字符:', result.substring(0, 500));
        
        return result;
    }
    
    // 简单的 HTML 到 Markdown 转换（降级方案）
    simpleHtmlToMarkdown(element) {
        console.log('🔄 使用简单文本提取');
        let markdown = '';
        
        // 获取所有文本内容
        const text = element.textContent || element.innerText || '';
        
        if (!text.trim()) {
            console.warn('⚠️ 没有文本内容');
            return '';
        }
        
        // 按行分割，过滤空行
        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        if (lines.length === 0) {
            return text.trim();
        }
        
        // 简单处理：每行作为段落
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 第一行作为主标题
            if (i === 0) {
                markdown += '# ' + line + '\n\n';
            }
            // 短文本且不以标点结尾，可能是小标题
            else if (line.length < 50 && !line.match(/[。！？.!?]$/)) {
                markdown += '## ' + line + '\n\n';
            }
            // 普通段落
            else {
                markdown += line + '\n\n';
            }
        }
        
        // 处理图片
        const images = element.querySelectorAll('img');
        if (images.length > 0) {
            markdown += '\n## 图片\n\n';
            images.forEach((img, index) => {
                const src = img.getAttribute('src') || '';
                const alt = img.getAttribute('alt') || `图片${index + 1}`;
                if (src) {
                    markdown += `![${alt}](${src})\n\n`;
                }
            });
        }
        
        console.log('✅ 简单提取完成，长度:', markdown.length);
        return markdown;
    }
    
    // 下载图片准备保存到本地
    async downloadImageForLocal(imageUrl, alt) {
        try {
            console.log('下载图片用于本地保存:', imageUrl.substring(0, 80));
            
            const response = await fetch(imageUrl, {
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            console.log('图片下载成功，大小:', blob.size, 'bytes, 类型:', blob.type);
            
            // 生成文件名
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            const ext = this.getImageExtension(blob.type);
            const filename = `feishu_${timestamp}_${random}${ext}`;
            
            // 创建下载链接
            const blobUrl = URL.createObjectURL(blob);
            
            return {
                filename: filename,
                blob: blob,
                blobUrl: blobUrl,
                size: blob.size,
                type: blob.type,
                alt: alt
            };
        } catch (error) {
            console.error('图片下载失败:', error);
            throw error;
        }
    }
    
    // 获取图片扩展名
    getImageExtension(mimeType) {
        const extensions = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg'
        };
        return extensions[mimeType] || '.jpg';
    }
    
    // 下载网络图片并转换为base64
    async downloadImageToBase64(imageUrl) {
        try {
            console.log('下载图片:', imageUrl.substring(0, 80));
            
            // 使用代理或直接fetch（可能遇到CORS问题）
            // 方法1: 尝试直接fetch
            try {
                const response = await fetch(imageUrl, {
                    mode: 'cors',
                    credentials: 'omit'
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const blob = await response.blob();
                console.log('图片下载成功，大小:', blob.size, 'bytes, 类型:', blob.type);
                
                // 不限制文件大小
                console.log('图片大小:', (blob.size / 1024 / 1024).toFixed(2) + 'MB');
                
                return await this.blobToBase64FromBlob(blob);
            } catch (fetchError) {
                console.warn('直接fetch失败，尝试使用img标签方法:', fetchError.message);
                
                // 方法2: 使用img标签和canvas转换（可以绕过某些CORS限制）
                return await this.imageUrlToBase64ViaCanvas(imageUrl);
            }
        } catch (error) {
            console.error('图片下载失败:', error);
            throw error;
        }
    }
    
    // 将blob URL转换为base64
    async blobToBase64(blobUrl) {
        try {
            console.log('Fetching blob:', blobUrl.substring(0, 50));
            const response = await fetch(blobUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            console.log('Blob 大小:', blob.size, 'bytes, 类型:', blob.type);
            
            // 不限制文件大小
            console.log('图片大小:', (blob.size / 1024 / 1024).toFixed(2) + 'MB');
            
            return await this.blobToBase64FromBlob(blob);
        } catch (error) {
            console.error('Blob 转换失败:', error);
            throw error;
        }
    }
    
    // 从Blob对象转换为base64
    async blobToBase64FromBlob(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                console.log('Base64 转换完成');
                resolve(reader.result);
            };
            reader.onerror = (error) => {
                console.error('FileReader 错误:', error);
                reject(error);
            };
            reader.readAsDataURL(blob);
        });
    }
    
    // 使用Canvas将图片URL转换为base64（绕过CORS）
    async imageUrlToBase64ViaCanvas(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            // 设置crossOrigin以尝试获取CORS权限
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    console.log('图片加载成功，尺寸:', img.width, 'x', img.height);
                    
                    // 创建canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // 绘制图片
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    // 转换为base64
                    const base64 = canvas.toDataURL('image/png');
                    console.log('Canvas 转换完成，长度:', base64.length);
                    
                    resolve(base64);
                } catch (error) {
                    console.error('Canvas 转换失败:', error);
                    reject(error);
                }
            };
            
            img.onerror = (error) => {
                console.error('图片加载失败:', error);
                reject(new Error('图片加载失败'));
            };
            
            // 添加时间戳避免缓存问题
            const urlWithTimestamp = imageUrl + (imageUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
            img.src = urlWithTimestamp;
            
            // 设置超时
            setTimeout(() => {
                if (!img.complete) {
                    reject(new Error('图片加载超时'));
                }
            }, 30000); // 30秒超时
        });
    }
    
    // 转换表格为Markdown
    async convertTableToMarkdown(table) {
        let markdown = '\n';
        const rows = table.querySelectorAll('tr');
        
        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('th, td');
            const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());
            
            markdown += '| ' + cellTexts.join(' | ') + ' |\n';
            
            // 添加表头分隔线
            if (rowIndex === 0) {
                markdown += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n';
            }
        });
        
        return markdown + '\n';
    }
    
    // 从Markdown中提取标题
    extractTitle(markdown) {
        const lines = markdown.split('\n');
        
        // 优先查找一级标题（# 标题）
        for (const line of lines) {
            const match = line.match(/^#\s+(.+)$/);
            if (match) {
                const title = match[1].trim();
                // 过滤掉看起来像列表项的标题（以数字开头）
                if (!title.match(/^\d+[\.\、]/)) {
                    console.log('✅ 提取到一级标题:', title);
                    return title;
                }
            }
        }
        
        // 如果没有找到合适的一级标题，查找二级标题
        for (const line of lines) {
            const match = line.match(/^##\s+(.+)$/);
            if (match) {
                const title = match[1].trim();
                // 过滤掉看起来像列表项的标题
                if (!title.match(/^\d+[\.\、]/)) {
                    console.log('✅ 提取到二级标题作为文档标题:', title);
                    return title;
                }
            }
        }
        
        // 如果还是没有，返回第一个标题（任意级别）
        for (const line of lines) {
            const match = line.match(/^#{1,6}\s+(.+)$/);
            if (match) {
                const title = match[1].trim();
                console.log('⚠️ 使用第一个标题:', title);
                return title;
            }
        }
        
        console.warn('⚠️ 未找到标题');
        return null;
    }
    
    // 批量下载图片
    async batchDownloadImages(images) {
        console.log(`开始批量下载 ${images.length} 张图片`);
        
        for (let i = 0; i < images.length; i++) {
            const imageData = images[i];
            try {
                // 创建下载链接
                const a = document.createElement('a');
                a.href = imageData.blobUrl;
                a.download = imageData.filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                
                // 触发下载
                a.click();
                
                // 清理
                document.body.removeChild(a);
                
                console.log(`✅ 下载图片 ${i + 1}/${images.length}: ${imageData.filename}`);
                
                // 延迟一下，避免浏览器阻止多个下载
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`❌ 下载图片失败 ${i + 1}/${images.length}:`, error);
            }
        }
        
        console.log('✅ 批量下载完成');
        
        // 清理Blob URLs
        images.forEach(img => {
            if (img.blobUrl) {
                URL.revokeObjectURL(img.blobUrl);
            }
        });
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
}

// 创建全局实例
const feishuImporter = new FeishuImporter();
window.feishuImporter = feishuImporter;
