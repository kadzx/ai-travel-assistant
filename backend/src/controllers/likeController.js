const { Like } = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');

const likeController = {
  // Toggle Like (Like/Unlike)
  // POST /api/social/like
  // Body: { targetId, targetType: 'post'|'comment'|'scenic_spot' }
  toggleLike: asyncHandler(async (req, res) => {
    const { targetId, targetType } = req.body;
    const userId = req.user.id;

    if (!targetId || !['post', 'comment', 'scenic_spot'].includes(targetType)) {
      return ResponseUtil.fail(res, 'param_error', 'Invalid targetId or targetType');
    }

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

  // Get Like Status
  // GET /api/social/like/status?targetId=1&targetType=post
  getLikeStatus: asyncHandler(async (req, res) => {
    const { targetId, targetType } = req.query;
    const userId = req.user.id;

    const count = await Like.count({
      where: {
        target_id: targetId,
        target_type: targetType
      }
    });

    const existingLike = await Like.findOne({
      where: {
        user_id: userId,
        target_id: targetId,
        target_type: targetType
      }
    });

    return ResponseUtil.success(res, {
      liked: !!existingLike,
      count
    });
  })
};

module.exports = likeController;
