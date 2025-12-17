// 简单的测试API
export default async function handler(req, res) {
  try {
    return res.json({ 
      success: true, 
      message: 'API正常工作',
      timestamp: new Date().toISOString(),
      environment: 'vercel'
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}