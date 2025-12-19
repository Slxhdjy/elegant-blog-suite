// 重要事项管理器
class EventsManager {
    constructor() {
        this.events = [];
        this.autoScrollInterval = null;
        this.init();
    }

    async init() {
        await this.loadEvents();
        this.renderEvents();
    }

    // 从API加载事件
    async loadEvents() {
        try {
            console.log('📡 正在加载重要事项...');
            
            // 使用环境适配器获取数据
            if (window.environmentAdapter) {
                this.events = await window.environmentAdapter.getData('events');
                console.log(`✅ 通过环境适配器加载了 ${this.events.length} 个重要事项`);
                return;
            }
            
            // 降级到直接API调用
            const apiBase = window.environmentAdapter ? window.environmentAdapter.apiBase : '/api';
            const response = await fetch(`${apiBase}/events`);
            
            if (!response.ok) {
                console.error('❌ HTTP错误:', response.status, response.statusText);
                this.events = [];
                return;
            }
            
            const text = await response.text();
            console.log('📥 服务器响应:', text);
            
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                console.error('❌ 无法解析JSON响应:', text);
                this.events = [];
                return;
            }
            
            if (result.success) {
                this.events = result.data || [];
                console.log(`✅ 加载了 ${this.events.length} 个重要事项`);
            } else {
                console.error('❌ 加载重要事项失败:', result.message);
                this.events = [];
            }
        } catch (error) {
            console.error('❌ 加载重要事项出错:', error);
            this.events = [];
        }
    }

    renderEvents() {
        const eventsList = document.getElementById('eventsList');
        const container = document.getElementById('eventsListContainer');
        
        if (!eventsList) return;

        // 停止之前的自动滚动
        if (this.autoScrollInterval) {
            cancelAnimationFrame(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }

        // 按时间排序
        const sortedEvents = [...this.events].sort((a, b) => new Date(a.date) - new Date(b.date));

        if (sortedEvents.length === 0) {
            eventsList.innerHTML = '<div style="text-align: center; color: #999; padding: 2rem;">暂无事项</div>';
            return;
        }

        const html = sortedEvents.map((event, index) => {
            const countdown = this.calculateCountdown(event.date);
            const priorityClass = event.priority || 'low';
            const completedClass = event.completed ? 'completed' : '';
            
            return `
                <div class="event-item priority-${priorityClass} ${completedClass}">
                    <div class="event-header">
                        <div class="event-title">${event.title}</div>
                        <span class="event-priority ${priorityClass}">
                            ${priorityClass === 'high' ? '重要' : priorityClass === 'medium' ? '一般' : '普通'}
                        </span>
                    </div>
                    <div class="event-body">${event.description || '无描述'}</div>
                    <div class="event-footer">
                        <div class="event-countdown ${countdown.urgent ? 'urgent' : ''}">${countdown.text}</div>
                        <div class="event-actions">
                            <button class="event-action-btn" onclick="eventsManager.toggleEventComplete(${index})" title="${event.completed ? '标记未完成' : '标记完成'}">
                                ${event.completed ? '↩️' : '✅'}
                            </button>
                            <button class="event-action-btn" onclick="eventsManager.deleteEvent(${index})" title="删除">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        eventsList.innerHTML = html;
        
        // 检查是否需要自动滚动
        setTimeout(() => {
            if (container && eventsList) {
                const containerHeight = container.offsetHeight;
                const listHeight = eventsList.scrollHeight;
                
                // 如果内容超出容器，启动自动滚动
                if (listHeight > containerHeight) {
                    this.startAutoScroll(container);
                }
            }
        }, 100);
    }

    startAutoScroll(container) {
        if (!container) return;
        
        // 停止之前的滚动
        if (this.autoScrollInterval) {
            cancelAnimationFrame(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }
        
        // 检查是否真的需要滚动
        const maxScroll = container.scrollHeight - container.clientHeight;
        
        if (maxScroll <= 0) return;
        
        let direction = 1; // 1: 向下, -1: 向上
        let isPaused = false;
        const speed = 1; // 滚动速度（像素/帧）
        
        // 移除旧的事件监听器
        if (this.scrollMouseEnter) {
            container.removeEventListener('mouseenter', this.scrollMouseEnter);
        }
        if (this.scrollMouseLeave) {
            container.removeEventListener('mouseleave', this.scrollMouseLeave);
        }
        
        // 创建新的事件监听器
        this.scrollMouseEnter = () => { isPaused = true; };
        this.scrollMouseLeave = () => { isPaused = false; };
        
        container.addEventListener('mouseenter', this.scrollMouseEnter);
        container.addEventListener('mouseleave', this.scrollMouseLeave);
        
        const scroll = () => {
            if (!isPaused && container) {
                const maxScroll = container.scrollHeight - container.clientHeight;
                const currentScroll = container.scrollTop;
                
                if (direction === 1) {
                    // 向下滚动
                    if (currentScroll >= maxScroll - 2) {
                        direction = -1;
                    } else {
                        container.scrollTop += speed;
                    }
                } else {
                    // 向上滚动
                    if (currentScroll <= 2) {
                        direction = 1;
                    } else {
                        container.scrollTop -= speed;
                    }
                }
            }
            
            this.autoScrollInterval = requestAnimationFrame(scroll);
        };
        
        this.autoScrollInterval = requestAnimationFrame(scroll);
    }

    calculateCountdown(dateStr) {
        const now = new Date();
        const target = new Date(dateStr);
        const diff = target - now;
        
        if (diff < 0) {
            return { text: '已过期', urgent: true };
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days === 0) {
            return { text: `今天 ${hours}小时后`, urgent: true };
        } else if (days === 1) {
            return { text: '明天', urgent: true };
        } else if (days <= 7) {
            return { text: `${days}天后`, urgent: true };
        } else {
            return { text: `${days}天后`, urgent: false };
        }
    }

    showEventModal() {
        // 检查权限
        if (!window.checkPermission('events', 'create')) {
            return;
        }
        
        const modal = document.getElementById('eventModal');
        if (!modal) {
            this.createEventModal();
        }
        document.getElementById('eventModal').classList.add('show');
    }

    hideEventModal() {
        document.getElementById('eventModal').classList.remove('show');
        document.getElementById('eventForm').reset();
    }

    createEventModal() {
        const modalHTML = `
            <div id="eventModal" class="event-modal">
                <div class="event-modal-content">
                    <div class="event-modal-header">添加重要事项</div>
                    <form id="eventForm">
                        <div class="event-form-group">
                            <label class="event-form-label">标题 *</label>
                            <input type="text" class="event-form-input" name="title" required>
                        </div>
                        <div class="event-form-group">
                            <label class="event-form-label">时间 *</label>
                            <input type="datetime-local" class="event-form-input" name="date" required>
                        </div>
                        <div class="event-form-group">
                            <label class="event-form-label">重要程度</label>
                            <select class="event-form-select" name="priority">
                                <option value="low">普通</option>
                                <option value="medium">一般</option>
                                <option value="high">重要</option>
                            </select>
                        </div>
                        <div class="event-form-group">
                            <label class="event-form-label">描述</label>
                            <textarea class="event-form-textarea" name="description"></textarea>
                        </div>
                        <div class="event-modal-footer">
                            <button type="submit" class="btn-modal btn-modal-primary">保存</button>
                            <button type="button" class="btn-modal btn-modal-secondary" onclick="eventsManager.hideEventModal()">取消</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 绑定表单提交事件
        const form = document.getElementById('eventForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEvent(e);
        });
        
        // 点击背景关闭
        document.getElementById('eventModal').addEventListener('click', (e) => {
            if (e.target.id === 'eventModal') {
                this.hideEventModal();
            }
        });
    }

    async saveEvent(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        const event = {
            id: Date.now(),
            title: formData.get('title'),
            date: formData.get('date'),
            priority: formData.get('priority'),
            description: formData.get('description'),
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        this.events.push(event);
        const saved = await this.saveEventsToAPI();
        
        if (saved) {
            this.renderEvents();
            this.hideEventModal();
        } else {
            alert('保存失败，请重试');
            this.events.pop(); // 回滚
        }
    }

    async toggleEventComplete(index) {
        if (!this.events || this.events.length === 0) return;
        
        const sortedEvents = [...this.events].sort((a, b) => new Date(a.date) - new Date(b.date));
        const event = sortedEvents[index];
        
        if (!event) return;
        
        const originalIndex = this.events.findIndex(e => e.id === event.id);
        
        if (originalIndex !== -1) {
            const oldValue = this.events[originalIndex].completed;
            this.events[originalIndex].completed = !oldValue;
            
            const saved = await this.saveEventsToAPI();
            if (saved) {
                this.renderEvents();
            } else {
                this.events[originalIndex].completed = oldValue; // 回滚
                alert('更新失败，请重试');
            }
        }
    }

    async deleteEvent(index) {
        if (!confirm('确定要删除这个事项吗？')) return;
        
        if (!this.events || this.events.length === 0) return;
        
        const sortedEvents = [...this.events].sort((a, b) => new Date(a.date) - new Date(b.date));
        const event = sortedEvents[index];
        
        if (!event) return;
        
        const originalIndex = this.events.findIndex(e => e.id === event.id);
        
        if (originalIndex !== -1) {
            const deletedEvent = this.events.splice(originalIndex, 1)[0];
            
            const saved = await this.saveEventsToAPI();
            if (saved) {
                this.renderEvents();
            } else {
                this.events.splice(originalIndex, 0, deletedEvent); // 回滚
                alert('删除失败，请重试');
            }
        }
    }

    // 保存事件到API
    async saveEventsToAPI() {
        try {
            console.log('💾 正在保存重要事项...');
            
            // 在Vercel环境下，只使用环境适配器，不回退
            if (window.environmentAdapter && window.environmentAdapter.environment === 'vercel') {
                console.log('🌐 Vercel环境：使用环境适配器保存重要事项');
                const result = await window.environmentAdapter.saveData('events', this.events);
                if (result.success) {
                    console.log('✅ 通过环境适配器保存重要事项成功');
                    return true;
                } else {
                    console.error('❌ 环境适配器保存失败:', result.message);
                    throw new Error(result.message || '保存重要事项失败');
                }
            }
            
            // 非Vercel环境：使用环境适配器或直接API调用
            if (window.environmentAdapter && window.environmentAdapter.supportsWrite) {
                const result = await window.environmentAdapter.saveData('events', this.events);
                if (result.success) {
                    console.log('✅ 通过环境适配器保存重要事项成功');
                    return true;
                } else {
                    console.error('❌ 环境适配器保存失败:', result.message);
                    return false;
                }
            }
            
            // 降级到直接API调用
            const apiBase = window.environmentAdapter ? window.environmentAdapter.apiBase : '/api';
            const response = await fetch(`${apiBase}/events/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.events)
            });
            
            // 检查响应状态
            if (!response.ok) {
                console.error('❌ HTTP错误:', response.status, response.statusText);
                return false;
            }
            
            // 获取响应文本
            const text = await response.text();
            console.log('📥 服务器响应:', text);
            
            // 尝试解析JSON
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                console.error('❌ 无法解析JSON响应:', text);
                return false;
            }
            
            if (result.success) {
                console.log('✅ 重要事项保存成功');
                return true;
            } else {
                console.error('❌ 保存重要事项失败:', result.message);
                return false;
            }
        } catch (error) {
            console.error('❌ 保存重要事项出错:', error);
            return false;
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 等待环境适配器初始化完成
    if (window.environmentAdapter) {
        window.eventsManager = new EventsManager();
    } else {
        // 如果环境适配器还没加载，等待一下
        setTimeout(() => {
            window.eventsManager = new EventsManager();
        }, 100);
    }
});
