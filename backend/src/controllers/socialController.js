const { Like, Comment, Favorite, Post, ScenicSpot } = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');
const { createNotification } = require('../services/notificationService');

const socialController = {
  // Toggle Like
  toggleLike: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { targetId, targetType } = req.body; // targetType: 'post' | 'comment' | 'scenic_spot'

    const existingLike = await Like.findOne({
      where: {
        user_id: userId,
        target_id: targetId,
        target_type: targetType
      }
    });

    if (existingLike) {
      await existingLike.destroy();
      return ResponseUtil.success(res, { liked: false });
    } else {
      await Like.create({
        user_id: userId,
        target_id: targetId,
        target_type: targetType
      });
      // 通知：点赞帖子 -> 通知帖子作者；点赞评论 -> 通知评论作者（与点赞者是否 admin 无关）
      let recipientId = null;
      const tid = parseInt(targetId, 10);
      if (!Number.isNaN(tid) && targetType === 'post') {
        const post = await Post.findByPk(tid, { attributes: ['user_id'] });
        if (post) recipientId = post.user_id;
      } else if (!Number.isNaN(tid) && targetType === 'comment') {
        const comment = await Comment.findByPk(tid, { attributes: ['user_id'] });
        if (comment) recipientId = comment.user_id;
      }
      if (recipientId) {
        await createNotification(recipientId, userId, 'like', targetType, tid, null);
        if (process.env.NODE_ENV !== 'production') {
          console.log('[通知] 点赞通知已创建 -> 接收者 userId:', recipientId, '点赞者 actorId:', userId);
        }
      } else if (process.env.NODE_ENV !== 'production') {
        console.log('[通知] 点赞未发通知: 未找到帖子/评论 targetId=', targetId, 'targetType=', targetType);
      }
      return ResponseUtil.success(res, { liked: true });
    }
  }),

  // Add Comment
  addComment: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { content, targetId, targetType, parentId } = req.body;

    const comment = await Comment.create({
      user_id: userId,
      content,
      target_id: targetId,
      target_type: targetType,
      parent_id: parentId || null
    });

    // 通知：评论帖子 -> 通知帖子作者
    if (targetType === 'post') {
      const post = await Post.findByPk(targetId, { attributes: ['user_id', 'title'] });
      if (post && post.user_id !== userId) {
        await createNotification(post.user_id, userId, 'comment', 'post', targetId, {
          contentSnippet: content ? content.slice(0, 60) : '',
          title: post.title
        });
      }
    }

    const commentWithUser = await Comment.findByPk(comment.id, {
      include: ['user']
    });

    return ResponseUtil.success(res, commentWithUser);
  }),

  // Get Comments
  getComments: asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Comment.findAndCountAll({
      where: {
        target_type: targetType,
        target_id: targetId,
        parent_id: null // Top level comments only
      },
      include: [
        { association: 'user', attributes: ['id', 'username', 'avatar', 'nickname'] },
        { 
          association: 'replies', 
          include: [{ association: 'user', attributes: ['id', 'username', 'avatar', 'nickname'] }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return ResponseUtil.success(res, {
      list: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  }),

  // Toggle Favorite
  toggleFavorite: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { targetId, targetType } = req.body;

    const existingFav = await Favorite.findOne({
      where: {
        user_id: userId,
        target_id: targetId,
        target_type: targetType
      }
    });

    if (existingFav) {
      await existingFav.destroy();
      return ResponseUtil.success(res, { favorited: false });
    } else {
      await Favorite.create({
        user_id: userId,
        target_id: targetId,
        target_type: targetType
      });
      return ResponseUtil.success(res, { favorited: true });
    }
  })
};

module.exports = socialController;
