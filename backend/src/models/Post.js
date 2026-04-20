const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User ID / 用户ID'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Post Title / 帖子标题'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Post Content / 帖子内容'
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Images JSON Array / 图片JSON数组'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Location Name / 地点名称'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
    comment: 'Latitude / 纬度'
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
    comment: 'Longitude / 经度'
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Detailed Address / 详细地址'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Tags / 标签话题'
  },
  type: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'recommend',
    comment: 'Post Type / 帖子分类 (recommend, nearby, food, etc.)'
  },
  privacy: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'public',
    comment: 'Privacy / 隐私设置 (public, private, friends)'
  },
  lang: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'zh',
    comment: 'Language / 语言 (zh, en)'
  }
}, {
  tableName: 'posts',
  timestamps: true,
  underscored: true
});

module.exports = Post;
