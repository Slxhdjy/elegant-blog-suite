// 清除KV数据库并重新同步本地JSON数据
import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    console.log('🔄 开始清除并重新同步数据...');
    
    // 读取实际的JSON数据文件
    const readJsonFile = (filename) => {
      try {
        const filePath = path.join(process.cwd(), 'data', filename);
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        console.error(`❌ 读取文件 ${filename} 失败:`, error.message);
        return filename === 'settings.json' ? {} : [];
      }
    };

    const localData = {
      articles: readJsonFile('articles.json'),
      categories: readJsonFile('categories.json'),
      tags: readJsonFile('tags.json'),
      comments: readJsonFile('comments.json'),
      guestbook: readJsonFile('guestbook.json'),
      images: readJsonFile('images.json'),
      music: readJsonFile('music.json'),
      videos: readJsonFile('videos.json'),
      links: readJsonFile('links.json'),
      apps: readJsonFile('apps.json'),
      events: readJsonFile('events.json'),
      users: readJsonFile('users.json'),
      settings: readJsonFile('settings.json')
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