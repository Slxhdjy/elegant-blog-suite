/**
 * 关于我页面脚本
 * 从系统设置中获取网站描述并显示
 */

class AboutPage {
    constructor() {
        this.init();
    }

    /**
     * 初始化
     */
    async init() {
        try {
            // 禁用音乐播放器初始化（关于我页面不需要）
            window.skipMusicPlayer = true;
            
            await this.loadAboutContent();
        } catch (error) {
            console.error('关于我页面初始化失败:', error);
            this.showDefaultContent();
        }
    }

    /**
     * 加载关于我内容
     */
    async loadAboutContent() {
        try {
            // 从系统设置获取网站描述
            const settings = await this.getSettings();
            
            if (settings && settings.siteDescription) {
                this.renderAboutContent(settings.siteDescription, settings.siteName);
            } else {
                this.showDefaultContent();
            }
        } catch (error) {
            console.error('加载关于我内容失败:', error);
            this.showDefaultContent();
        }
    }

    /**
     * 获取系统设置
     */
    async getSettings() {
        try {
            // 优先从API获取
            if (window.DataAdapter && window.DataAdapter.useApiMode) {
                const apiBase = window.environmentAdapter ? window.environmentAdapter.apiBase : '/api';
                const response = await fetch(`${apiBase}/settings`);
                if (response.ok) {
                    return await response.json();
                }
            }
            
            // 从JSON文件获取
            const response = await fetch('../../data/settings.json');
            if (response.ok) {
                return await response.json();
            }
            
            throw new Error('无法获取系统设置');
        } catch (error) {
            console.error('获取系统设置失败:', error);
            return null;
        }
    }

    /**
     * 渲染关于我内容
     */
    renderAboutContent(description, siteName = '') {
        const contentContainer = document.querySelector('.main-content-box');
        if (!contentContainer) {
            console.error('找不到内容容器');
            return;
        }

        // 处理描述文本，支持换行
        const formattedDescription = this.formatDescription(description);
        
        // 生成内容HTML
        const contentHTML = `
            <h1 style="text-align: center; color: #2c5f7c; margin-bottom: 2rem; 
                border-bottom: 2px solid #f0f0f0; padding-bottom: 2rem; margin-bottom: 2rem; width: 100%;">
                👋 关于${siteName ? ` ${siteName}` : '我'}
            </h1>
            <div class="about-content" style="padding: 2rem; line-height: 2;">
                <div class="about-description" style="color: #5a7a8a; font-size: 1.1rem;">
                    ${formattedDescription}
                </div>
            </div>
        `;

        contentContainer.innerHTML = contentHTML;
    }

    /**
     * 格式化描述文本（支持Markdown）
     */
    formatDescription(description) {
        if (!description) return '';
        
        // 检测是否包含Markdown语法
        const hasMarkdown = /(\*\*.*?\*\*|\*.*?\*|#+ |> |- |\[.*?\]\(.*?\)|`.*?`)/.test(description);
        
        if (hasMarkdown) {
            return this.markdownToHtml(description);
        } else {
            // 简单的换行处理
            const paragraphs = description.split('\n').filter(p => p.trim());
            
            return paragraphs.map(paragraph => {
                const trimmed = paragraph.trim();
                if (!trimmed) return '';
                
                return `<p style="margin-bottom: 1.5rem; text-align: justify;">${trimmed}</p>`;
            }).join('');
        }
    }

    /**
     * 简单的Markdown转HTML
     */
    markdownToHtml(markdown) {
        if (!markdown.trim()) return '';

        let html = markdown;

        // 首先处理文本对齐（在HTML转义之前）
        html = html.replace(/<div class="text-left">(.*?)<\/div>/g, '<div style="text-align: left; margin: 1em 0;">$1</div>');
        html = html.replace(/<div class="text-center">(.*?)<\/div>/g, '<div style="text-align: center; margin: 1em 0;">$1</div>');
        html = html.replace(/<div class="text-right">(.*?)<\/div>/g, '<div style="text-align: right; margin: 1em 0;">$1</div>');

        // 转义HTML标签（但保留我们刚刚添加的对齐div标签）
        html = html.replace(/&/g, '&amp;');
        
        // 临时保护对齐div标签
        const alignDivs = [];
        html = html.replace(/<div style="text-align: (left|center|right); margin: 1em 0;">(.*?)<\/div>/g, (match, align, content) => {
            const placeholder = `__ALIGN_DIV_${alignDivs.length}__`;
            alignDivs.push({ align, content });
            return placeholder;
        });
        
        // 转义其他HTML标签
        html = html.replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');

        // 恢复对齐div标签
        alignDivs.forEach((div, index) => {
            html = html.replace(`__ALIGN_DIV_${index}__`, `<div style="text-align: ${div.align}; margin: 1em 0;">${div.content}</div>`);
        });

        // 标题
        html = html.replace(/^### (.*$)/gm, '<h3 style="color: #2c5f7c; margin: 1.5em 0 0.5em 0; font-size: 1.3em;">$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2 style="color: #2c5f7c; margin: 1.5em 0 0.5em 0; font-size: 1.5em;">$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1 style="color: #2c5f7c; margin: 1.5em 0 0.5em 0; font-size: 1.8em;">$1</h1>');

        // 加粗和斜体
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #2c5f7c; font-weight: 600;">$1</strong>');
        html = html.replace(/__(.*?)__/g, '<strong style="color: #2c5f7c; font-weight: 600;">$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em style="color: #555; font-style: italic;">$1</em>');
        html = html.replace(/_(.*?)_/g, '<em style="color: #555; font-style: italic;">$1</em>');

        // 行内代码
        html = html.replace(/`(.*?)`/g, '<code style="background: #f1f3f4; padding: 2px 6px; border-radius: 4px; font-family: Consolas, Monaco, monospace; font-size: 0.9em; color: #d63384;">$1</code>');

        // 链接
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #007bff; text-decoration: none;">$1</a>');

        // 引用
        html = html.replace(/^> (.*$)/gm, '<blockquote style="margin: 1em 0; padding: 12px 20px; background: #f8f9fa; border-left: 4px solid #007bff; font-style: italic; color: #555;">$1</blockquote>');

        // 无序列表
        html = html.replace(/^- (.*$)/gm, '<li style="margin-bottom: 0.5em;">$1</li>');
        html = html.replace(/^(\* .*$)/gm, '<li style="margin-bottom: 0.5em;">$1</li>');
        
        // 包装列表项
        html = html.replace(/(<li.*?>.*<\/li>)/gs, '<ul style="margin: 1em 0; padding-left: 2em;">$1</ul>');
        
        // 有序列表
        html = html.replace(/^\d+\. (.*$)/gm, '<li style="margin-bottom: 0.5em;">$1</li>');
        
        // 段落处理
        const lines = html.split('\n');
        const processedLines = [];
        let inList = false;
        let inBlockquote = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) {
                if (!inList && !inBlockquote) {
                    processedLines.push('</p><p style="margin-bottom: 1.5rem; text-align: justify;">');
                }
                continue;
            }

            if (line.startsWith('<ul>') || line.startsWith('<ol>')) {
                inList = true;
            } else if (line.startsWith('</ul>') || line.startsWith('</ol>')) {
                inList = false;
            } else if (line.startsWith('<blockquote>')) {
                inBlockquote = true;
            } else if (line.startsWith('</blockquote>')) {
                inBlockquote = false;
            }

            processedLines.push(line);
        }

        html = processedLines.join('\n');
        
        // 包装段落
        if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<ol') && !html.startsWith('<blockquote')) {
            html = '<p style="margin-bottom: 1.5rem; text-align: justify;">' + html + '</p>';
        }

        // 清理多余的段落标签
        html = html.replace(/<p[^>]*><\/p>/g, '');
        html = html.replace(/<p[^>]*>(<h[1-6])/g, '$1');
        html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
        html = html.replace(/<p[^>]*>(<ul>)/g, '$1');
        html = html.replace(/(<\/ul>)<\/p>/g, '$1');
        html = html.replace(/<p[^>]*>(<blockquote>)/g, '$1');
        html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');

        return html;
    }

    /**
     * 显示默认内容
     */
    showDefaultContent() {
        const contentContainer = document.querySelector('.main-content-box');
        if (!contentContainer) return;

        const defaultHTML = `
            <h1 style="text-align: center; color: #2c5f7c; margin-bottom: 2rem; 
                border-bottom: 2px solid #f0f0f0; padding-bottom: 2rem; margin-bottom: 2rem; width: 100%;">
                👋 关于我
            </h1>
            <div class="about-content" style="padding: 2rem; line-height: 2;">
                <p style="color: #5a7a8a; font-size: 1.1rem; text-align: center; margin-bottom: 2rem;">
                    你好，欢迎来到我的博客！
                </p>
                <p style="color: #5a7a8a; margin-bottom: 1rem;">
                    这里是我记录生活、分享知识的小天地。
                </p>
                <p style="color: #999; font-size: 0.9rem; text-align: center; margin-top: 2rem;">
                    <em>提示：可以在后台系统设置中修改网站描述来自定义此页面内容</em>
                </p>
            </div>
        `;

        contentContainer.innerHTML = defaultHTML;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    new AboutPage();
});

// 导出供其他脚本使用
window.AboutPage = AboutPage;