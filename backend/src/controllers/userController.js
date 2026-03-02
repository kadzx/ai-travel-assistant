const { User, Post, Like, Favorite, FavoriteFolder, Comment } = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');

const userController = {
  // Get Current User Profile (My Profile)
  // GET /api/user/profile
  getMyProfile: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    // Fetch basic user info
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return ResponseUtil.fail(res, 'user_not_found');
    }

    // Fetch Stats
    // 1. Posts Count
    const postCount = await Post.count({ where: { user_id: userId } });
    
    // 2. Favorites Count (Items favorited by user)
    const favoriteCount = await Favorite.count({ where: { user_id: userId } });

    // 3. Likes Received Count (Total likes on user's posts)
    // This is a bit complex: find all posts by user, then count likes on those posts
    // For simplicity, we can do a raw query or sum up. 
    // Here we use a simpler approach: get posts IDs, count likes where target_id IN postIds AND target_type='post'
    const userPosts = await Post.findAll({ where: { user_id: userId }, attributes: ['id'] });
    const postIds = userPosts.map(p => p.id);
    let receivedLikesCount = 0;
    if (postIds.length > 0) {
      receivedLikesCount = await Like.count({
        where: {
          target_id: postIds,
          target_type: 'post'
        }
      });
    }

    // 4. Liked Count (Items liked by user)
    const likedCount = await Like.count({ where: { user_id: userId } });

    // Construct response
    const profileData = {
      ...user.toJSON(),
      stats: {
        postCount,
        favoriteCount,
        receivedLikesCount,
        likedCount,
        followerCount: 0, // Placeholder as Follow feature is skipped
        followingCount: 0 // Placeholder
      }
    };

    return ResponseUtil.success(res, profileData);
  }),

  // Update Profile
  // PUT /api/user/profile
  // Body: { nickname, avatar, bio }
  updateProfile: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { nickname, avatar, bio } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return ResponseUtil.fail(res, 'user_not_found');
    }

    // Update fields if provided
    if (nickname !== undefined) user.nickname = nickname;
    if (avatar !== undefined) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    // Return updated user (exclude password)
    const updatedUser = user.toJSON();
    delete updatedUser.password;

    return ResponseUtil.success(res, updatedUser);
  }),

  // Get My Activities (Posts, Favorites, Likes)
  // GET /api/user/activities?type=posts|favorites|likes
  getMyActivities: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { type } = req.query;

    let data = [];

    switch (type) {
      case 'posts':
        // Get user's posts
        data = await Post.findAll({
          where: { user_id: userId },
          order: [['created_at', 'DESC']],
          // Include like/comment counts if needed (simplified here)
        });
        break;
      
      case 'favorites':
        // Get user's favorites (grouped by folders usually, but here flat list or folders)
        // Let's return folders with preview
        const folders = await FavoriteFolder.findAll({
          where: { user_id: userId },
          include: [
            {
              model: Favorite,
              as: 'favorites',
              limit: 5, // Preview 5 items
              order: [['created_at', 'DESC']]
            }
          ],
          order: [['created_at', 'DESC']]
        });
        data = folders;
        break;

      case 'likes':
        // Get items liked by user
        const likes = await Like.findAll({
          where: { user_id: userId },
          order: [['created_at', 'DESC']]
        });
        data = likes;
        break;

      default:
        return ResponseUtil.fail(res, 'param_error', 'Invalid activity type');
    }

    return ResponseUtil.success(res, data);
  })
};

module.exports = userController;
