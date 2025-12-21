// Vercel通用资源API - 处理所有数据类型的CRUD操作
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { method, query } = req;
  const { resource, id } = query;

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 确保请求体被正确解析
  let requestBody = req.body;
  
  // 如果没有请求体但需要请求体的操作，返回错误
  if ((method === 'POST' || method === 'PUT') && !requestBody) {
    console.error('缺少请求体');
    return res.status(400).json({ success: false, error: '缺少请求体数据' });
  }
  
  if (typeof requestBody === 'string') {
    try {
      requestBody = JSON.parse(requestBody);
    } catch (error) {
      console.error('JSON解析错误:', error);
      return res.status(400).json({ success: false, error: '无效的JSON格式' });
    }
  }
  
  // 记录请求详情用于调试
  console.log('API请求详情:', {
    method,
    resource,
    id,
    url: req.url,
    hasBody: !!requestBody,
    bodyType: typeof requestBody,
    hasKvEnv: !!process.env.KV_REST_API_URL
  });

  // 验证资源类型
  const allowedResources = [
    'articles', 'categories', 'tags', 'comments', 'guestbook',
    'users', 'images', 'music', 'videos', 'links', 'apps', 
    'resumes', 'events', 'settings'
  ];

  if (!allowedResources.includes(resource)) {
    return res.status(400).json({ success: false, error: '不支持的资源类型' });
  }

  // 检查KV环境变量
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error('KV环境变量未配置');
    return res.status(500).json({ 
      success: false, 
      error: 'KV数据库未配置，请检查环境变量',
      details: {
        hasUrl: !!process.env.KV_REST_API_URL,
        hasToken: !!process.env.KV_REST_API_TOKEN
      }
    });
  }

  try {
    switch (method) {
      case 'GET':
        if (id) {
          // 获取单个项目
          const items = await kv.get(resource) || [];
          
          if (resource === 'settings') {
            // settings是对象，不是数组
            const settings = await kv.get('settings');
            if (!settings) {
              return res.status(404).json({ 
                success: false, 
                error: '设置数据不存在',
                code: 'SETTINGS_NOT_FOUND'
              });
            }
            return res.json({ success: true, data: settings });
          }
          
          const item = items.find(i => String(i.id) === String(id));
          
          if (item) {
            return res.json({ success: true, data: item });
          } else {
            return res.status(404).json({ success: false, error: '项目未找到' });
          }
        } else {
          // 获取所有项目
          if (resource === 'settings') {
            const settings = await kv.get('settings');
            if (!settings) {
              return res.status(404).json({ 
                success: false, 
                error: '设置数据不存在',
                code: 'SETTINGS_NOT_FOUND'
              });
            }
            return res.json({ success: true, data: settings });
          } else {
            const items = await kv.get(resource) || [];
            return res.json({ success: true, data: items });
          }
        }

      case 'POST':
        console.log('POST请求详情:', { url: req.url, resource, id, query, body: requestBody });
        
        // 🔥 处理统计增量操作 - 支持查询参数格式
        const action = query.action || id;
        
        if (resource === 'settings' && action === 'increment-views') {
          console.log('📊 增加访问量');
          const settings = await kv.get('settings') || {};
          settings.totalViews = (settings.totalViews || 0) + 1;
          await kv.set('settings', settings);
          console.log('📊 访问量更新成功:', settings.totalViews);
          return res.json({ success: true, totalViews: settings.totalViews });
        }
        
        if (resource === 'settings' && action === 'increment-visitors') {
          console.log('📊 增加访客数');
          const settings = await kv.get('settings') || {};
          settings.totalVisitors = (settings.totalVisitors || 0) + 1;
          await kv.set('settings', settings);
          console.log('📊 访客数更新成功:', settings.totalVisitors);
          return res.json({ success: true, totalVisitors: settings.totalVisitors });
        }
        
        // 🔥 处理文章浏览量增加 - 支持查询参数格式
        if (resource === 'articles' && (action === 'view' || id === 'view')) {
          // URL格式: /api/articles?action=view&articleId=xxx
          const articleId = query.articleId;
          if (!articleId) {
            return res.status(400).json({ success: false, error: '缺少文章ID' });
          }
          
          console.log('📊 增加文章浏览量:', articleId);
          const articles = await kv.get('articles') || [];
          const articleIndex = articles.findIndex(a => String(a.id) === String(articleId));
          
          if (articleIndex !== -1) {
            articles[articleIndex].views = (articles[articleIndex].views || 0) + 1;
            await kv.set('articles', articles);
            console.log('📊 文章浏览量更新成功:', articles[articleIndex].views);
            return res.json({ success: true, views: articles[articleIndex].views });
          } else {
            return res.status(404).json({ success: false, error: '文章未找到' });
          }
        }
        
        // 🔥 处理留言点赞/差评 - 支持 action 和 id 两种格式
        const guestbookAction = query.action || id;
        if (resource === 'guestbook' && ['like', 'unlike', 'dislike', 'undislike'].includes(guestbookAction)) {
          const messageId = query.messageId;
          if (!messageId) {
            return res.status(400).json({ success: false, error: '缺少留言ID' });
          }
          
          console.log(`📊 留言${guestbookAction}操作:`, messageId);
          const messages = await kv.get('guestbook') || [];
          const messageIndex = messages.findIndex(m => String(m.id) === String(messageId));
          
          if (messageIndex !== -1) {
            const message = messages[messageIndex];
            
            switch (guestbookAction) {
              case 'like':
                message.likes = (message.likes || 0) + 1;
                break;
              case 'unlike':
                message.likes = Math.max(0, (message.likes || 0) - 1);
                break;
              case 'dislike':
                message.dislikes = (message.dislikes || 0) + 1;
                break;
              case 'undislike':
                message.dislikes = Math.max(0, (message.dislikes || 0) - 1);
                break;
            }
            
            await kv.set('guestbook', messages);
            return res.json({ success: true, data: message });
          } else {
            return res.status(404).json({ success: false, error: '留言未找到' });
          }
        }
        
        // 🔥 处理评论点赞/差评 - 支持 action 和 id 两种格式
        const commentAction = query.action || id;
        if (resource === 'comments' && ['like', 'unlike', 'dislike', 'undislike'].includes(commentAction)) {
          const commentId = query.commentId;
          if (!commentId) {
            return res.status(400).json({ success: false, error: '缺少评论ID' });
          }
          
          console.log(`📊 评论${commentAction}操作:`, commentId);
          const comments = await kv.get('comments') || [];
          const commentIndex = comments.findIndex(c => String(c.id) === String(commentId));
          
          if (commentIndex !== -1) {
            const comment = comments[commentIndex];
            
            switch (commentAction) {
              case 'like':
                comment.likes = (comment.likes || 0) + 1;
                break;
              case 'unlike':
                comment.likes = Math.max(0, (comment.likes || 0) - 1);
                break;
              case 'dislike':
                comment.dislikes = (comment.dislikes || 0) + 1;
                break;
              case 'undislike':
                comment.dislikes = Math.max(0, (comment.dislikes || 0) - 1);
                break;
            }
            
            await kv.set('comments', comments);
            return res.json({ success: true, data: comment });
          } else {
            return res.status(404).json({ success: false, error: '评论未找到' });
          }
        }
        
        // 🔥 处理文章点赞
        const articleAction = query.action || id;
        if (resource === 'articles' && ['like', 'unlike'].includes(articleAction)) {
          const articleId = query.articleId;
          if (!articleId) {
            return res.status(400).json({ success: false, error: '缺少文章ID' });
          }
          
          console.log(`📊 文章${articleAction}操作:`, articleId);
          const articles = await kv.get('articles') || [];
          const articleIndex = articles.findIndex(a => String(a.id) === String(articleId));
          
          if (articleIndex !== -1) {
            const article = articles[articleIndex];
            
            switch (articleAction) {
              case 'like':
                article.likes = (article.likes || 0) + 1;
                break;
              case 'unlike':
                article.likes = Math.max(0, (article.likes || 0) - 1);
                break;
            }
            
            await kv.set('articles', articles);
            return res.json({ success: true, data: article, likes: article.likes });
          } else {
            return res.status(404).json({ success: false, error: '文章未找到' });
          }
        }
        
        // 处理用户登录验证
        if (resource === 'users' && requestBody.action === 'validate_login') {
          console.log('🔐 处理用户登录验证');
          const { username, password } = requestBody;
          
          if (!username || !password) {
            return res.status(400).json({ 
              success: false, 
              message: '用户名和密码不能为空' 
            });
          }
          
          const users = await kv.get('users') || [];
          const user = users.find(u => u.username === username);
          
          if (!user) {
            return res.json({
              success: false,
              message: '用户名不存在'
            });
          }
          
          if (user.status !== 'active') {
            return res.json({
              success: false,
              message: '用户已被禁用'
            });
          }
          
          if (user.password !== password) {
            return res.json({
              success: false,
              message: '密码错误'
            });
          }
          
          console.log('✅ 用户登录验证成功:', username);
          return res.json({
            success: true,
            message: '登录成功',
            user: {
              username: user.username,
              role: user.role,
              displayName: user.displayName,
              email: user.email
            }
          });
        }
        
        // 处理修改密码
        if (resource === 'users' && requestBody.action === 'change_password') {
          console.log('🔐 处理修改密码');
          const { username, oldPassword, newPassword } = requestBody;
          
          if (!username || !oldPassword || !newPassword) {
            return res.status(400).json({ 
              success: false, 
              message: '用户名、旧密码和新密码不能为空' 
            });
          }
          
          if (newPassword.length < 6) {
            return res.json({
              success: false,
              message: '新密码至少需要6位'
            });
          }
          
          const users = await kv.get('users') || [];
          const userIndex = users.findIndex(u => u.username === username);
          
          if (userIndex === -1) {
            return res.json({
              success: false,
              message: '用户不存在'
            });
          }
          
          const user = users[userIndex];
          
          if (user.status !== 'active') {
            return res.json({
              success: false,
              message: '用户已被禁用'
            });
          }
          
          if (user.password !== oldPassword) {
            return res.json({
              success: false,
              message: '当前密码错误'
            });
          }
          
          // 更新密码
          users[userIndex] = {
            ...user,
            password: newPassword,
            updatedAt: new Date().toISOString()
          };
          
          await kv.set('users', users);
          
          console.log('✅ 用户密码修改成功:', username);
          return res.json({
            success: true,
            message: '密码修改成功'
          });
        }
        
        // 检查是否为批量操作 - 通过query参数或URL路径
        const isBatchOperation = req.url.includes('/batch') || query.batch === 'true' || requestBody.isBatch === true;
        
        if (isBatchOperation) {
          // 批量导入
          console.log('执行批量导入操作');
          const data = requestBody.isBatch ? requestBody.data : requestBody;
          await kv.set(resource, data);
          const count = Array.isArray(data) ? data.length : 1;
          return res.json({ 
            success: true, 
            message: `成功导入 ${count} 条数据`,
            count 
          });
        } else {
          // 创建新项目
          console.log('执行创建新项目操作');
          
          if (resource === 'settings') {
            // settings直接更新
            console.log('更新settings');
            await kv.set('settings', requestBody);
            return res.json({ success: true, data: requestBody });
          }
          
          const items = await kv.get(resource) || [];
          console.log(`当前${resource}数据:`, items.length, '条');
          
          // 生成新ID - 改进版，避免ID冲突
          let newId;
          if (resource === 'users') {
            // 用户使用特殊格式
            newId = `user_${Date.now()}`;
          } else {
            // 其他资源使用数字ID，但确保唯一性
            let maxId = 0;
            items.forEach(item => {
              const itemId = parseInt(item.id) || 0;
              if (itemId > maxId) {
                maxId = itemId;
              }
            });
            newId = String(maxId + 1);
            
            // 双重检查确保ID唯一
            while (items.some(item => String(item.id) === newId)) {
              newId = String(parseInt(newId) + 1);
            }
          }
          console.log('生成新ID:', newId);
          
          // 数据验证和清理
          const validatedData = validateAndCleanData(resource, requestBody);
          if (!validatedData.valid) {
            return res.status(400).json({ 
              success: false, 
              error: `数据验证失败: ${validatedData.error}` 
            });
          }
          
          const newItem = {
            id: newId,
            ...validatedData.data,
            createdAt: new Date().toISOString()
          };
          
          items.push(newItem);
          await kv.set(resource, items);
          console.log(`${resource}保存成功，新增项目:`, newItem);
          
          return res.json({ success: true, data: newItem });
        }

      case 'PUT':
        console.log('PUT请求详情:', { resource, id, body: requestBody });
        
        if (resource === 'settings') {
          // 🔥 设置更新 - 区分前台统计更新和后台完整更新
          const existingSettings = await kv.get('settings') || {};
          
          // 检查是否是前台统计更新（只包含统计字段）
          const statsOnlyFields = ['totalViews', 'totalVisitors', 'totalWords'];
          const requestFields = Object.keys(requestBody);
          const isStatsOnlyUpdate = requestFields.every(field => 
            statsOnlyFields.includes(field) || field === 'updatedAt'
          );
          
          // 检查是否有 adminUpdate 标记（后台完整更新）
          const isAdminUpdate = requestBody._adminUpdate === true;
          
          console.log('设置更新检查:', { 
            requestFields, 
            isStatsOnlyUpdate, 
            isAdminUpdate,
            existingSettingsKeys: Object.keys(existingSettings)
          });
          
          let updatedSettings;
          
          if (isStatsOnlyUpdate) {
            // 前台统计更新：只更新统计字段，保留其他设置
            console.log('📊 前台统计更新模式');
            updatedSettings = {
              ...existingSettings,
              totalViews: requestBody.totalViews ?? existingSettings.totalViews,
              totalVisitors: requestBody.totalVisitors ?? existingSettings.totalVisitors,
              totalWords: requestBody.totalWords ?? existingSettings.totalWords,
              updatedAt: new Date().toISOString()
            };
          } else if (isAdminUpdate) {
            // 后台完整更新：允许更新所有字段
            console.log('🔧 后台完整更新模式');
            const { _adminUpdate, ...cleanedBody } = requestBody; // 移除标记字段
            updatedSettings = {
              ...existingSettings,
              ...cleanedBody,
              updatedAt: new Date().toISOString()
            };
          } else {
            // 默认：合并更新，但保护关键字段不被清空
            console.log('⚠️ 默认合并更新模式');
            const protectedFields = ['siteName', 'siteDescription', 'avatar', 'startDate', 'theme', 'frontendTheme'];
            updatedSettings = { ...existingSettings };
            
            for (const [key, value] of Object.entries(requestBody)) {
              // 如果是受保护字段且新值为空，保留原值
              if (protectedFields.includes(key) && (value === null || value === undefined || value === '')) {
                console.log(`保护字段 ${key}，保留原值:`, existingSettings[key]);
                continue;
              }
              updatedSettings[key] = value;
            }
            updatedSettings.updatedAt = new Date().toISOString();
          }
          
          await kv.set('settings', updatedSettings);
          console.log('✅ 设置更新成功');
          return res.json({ success: true, data: updatedSettings });
        }
        
        // 更新项目
        const items = await kv.get(resource) || [];
        console.log(`当前${resource}数据:`, items.length, '条');
        
        const index = items.findIndex(i => String(i.id) === String(id));
        console.log('查找项目索引:', index, '目标ID:', id);
        
        if (index !== -1) {
          // 数据验证和清理
          const validatedData = validateAndCleanData(resource, requestBody);
          if (!validatedData.valid) {
            return res.status(400).json({ 
              success: false, 
              error: `数据验证失败: ${validatedData.error}` 
            });
          }
          
          const originalItem = items[index];
          items[index] = {
            ...originalItem,
            ...validatedData.data,
            updatedAt: new Date().toISOString()
          };
          
          await kv.set(resource, items);
          console.log(`${resource}更新成功:`, items[index]);
          return res.json({ success: true, data: items[index] });
        } else {
          console.log('项目未找到，可用ID:', items.map(i => i.id));
          return res.status(404).json({ success: false, error: '项目未找到' });
        }

      case 'DELETE':
        console.log('DELETE请求详情:', { resource, id });
        
        if (resource === 'settings') {
          return res.status(400).json({ success: false, error: '不能删除设置' });
        }
        
        // 删除项目
        let allItems = await kv.get(resource) || [];
        console.log(`删除前${resource}数据:`, allItems.length, '条');
        
        const originalLength = allItems.length;
        allItems = allItems.filter(i => String(i.id) !== String(id));
        console.log(`删除后${resource}数据:`, allItems.length, '条，目标ID:', id);
        
        if (allItems.length < originalLength) {
          await kv.set(resource, allItems);
          console.log(`${resource}删除成功`);
          return res.json({ success: true, message: '项目已删除' });
        } else {
          console.log('项目未找到，可用ID:', allItems.map(i => i.id));
          return res.status(404).json({ success: false, error: '项目未找到' });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`${resource} API error:`, error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// 数据验证和清理函数
function validateAndCleanData(resource, data) {
  try {
    const cleaned = { ...data };
    
    // 通用验证
    if (typeof cleaned !== 'object' || cleaned === null) {
      return { valid: false, error: '数据必须是对象' };
    }
    
    // 资源特定验证
    switch (resource) {
      case 'articles':
        // 🔥 更新操作时不强制要求所有字段
        // 只有当字段存在且不为 null/undefined 时才验证格式
        if (cleaned.title != null && typeof cleaned.title !== 'string') {
          return { valid: false, error: '文章标题格式错误' };
        }
        if (cleaned.content != null && typeof cleaned.content !== 'string') {
          return { valid: false, error: '文章内容格式错误' };
        }
        // 设置默认值（仅当字段存在时）
        if (cleaned.views === undefined) cleaned.views = cleaned.views || 0;
        if (cleaned.likes === undefined) cleaned.likes = cleaned.likes || 0;
        break;
        
      case 'categories':
      case 'tags':
        // 🔥 更新操作时不强制要求 name 字段
        // 只有当字段存在且不为 null/undefined 时才验证格式
        if (cleaned.name != null && typeof cleaned.name !== 'string') {
          return { valid: false, error: '名称格式错误' };
        }
        break;
        
      case 'users':
        // 用户名验证（如果提供的话）
        if (cleaned.username && typeof cleaned.username !== 'string') {
          return { valid: false, error: '用户名格式错误' };
        }
        // 密码验证（如果提供的话）
        if (cleaned.password && typeof cleaned.password !== 'string') {
          return { valid: false, error: '密码格式错误' };
        }
        // 角色验证（如果提供的话）
        if (cleaned.role) {
          const validRoles = ['super_admin', 'admin', 'editor', 'viewer'];
          if (!validRoles.includes(cleaned.role)) {
            return { valid: false, error: '无效的用户角色' };
          }
        }
        // 不设置默认值，保持原有数据
        break;
        
      case 'comments':
        // 🔥 更新操作时不强制要求 content 字段
        // 只有当 content 字段存在且不为 null/undefined 时才验证格式
        if (cleaned.content != null && typeof cleaned.content !== 'string') {
          return { valid: false, error: '评论内容格式错误' };
        }
        // 只在有 status 字段时设置默认值
        if (cleaned.status === undefined && cleaned.content) {
          cleaned.status = 'pending';
        }
        if (cleaned.likes === undefined) {
          cleaned.likes = cleaned.likes || 0;
        }
        break;
        
      case 'guestbook':
        // 🔥 更新操作时不强制要求 content 字段
        // 只有当 content 字段存在且不为 null/undefined 时才验证格式
        if (cleaned.content != null && typeof cleaned.content !== 'string') {
          return { valid: false, error: '留言内容格式错误' };
        }
        if (cleaned.likes === undefined) {
          cleaned.likes = cleaned.likes || 0;
        }
        break;
        
      case 'images':
        // 🔥 更新操作时不强制要求所有字段
        // 支持 filename 或 name 字段
        if (cleaned.filename == null && cleaned.name != null) {
          cleaned.filename = cleaned.name;
        }
        if (cleaned.filename != null && typeof cleaned.filename !== 'string') {
          return { valid: false, error: '文件名格式错误' };
        }
        if (cleaned.url != null && typeof cleaned.url !== 'string') {
          return { valid: false, error: '图片URL格式错误' };
        }
        break;
        
      case 'music':
        // 🔥 更新操作时不强制要求 name 字段
        // 音乐使用 name 字段而不是 title
        if (cleaned.name != null && typeof cleaned.name !== 'string') {
          return { valid: false, error: '音乐名称格式错误' };
        }
        break;
        
      case 'videos':
        // 🔥 更新操作时不强制要求 name 字段
        // 视频使用 name 字段而不是 title
        if (cleaned.name != null && typeof cleaned.name !== 'string') {
          return { valid: false, error: '视频名称格式错误' };
        }
        break;
        
      case 'links':
        // 🔥 更新操作时不强制要求所有字段
        if (cleaned.name != null && typeof cleaned.name !== 'string') {
          return { valid: false, error: '链接名称格式错误' };
        }
        if (cleaned.url != null && typeof cleaned.url !== 'string') {
          return { valid: false, error: '链接URL格式错误' };
        }
        break;
        
      case 'apps':
        // 🔥 更新操作时不强制要求 name 字段
        if (cleaned.name != null && typeof cleaned.name !== 'string') {
          return { valid: false, error: '应用名称格式错误' };
        }
        break;
        
      case 'events':
        // 🔥 更新操作时不强制要求 title 字段
        if (cleaned.title != null && typeof cleaned.title !== 'string') {
          return { valid: false, error: '事件标题格式错误' };
        }
        break;
    }
    
    // 清理危险字符
    Object.keys(cleaned).forEach(key => {
      if (typeof cleaned[key] === 'string') {
        // 基本的XSS防护
        cleaned[key] = cleaned[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    });
    
    return { valid: true, data: cleaned };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}