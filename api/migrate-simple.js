// 简化的数据迁移API - 手动设置初始数据
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    console.log('🔄 开始简化数据迁移...');
    
    // 检查是否已经迁移过
    const migrationStatus = await kv.get('migration_status');
    if (migrationStatus === 'completed') {
      return res.json({ 
        success: true, 
        message: '数据已经迁移过了',
        alreadyMigrated: true 
      });
    }

    // 初始化基础数据结构
    const initialData = {
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
      events: [],
      users: [],
      settings: {
        siteName: "ℳঞ执念ꦿ的博客",
        siteDescription: "欢迎来到我的博客",
        postsPerPage: 12,
        commentModeration: true,
        totalWords: 0,
        totalViews: 0,
        totalVisitors: 0,
        startDate: "2025-11-16",
        avatar: "/uploads/images/1.jpg"
      }
    };

    let totalRecords = 0;
    const results = {};

    // 逐个保存数据
    for (const [key, data] of Object.entries(initialData)) {
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

    // 标记迁移完成
    await kv.set('migration_status', 'completed');
    await kv.set('migration_date', new Date().toISOString());
    await kv.set('migration_results', results);

    console.log('🎉 数据初始化完成!');

    return res.json({
      success: true,
      message: `数据初始化完成，共创建 ${totalRecords} 条记录`,
      totalRecords,
      results,
      migrationDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 数据初始化失败:', error);
    return res.status(500).json({
      success: false,
      message: '数据初始化失败: ' + error.message
    });
  }
}