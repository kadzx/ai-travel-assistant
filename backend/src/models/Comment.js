const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'User ID / 用户ID',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Content / 内容'
  },
  target_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Target ID / 目标ID'
  },
  target_type: {
    type: DataTypes.ENUM('post', 'scenic_spot'),
    allowNull: false,
    comment: 'Target Type / 目标类型'
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Parent Comment ID / 父评论ID (支持二级评论)'
  },
  reply_to_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reply To User ID / 回复给谁 (可选)'
  }
}, {
  tableName: 'comments',
  timestamps: true,
  underscored: true
});

module.exports = Comment;
