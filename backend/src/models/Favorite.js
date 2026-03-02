const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Favorite = sequelize.define('Favorite', {
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
  folder_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Folder ID / 收藏夹ID (可选，默认收藏夹可为空)',
    references: {
      model: 'favorite_folders',
      key: 'id'
    }
  },
  target_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Target ID / 目标ID'
  },
  target_type: {
    type: DataTypes.ENUM('post', 'scenic_spot', 'itinerary'),
    allowNull: false,
    comment: 'Target Type / 目标类型'
  }
}, {
  tableName: 'favorites',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'folder_id', 'target_id', 'target_type']
    }
  ]
});

module.exports = Favorite;
