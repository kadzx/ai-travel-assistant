const { Like, Comment, Favorite, Post, ScenicSpot } = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');

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

    // Fetch user info to return complete object
    const commentWithUser = await Comment.findByPk(comment.id, {
      include: ['user'] // Assuming association 'user' exists in Comment model
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
