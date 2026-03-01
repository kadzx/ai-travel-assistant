const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Itinerary = sequelize.define('Itinerary', {
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
    comment: 'Itinerary Title / 行程标题'
  },
  content: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Itinerary Content (JSON) / 行程内容'
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Start Date / 开始日期'
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'End Date / 结束日期'
  }
}, {
  tableName: 'itineraries',
  timestamps: true,
  underscored: true
});

module.exports = Itinerary;
