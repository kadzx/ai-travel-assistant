const { Post, User, Like, Comment, Favorite } = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');

const postController = {
  // Create a new post
  createPost: asyncHandler(async (req, res) => {
    const { title, content, images } = req.body;
    const userId = req.user.id;

    const post = await Post.create({
      user_id: userId,
      title,
      content,
      images: images || []
    });

    return ResponseUtil.success(res, post);
  }),

  // Get post feed (Masonry list)
  getPosts: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const currentUserId = req.user ? req.user.id : null; // Optional auth for feed

    const { count, rows } = await Post.findAndCountAll({
      attributes: ['id', 'title', 'images', 'created_at'],
      include: [
        {
          model: User,
          as: 'user', 
          attributes: ['id', 'username', 'avatar', 'nickname']
        },
        {
            model: Like,
            as: 'likes',
            attributes: ['user_id']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true 
    });

    // Format for frontend masonry
    const posts = rows.map(post => {
      const p = post.toJSON();
      return {
        id: p.id,
        title: p.title,
        image: p.images && p.images.length > 0 ? p.images[0] : null,
        user: {
          name: p.user.nickname || p.user.username,
          avatar: p.user.avatar
        },
        likes: p.likes ? p.likes.length : 0,
        isLiked: currentUserId ? p.likes.some(l => String(l.user_id) === String(currentUserId)) : false
      };
    });

    return ResponseUtil.success(res, {
      list: posts,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  }),

  // Get post detail
  getPostById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.user ? req.user.id : null; // Need auth to check isLiked

    const post = await Post.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'avatar', 'nickname']
        },
        {
            model: Like,
            as: 'likes',
            attributes: ['user_id']
        },
        {
            model: Favorite, // Assuming association exists or will be added
            as: 'favorites', // Assuming polymorphic association name
            required: false,
            where: { target_type: 'post' },
            attributes: ['user_id']
        }
      ]
    });

    if (!post) {
      return ResponseUtil.fail(res, 'post_not_found', 'Post not found'); 
    }
    
    // Get comment count
    const commentCount = await Comment.count({ where: { target_id: id, target_type: 'post' } });
    
    // Get favorite count (if not included above or separate query)
    const favoriteCount = await Favorite.count({ where: { target_id: id, target_type: 'post' } });

    const result = post.toJSON();
    result.likesCount = result.likes ? result.likes.length : 0;
    result.commentsCount = commentCount;
    result.favoritesCount = favoriteCount;
    
    result.isLiked = currentUserId ? result.likes.some(l => String(l.user_id) === String(currentUserId)) : false;
    
    // Check favorites manually if association complex
    result.isFavorited = currentUserId ? (await Favorite.findOne({ where: { user_id: currentUserId, target_id: id, target_type: 'post' } })) !== null : false;

    // Clean up
    delete result.likes;
    delete result.favorites;

    return ResponseUtil.success(res, result);
  }),

  // Delete post
  deletePost: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await Post.findByPk(id);
    if (!post) {
      return ResponseUtil.fail(res, 'post_not_found');
    }

    if (post.user_id !== userId && req.user.role !== 'admin') {
      return ResponseUtil.fail(res, 'permission_denied');
    }

    await post.destroy();
    return ResponseUtil.success(res, null);
  })
};

module.exports = postController;
