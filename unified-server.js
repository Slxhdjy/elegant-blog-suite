/* ========================================
   统一的博客服务器
   整合了数据API和图片上传功能
   Node.js + Express + JSON文件存储
   ======================================== */

const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');

// ========== 中间件配置 ==========
app.use(cors());
app.use(express.json({ limit: '500mb' })); // 增大JSON请求体限制
app.use(express.urlencoded({ limit: '500mb', extended: true })); // 增大URL编码请求体限制
app.use(express.static('.')); // 静态文件服务

// 安全响应头
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
});

// 日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ========== 图片上传配置 ==========

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads', 'images');
const backgroundDir = path.join(__dirname, 'blog-admin', 'uploads', 'images', 'background');
const uploadDirNew = path.join(__dirname, 'uploads', 'images', 'upload');

[uploadDir, backgroundDir, uploadDirNew].forEach(dir => {
    if (!fsSync.existsSync(dir)) {
        fsSync.mkdirSync(dir, { recursive: true });
        console.log(`✅ 创建目录: ${dir}`);
    }
});

// 配置 multer 存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // 根据请求路径决定存储位置
        if (req.path.includes('/feishu/') || req.path.includes('/article-image')) {
            cb(null, uploadDir); // 飞书和文章图片使用旧路径
        } else {
            cb(null, uploadDirNew); // 新的上传使用新路径
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'img-' + uniqueSuffix + ext);
    }
});

// 文件过滤器：只允许图片
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('只允许上传图片文件！'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: Infinity // 不限制文件大小
    },
    fileFilter: fileFilter
});

// ========== 数据API函数 ==========

// 确保data目录存在
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
        console.log('✅ 创建data目录');
    }
}

// 读取JSON文件
async function readJSON(filename) {
    try {
        const filePath = path.join(DATA_DIR, filename);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return filename.includes('settings') ? {} : [];
        }
        throw error;
    }
}

// 写入JSON文件
async function writeJSON(filename, data) {
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ========== 图片上传路由 ==========

// 上传单个图片（新接口）
app.post('/upload/image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '没有上传文件'
            });
        }
        
        const fileUrl = `/uploads/images/upload/${req.file.filename}`;
        res.json({
            success: true,
            message: '上传成功',
            data: {
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                url: fileUrl,
                fullUrl: `http://localhost:${PORT}${fileUrl}`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '上传失败：' + error.message
        });
    }
});

// 上传多个图片
app.post('/upload/images', upload.array('images', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有上传文件'
            });
        }
        
        const files = req.files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            size: file.size,
            url: `/uploads/images/upload/${file.filename}`,
            fullUrl: `http://localhost:${PORT}/uploads/images/upload/${file.filename}`
        }));
        
        res.json({
            success: true,
            message: `成功上传 ${files.length} 个文件`,
            data: files
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '上传失败：' + error.message
        });
    }
});

// 飞书文档图片上传（保持原有路径）
app.post('/upload/feishu/image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '没有上传文件'
            });
        }
        
        // 使用统一的uploads路径
        const fileUrl = `/uploads/images/upload/${req.file.filename}`;
        res.json({
            success: true,
            message: '飞书图片上传成功',
            data: {
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                url: fileUrl,
                fullUrl: `http://localhost:${PORT}/${fileUrl}`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '上传失败：' + error.message
        });
    }
});

// 文档图片上传（飞书导入专用）
app.post('/upload/article-image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '没有上传文件'
            });
        }
        
        const articleId = req.body.articleId || 'default';
        const type = req.body.type || 'article';
        
        // 创建文档专用目录
        const articleDir = path.join(__dirname, 'uploads', 'articles', articleId);
        if (!fsSync.existsSync(articleDir)) {
            fsSync.mkdirSync(articleDir, { recursive: true });
            console.log(`✅ 创建文档目录: ${articleDir}`);
        }
        
        // 移动文件到文档目录
        const oldPath = req.file.path;
        const newPath = path.join(articleDir, req.file.filename);
        
        try {
            fsSync.renameSync(oldPath, newPath);
        } catch (moveError) {
            // 如果移动失败，尝试复制然后删除
            fsSync.copyFileSync(oldPath, newPath);
            fsSync.unlinkSync(oldPath);
        }
        
        // 返回文档专用的URL路径
        const fileUrl = `/uploads/articles/${articleId}/${req.file.filename}`;
        
        console.log(`✅ 文档图片上传成功: ${fileUrl}`);
        
        res.json({
            success: true,
            message: '文档图片上传成功',
            data: {
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                url: fileUrl,
                fullUrl: `http://localhost:${PORT}${fileUrl}`,
                articleId: articleId,
                type: type
            }
        });
    } catch (error) {
        console.error('❌ 文档图片上传失败:', error);
        res.status(500).json({
            success: false,
            message: '上传失败：' + error.message
        });
    }
});

// 删除图片
app.delete('/upload/image/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        // 尝试在两个位置查找文件
        const paths = [
            path.join(uploadDirNew, filename),
            path.join(uploadDir, filename)
        ];
        
        let deleted = false;
        for (const filepath of paths) {
            if (fsSync.existsSync(filepath)) {
                fsSync.unlinkSync(filepath);
                deleted = true;
                break;
            }
        }
        
        if (deleted) {
            res.json({
                success: true,
                message: '删除成功'
            });
        } else {
            res.status(404).json({
                success: false,
                message: '文件不存在'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '删除失败：' + error.message
        });
    }
});

// 获取图片列表
app.get('/upload/images', (req, res) => {
    try {
        const files = fsSync.readdirSync(uploadDirNew);
        const images = files
            .filter(file => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file))
            .map(file => {
                const stats = fsSync.statSync(path.join(uploadDirNew, file));
                return {
                    filename: file,
                    size: stats.size,
                    created: stats.birthtime,
                    url: `/uploads/images/upload/${file}`,
                    fullUrl: `http://localhost:${PORT}/uploads/images/upload/${file}`
                };
            });
        
        res.json({
            success: true,
            data: images
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取列表失败：' + error.message
        });
    }
});

// ========== 数据API路由 ==========

// 通用CRUD路由生成器
function createCRUDRoutes(resource, filename) {
    // 获取所有
    app.get(`/api/${resource}`, async (req, res) => {
        try {
            const data = await readJSON(filename);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // 获取单个
    app.get(`/api/${resource}/:id`, async (req, res) => {
        try {
            const data = await readJSON(filename);
            const item = data.find(d => String(d.id) === String(req.params.id));
            if (item) {
                res.json({ success: true, data: item });
            } else {
                res.status(404).json({ success: false, error: '未找到' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // 创建
    app.post(`/api/${resource}`, async (req, res) => {
        try {
            const data = await readJSON(filename);
            // 生成新ID：找到最大ID并+1
            let maxId = 0;
            data.forEach(item => {
                const itemId = parseInt(item.id) || 0;
                if (itemId > maxId) {
                    maxId = itemId;
                }
            });
            const newId = String(maxId + 1);
            
            const newItem = {
                id: newId,
                ...req.body,
                createdAt: new Date().toISOString()
            };
            data.push(newItem);
            await writeJSON(filename, data);
            res.json({ success: true, data: newItem });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // 更新
    app.put(`/api/${resource}/:id`, async (req, res) => {
        try {
            const data = await readJSON(filename);
            const index = data.findIndex(d => String(d.id) === String(req.params.id));
            if (index !== -1) {
                data[index] = {
                    ...data[index],
                    ...req.body,
                    updatedAt: new Date().toISOString()
                };
                await writeJSON(filename, data);
                res.json({ success: true, data: data[index] });
            } else {
                res.status(404).json({ success: false, error: '未找到' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // 删除
    app.delete(`/api/${resource}/:id`, async (req, res) => {
        try {
            let data = await readJSON(filename);
            const originalLength = data.length;
            data = data.filter(d => String(d.id) !== String(req.params.id));
            if (data.length < originalLength) {
                await writeJSON(filename, data);
                res.json({ success: true, message: '删除成功' });
            } else {
                res.status(404).json({ success: false, error: '未找到' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // 批量导入
    app.post(`/api/${resource}/batch`, async (req, res) => {
        try {
            const data = req.body;
            await writeJSON(filename, data);
            const count = Array.isArray(data) ? data.length : 1;
            res.json({ 
                success: true, 
                message: `成功导入 ${count} 条数据`,
                count 
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
}

// ========== 评论点赞/差评 API（必须在通用 CRUD 路由之前定义）==========

// 评论点赞
app.post('/api/comments/:id/like', async (req, res) => {
    try {
        const comments = await readJSON('comments.json');
        const comment = comments.find(c => String(c.id) === String(req.params.id));
        
        if (comment) {
            comment.likes = (comment.likes || 0) + 1;
            await writeJSON('comments.json', comments);
            res.json({ success: true, data: comment });
        } else {
            res.status(404).json({ success: false, error: '评论未找到' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 取消评论点赞
app.post('/api/comments/:id/unlike', async (req, res) => {
    try {
        const comments = await readJSON('comments.json');
        const comment = comments.find(c => String(c.id) === String(req.params.id));
        
        if (comment) {
            comment.likes = Math.max(0, (comment.likes || 0) - 1);
            await writeJSON('comments.json', comments);
            res.json({ success: true, data: comment });
        } else {
            res.status(404).json({ success: false, error: '评论未找到' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 评论差评
app.post('/api/comments/:id/dislike', async (req, res) => {
    try {
        const comments = await readJSON('comments.json');
        const comment = comments.find(c => String(c.id) === String(req.params.id));
        
        if (comment) {
            comment.dislikes = (comment.dislikes || 0) + 1;
            await writeJSON('comments.json', comments);
            res.json({ success: true, data: comment });
        } else {
            res.status(404).json({ success: false, error: '评论未找到' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 取消评论差评
app.post('/api/comments/:id/undislike', async (req, res) => {
    try {
        const comments = await readJSON('comments.json');
        const comment = comments.find(c => String(c.id) === String(req.params.id));
        
        if (comment) {
            comment.dislikes = Math.max(0, (comment.dislikes || 0) - 1);
            await writeJSON('comments.json', comments);
            res.json({ success: true, data: comment });
        } else {
            res.status(404).json({ success: false, error: '评论未找到' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== 留言点赞/差评 API ==========

// 留言点赞
app.post('/api/guestbook/:id/like', async (req, res) => {
    try {
        const messages = await readJSON('guestbook.json');
        const message = messages.find(m => String(m.id) === String(req.params.id));
        
        if (message) {
            message.likes = (message.likes || 0) + 1;
            await writeJSON('guestbook.json', messages);
            res.json({ success: true, data: message });
        } else {
            res.status(404).json({ success: false, error: '留言未找到' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 取消留言点赞
app.post('/api/guestbook/:id/unlike', async (req, res) => {
    try {
        const messages = await readJSON('guestbook.json');
        const message = messages.find(m => String(m.id) === String(req.params.id));
        
        if (message) {
            message.likes = Math.max(0, (message.likes || 0) - 1);
            await writeJSON('guestbook.json', messages);
            res.json({ success: true, data: message });
        } else {
            res.status(404).json({ success: false, error: '留言未找到' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 留言差评
app.post('/api/guestbook/:id/dislike', async (req, res) => {
    try {
        const messages = await readJSON('guestbook.json');
        const message = messages.find(m => String(m.id) === String(req.params.id));
        
        if (message) {
            message.dislikes = (message.dislikes || 0) + 1;
            await writeJSON('guestbook.json', messages);
            res.json({ success: true, data: message });
        } else {
            res.status(404).json({ success: false, error: '留言未找到' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 取消留言差评
app.post('/api/guestbook/:id/undislike', async (req, res) => {
    try {
        const messages = await readJSON('guestbook.json');
        const message = messages.find(m => String(m.id) === String(req.params.id));
        
        if (message) {
            message.dislikes = Math.max(0, (message.dislikes || 0) - 1);
            await writeJSON('guestbook.json', messages);
            res.json({ success: true, data: message });
        } else {
            res.status(404).json({ success: false, error: '留言未找到' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== 统计 API ==========

// 增加文章浏览量
app.post('/api/articles/:id/view', async (req, res) => {
    try {
        const articles = await readJSON('articles.json');
        const article = articles.find(a => String(a.id) === String(req.params.id));
        
        if (article) {
            article.views = (article.views || 0) + 1;
            await writeJSON('articles.json', articles);
            
            // 同时更新总浏览量
            const settings = await readJSON('settings.json');
            settings.totalViews = (settings.totalViews || 0) + 1;
            await writeJSON('settings.json', settings);
            
            res.json({ success: true, data: article });
        } else {
            res.status(404).json({ success: false, error: '文章未找到' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 增加页面访问次数
app.post('/api/stats/pageview', async (req, res) => {
    try {
        const settings = await readJSON('settings.json');
        settings.totalViews = (settings.totalViews || 0) + 1;
        await writeJSON('settings.json', settings);
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 增加访问人数
app.post('/api/stats/visitor', async (req, res) => {
    try {
        const settings = await readJSON('settings.json');
        settings.totalVisitors = (settings.totalVisitors || 0) + 1;
        await writeJSON('settings.json', settings);
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取统计信息
app.get('/api/stats', async (req, res) => {
    try {
        const [articles, comments, settings] = await Promise.all([
            readJSON('articles.json'),
            readJSON('comments.json'),
            readJSON('settings.json')
        ]);
        
        // 实时计算总字数
        const calculatedWords = articles
            .filter(a => a.status === 'published')
            .reduce((sum, article) => sum + (article.content?.length || 0), 0);
        
        // 实时计算总浏览量（所有文章的 views 之和）
        const calculatedViews = articles.reduce((sum, article) => sum + (article.views || 0), 0);
        
        // 计算运行天数
        const startDate = new Date(settings.startDate || '2025-01-01');
        const now = new Date();
        const runningDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        
        // 如果计算值与 settings 中的值不同，则更新 settings
        let needUpdate = false;
        if (settings.totalWords !== calculatedWords) {
            settings.totalWords = calculatedWords;
            needUpdate = true;
        }
        if (settings.totalViews !== calculatedViews) {
            settings.totalViews = calculatedViews;
            needUpdate = true;
        }
        
        // 异步更新 settings（不阻塞响应）
        if (needUpdate) {
            writeJSON('settings.json', settings).then(() => {
                console.log('✅ 统计数据已自动同步到 settings.json');
                console.log(`   总字数: ${calculatedWords}, 总访问量: ${calculatedViews}`);
            }).catch(err => {
                console.error('❌ 同步统计数据失败:', err);
            });
        }
        
        const stats = {
            totalArticles: articles.filter(a => a.status === 'published').length,
            totalComments: comments.length,
            totalWords: calculatedWords,      // 使用计算值
            totalViews: calculatedViews,      // 使用计算值
            totalVisitors: settings.totalVisitors || 0,
            runningDays: runningDays,
            startDate: settings.startDate || '2025-01-01'
        };
        
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== 通用 CRUD 路由 ==========

// 创建所有资源的CRUD路由
const resources = [
    'articles', 'categories', 'tags', 'comments', 'guestbook',
    'users', 'images', 'music', 'videos', 'links', 'apps', 'resumes'
    // events 使用自定义API，不使用通用CRUD
];

resources.forEach(resource => {
    createCRUDRoutes(resource, `${resource}.json`);
});

// 设置相关（特殊处理）
app.get('/api/settings', async (req, res) => {
    try {
        const data = await readJSON('settings.json');
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/settings', async (req, res) => {
    try {
        await writeJSON('settings.json', req.body);
        res.json({ success: true, data: req.body });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🔥 增加访问量 API
app.post('/api/settings/increment-views', async (req, res) => {
    try {
        const settings = await readJSON('settings.json');
        settings.totalViews = (settings.totalViews || 0) + 1;
        await writeJSON('settings.json', settings);
        console.log('✅ 访问量已增加:', settings.totalViews);
        res.json({ success: true, data: { totalViews: settings.totalViews } });
    } catch (error) {
        console.error('❌ 增加访问量失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🔥 增加访客数 API
app.post('/api/settings/increment-visitors', async (req, res) => {
    try {
        const settings = await readJSON('settings.json');
        settings.totalVisitors = (settings.totalVisitors || 0) + 1;
        await writeJSON('settings.json', settings);
        console.log('✅ 访客数已增加:', settings.totalVisitors);
        res.json({ success: true, data: { totalVisitors: settings.totalVisitors } });
    } catch (error) {
        console.error('❌ 增加访客数失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🔥 增加文章访问量 API
app.post('/api/articles/:id/view', async (req, res) => {
    try {
        const articleId = parseInt(req.params.id);
        const articles = await readJSON('articles.json');
        const article = articles.find(a => a.id === articleId);
        
        if (article) {
            article.views = (article.views || 0) + 1;
            await writeJSON('articles.json', articles);
            
            // 同时更新 settings 中的总访问量
            const settings = await readJSON('settings.json');
            settings.totalViews = (settings.totalViews || 0) + 1;
            await writeJSON('settings.json', settings);
            
            console.log(`✅ 文章 ${articleId} 访问量已增加:`, article.views);
            res.json({ success: true, data: { views: article.views, totalViews: settings.totalViews } });
        } else {
            res.status(404).json({ success: false, error: '文章不存在' });
        }
    } catch (error) {
        console.error('❌ 增加文章访问量失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取背景视频列表
app.get('/api/background-videos', (req, res) => {
    try {
        const videoDir = path.join(__dirname, 'uploads', 'video');
        
        // 确保目录存在
        if (!fsSync.existsSync(videoDir)) {
            return res.json({ success: true, data: [] });
        }
        
        const files = fsSync.readdirSync(videoDir);
        const videos = files
            .filter(file => /\.(mp4|webm|ogg)$/i.test(file))
            .map(file => {
                const stats = fsSync.statSync(path.join(videoDir, file));
                return {
                    filename: file,
                    size: stats.size,
                    url: `/uploads/video/${file}`
                };
            });
        
        res.json({ success: true, data: videos });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 重要事项API
app.get('/api/events', async (req, res) => {
    try {
        const events = await readJSON('events.json');
        res.json({
            success: true,
            data: events
        });
    } catch (error) {
        console.error('获取重要事项失败:', error);
        res.json({
            success: true,
            data: []
        });
    }
});

app.post('/api/events', async (req, res) => {
    try {
        const events = req.body;
        await writeJSON('events.json', events);
        console.log('✅ 重要事项已保存');
        res.json({
            success: true,
            message: '重要事项保存成功'
        });
    } catch (error) {
        console.error('保存重要事项失败:', error);
        res.json({
            success: false,
            message: '保存失败: ' + error.message
        });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: '统一服务器运行正常',
        timestamp: new Date().toISOString(),
        services: {
            api: 'running',
            upload: 'running'
        }
    });
});

// ========== 数据备份 API ==========

// 备份数据
app.post('/api/backup', async (req, res) => {
    try {
        const backupDir = path.join(__dirname, 'backups');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                         new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const backupPath = path.join(backupDir, `backup_${timestamp}`);
        
        // 创建备份目录
        if (!fsSync.existsSync(backupDir)) {
            fsSync.mkdirSync(backupDir, { recursive: true });
        }
        fsSync.mkdirSync(backupPath, { recursive: true });
        
        // 获取所有 JSON 文件
        const dataFiles = fsSync.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));
        
        let totalSize = 0;
        let filesCount = 0;
        
        // 复制所有数据文件
        for (const file of dataFiles) {
            const sourcePath = path.join(DATA_DIR, file);
            const destPath = path.join(backupPath, file);
            
            fsSync.copyFileSync(sourcePath, destPath);
            
            const stats = fsSync.statSync(destPath);
            totalSize += stats.size;
            filesCount++;
        }
        
        // 创建备份信息文件
        const backupInfo = {
            timestamp: new Date().toISOString(),
            filesCount,
            totalSize,
            files: dataFiles
        };
        
        fsSync.writeFileSync(
            path.join(backupPath, 'backup-info.json'),
            JSON.stringify(backupInfo, null, 2)
        );
        
        res.json({
            success: true,
            message: '数据备份成功',
            data: {
                backupPath: backupPath,
                filesCount,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                timestamp: backupInfo.timestamp
            }
        });
        
        console.log(`✅ 数据备份完成: ${backupPath}`);
    } catch (error) {
        console.error('❌ 备份失败:', error);
        res.status(500).json({
            success: false,
            message: '备份失败: ' + error.message
        });
    }
});

// 获取备份列表
app.get('/api/backups', (req, res) => {
    try {
        const backupDir = path.join(__dirname, 'backups');
        
        if (!fsSync.existsSync(backupDir)) {
            return res.json({
                success: true,
                data: []
            });
        }
        
        const backups = [];
        const folders = fsSync.readdirSync(backupDir);
        
        for (const folder of folders) {
            const folderPath = path.join(backupDir, folder);
            const stats = fsSync.statSync(folderPath);
            
            if (stats.isDirectory()) {
                const infoPath = path.join(folderPath, 'backup-info.json');
                let backupInfo = {
                    timestamp: stats.birthtime.toISOString(),
                    filesCount: 0,
                    totalSize: 0
                };
                
                // 读取备份信息
                if (fsSync.existsSync(infoPath)) {
                    try {
                        backupInfo = JSON.parse(fsSync.readFileSync(infoPath, 'utf8'));
                    } catch (e) {
                        console.error('读取备份信息失败:', e);
                    }
                }
                
                backups.push({
                    name: folder,
                    path: folderPath,
                    createTime: backupInfo.timestamp,
                    filesCount: backupInfo.filesCount,
                    totalSizeMB: (backupInfo.totalSize / 1024 / 1024).toFixed(2)
                });
            }
        }
        
        // 按时间倒序排列
        backups.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
        
        res.json({
            success: true,
            data: backups
        });
    } catch (error) {
        console.error('❌ 获取备份列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取备份列表失败: ' + error.message
        });
    }
});

// 恢复备份
app.post('/api/restore/:backupName', async (req, res) => {
    try {
        const backupName = req.params.backupName;
        const backupPath = path.join(__dirname, 'backups', backupName);
        
        if (!fsSync.existsSync(backupPath)) {
            return res.status(404).json({
                success: false,
                message: '备份不存在'
            });
        }
        
        // 获取备份中的所有 JSON 文件
        const files = fsSync.readdirSync(backupPath).filter(file => 
            file.endsWith('.json') && file !== 'backup-info.json'
        );
        
        let restoredCount = 0;
        
        // 恢复所有文件
        for (const file of files) {
            const sourcePath = path.join(backupPath, file);
            const destPath = path.join(DATA_DIR, file);
            
            fsSync.copyFileSync(sourcePath, destPath);
            restoredCount++;
        }
        
        res.json({
            success: true,
            message: '数据恢复成功',
            data: {
                restoredCount
            }
        });
        
        console.log(`✅ 数据恢复完成: ${backupName}`);
    } catch (error) {
        console.error('❌ 恢复失败:', error);
        res.status(500).json({
            success: false,
            message: '恢复失败: ' + error.message
        });
    }
});

// 删除备份
app.delete('/api/backup/:backupName', (req, res) => {
    try {
        const backupName = req.params.backupName;
        const backupPath = path.join(__dirname, 'backups', backupName);
        
        if (!fsSync.existsSync(backupPath)) {
            return res.status(404).json({
                success: false,
                message: '备份不存在'
            });
        }
        
        // 递归删除目录
        fsSync.rmSync(backupPath, { recursive: true, force: true });
        
        res.json({
            success: true,
            message: '备份已删除'
        });
        
        console.log(`✅ 备份已删除: ${backupName}`);
    } catch (error) {
        console.error('❌ 删除备份失败:', error);
        res.status(500).json({
            success: false,
            message: '删除失败: ' + error.message
        });
    }
});

// ========== 文章抓取API ==========
app.post('/api/scrape-article', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.json({ success: false, message: '缺少URL参数' });
    }
    
    console.log(`📄 开始抓取文章: ${url}`);
    
    try {
        const { spawn } = require('child_process');
        const pythonPath = 'python'; // 或者 'python3'
        const scriptPath = path.join(__dirname, 'apps', 'article-scraper', 'scraper.py');
        
        const python = spawn(pythonPath, [scriptPath, url]);
        
        let result = '';
        let error = '';
        let responded = false; // 防止多次响应
        
        python.stdout.on('data', (data) => {
            result += data.toString();
        });
        
        python.stderr.on('data', (data) => {
            error += data.toString();
        });
        
        python.on('close', (code) => {
            if (responded) return; // 已经响应过了
            responded = true;
            
            clearTimeout(timeoutId); // 清除超时定时器
            
            if (code === 0 && result) {
                try {
                    const data = JSON.parse(result);
                    console.log(`✅ 文章抓取成功: ${data.title || '未知标题'}`);
                    res.json(data);
                } catch (e) {
                    console.error('❌ 解析Python输出失败:', e.message);
                    res.json({ 
                        success: false, 
                        message: '解析结果失败，请检查Python环境和依赖' 
                    });
                }
            } else {
                console.error('❌ 文章抓取失败:', error);
                res.json({ 
                    success: false, 
                    message: error || 'Python脚本执行失败，请确保已安装依赖 (pip install -r requirements.txt)' 
                });
            }
        });
        
        // 设置超时
        const timeoutId = setTimeout(() => {
            if (responded) return; // 已经响应过了
            responded = true;
            
            python.kill();
            console.error('❌ 文章抓取超时');
            res.json({ 
                success: false, 
                message: '抓取超时，请检查URL是否可访问' 
            });
        }, 30000); // 30秒超时
        
    } catch (error) {
        console.error('❌ 文章抓取错误:', error);
        res.json({ 
            success: false, 
            message: `抓取失败: ${error.message}` 
        });
    }
});

// ========== 图片代理API ==========
app.get('/api/image-proxy', async (req, res) => {
    const imageUrl = req.query.url;
    
    if (!imageUrl) {
        return res.status(400).json({ error: '缺少图片URL参数' });
    }
    
    console.log(`🖼️ 代理图片请求: ${imageUrl}`);
    
    try {
        const https = require('https');
        const http = require('http');
        const url = require('url');
        const parsedUrl = url.parse(imageUrl);
        
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.path,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': parsedUrl.protocol + '//' + parsedUrl.hostname + '/',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            }
        };
        
        const proxyReq = protocol.request(options, (proxyRes) => {
            // 设置响应头
            res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 缓存1天
            res.setHeader('Access-Control-Allow-Origin', '*');
            
            // 直接pipe图片数据
            proxyRes.pipe(res);
        });
        
        proxyReq.on('error', (e) => {
            console.error(`❌ 图片代理错误:`, e.message);
            res.status(500).json({ error: '图片加载失败' });
        });
        
        proxyReq.end();
        
    } catch (error) {
        console.error(`❌ 图片代理错误:`, error);
        res.status(500).json({ error: error.message });
    }
});

// ========== 热榜API代理 ==========
app.get('/api/hotboard', async (req, res) => {
    const type = req.query.type || 'douyin';
    const apiUrl = `https://uapis.cn/api/v1/misc/hotboard?type=${type}`;
    
    console.log(`📡 代理热榜API请求: ${apiUrl}`);
    
    try {
        const https = require('https');
        const url = require('url');
        const parsedUrl = url.parse(apiUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.path,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };
        
        const proxyReq = https.request(options, (proxyRes) => {
            let data = '';
            
            proxyRes.on('data', (chunk) => {
                data += chunk;
            });
            
            proxyRes.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log(`✅ 热榜API响应成功: ${type}, 数据条数: ${jsonData.list ? jsonData.list.length : 0}`);
                    res.json(jsonData);
                } catch (e) {
                    console.error(`❌ 解析热榜API响应失败:`, e.message);
                    res.status(500).json({ error: '解析API响应失败' });
                }
            });
        });
        
        proxyReq.on('error', (e) => {
            console.error(`❌ 热榜API请求失败:`, e.message);
            res.status(500).json({ error: 'API请求失败' });
        });
        
        proxyReq.end();
        
    } catch (error) {
        console.error(`❌ 热榜API代理错误:`, error);
        res.status(500).json({ error: error.message });
    }
});

// ========== 静态文件服务 ==========
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== 错误处理 ==========
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: '文件太大，最大允许 10MB'
            });
        }
    }
    res.status(500).json({
        success: false,
        message: error.message
    });
});

// ========== 启动服务器 ==========
async function startServer() {
    await ensureDataDir();
    
    app.listen(PORT, () => {
        console.log('========================================');
        console.log('🚀 统一博客服务器已启动');
        console.log(`📡 服务地址: http://localhost:${PORT}`);
        console.log(`📁 数据目录: ${DATA_DIR}`);
        console.log('========================================');
        console.log('📤 图片上传API:');
        console.log('  POST   /upload/image              - 上传单个图片');
        console.log('  POST   /upload/images             - 上传多个图片');
        console.log('  POST   /upload/feishu/image       - 飞书图片上传');
        console.log('  GET    /upload/images             - 获取图片列表');
        console.log('  DELETE /upload/image/:filename    - 删除图片');
        console.log('----------------------------------------');
        console.log('📊 数据API:');
        console.log('  GET    /api/{resource}            - 获取所有');
        console.log('  GET    /api/{resource}/:id        - 获取单个');
        console.log('  POST   /api/{resource}            - 创建');
        console.log('  PUT    /api/{resource}/:id        - 更新');
        console.log('  DELETE /api/{resource}/:id        - 删除');
        console.log('  POST   /api/{resource}/batch      - 批量导入');
        console.log('----------------------------------------');
        console.log('📋 可用资源: articles, categories, tags,');
        console.log('           comments, guestbook, users,');
        console.log('           images, music, videos, links, events');
        console.log('----------------------------------------');
        console.log('💾 数据备份API:');
        console.log('  POST   /api/backup                - 创建备份');
        console.log('  GET    /api/backups               - 获取备份列表');
        console.log('  POST   /api/restore/:backupName   - 恢复备份');
        console.log('  DELETE /api/backup/:backupName    - 删除备份');
        console.log('========================================');
    }).on('error', (error) => {
        console.error('========================================');
        console.error('✗ 服务器启动失败');
        console.error('✗ 错误:', error.message);
        console.error('========================================');
        
        if (error.code === 'EADDRINUSE') {
            console.error(`端口 ${PORT} 已被占用`);
            console.error('请关闭占用该端口的程序，或修改端口号');
        }
        
        process.exit(1);
    });
}

startServer().catch(console.error);
