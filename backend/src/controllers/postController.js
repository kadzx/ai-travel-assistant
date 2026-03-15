const { Post, User, Like, Comment, Favorite, Follow, sequelize } = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');
const { rewritePostImages } = require('../utils/xhsImageRewrite');
const cozeWorkflowService = require('../services/cozeWorkflowService');

const postController = {
  // Create a new post
  createPost: asyncHandler(async (req, res) => {
    const { title, content, images, location, tags, type, privacy } = req.body;
    const userId = req.user.id;

    const post = await Post.create({
      user_id: userId,
      title,
      content,
      images: images || [],
      location,
      tags: tags || [],
      type: type || 'recommend',
      privacy: privacy || 'public'
    });

    return ResponseUtil.success(res, post);
  }),

  // Get post feed (Masonry list)
  // Query: page, limit, type, feed=following|recommend, userId, keyword, tag
  getPosts: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const type = req.query.type;
    const feed = req.query.feed; // 'following' = only from users I follow
    const userId = req.query.userId ? parseInt(req.query.userId) : null; // posts by this user
    const keyword = (req.query.keyword || req.query.q || '').trim();
    const tag = (req.query.tag || '').trim();
    const currentUserId = req.user ? req.user.id : null;

    const where = {};

    if (userId) {
      where.user_id = userId;
      // When viewing a user's page, show their public + (if self) private posts
      if (currentUserId !== userId) {
        where.privacy = 'public';
      }
    } else if (feed === 'following') {
      if (!currentUserId) {
        return ResponseUtil.success(res, { list: [], total: 0, page: 1, totalPages: 0 });
      }
      const followingRows = await Follow.findAll({
        where: { follower_id: currentUserId },
        attributes: ['following_id']
      });
      const followingIds = followingRows.map(r => r.following_id);
      if (followingIds.length === 0) {
        return ResponseUtil.success(res, { list: [], total: 0, page: 1, totalPages: 0 });
      }
      where.user_id = { [Op.in]: followingIds };
      where.privacy = 'public';
    } else {
      where.privacy = 'public';
    }

    if (type && type !== 'recommend') {
      where.type = type;
    }

    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { content: { [Op.like]: `%${keyword}%` } }
      ];
    }

    if (tag) {
      // tags is JSON array, e.g. ["京都","摄影"]. MySQL: JSON_CONTAINS(tags, '"tag"', '$')
      const escapedTag = tag.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        sequelize.literal(`JSON_CONTAINS(tags, JSON_QUOTE('${escapedTag}'), '$')`)
      );
    }

    const { count, rows } = await Post.findAndCountAll({
      where,
      attributes: ['id', 'title', 'images', 'content', 'created_at', 'type', 'location', 'tags'],
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

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    // Format for frontend masonry，并把 xhscdn 图链重写成本地 URL（若本地有文件）
    const posts = rows.map(post => {
      const p = post.toJSON();
      const item = {
        id: p.id,
        title: p.title,
        image: p.images && p.images.length > 0 ? p.images[0] : null,
        images: p.images,
        tags: p.tags || [],
        user: {
          id: p.user.id,
          name: p.user.nickname || p.user.username,
          avatar: p.user.avatar
        },
        likes: p.likes ? p.likes.length : 0,
        isLiked: currentUserId ? p.likes.some(l => String(l.user_id) === String(currentUserId)) : false
      };
      return rewritePostImages(item, baseUrl);
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

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const out = rewritePostImages(result, baseUrl);
    return ResponseUtil.success(res, out);
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
  }),

  /**
   * POST /posts/:id/generate-itinerary
   * 从帖子正文调用 Coze 工作流 type: posts，SSE 流式返回行程结果。
   * 请求需登录；帖子存在即可（不校验是否本人）。
   */
  generateItinerary: async (req, res) => {
    const { id } = req.params;
    if (!id) {
      return ResponseUtil.fail(res, 'params_error', 'Post ID is required');
    }
    const post = await Post.findByPk(id, { attributes: ['id', 'title', 'content'] });
    if (!post) {
      return ResponseUtil.fail(res, 'post_not_found', 'Post not found');
    }
    const plain = post.get ? post.get({ plain: true }) : post;
    const content = [plain.title, plain.content].filter(Boolean).join('\n\n').trim() || plain.content || '';
    if (!content) {
      return ResponseUtil.fail(res, 'params_error', 'Post has no content to generate itinerary');
    }
    const sessionId = `post-${id}-${Date.now()}`;
    const payload = { type: 'posts', content };
    try {
      await cozeWorkflowService.streamWorkflowToResponse(payload, sessionId, res, () => {});
    } catch (err) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ code: 500, message: err.message || 'Generate failed' });
      }
    }
  }
};

module.exports = postController;
