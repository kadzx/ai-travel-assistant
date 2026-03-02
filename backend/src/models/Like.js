const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Like = sequelize.define('Like', {
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
  target_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Target ID / 目标ID'
  },
  target_type: {
    type: DataTypes.ENUM('post', 'comment', 'scenic_spot'),
    allowNull: false,
    comment: 'Target Type / 目标类型'
  }
}, {
  tableName: 'likes',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'target_id', 'target_type']
    }
  ]
});

module.exports = Like;
