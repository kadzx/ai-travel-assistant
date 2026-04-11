const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./src/routes');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
const path = require('path');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态图片：/uploads 对应 backend/public/uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// 占位图：CDN 无法下载时返回此图，避免前端 403
app.get('/placeholder-image.svg', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/placeholder-image.svg'));
});

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
    // 使用 sync() 不 alter，避免已有表索引过多触发 MySQL 单表 64 键限制
    await sequelize.sync();
    // 为 posts 表补充定位字段（若已存在则忽略）
    const addColumnIfNotExists = async (table, column, sql) => {
      try {
        const [cols] = await sequelize.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
        if (cols.length === 0) {
          await sequelize.query(sql);
          console.log(`${table}.${column} 列已添加`);
        }
      } catch (e) {
        console.warn(`${table}.${column} 列添加跳过:`, e.message);
      }
    };
    await addColumnIfNotExists('posts', 'latitude',
      "ALTER TABLE posts ADD COLUMN latitude DECIMAL(10,7) DEFAULT NULL COMMENT '纬度' AFTER location");
    await addColumnIfNotExists('posts', 'longitude',
      "ALTER TABLE posts ADD COLUMN longitude DECIMAL(10,7) DEFAULT NULL COMMENT '经度' AFTER latitude");
    await addColumnIfNotExists('posts', 'address',
      "ALTER TABLE posts ADD COLUMN address VARCHAR(255) DEFAULT NULL COMMENT '详细地址' AFTER longitude");
    // 将 users.avatar 升级为 LONGTEXT 以支持 Base64 存储（已有库需执行一次）
    try {
      await sequelize.query(
        "ALTER TABLE users MODIFY COLUMN avatar LONGTEXT COMMENT 'Avatar as data URL (base64) or legacy URL'"
      );
      console.log('users.avatar 已升级为 LONGTEXT');
    } catch (alterErr) {
      if (alterErr.name !== 'SequelizeDatabaseError') console.warn('avatar 列升级跳过:', alterErr.message);
    }
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
