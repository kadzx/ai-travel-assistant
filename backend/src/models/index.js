const sequelize = require('../config/database');
const User = require('./User');
const ScenicSpot = require('./ScenicSpot');
const Itinerary = require('./Itinerary');
const ChatMessage = require('./ChatMessage');
const Post = require('./Post');
const Comment = require('./Comment');
const Like = require('./Like');
const Favorite = require('./Favorite');
const FavoriteFolder = require('./FavoriteFolder');
const Follow = require('./Follow');
const Notification = require('./Notification');
const Report = require('./Report');

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

// --- Social Features Associations ---

// User <-> Like
User.hasMany(Like, { foreignKey: 'user_id', as: 'likes' });
Like.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> Comment
User.hasMany(Comment, { foreignKey: 'user_id', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> FavoriteFolder
User.hasMany(FavoriteFolder, { foreignKey: 'user_id', as: 'favoriteFolders' });
FavoriteFolder.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// FavoriteFolder <-> Favorite
FavoriteFolder.hasMany(Favorite, { foreignKey: 'folder_id', as: 'favorites' });
Favorite.belongsTo(FavoriteFolder, { foreignKey: 'folder_id', as: 'folder' });

// User <-> Favorite (Direct access for convenience)
User.hasMany(Favorite, { foreignKey: 'user_id', as: 'allFavorites' });
Favorite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> Follow (follower_id follows following_id)
User.hasMany(Follow, { foreignKey: 'follower_id', as: 'followingList' });
User.hasMany(Follow, { foreignKey: 'following_id', as: 'followerList' });
Follow.belongsTo(User, { foreignKey: 'follower_id', as: 'follower' });
Follow.belongsTo(User, { foreignKey: 'following_id', as: 'following' });

// Notification: 接收者 / 触发者
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Notification.belongsTo(User, { foreignKey: 'actor_id', as: 'actor' });

// Comment Self-Association (Replies)
Comment.hasMany(Comment, { foreignKey: 'parent_id', as: 'replies' });
Comment.belongsTo(Comment, { foreignKey: 'parent_id', as: 'parent' });

// Polymorphic Associations (Manual Setup or Helpers)
// Note: Sequelize polymorphic is a bit manual. We use hooks or scopes usually.
// Here we define the reverse relationship for convenience where possible.

// Post <-> Comment
Post.hasMany(Comment, { 
  foreignKey: 'target_id', 
  constraints: false,
  scope: { target_type: 'post' },
  as: 'comments'
});

// ScenicSpot <-> Comment
ScenicSpot.hasMany(Comment, { 
  foreignKey: 'target_id', 
  constraints: false,
  scope: { target_type: 'scenic_spot' },
  as: 'comments'
});

// Post <-> Like
Post.hasMany(Like, { 
  foreignKey: 'target_id', 
  constraints: false,
  scope: { target_type: 'post' },
  as: 'likes'
});

// Post <-> Favorite
Post.hasMany(Favorite, {
  foreignKey: 'target_id',
  constraints: false,
  scope: { target_type: 'post' },
  as: 'favorites'
});

Favorite.belongsTo(Post, {
  foreignKey: 'target_id',
  constraints: false,
  as: 'post'
});

// Comment <-> Like
Comment.hasMany(Like, { 
  foreignKey: 'target_id', 
  constraints: false,
  scope: { target_type: 'comment' },
  as: 'likes'
});

Like.belongsTo(Post, {
  foreignKey: 'target_id',
  constraints: false,
  as: 'post'
});

// User <-> Report
User.hasMany(Report, { foreignKey: 'user_id', as: 'reports' });
Report.belongsTo(User, { foreignKey: 'user_id', as: 'reporter' });

// 导出模型和 Sequelize 实例
module.exports = {
  sequelize,
  User,
  ScenicSpot,
  Itinerary,
  ChatMessage,
  Post,
  Comment,
  Like,
  Favorite,
  FavoriteFolder,
  Follow,
  Notification,
  Report
};
