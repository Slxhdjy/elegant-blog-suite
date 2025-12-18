/* ========================================
   留言板功能
   ======================================== */

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    loadGuestbookMessages();
    loadSiteAvatar();
});

// 加载留言列表（异步）
async function loadGuestbookMessages() {
    const messages = await window.blogDataStore.getGuestbookMessages();
    const messagesList = document.getElementById('messagesList');
    const messageCount = document.getElementById('messageCount');
    
    // 计算总留言数（包括回复）
    let totalCount = messages.length;
    for (const message of messages) {
        const replies = await window.blogDataStore.getRepliesByMessage(message.id);
        totalCount += replies.length;
    }
    
    // 更新留言数量
    messageCount.textContent = totalCount;
    
    if (messages.length === 0) {
        messagesList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #999;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">💬</div>
                <p>还没有留言，快来抢沙发吧！</p>
            </div>
        `;
        return;
    }
    
    // 分离置顶和普通留言
    const pinnedMessages = messages.filter(m => m.pinned);
    const normalMessages = messages.filter(m => !m.pinned);
    
    // 渲染留言列表（异步）
    const pinnedHTML = await Promise.all(pinnedMessages.map(msg => renderMessage(msg, true)));
    const normalHTML = await Promise.all(normalMessages.map(msg => renderMessage(msg, false)));
    
    messagesList.innerHTML = [...pinnedHTML, ...normalHTML].join('');
}

// 渲染单条留言（异步）
async function renderMessage(message, isPinned) {
    // 兼容 time 和 createdAt 两种字段名
    const messageTime = message.time || message.createdAt;
    const timeAgo = getTimeAgo(new Date(messageTime));
    const initial = message.author.charAt(0).toUpperCase();
    const replies = await window.blogDataStore.getRepliesByMessage(message.id);
    
    // 检查用户是否已投票
    const likedKey = `guestbook_liked_${message.id}`;
    const dislikedKey = `guestbook_disliked_${message.id}`;
    const hasLiked = localStorage.getItem(likedKey) === 'true';
    const hasDisliked = localStorage.getItem(dislikedKey) === 'true';
    
    return `
        <div class="message-item ${isPinned ? 'pinned' : ''}" data-id="${message.id}" style="
            background: ${isPinned ? 'linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%)' : 'white'};
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            transition: all 0.3s;
            ${isPinned ? 'border: 2px solid #ffc107;' : ''}
        ">
            ${isPinned ? '<div style="color: #ff9800; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;"><span>📌</span><span>置顶留言</span></div>' : ''}
            <div style="display: flex; align-items: flex-start; gap: 1rem;">
                <div style="
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #4fc3f7 0%, #2c5f7c 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 1.2rem;
                    flex-shrink: 0;
                ">${initial}</div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <div>
                            <div style="font-weight: 600; color: #333; font-size: 1.1rem;">${message.author}</div>
                            <div style="font-size: 0.85rem; color: #999; margin-top: 0.25rem;">${timeAgo}</div>
                        </div>
                    </div>
                    <div style="color: #555; line-height: 1.6; margin: 1rem 0;">${escapeHtml(message.content)}</div>
                    <div style="display: flex; gap: 1rem; font-size: 0.9rem; flex-wrap: wrap;">
                        <button onclick="toggleMessageLike(${message.id})" style="
                            display: flex;
                            align-items: center;
                            gap: 0.3rem;
                            background: ${hasLiked ? '#4fc3f7' : 'white'};
                            border: 1px solid ${hasLiked ? '#4fc3f7' : '#e0e0e0'};
                            color: ${hasLiked ? 'white' : '#666'};
                            cursor: pointer;
                            transition: all 0.3s;
                            padding: 0.4rem 0.8rem;
                            border-radius: 15px;
                            font-size: 0.85rem;
                        ">
                            <span>👍</span>
                            <span>${message.likes || 0}</span>
                        </button>
                        <button onclick="toggleMessageDislike(${message.id})" style="
                            display: flex;
                            align-items: center;
                            gap: 0.3rem;
                            background: ${hasDisliked ? '#4fc3f7' : 'white'};
                            border: 1px solid ${hasDisliked ? '#4fc3f7' : '#e0e0e0'};
                            color: ${hasDisliked ? 'white' : '#666'};
                            cursor: pointer;
                            transition: all 0.3s;
                            padding: 0.4rem 0.8rem;
                            border-radius: 15px;
                            font-size: 0.85rem;
                        ">
                            <span>👎</span>
                            <span>${message.dislikes || 0}</span>
                        </button>
                        <button onclick="showReplyForm(${message.id}, '${message.author}')" style="
                            display: flex;
                            align-items: center;
                            gap: 0.3rem;
                            background: white;
                            border: 1px solid #e0e0e0;
                            color: #666;
                            cursor: pointer;
                            transition: all 0.3s;
                            padding: 0.4rem 0.8rem;
                            border-radius: 15px;
                            font-size: 0.85rem;
                        ">
                            <span>💬</span>
                            <span>回复</span>
                        </button>
                    </div>
                    
                    <!-- 回复表单（默认隐藏） -->
                    <div id="replyForm${message.id}" style="display: none; margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #4fc3f7;">
                        <div style="margin-bottom: 0.8rem;">
                            <input type="text" id="replyName${message.id}" placeholder="昵称 *" required style="width: 100%; padding: 0.6rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 0.8rem;">
                            <textarea id="replyContent${message.id}" rows="3" placeholder="回复 @${message.author}..." required style="width: 100%; padding: 0.6rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box; resize: vertical;"></textarea>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="submitReply(${message.id})" style="padding: 0.5rem 1rem; font-size: 0.9rem; background: linear-gradient(135deg, #4fc3f7 0%, #2c5f7c 100%); color: white; border: none; border-radius: 6px; cursor: pointer; transition: all 0.3s;">发表回复</button>
                            <button onclick="hideReplyForm(${message.id})" style="padding: 0.5rem 1rem; font-size: 0.9rem; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; transition: all 0.3s;">取消</button>
                        </div>
                    </div>
                    
                    <!-- 回复列表 -->
                    ${replies.length > 0 ? `
                        <div style="margin-top: 1rem; margin-left: 2rem; padding-left: 1.5rem; border-left: 2px solid #e0e0e0;">
                            ${replies.map(reply => renderReply(reply)).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// 渲染回复
function renderReply(reply) {
    // 兼容 time 和 createdAt 两种字段名
    const replyTime = reply.time || reply.createdAt;
    const timeAgo = getTimeAgo(new Date(replyTime));
    const initial = reply.author.charAt(0).toUpperCase();
    
    // 检查用户是否已投票
    const likedKey = `guestbook_liked_${reply.id}`;
    const dislikedKey = `guestbook_disliked_${reply.id}`;
    const hasLiked = localStorage.getItem(likedKey) === 'true';
    const hasDisliked = localStorage.getItem(dislikedKey) === 'true';
    
    return `
        <div style="padding: 1rem 0; border-bottom: 1px solid #f0f0f0;">
            <div style="display: flex; align-items: flex-start; gap: 0.8rem;">
                <div style="
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #4fc3f7 0%, #2c5f7c 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 0.85rem;
                    flex-shrink: 0;
                ">${initial}</div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
                        <div>
                            <span style="font-weight: 600; color: #333; font-size: 0.95rem;">${reply.author}</span>
                            <span style="font-size: 0.8rem; color: #999; margin-left: 0.5rem;">${timeAgo}</span>
                        </div>
                    </div>
                    <div style="color: #555; line-height: 1.6; margin-bottom: 0.8rem; font-size: 0.95rem;">${escapeHtml(reply.content)}</div>
                    <div style="display: flex; gap: 0.8rem; font-size: 0.85rem;">
                        <button onclick="toggleMessageLike(${reply.id})" style="
                            display: flex;
                            align-items: center;
                            gap: 0.3rem;
                            background: ${hasLiked ? '#4fc3f7' : 'white'};
                            border: 1px solid ${hasLiked ? '#4fc3f7' : '#e0e0e0'};
                            color: ${hasLiked ? 'white' : '#666'};
                            cursor: pointer;
                            transition: all 0.3s;
                            padding: 0.3rem 0.6rem;
                            border-radius: 12px;
                            font-size: 0.8rem;
                        ">
                            <span>👍</span>
                            <span>${reply.likes || 0}</span>
                        </button>
                        <button onclick="toggleMessageDislike(${reply.id})" style="
                            display: flex;
                            align-items: center;
                            gap: 0.3rem;
                            background: ${hasDisliked ? '#4fc3f7' : 'white'};
                            border: 1px solid ${hasDisliked ? '#4fc3f7' : '#e0e0e0'};
                            color: ${hasDisliked ? 'white' : '#666'};
                            cursor: pointer;
                            transition: all 0.3s;
                            padding: 0.3rem 0.6rem;
                            border-radius: 12px;
                            font-size: 0.8rem;
                        ">
                            <span>👎</span>
                            <span>${reply.dislikes || 0}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 提交留言
async function submitGuestbook() {
    const name = document.getElementById('guestName').value.trim();
    const email = document.getElementById('guestEmail').value.trim();
    const content = document.getElementById('guestMessage').value.trim();
    
    // 验证
    if (!name) {
        showNotification('请输入昵称', 'error');
        return;
    }
    
    if (!content) {
        showNotification('请输入留言内容', 'error');
        return;
    }
    
    if (email && !isValidEmail(email)) {
        showNotification('邮箱格式不正确', 'error');
        return;
    }
    
    // 添加留言
    const message = {
        author: name,
        email: email,
        content: content
    };
    
    try {
        await window.blogDataStore.addGuestbookMessage(message);
        
        // 清空表单
        document.getElementById('guestName').value = '';
        document.getElementById('guestEmail').value = '';
        document.getElementById('guestMessage').value = '';
        
        // 重新加载留言列表
        await loadGuestbookMessages();
        
        showNotification('留言发表成功！', 'success');
    } catch (error) {
        console.error('提交留言失败:', error);
        showNotification('留言发表失败，请稍后重试', 'error');
    }
    
    // 滚动到留言列表
    document.getElementById('guestbookList').scrollIntoView({ behavior: 'smooth' });
}

// 显示回复表单
function showReplyForm(messageId, authorName) {
    // 隐藏所有其他回复表单
    document.querySelectorAll('[id^="replyForm"]').forEach(form => {
        form.style.display = 'none';
    });
    
    // 显示当前回复表单
    const replyForm = document.getElementById(`replyForm${messageId}`);
    if (replyForm) {
        replyForm.style.display = 'block';
        document.getElementById(`replyContent${messageId}`).focus();
    }
}

// 隐藏回复表单
function hideReplyForm(messageId) {
    const replyForm = document.getElementById(`replyForm${messageId}`);
    if (replyForm) {
        replyForm.style.display = 'none';
        document.getElementById(`replyName${messageId}`).value = '';
        document.getElementById(`replyContent${messageId}`).value = '';
    }
}

// 提交回复
async function submitReply(parentId) {
    const name = document.getElementById(`replyName${parentId}`).value.trim();
    const content = document.getElementById(`replyContent${parentId}`).value.trim();
    
    // 验证
    if (!name) {
        showNotification('请输入昵称', 'error');
        return;
    }
    
    if (!content) {
        showNotification('请输入回复内容', 'error');
        return;
    }
    
    // 添加回复
    const reply = {
        author: name,
        email: '',
        content: content,
        parentId: parentId // 父留言ID
    };
    
    try {
        await window.blogDataStore.addGuestbookMessage(reply);
        
        // 隐藏表单
        hideReplyForm(parentId);
        
        // 重新加载留言列表
        await loadGuestbookMessages();
        
        showNotification('回复发表成功！', 'success');
    } catch (error) {
        console.error('提交回复失败:', error);
        showNotification('回复发表失败，请稍后重试', 'error');
    }
}

// 留言点赞（点一次+1，再点一次-1，互斥差评）
async function toggleMessageLike(id) {
    const likedKey = `guestbook_liked_${id}`;
    const dislikedKey = `guestbook_disliked_${id}`;
    const hasLiked = localStorage.getItem(likedKey) === 'true';
    const hasDisliked = localStorage.getItem(dislikedKey) === 'true';
    
    // 找到对应的按钮
    const messageItem = document.querySelector(`[data-id="${id}"]`);
    if (!messageItem) {
        console.error('找不到留言元素:', id);
        return;
    }
    
    const likeBtn = messageItem.querySelector(`button[onclick="toggleMessageLike(${id})"]`);
    const dislikeBtn = messageItem.querySelector(`button[onclick="toggleMessageDislike(${id})"]`);
    
    if (!likeBtn || !dislikeBtn) {
        console.error('找不到按钮');
        return;
    }
    
    const likeCountSpan = likeBtn.querySelector('span:last-child');
    const dislikeCountSpan = dislikeBtn.querySelector('span:last-child');
    
    try {
        if (hasLiked) {
            // 已点赞，取消点赞：调用API -1
            await window.blogDataStore.unlikeGuestbookMessage(id);
            
            // 更新UI
            localStorage.removeItem(likedKey);
            likeBtn.style.background = 'white';
            likeBtn.style.borderColor = '#e0e0e0';
            likeBtn.style.color = '#666';
            if (likeCountSpan) {
                likeCountSpan.textContent = Math.max(0, parseInt(likeCountSpan.textContent) - 1);
            }
            
            console.log('✅ 取消点赞成功');
        } else {
            // 如果已经差评，先取消差评
            if (hasDisliked) {
                await window.blogDataStore.undislikeGuestbookMessage(id);
                localStorage.removeItem(dislikedKey);
                dislikeBtn.style.background = 'white';
                dislikeBtn.style.borderColor = '#e0e0e0';
                dislikeBtn.style.color = '#666';
                if (dislikeCountSpan) {
                    dislikeCountSpan.textContent = Math.max(0, parseInt(dislikeCountSpan.textContent) - 1);
                }
                console.log('✅ 自动取消差评');
            }
            
            // 执行点赞：调用API +1
            await window.blogDataStore.likeGuestbookMessage(id);
            
            // 更新UI
            localStorage.setItem(likedKey, 'true');
            likeBtn.style.background = '#4fc3f7';
            likeBtn.style.borderColor = '#4fc3f7';
            likeBtn.style.color = 'white';
            if (likeCountSpan) {
                likeCountSpan.textContent = parseInt(likeCountSpan.textContent) + 1;
            }
            
            console.log('✅ 点赞成功');
        }
    } catch (error) {
        console.error('❌ 点赞操作失败:', error);
    }
}

// 留言差评（点一次+1，再点一次-1，互斥点赞）
async function toggleMessageDislike(id) {
    const likedKey = `guestbook_liked_${id}`;
    const dislikedKey = `guestbook_disliked_${id}`;
    const hasLiked = localStorage.getItem(likedKey) === 'true';
    const hasDisliked = localStorage.getItem(dislikedKey) === 'true';
    
    // 找到对应的按钮
    const messageItem = document.querySelector(`[data-id="${id}"]`);
    if (!messageItem) {
        console.error('找不到留言元素:', id);
        return;
    }
    
    const likeBtn = messageItem.querySelector(`button[onclick="toggleMessageLike(${id})"]`);
    const dislikeBtn = messageItem.querySelector(`button[onclick="toggleMessageDislike(${id})"]`);
    
    if (!likeBtn || !dislikeBtn) {
        console.error('找不到按钮');
        return;
    }
    
    const likeCountSpan = likeBtn.querySelector('span:last-child');
    const dislikeCountSpan = dislikeBtn.querySelector('span:last-child');
    
    try {
        if (hasDisliked) {
            // 已差评，取消差评：调用API -1
            await window.blogDataStore.undislikeGuestbookMessage(id);
            
            // 更新UI
            localStorage.removeItem(dislikedKey);
            dislikeBtn.style.background = 'white';
            dislikeBtn.style.borderColor = '#e0e0e0';
            dislikeBtn.style.color = '#666';
            if (dislikeCountSpan) {
                dislikeCountSpan.textContent = Math.max(0, parseInt(dislikeCountSpan.textContent) - 1);
            }
            
            console.log('✅ 取消差评成功');
        } else {
            // 如果已经点赞，先取消点赞
            if (hasLiked) {
                await window.blogDataStore.unlikeGuestbookMessage(id);
                localStorage.removeItem(likedKey);
                likeBtn.style.background = 'white';
                likeBtn.style.borderColor = '#e0e0e0';
                likeBtn.style.color = '#666';
                if (likeCountSpan) {
                    likeCountSpan.textContent = Math.max(0, parseInt(likeCountSpan.textContent) - 1);
                }
                console.log('✅ 自动取消点赞');
            }
            
            // 执行差评：调用API +1
            await window.blogDataStore.dislikeGuestbookMessage(id);
            
            // 更新UI
            localStorage.setItem(dislikedKey, 'true');
            dislikeBtn.style.background = '#4fc3f7';
            dislikeBtn.style.borderColor = '#4fc3f7';
            dislikeBtn.style.color = 'white';
            if (dislikeCountSpan) {
                dislikeCountSpan.textContent = parseInt(dislikeCountSpan.textContent) + 1;
            }
            
            console.log('✅ 差评成功');
        }
    } catch (error) {
        console.error('❌ 差评操作失败:', error);
    }
}

// 验证邮箱
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 计算时间差
function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) {
        return '刚刚';
    } else if (minutes < 60) {
        return `${minutes}分钟前`;
    } else if (hours < 24) {
        return `${hours}小时前`;
    } else if (days < 30) {
        return `${days}天前`;
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 显示通知
function showNotification(message, type = 'info') {
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

// 加载网站头像
async function loadSiteAvatar() {
    if (window.blogDataStore) {
        const settings = await window.blogDataStore.getSettings();
        if (settings && settings.avatar) {
            const avatarEl = document.getElementById('siteAvatar');
            if (avatarEl) {
                avatarEl.src = settings.avatar;
            }
        }
    }
}
