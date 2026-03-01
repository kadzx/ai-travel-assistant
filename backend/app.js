const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./src/routes');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api', routes);

// 基础路由
app.get('/', (req, res) => {
  res.json({
    code: 200,
    msg: '后端服务正在运行',
    data: null
  });
});

// 404 处理
app.use((req, res, next) => {
  res.status(404).json({
    code: 404,
    msg: '未找到该资源',
    data: null
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    code: 500,
    msg: '服务器内部错误',
    data: process.env.NODE_ENV === 'development' ? err.message : null
  });
});

const { sequelize } = require('./src/models');

// 启动服务器
const startServer = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('数据库连接成功并已同步模型');
    
    app.listen(PORT, () => {
      console.log(`服务器正在运行: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('无法连接到数据库:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
