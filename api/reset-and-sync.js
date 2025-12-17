// 清除KV数据库并重新同步本地JSON数据
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    console.log('🔄 开始清除并重新同步数据...');
    
    // 要同步的数据结构（从你的本地JSON文件）
    const localData = {
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
      apps: [
        {
          "id": "1",
          "name": "羊了个羊",
          "description": "经典消除游戏，点击相同卡片进行消除，挑战你的观察力和策略！",
          "icon": "🐑",
          "url": "/apps/sheep-game/index.html",
          "category": "游戏",
          "status": "enabled",
          "order": 1,
          "createdAt": "2025-12-05T10:00:00.000Z"
        },
        {
          "id": "2",
          "name": "示例游戏",
          "description": "这是一个示例小游戏，展示如何添加应用到系统中",
          "icon": "🎮",
          "url": "/apps/example-game/index.html",
          "category": "游戏",
          "status": "enabled",
          "order": 10,
          "createdAt": "2025-12-05T08:00:00.000Z",
          "updatedAt": "2025-12-05T15:35:45.083Z"
        },
        {
          "id": "3",
          "name": "实用工具",
          "description": "一个实用的在线工具示例",
          "icon": "🔧",
          "url": "/apps/example-tool/index.html",
          "category": "工具",
          "status": "enabled",
          "order": 20,
          "createdAt": "2025-12-05T08:00:00.000Z",
          "updatedAt": "2025-12-05T15:35:46.686Z"
        },
        {
          "id": "4",
          "name": "外部应用",
          "description": "可以链接到外部网站的示例",
          "icon": "🌐",
          "url": "https://example.com",
          "category": "其他",
          "status": "enabled",
          "order": 30,
          "createdAt": "2025-12-05T08:00:00.000Z",
          "updatedAt": "2025-12-05T15:35:48.427Z"
        },
        {
          "id": "5",
          "name": "API接口平台",
          "icon": "🖥️",
          "category": "工具",
          "url": "https://uapis.cn/",
          "description": "一个强大、稳定且好用的通用 API，是构建出色应用的基础。",
          "status": "enabled",
          "order": 2,
          "createdAt": "2025-12-05T16:09:49.241Z",
          "updatedAt": "2025-12-05T16:31:02.810Z"
        },
        {
          "id": "6",
          "name": "哲风壁纸",
          "icon": "📇",
          "category": "工具",
          "url": "https://haowallpaper.com/",
          "description": "免费高清壁纸网站，可下载手机，电脑，动态等高清壁纸",
          "status": "enabled",
          "order": 3,
          "createdAt": "2025-12-05T16:38:12.569Z"
        },
        {
          "id": "7",
          "name": "ToolOnline.net",
          "icon": "🧰",
          "category": "工具",
          "url": "https://toolonline.net/",
          "description": "ToolOnline.net 是一个在线工具集合网站，为用户提供便捷的在线工具和软件。",
          "status": "enabled",
          "order": 4,
          "createdAt": "2025-12-05T16:40:35.290Z",
          "updatedAt": "2025-12-05T16:40:43.513Z"
        },
        {
          "id": "8",
          "name": "看剧网",
          "icon": "📺",
          "category": "工具",
          "url": "https://www.kanjuw.net/",
          "description": "一款可以免费看剧的网站",
          "status": "enabled",
          "order": 5,
          "createdAt": "2025-12-05T16:48:21.471Z",
          "updatedAt": "2025-12-09T17:50:50.274Z"
        },
        {
          "id": "9",
          "name": "AI学习工具",
          "icon": "📓",
          "category": "工具",
          "url": "/apps/ai_study-tool/index.html",
          "description": "一个交互式的AI编程学习网站，帮助你从零开始，循序渐进地学习AI相关编程。",
          "status": "enabled",
          "order": 6,
          "createdAt": "2025-12-08T06:47:10.206Z",
          "updatedAt": "2025-12-08T07:02:41.232Z"
        },
        {
          "id": "10",
          "name": "文章抓取",
          "icon": "📘",
          "category": "工具",
          "url": "/apps/article-scraper/index.html",
          "description": "将网页文章智能转换为 Markdown 格式的工具",
          "status": "enabled",
          "order": 7,
          "createdAt": "2025-12-08T08:54:51.082Z"
        },
        {
          "id": "11",
          "name": "屏幕录制",
          "icon": "📹",
          "category": "工具",
          "url": "/apps/screen-recorder/index.html",
          "description": "基于Web API的现代化屏幕录制工具，支持高质量屏幕录制和音频捕获",
          "status": "enabled",
          "order": 8,
          "createdAt": "2025-12-11T12:00:00.000Z"
        },
        {
          "id": "12",
          "name": "视频剪辑",
          "icon": "🎬",
          "category": "工具",
          "url": "/apps/video-editor/index.html",
          "description": "专业的Web视频编辑工具，支持视频导入、背景音乐添加、文字叠加和高质量导出",
          "status": "enabled",
          "order": 9,
          "createdAt": "2025-12-11T15:00:00.000Z"
        },
        {
          "id": "13",
          "name": "简历生成器",
          "icon": "📄",
          "category": "工具",
          "url": "/apps/resume-builder/index.html",
          "description": "专业的多页简历生成工具，支持多种模板样式、照片上传、数据管理和PDF/Excel导出",
          "status": "enabled",
          "order": 10,
          "createdAt": "2025-12-11T18:00:00.000Z"
        }
      ],
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

    // 清除并重新设置每个数据集
    for (const [key, data] of Object.entries(localData)) {
      try {
        // 直接覆盖（KV会自动替换现有数据）
        await kv.set(key, data);
        const recordCount = Array.isArray(data) ? data.length : 1;
        totalRecords += recordCount;
        results[key] = { status: 'success', records: recordCount };
        console.log(`✅ 重新同步完成: ${key} (${recordCount}条记录)`);
      } catch (error) {
        console.error(`❌ 重新同步失败: ${key}`, error);
        results[key] = { status: 'error', error: error.message };
      }
    }

    // 更新同步状态
    await kv.set('sync_status', 'completed');
    await kv.set('last_sync_date', new Date().toISOString());
    await kv.set('sync_results', results);

    // 清除旧的迁移状态
    await kv.del('migration_status');
    await kv.del('local_sync_status');

    console.log('🎉 数据重新同步完成!');

    return res.json({
      success: true,
      message: `数据重新同步完成，共同步 ${totalRecords} 条记录`,
      totalRecords,
      results,
      syncDate: new Date().toISOString(),
      action: 'reset_and_sync'
    });

  } catch (error) {
    console.error('❌ 数据重新同步失败:', error);
    return res.status(500).json({
      success: false,
      message: '数据重新同步失败: ' + error.message
    });
  }
}