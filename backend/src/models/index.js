const sequelize = require('../config/database');
const User = require('./User');
const ScenicSpot = require('./ScenicSpot');
const Itinerary = require('./Itinerary');
const ChatMessage = require('./ChatMessage');
const Post = require('./Post');

// 定义关联关系 / Define Associations

// User <-> Itinerary
User.hasMany(Itinerary, { foreignKey: 'user_id', as: 'itineraries' });
Itinerary.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> ChatMessage
User.hasMany(ChatMessage, { foreignKey: 'user_id', as: 'chatMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> Post
User.hasMany(Post, { foreignKey: 'user_id', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// 导出模型和 Sequelize 实例
module.exports = {
  sequelize,
  User,
  ScenicSpot,
  Itinerary,
  ChatMessage,
  Post
};
