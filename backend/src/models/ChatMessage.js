const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatMessage = sequelize.define('ChatMessage', {
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
  session_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Session ID / 会话ID'
  },
  role: {
    type: DataTypes.ENUM('user', 'assistant'),
    allowNull: false,
    comment: 'Role (user/assistant) / 角色'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Message Content / 消息内容'
  }
}, {
  tableName: 'chat_messages',
  timestamps: true,
  underscored: true
});

module.exports = ChatMessage;
