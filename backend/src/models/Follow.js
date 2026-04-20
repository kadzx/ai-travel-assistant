const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Follow = sequelize.define('Follow', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  follower_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'User who follows / 关注者'
  },
  following_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'User being followed / 被关注者'
  }
}, {
  tableName: 'follows',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['follower_id', 'following_id'] },
    { fields: ['following_id'] }
  ]
});

module.exports = Follow;
