// Vercel API - 数据完整性检查和修复
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { method } = req;

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (method !== 'GET' && method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use GET or POST.' 
    });
  }

  // 检查KV环境变量
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(500).json({ 
      success: false, 
      error: 'KV数据库未配置，请检查环境变量'
    });
  }

  try {
    console.log('🔍 开始数据完整性检查...');

    const resources = [
      'articles', 'categories', 'tags', 'comments', 'guestbook',
      'users', 'images', 'music', 'videos', 'links', 'apps', 
      'events', 'settings'
    ];

    const checkResults = {};
    const issues = [];
    let totalRecords = 0;

    // 检查每个资源
    for (const resource of resources) {
      try {
        const data = await kv.get(resource);
        
        if (resource === 'settings') {
          // settings是对象
          if (data && typeof data === 'object') {
            checkResults[resource] = {
              status: 'ok',
              type: 'object',
              hasData: Object.keys(data).length > 0
            };
            totalRecords += 1;
          } else {
            checkResults[resource] = {
              status: 'missing',
              type: 'object',
              hasData: false
            };
            issues.push(`${resource}: 设置数据缺失或格式错误`);
          }
        } else {
          // 其他资源是数组
          if (Array.isArray(data)) {
            checkResults[resource] = {
              status: 'ok',
              type: 'array',
              count: data.length,
              hasData: data.length > 0
            };
            totalRecords += data.length;

            // 检查数据完整性
            const dataIssues = checkDataIntegrity(resource, data);
            if (dataIssues.length > 0) {
              checkResults[resource].issues = dataIssues;
              issues.push(...dataIssues.map(issue => `${resource}: ${issue}`));
            }
          } else if (data === null || data === undefined) {
            checkResults[resource] = {
              status: 'empty',
              type: 'array',
              count: 0,
              hasData: false
            };
          } else {
            checkResults[resource] = {
              status: 'invalid',
              type: 'unknown',
              actualType: typeof data,
              hasData: false
            };
            issues.push(`${resource}: 数据类型错误，期望数组但得到${typeof data}`);
          }
        }
      } catch (error) {
        checkResults[resource] = {
          status: 'error',
          error: error.message,
          hasData: false
        };
        issues.push(`${resource}: 读取失败 - ${error.message}`);
      }
    }

    // 检查关联数据一致性
    const relationshipIssues = await checkRelationshipIntegrity();
    issues.push(...relationshipIssues);

    // 生成报告
    const report = {
      timestamp: new Date().toISOString(),
      totalResources: resources.length,
      totalRecords,
      healthyResources: Object.values(checkResults).filter(r => r.status === 'ok').length,
      issues: issues.length,
      details: checkResults,
      issuesList: issues
    };

    // 如果是POST请求，尝试修复问题
    if (method === 'POST') {
      const fixResults = await fixDataIssues(checkResults);
      report.fixResults = fixResults;
    }

    console.log('✅ 数据完整性检查完成');

    return res.json({
      success: true,
      message: `数据完整性检查完成，发现 ${issues.length} 个问题`,
      data: report
    });

  } catch (error) {
    console.error('❌ 数据完整性检查失败:', error);
    return res.status(500).json({ 
      success: false, 
      error: '数据完整性检查失败: ' + error.message 
    });
  }
}

// 检查单个资源的数据完整性
function checkDataIntegrity(resource, data) {
  const issues = [];

  data.forEach((item, index) => {
    // 检查必需字段
    if (!item.id) {
      issues.push(`项目 ${index}: 缺少ID字段`);
    }

    // 资源特定检查
    switch (resource) {
      case 'articles':
        if (!item.title) issues.push(`文章 ${item.id}: 缺少标题`);
        if (!item.content) issues.push(`文章 ${item.id}: 缺少内容`);
        if (item.views && typeof item.views !== 'number') {
          issues.push(`文章 ${item.id}: 浏览数格式错误`);
        }
        break;

      case 'categories':
      case 'tags':
        if (!item.name) issues.push(`${resource} ${item.id}: 缺少名称`);
        if (item.count && typeof item.count !== 'number') {
          issues.push(`${resource} ${item.id}: 计数格式错误`);
        }
        break;

      case 'users':
        if (!item.username) issues.push(`用户 ${item.id}: 缺少用户名`);
        if (!item.role) issues.push(`用户 ${item.id}: 缺少角色`);
        const validRoles = ['super_admin', 'admin', 'editor', 'viewer'];
        if (item.role && !validRoles.includes(item.role)) {
          issues.push(`用户 ${item.id}: 无效角色 ${item.role}`);
        }
        break;

      case 'comments':
        if (!item.content) issues.push(`评论 ${item.id}: 缺少内容`);
        if (!item.articleId) issues.push(`评论 ${item.id}: 缺少文章ID`);
        break;

      case 'guestbook':
        if (!item.content) issues.push(`留言 ${item.id}: 缺少内容`);
        break;
    }

    // 检查时间戳格式
    if (item.createdAt && !isValidDate(item.createdAt)) {
      issues.push(`${resource} ${item.id}: 创建时间格式错误`);
    }
    if (item.updatedAt && !isValidDate(item.updatedAt)) {
      issues.push(`${resource} ${item.id}: 更新时间格式错误`);
    }
  });

  return issues;
}

// 检查关联数据一致性
async function checkRelationshipIntegrity() {
  const issues = [];

  try {
    const [articles, categories, tags, comments] = await Promise.all([
      kv.get('articles') || [],
      kv.get('categories') || [],
      kv.get('tags') || [],
      kv.get('comments') || []
    ]);

    // 检查文章分类关联
    const categoryNames = categories.map(c => c.name);
    articles.forEach(article => {
      if (article.category && !categoryNames.includes(article.category)) {
        issues.push(`文章 ${article.id}: 引用了不存在的分类 "${article.category}"`);
      }
    });

    // 检查文章标签关联
    const tagNames = tags.map(t => t.name);
    articles.forEach(article => {
      if (article.tags && Array.isArray(article.tags)) {
        article.tags.forEach(tagName => {
          if (!tagNames.includes(tagName)) {
            issues.push(`文章 ${article.id}: 引用了不存在的标签 "${tagName}"`);
          }
        });
      }
    });

    // 检查评论文章关联
    const articleIds = articles.map(a => String(a.id));
    comments.forEach(comment => {
      if (comment.articleId && !articleIds.includes(String(comment.articleId))) {
        issues.push(`评论 ${comment.id}: 引用了不存在的文章 ${comment.articleId}`);
      }
    });

  } catch (error) {
    issues.push(`关联检查失败: ${error.message}`);
  }

  return issues;
}

// 修复数据问题
async function fixDataIssues(checkResults) {
  const fixResults = {};

  for (const [resource, result] of Object.entries(checkResults)) {
    if (result.status === 'empty' && resource !== 'settings') {
      // 初始化空数组
      try {
        await kv.set(resource, []);
        fixResults[resource] = '已初始化为空数组';
      } catch (error) {
        fixResults[resource] = `初始化失败: ${error.message}`;
      }
    } else if (result.status === 'missing' && resource === 'settings') {
      // 初始化默认设置
      try {
        const defaultSettings = {
          siteName: "博客系统",
          siteDescription: "欢迎来到我的博客",
          postsPerPage: 12,
          commentModeration: true,
          totalWords: 0,
          totalViews: 0,
          totalVisitors: 0,
          startDate: new Date().toISOString().split('T')[0]
        };
        await kv.set('settings', defaultSettings);
        fixResults[resource] = '已初始化默认设置';
      } catch (error) {
        fixResults[resource] = `设置初始化失败: ${error.message}`;
      }
    }
  }

  return fixResults;
}

// 验证日期格式
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}