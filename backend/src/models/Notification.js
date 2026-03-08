const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '接收通知的用户 ID',
    references: { model: 'users', key: 'id' }
  },
  actor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '触发通知的用户 ID（点赞/评论/关注者）',
    references: { model: 'users', key: 'id' }
  },
  type: {
    type: DataTypes.STRING(32),
    allowNull: false,
    comment: 'like | comment | follow'
  },
  target_type: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: 'post | comment | user'
  },
  target_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '目标 ID（帖子/评论等）'
  },
  extra: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '扩展：如评论摘要、帖子标题等'
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '已读时间'
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true
});

module.exports = Notification;
