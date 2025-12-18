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
            const settings = await kv.get('settings') || {};
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
          const items = await kv.get(resource) || (resource === 'settings' ? {} : []);
          return res.json({ success: true, data: items });
        }

      case 'POST':
        console.log('POST请求详情:', { url: req.url, resource, body: requestBody });
        
        if (req.url.includes('/batch')) {
          // 批量导入
          console.log('执行批量导入操作');
          const data = requestBody;
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
          // settings直接更新
          console.log('更新settings');
          await kv.set('settings', requestBody);
          return res.json({ success: true, data: requestBody });
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
        if (!cleaned.title || typeof cleaned.title !== 'string') {
          return { valid: false, error: '文章标题不能为空' };
        }
        if (!cleaned.content || typeof cleaned.content !== 'string') {
          return { valid: false, error: '文章内容不能为空' };
        }
        // 设置默认值
        cleaned.views = cleaned.views || 0;
        cleaned.likes = cleaned.likes || 0;
        cleaned.status = cleaned.status || 'draft';
        cleaned.publishDate = cleaned.publishDate || new Date().toISOString().split('T')[0];
        break;
        
      case 'categories':
      case 'tags':
        if (!cleaned.name || typeof cleaned.name !== 'string') {
          return { valid: false, error: '名称不能为空' };
        }
        cleaned.count = cleaned.count || 0;
        break;
        
      case 'users':
        if (!cleaned.username || typeof cleaned.username !== 'string') {
          return { valid: false, error: '用户名不能为空' };
        }
        if (!cleaned.password || typeof cleaned.password !== 'string') {
          return { valid: false, error: '密码不能为空' };
        }
        cleaned.role = cleaned.role || 'viewer';
        cleaned.status = cleaned.status || 'active';
        break;
        
      case 'comments':
        if (!cleaned.content || typeof cleaned.content !== 'string') {
          return { valid: false, error: '评论内容不能为空' };
        }
        cleaned.status = cleaned.status || 'pending';
        cleaned.likes = cleaned.likes || 0;
        break;
        
      case 'guestbook':
        if (!cleaned.content || typeof cleaned.content !== 'string') {
          return { valid: false, error: '留言内容不能为空' };
        }
        cleaned.likes = cleaned.likes || 0;
        cleaned.isTop = cleaned.isTop || false;
        break;
        
      case 'images':
        if (!cleaned.filename || typeof cleaned.filename !== 'string') {
          return { valid: false, error: '文件名不能为空' };
        }
        if (!cleaned.url || typeof cleaned.url !== 'string') {
          return { valid: false, error: '图片URL不能为空' };
        }
        break;
        
      case 'music':
        if (!cleaned.title || typeof cleaned.title !== 'string') {
          return { valid: false, error: '音乐标题不能为空' };
        }
        break;
        
      case 'videos':
        if (!cleaned.title || typeof cleaned.title !== 'string') {
          return { valid: false, error: '视频标题不能为空' };
        }
        break;
        
      case 'links':
        if (!cleaned.name || typeof cleaned.name !== 'string') {
          return { valid: false, error: '链接名称不能为空' };
        }
        if (!cleaned.url || typeof cleaned.url !== 'string') {
          return { valid: false, error: '链接URL不能为空' };
        }
        break;
        
      case 'apps':
        if (!cleaned.name || typeof cleaned.name !== 'string') {
          return { valid: false, error: '应用名称不能为空' };
        }
        cleaned.status = cleaned.status || 'enabled';
        cleaned.order = cleaned.order || 0;
        break;
        
      case 'events':
        if (!cleaned.title || typeof cleaned.title !== 'string') {
          return { valid: false, error: '事件标题不能为空' };
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