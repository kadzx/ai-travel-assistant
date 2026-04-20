const { Like, Comment, Favorite, Post, ScenicSpot, User, Report } = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');
const { createNotification } = require('../services/notificationService');

const socialController = {
  // Toggle Like
  toggleLike: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { targetId, targetType } = req.body;

    const existingLike = await Like.findOne({
      where: { user_id: userId, target_id: targetId, target_type: targetType }
    });

    if (existingLike) {
      await existingLike.destroy();
      return ResponseUtil.success(res, { liked: false });
    } else {
      await Like.create({ user_id: userId, target_id: targetId, target_type: targetType });
      let recipientId = null;
      const tid = parseInt(targetId, 10);
      if (!Number.isNaN(tid) && targetType === 'post') {
        const post = await Post.findByPk(tid, { attributes: ['user_id'] });
        if (post) recipientId = post.user_id;
      } else if (!Number.isNaN(tid) && targetType === 'comment') {
        const comment = await Comment.findByPk(tid, { attributes: ['user_id'] });
        if (comment) recipientId = comment.user_id;
      }
      if (recipientId && recipientId !== userId) {
        await createNotification(recipientId, userId, 'like', targetType, tid, null);
      }
      return ResponseUtil.success(res, { liked: true });
    }
  }),

  // Add Comment (supports nested replies via parentId + replyToUserId)
  addComment: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { content, targetId, targetType, parentId, replyToUserId } = req.body;

    const comment = await Comment.create({
      user_id: userId,
      content,
      target_id: targetId,
      target_type: targetType,
      parent_id: parentId || null,
      reply_to_user_id: replyToUserId || null
    });

    // Notify post author for top-level comments
    if (targetType === 'post' && !parentId) {
      const post = await Post.findByPk(targetId, { attributes: ['user_id', 'title'] });
      if (post && post.user_id !== userId) {
        await createNotification(post.user_id, userId, 'comment', 'post', targetId, {
          contentSnippet: content ? content.slice(0, 60) : '',
          title: post.title
        });
      }
    }

    // Notify parent comment author for replies
    if (parentId) {
      const parentComment = await Comment.findByPk(parentId, { attributes: ['user_id'] });
      if (parentComment && parentComment.user_id !== userId) {
        await createNotification(parentComment.user_id, userId, 'comment', 'comment', parentId, {
          contentSnippet: content ? content.slice(0, 60) : ''
        });
      }
      // Also notify the user being replied to (if different from parent author)
      if (replyToUserId && replyToUserId !== userId && (!parentComment || replyToUserId !== parentComment.user_id)) {
        await createNotification(replyToUserId, userId, 'comment', 'comment', parentId, {
          contentSnippet: content ? content.slice(0, 60) : ''
        });
      }
    }

    const commentWithUser = await Comment.findByPk(comment.id, {
      include: [
        { association: 'user', attributes: ['id', 'username', 'avatar', 'nickname'] }
      ]
    });

    // Attach replyToUser if applicable
    const result = commentWithUser.toJSON();
    if (replyToUserId) {
      const replyToUser = await User.findByPk(replyToUserId, { attributes: ['id', 'username', 'nickname'] });
      result.replyToUser = replyToUser ? replyToUser.toJSON() : null;
    }

    return ResponseUtil.success(res, result);
  }),

  // Get top-level comments with first N replies
  getComments: asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Comment.findAndCountAll({
      where: { target_type: targetType, target_id: targetId, parent_id: null },
      include: [
        { association: 'user', attributes: ['id', 'username', 'avatar', 'nickname'] },
        {
          association: 'replies',
          separate: true,
          limit: 3,
          order: [['created_at', 'ASC']],
          include: [
            { association: 'user', attributes: ['id', 'username', 'avatar', 'nickname'] }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    // Count total replies per comment & attach replyToUser
    const list = await Promise.all(rows.map(async (row) => {
      const item = row.toJSON();
      item.replyCount = await Comment.count({ where: { parent_id: item.id } });
      // Attach replyToUser for each reply
      if (item.replies) {
        for (const reply of item.replies) {
          if (reply.reply_to_user_id) {
            const rtu = await User.findByPk(reply.reply_to_user_id, { attributes: ['id', 'username', 'nickname'] });
            reply.replyToUser = rtu ? rtu.toJSON() : null;
          }
        }
      }
      return item;
    }));

    return ResponseUtil.success(res, { list, total: count, page, totalPages: Math.ceil(count / limit) });
  }),

  // Get paginated replies for a specific comment
  getReplies: asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Comment.findAndCountAll({
      where: { parent_id: commentId },
      include: [
        { association: 'user', attributes: ['id', 'username', 'avatar', 'nickname'] }
      ],
      order: [['created_at', 'ASC']],
      limit,
      offset
    });

    const list = await Promise.all(rows.map(async (row) => {
      const item = row.toJSON();
      if (item.reply_to_user_id) {
        const rtu = await User.findByPk(item.reply_to_user_id, { attributes: ['id', 'username', 'nickname'] });
        item.replyToUser = rtu ? rtu.toJSON() : null;
      }
      return item;
    }));

    return ResponseUtil.success(res, { list, total: count, page, totalPages: Math.ceil(count / limit) });
  }),

  // Toggle Favorite
  toggleFavorite: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { targetId, targetType } = req.body;

    const existingFav = await Favorite.findOne({
      where: { user_id: userId, target_id: targetId, target_type: targetType }
    });

    if (existingFav) {
      await existingFav.destroy();
      return ResponseUtil.success(res, { favorited: false });
    } else {
      await Favorite.create({ user_id: userId, target_id: targetId, target_type: targetType });
      return ResponseUtil.success(res, { favorited: true });
    }
  }),

  // Submit Report
  submitReport: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { targetId, targetType, reason, description } = req.body;

    const existing = await Report.findOne({
      where: { user_id: userId, target_id: targetId, target_type: targetType, status: 'pending' }
    });
    if (existing) {
      return ResponseUtil.fail(res, 'param_error', '您已举报过该内容，请等待处理');
    }

    await Report.create({
      user_id: userId,
      target_id: targetId,
      target_type: targetType,
      reason: reason || 'other',
      description: description || null,
    });

    return ResponseUtil.success(res, { reported: true });
  })
};

module.exports = socialController;
