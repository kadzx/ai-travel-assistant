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
        const posts = await Post.findAll({
          where: { user_id: userId },
          order: [['created_at', 'DESC']],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'nickname', 'avatar']
            },
            {
              model: Like,
              as: 'likes',
              attributes: ['user_id']
            }
          ]
        });

        data = posts.map(post => {
          const p = post.toJSON();
          const isLiked = p.likes ? p.likes.some(l => String(l.user_id) === String(userId)) : false;
          return {
            id: p.id,
            title: p.title,
            image: p.images && p.images.length > 0 ? p.images[0] : null,
            user: {
              name: p.user.nickname || p.user.username,
              avatar: p.user.avatar
            },
            likes: p.likes ? p.likes.length : 0,
            isLiked: isLiked
          };
        });
        break;
      
      case 'favorites':
        // Get user's favorites (flat list for now to simplify frontend waterfall)
        const favorites = await Favorite.findAll({
          where: { user_id: userId, target_type: 'post' },
          order: [['created_at', 'DESC']],
          include: [
            {
              model: Post,
              as: 'post',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'username', 'nickname', 'avatar']
                },
                {
                   model: Like,
                   as: 'likes',
                   attributes: ['user_id']
                }
              ]
            }
          ]
        });

        data = favorites.map(fav => {
          if (!fav.post) return null;
          const p = fav.post.toJSON();
          // Check if user also liked this favorited post
          const isLiked = p.likes ? p.likes.some(l => String(l.user_id) === String(userId)) : false;
          
          return {
            id: p.id,
            title: p.title,
            image: p.images && p.images.length > 0 ? p.images[0] : null,
            user: {
              name: p.user.nickname || p.user.username,
              avatar: p.user.avatar
            },
            likes: p.likes ? p.likes.length : 0,
            isLiked: isLiked,
            favoritedAt: fav.created_at
          };
        }).filter(item => item !== null);
        break;

      case 'likes':
        // Get items liked by user
        const likes = await Like.findAll({
          where: { user_id: userId, target_type: 'post' },
          order: [['created_at', 'DESC']],
          attributes: ['created_at'], // Only need timestamp of like
          include: [
            {
              model: Post,
              as: 'post', // Ensure alias matches association
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'username', 'nickname', 'avatar']
                },
                {
                  model: Like,
                  as: 'likes',
                  attributes: ['user_id']
                }
              ]
            }
          ]
        });
        
        // Transform to flat post list with isLiked status
        data = likes.map(like => {
          if (!like.post) return null;
          const p = like.post.toJSON();
          return {
            id: p.id,
            title: p.title,
            image: p.images && p.images.length > 0 ? p.images[0] : null,
            user: {
              name: p.user.nickname || p.user.username,
              avatar: p.user.avatar
            },
            likes: p.likes ? p.likes.length : 0,
            isLiked: true, // Since it's in user's liked list
            likedAt: like.created_at
          };
        }).filter(item => item !== null);
        break;

      default:
        return ResponseUtil.fail(res, 'param_error', 'Invalid activity type');
    }

    return ResponseUtil.success(res, data);
  })
};

module.exports = userController;
