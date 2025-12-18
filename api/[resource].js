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
          
          // 生成新ID
          let maxId = 0;
          items.forEach(item => {
            const itemId = parseInt(item.id) || 0;
            if (itemId > maxId) {
              maxId = itemId;
            }
          });
          const newId = String(maxId + 1);
          console.log('生成新ID:', newId);
          
          const newItem = {
            id: newId,
            ...requestBody,
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
          const originalItem = items[index];
          items[index] = {
            ...originalItem,
            ...requestBody,
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