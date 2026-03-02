const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FavoriteFolder = sequelize.define('FavoriteFolder', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Folder Name / 收藏夹名称'
  },
  is_private: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Is Private / 是否私密'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Description / 描述'
  }
}, {
  tableName: 'favorite_folders',
  timestamps: true,
  underscored: true
});

module.exports = FavoriteFolder;
