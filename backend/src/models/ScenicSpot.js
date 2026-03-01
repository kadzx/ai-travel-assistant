const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ScenicSpot = sequelize.define('ScenicSpot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name_en: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'English Name / 英文名称'
  },
  name_zh: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Chinese Name / 中文名称'
  },
  description_en: {
    type: DataTypes.TEXT,
    comment: 'English Description / 英文描述'
  },
  description_zh: {
    type: DataTypes.TEXT,
    comment: 'Chinese Description / 中文描述'
  },
  location_en: {
    type: DataTypes.STRING,
    comment: 'Location EN / 英文地址'
  },
  location_zh: {
    type: DataTypes.STRING,
    comment: 'Location ZH / 中文地址'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: 'Ticket Price / 票价'
  }
}, {
  tableName: 'scenic_spots'
});

module.exports = ScenicSpot;
