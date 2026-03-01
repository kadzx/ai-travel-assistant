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
  }
}, {
  tableName: 'posts',
  timestamps: true,
  underscored: true
});

module.exports = Post;
