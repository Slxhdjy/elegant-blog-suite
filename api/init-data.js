// Vercel API - 安全的数据初始化（仅在KV为空时执行）
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { method } = req;

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  // 检查KV环境变量
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error('KV环境变量未配置');
    return res.status(500).json({ 
      success: false, 
      error: 'KV数据库未配置，请检查环境变量'
    });
  }

  try {
    console.log('🔍 检查KV数据库状态...');

    // 检查关键数据是否已存在
    const existingUsers = await kv.get('users');
    const existingSettings = await kv.get('settings');
    
    if (existingUsers && existingUsers.length > 0) {
      return res.json({
        success: false,
        message: 'KV数据库已有数据，拒绝初始化以保护现有数据',
        existingData: {
          users: existingUsers.length,
          settings: existingSettings ? 'exists' : 'missing'
        }
      });
    }

    console.log('✅ KV数据库为空，开始安全初始化...');

    // 初始化基础数据结构
    const initData = {
      users: [
        {
          id: `user_${Date.now()}`,
          username: 'admin',
          password: 'admin123',
          role: 'super_admin',
          email: 'admin@example.com',
          displayName: '超级管理员',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      settings: {
        siteName: "ℳঞ执念ꦿ的博客",
        siteDescription: "欢迎来到我的博客",
        postsPerPage: 12,
        commentModeration: true,
        totalWords: 0,
        totalViews: 0,
        totalVisitors: 0,
        startDate: new Date().toISOString().split('T')[0],
        avatar: "/uploads/images/1.jpg"
      },
      articles: [],
      categories: [
        { id: 1, name: '技术', description: '技术相关文章', count: 0 },
        { id: 2, name: '生活', description: '生活随笔', count: 0 }
      ],
      tags: [
        { id: 1, name: 'JavaScript', count: 0 },
        { id: 2, name: 'Vue', count: 0 },
        { id: 3, name: '随笔', count: 0 }
      ],
      comments: [],
      guestbook: [],
      images: [],
      music: [],
      videos: [],
      links: [],
      apps: [],
      events: []
    };

    let totalRecords = 0;
    const results = {};

    // 逐个初始化数据
    for (const [key, data] of Object.entries(initData)) {
      try {
        await kv.set(key, data);
        const recordCount = Array.isArray(data) ? data.length : 1;
        totalRecords += recordCount;
        results[key] = { status: 'success', records: recordCount };
        console.log(`✅ 初始化完成: ${key} (${recordCount}条记录)`);
      } catch (error) {
        console.error(`❌ 初始化失败: ${key}`, error);
        results[key] = { status: 'error', error: error.message };
      }
    }

    // 标记初始化完成
    await kv.set('init_status', 'completed');
    await kv.set('init_date', new Date().toISOString());

    console.log('🎉 KV数据库初始化完成!');

    return res.json({
      success: true,
      message: `KV数据库初始化完成，共创建 ${totalRecords} 条记录`,
      totalRecords,
      results,
      initDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ KV数据库初始化失败:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'KV数据库初始化失败: ' + error.message 
    });
  }
}