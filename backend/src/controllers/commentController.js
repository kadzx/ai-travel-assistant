const { Comment, User } = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');

const commentController = {
  // Create Comment
  // POST /api/social/comment
  // Body: { content, targetId, targetType: 'post'|'scenic_spot', parentId (optional) }
  createComment: asyncHandler(async (req, res) => {
    const { content, targetId, targetType, parentId, replyToUserId } = req.body;
    const userId = req.user.id;

    if (!content || !targetId || !['post', 'scenic_spot'].includes(targetType)) {
      return ResponseUtil.fail(res, 'param_error', 'Invalid content, targetId or targetType');
    }

    const comment = await Comment.create({
      user_id: userId,
      content,
      target_id: targetId,
      target_type: targetType,
      parent_id: parentId || null,
      reply_to_user_id: replyToUserId || null
    });

    // Return created comment with user info for immediate display
    const commentWithUser = await Comment.findByPk(comment.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'role'] }
      ]
    });

    return ResponseUtil.success(res, commentWithUser);
  }),

  // Get Comments List (Hierarchical)
  // GET /api/social/comments/:targetType/:targetId
  getComments: asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.params;

    if (!targetId || !['post', 'scenic_spot'].includes(targetType)) {
      return ResponseUtil.fail(res, 'param_error', 'Invalid targetId or targetType');
    }

    // Fetch root comments (parent_id: null)
    // In a real app, pagination is needed here.
    const comments = await Comment.findAll({
      where: {
        target_id: targetId,
        target_type: targetType,
        parent_id: null
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username'] },
        { 
          model: Comment, 
          as: 'replies', 
          include: [{ model: User, as: 'user', attributes: ['id', 'username'] }] 
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return ResponseUtil.success(res, comments);
  }),

  // Delete Comment
  // DELETE /api/social/comment/:id
  deleteComment: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return ResponseUtil.fail(res, 'not_found', 'Comment not found');
    }

    if (comment.user_id !== userId && req.user.role !== 'admin') {
      return ResponseUtil.fail(res, 'forbidden', 'No permission to delete this comment');
    }

    await comment.destroy();
    return ResponseUtil.success(res, { deleted: true });
  })
};

module.exports = commentController;
