// 网易云音乐导入模态框管理
class NeteaseMusicModal {
    constructor() {
        this.modal = null;
        this.currentMusicData = null;
        this.scrollY = 0;
        this.init();
    }

    init() {
        this.createModal();
    }

    createModal() {
        const modalHTML = `
            <div id="neteaseMusicModal" class="modal" style="display: none;">
                <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 850px !important; width: 850px !important;">
                        <div class="modal-header">
                            <h2>🎵 网易云音乐导入</h2>
                            <button class="modal-close" onclick="neteaseMusicModal.close()">×</button>
                        </div>
                        <div class="modal-body">
                        <div id="neteaseStatusMessage" class="netease-status-message"></div>

                        <!-- 输入区域 -->
                        <div class="netease-input-section">
                            <h3>📝 输入歌曲ID</h3>
                            <div class="netease-input-group">
                                <input 
                                    type="text" 
                                    id="neteaseMusicId" 
                                    placeholder="例如：1868553"
                                    onkeypress="if(event.key==='Enter') neteaseMusicModal.fetchMusicInfo()"
                                >
                                <button onclick="neteaseMusicModal.fetchMusicInfo()" id="neteaseFetchBtn">
                                    🔍 获取信息
                                </button>
                            </div>
                            <div class="netease-help-text">
                                💡 <strong>如何获取歌曲ID？</strong><br>
                                1. 打开网易云音乐网页版 (music.163.com)<br>
                                2. 搜索并打开想要的歌曲<br>
                                3. 复制浏览器地址栏中的数字ID<br>
                                例如：https://music.163.com/#/song?id=<strong>1868553</strong>
                            </div>
                        </div>

                        <!-- 预览区域 -->
                        <div id="neteasePreviewSection" class="netease-preview-section">
                            <h3>🎵 歌曲预览</h3>
                            <div id="neteasePreviewContent"></div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('neteaseMusicModal');
        
        // 点击模态框背景关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }

    open() {
        // 检查权限
        if (!window.checkPermission('media', 'upload')) {
            return;
        }
        
        if (!this.modal) {
            console.error('模态框未初始化');
            return;
        }
        
        // 保存当前滚动位置
        this.scrollY = window.scrollY;
        
        // 清空之前的数据
        document.getElementById('neteaseMusicId').value = '';
        document.getElementById('neteasePreviewSection').classList.remove('show');
        this.hideStatus();
        
        // 防止背景滚动
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.scrollY}px`;
        document.body.style.width = '100%';
        
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
            
            this.currentMusicData = null;
        }, 300);
    }

    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('neteaseStatusMessage');
        statusEl.textContent = message;
        statusEl.className = `netease-status-message ${type} show`;
        
        if (type === 'success') {
            setTimeout(() => {
                statusEl.classList.remove('show');
            }, 5000);
        }
    }

    hideStatus() {
        const statusEl = document.getElementById('neteaseStatusMessage');
        statusEl.classList.remove('show');
    }

    async fetchMusicInfo() {
        const musicId = document.getElementById('neteaseMusicId').value.trim();
        
        if (!musicId) {
            this.showStatus('❌ 请输入歌曲ID', 'error');
            return;
        }

        if (!/^\d+$/.test(musicId)) {
            this.showStatus('❌ 歌曲ID必须是纯数字', 'error');
            return;
        }

        const fetchBtn = document.getElementById('neteaseFetchBtn');
        fetchBtn.disabled = true;
        fetchBtn.textContent = '⏳ 获取中...';

        try {
            this.showStatus('🔍 正在获取歌曲信息...', 'info');

            const musicData = await this.getMusicInfo(musicId);
            
            if (musicData) {
                this.currentMusicData = musicData;
                this.displayPreview(musicData);
                this.showStatus('✅ 歌曲信息获取成功！', 'success');
            } else {
                this.showStatus('❌ 获取失败，请检查歌曲ID是否正确', 'error');
            }
        } catch (error) {
            console.error('获取失败:', error);
            this.showStatus('❌ 获取失败: ' + error.message, 'error');
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.textContent = '🔍 获取信息';
        }
    }

    async getMusicInfo(musicId) {
        try {
            // 模拟数据结构（由于跨域限制）
            const mockData = {
                id: musicId,
                name: '歌曲名称（请手动修改）',
                artist: '歌手名称（请手动修改）',
                album: '专辑名称（请手动修改）',
                cover: `https://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg`,
                url: musicId,
                duration: 240,
                lrc: '[00:00.00]歌词获取中...\n[00:05.00]请手动修改歌词',
                description: ''
            };

            // 尝试从网易云获取（可能因跨域失败）
            try {
                const response = await fetch(`https://music.163.com/api/song/detail/?id=${musicId}&ids=[${musicId}]`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.songs && data.songs.length > 0) {
                        const song = data.songs[0];
                        return {
                            id: musicId,
                            name: song.name,
                            artist: song.artists.map(a => a.name).join('/'),
                            album: song.album.name,
                            cover: song.album.picUrl,
                            url: musicId,
                            duration: Math.floor(song.duration / 1000),
                            lrc: await this.getLyrics(musicId),
                            description: ''
                        };
                    }
                }
            } catch (e) {
                console.log('API调用失败，使用模板数据');
            }

            return mockData;
        } catch (error) {
            console.error('获取音乐信息失败:', error);
            throw error;
        }
    }

    async getLyrics(musicId) {
        try {
            const response = await fetch(`https://music.163.com/api/song/lyric?id=${musicId}&lv=1&kv=1&tv=-1`);
            if (response.ok) {
                const data = await response.json();
                return data.lrc?.lyric || '';
            }
        } catch (e) {
            console.log('歌词获取失败');
        }
        return '[00:00.00]歌词获取失败，请手动添加';
    }

    displayPreview(data) {
        const previewSection = document.getElementById('neteasePreviewSection');
        const previewContent = document.getElementById('neteasePreviewContent');

        const audioUrl = `https://music.163.com/song/media/outer/url?id=${data.id}.mp3`;

        previewContent.innerHTML = `
            <div class="music-preview-grid">
                <img src="${data.cover}" alt="${data.name}" class="preview-cover" 
                     onerror="this.src='https://via.placeholder.com/200x200/e74c3c/ffffff?text=🎵'">
                <div class="preview-info">
                    <h4 contenteditable="true" id="editName">${data.name}</h4>
                    <div class="preview-field">
                        🎤 <span contenteditable="true" id="editArtist">${data.artist}</span>
                    </div>
                    <div class="preview-field">
                        💿 <span contenteditable="true" id="editAlbum">${data.album}</span>
                    </div>
                    <div class="preview-field">
                        ⏱️ 时长: <span contenteditable="true" id="editDuration">${data.duration}</span> 秒
                    </div>
                    <div class="preview-audio">
                        <audio controls>
                            <source src="${audioUrl}" type="audio/mpeg">
                            您的浏览器不支持音频播放
                        </audio>
                    </div>
                </div>
            </div>

            <div class="lyrics-preview-box">
                <h4>📜 歌词（可编辑）</h4>
                <pre contenteditable="true" id="editLyrics">${data.lrc}</pre>
            </div>

            <div class="description-box">
                <label>💬 描述（可选）</label>
                <textarea id="editDescription" placeholder="添加歌曲描述、推荐理由等...">${data.description}</textarea>
            </div>

            <div class="info-box">
                <strong>💡 提示：</strong>
                • 所有标记为可编辑的内容都可以直接点击修改<br>
                • 由于跨域限制，部分信息可能需要手动修改<br>
                • 确认信息无误后点击"保存到博客"按钮
            </div>

            <div class="modal-footer" style="margin-top: 1.5rem; padding-top: 0; border-top: none;">
                <button class="netease-btn netease-btn-cancel" onclick="neteaseMusicModal.cancelPreview()">
                    ❌ 取消
                </button>
                <button class="netease-btn netease-btn-save" onclick="neteaseMusicModal.saveToBlog()">
                    💾 保存到博客
                </button>
            </div>
        `;

        previewSection.classList.add('show');
        previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    saveToBlog() {
        if (!this.currentMusicData) return;

        // 获取编辑后的数据
        const musicData = {
            name: document.getElementById('editName').textContent.trim(),
            artist: document.getElementById('editArtist').textContent.trim(),
            album: document.getElementById('editAlbum').textContent.trim(),
            url: this.currentMusicData.id,
            cover: this.currentMusicData.cover,
            duration: parseInt(document.getElementById('editDuration').textContent.trim()),
            lrc: document.getElementById('editLyrics').textContent.trim(),
            description: document.getElementById('editDescription').value.trim()
        };

        // 验证必填项
        if (!musicData.name || !musicData.artist || !musicData.duration) {
            this.showStatus('❌ 请填写完整的歌曲信息', 'error');
            return;
        }

        try {
            // 保存到数据存储
            const result = window.blogDataStore.addMusic(musicData);
            
            this.showStatus(`✅ 保存成功！歌曲《${musicData.name}》已添加到博客`, 'success');
            
            // 延迟关闭模态框
            setTimeout(() => {
                this.close();
                
                // 刷新音乐列表（如果在媒体库页面）
                if (typeof renderMusicTable === 'function') {
                    renderMusicTable();
                }
            }, 1500);
        } catch (error) {
            console.error('保存失败:', error);
            this.showStatus('❌ 保存失败: ' + error.message, 'error');
        }
    }

    cancelPreview() {
        document.getElementById('neteasePreviewSection').classList.remove('show');
        this.currentMusicData = null;
        this.hideStatus();
    }
}

// 初始化
let neteaseMusicModal;
document.addEventListener('DOMContentLoaded', () => {
    neteaseMusicModal = new NeteaseMusicModal();
});
