const { User, Post, Like, Favorite, FavoriteFolder, Comment, Follow } = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');
const { rewritePostImages } = require('../utils/xhsImageRewrite');

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

    // 5. Follow counts
    const followerCount = await Follow.count({ where: { following_id: userId } });
    const followingCount = await Follow.count({ where: { follower_id: userId } });

    // Construct response
    const profileData = {
      ...user.toJSON(),
      stats: {
        postCount,
        favoriteCount,
        receivedLikesCount,
        likedCount,
        followerCount,
        followingCount
      }
    };

    return ResponseUtil.success(res, profileData);
  }),

  // Get Public Profile (for other user's home page)
  // GET /api/user/:id
  getPublicProfile: asyncHandler(async (req, res) => {
    const targetUserId = parseInt(req.params.id);
    const currentUserId = req.user ? req.user.id : null;

    if (!targetUserId) {
      return ResponseUtil.fail(res, 'param_error', 'Invalid user id');
    }

    const user = await User.findByPk(targetUserId, {
      attributes: ['id', 'username', 'nickname', 'avatar', 'bio', 'created_at']
    });

    if (!user) {
      return ResponseUtil.fail(res, 'user_not_found');
    }

    const postCount = await Post.count({ where: { user_id: targetUserId } });
    const followerCount = await Follow.count({ where: { following_id: targetUserId } });
    const followingCount = await Follow.count({ where: { follower_id: targetUserId } });

    const userPosts = await Post.findAll({ where: { user_id: targetUserId }, attributes: ['id'] });
    const postIds = userPosts.map(p => p.id);
    let receivedLikesCount = 0;
    if (postIds.length > 0) {
      receivedLikesCount = await Like.count({
        where: { target_id: postIds, target_type: 'post' }
      });
    }

    let isFollowing = false;
    if (currentUserId && currentUserId !== targetUserId) {
      const follow = await Follow.findOne({
        where: { follower_id: currentUserId, following_id: targetUserId }
      });
      isFollowing = !!follow;
    }

    const profileData = {
      ...user.toJSON(),
      stats: {
        postCount,
        followerCount,
        followingCount,
        receivedLikesCount
      },
      isFollowing
    };

    return ResponseUtil.success(res, profileData);
  }),

  // Update Profile
  // PUT /api/user/profile
  // Body: { nickname, avatar, bio } — avatar 可为 data URL (base64) 或旧版 URL
  updateProfile: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { nickname, avatar, bio, preferred_lang } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return ResponseUtil.fail(res, 'user_not_found');
    }

    if (nickname !== undefined) user.nickname = nickname;
    if (bio !== undefined) user.bio = bio;
    if (preferred_lang !== undefined && (preferred_lang === 'zh' || preferred_lang === 'en')) {
      user.preferred_lang = preferred_lang;
    }

    if (avatar !== undefined) {
      if (typeof avatar !== 'string' || !avatar.trim()) {
        return ResponseUtil.fail(res, 'param_error', '头像不能为空');
      }
      if (!avatar.startsWith('http://') && !avatar.startsWith('https://') && !avatar.startsWith('data:image/')) {
        return ResponseUtil.fail(res, 'param_error', '头像格式无效，请使用图片链接');
      }
      user.avatar = avatar.trim();
    }

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
          const item = {
            id: p.id,
            title: p.title,
            image: p.images && p.images.length > 0 ? p.images[0] : null,
            images: p.images || [],
            user: {
              name: p.user.nickname || p.user.username,
              avatar: p.user.avatar
            },
            likes: p.likes ? p.likes.length : 0,
            isLiked: isLiked
          };
          return rewritePostImages(item, `${req.protocol}://${req.get('host')}`);
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
          const isLiked = p.likes ? p.likes.some(l => String(l.user_id) === String(userId)) : false;
          const item = {
            id: p.id,
            title: p.title,
            image: p.images && p.images.length > 0 ? p.images[0] : null,
            images: p.images || [],
            user: {
              name: p.user.nickname || p.user.username,
              avatar: p.user.avatar
            },
            likes: p.likes ? p.likes.length : 0,
            isLiked: isLiked,
            favoritedAt: fav.created_at
          };
          return rewritePostImages(item, `${req.protocol}://${req.get('host')}`);
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
          const item = {
            id: p.id,
            title: p.title,
            image: p.images && p.images.length > 0 ? p.images[0] : null,
            images: p.images || [],
            user: {
              name: p.user.nickname || p.user.username,
              avatar: p.user.avatar
            },
            likes: p.likes ? p.likes.length : 0,
            isLiked: true,
            likedAt: like.created_at
          };
          return rewritePostImages(item, `${req.protocol}://${req.get('host')}`);
        }).filter(item => item !== null);
        break;

      default:
        return ResponseUtil.fail(res, 'param_error', 'Invalid activity type');
    }

    return ResponseUtil.success(res, data);
  })
};

module.exports = userController;
