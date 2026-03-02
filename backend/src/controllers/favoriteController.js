const { Favorite, FavoriteFolder, User } = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');

const favoriteController = {
  // --- Folder Management ---

  // Create Folder
  // POST /api/social/favorite/folder
  // Body: { name, description, isPrivate }
  createFolder: asyncHandler(async (req, res) => {
    const { name, description, isPrivate } = req.body;
    const userId = req.user.id;

    if (!name) {
      return ResponseUtil.fail(res, 'param_error', 'Folder name is required');
    }

    const folder = await FavoriteFolder.create({
      user_id: userId,
      name,
      description,
      is_private: isPrivate || false
    });

    return ResponseUtil.success(res, folder);
  }),

  // Get User's Folders
  // GET /api/social/favorite/folders
  getFolders: asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const folders = await FavoriteFolder.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    return ResponseUtil.success(res, folders);
  }),

  // --- Favorite Actions ---

  // Add/Remove Favorite (Toggle)
  // POST /api/social/favorite
  // Body: { targetId, targetType, folderId }
  toggleFavorite: asyncHandler(async (req, res) => {
    const { targetId, targetType, folderId } = req.body;
    const userId = req.user.id;

    if (!targetId || !['post', 'scenic_spot', 'itinerary'].includes(targetType)) {
      return ResponseUtil.fail(res, 'param_error', 'Invalid targetId or targetType');
    }

    // Default to first folder or create "Default" if none exists (simplified: require folderId for now)
    // Actually, XHS prompts to choose.
    // Let's assume folderId is optional; if null, create/use "Default".
    let targetFolderId = folderId;

    if (!targetFolderId) {
      // Find or create 'Default' folder
      let defaultFolder = await FavoriteFolder.findOne({
        where: { user_id: userId, name: 'Default' }
      });
      if (!defaultFolder) {
        defaultFolder = await FavoriteFolder.create({
          user_id: userId,
          name: 'Default',
          description: 'My default collection'
        });
      }
      targetFolderId = defaultFolder.id;
    }

    const existingFavorite = await Favorite.findOne({
      where: {
        user_id: userId,
        target_id: targetId,
        target_type: targetType,
        folder_id: targetFolderId
      }
    });

    if (existingFavorite) {
      await existingFavorite.destroy();
      return ResponseUtil.success(res, { favorited: false, folderId: targetFolderId });
    } else {
      await Favorite.create({
        user_id: userId,
        target_id: targetId,
        target_type: targetType,
        folder_id: targetFolderId
      });
      return ResponseUtil.success(res, { favorited: true, folderId: targetFolderId });
    }
  }),

  // Get User's Favorites (All or by Folder)
  // GET /api/social/favorites?folderId=1
  getFavorites: asyncHandler(async (req, res) => {
    const { folderId } = req.query;
    const userId = req.user.id;

    const where = { user_id: userId };
    if (folderId) {
      where.folder_id = folderId;
    }

    const favorites = await Favorite.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    // Note: To get the actual target data (Post/Spot), we need more complex queries or separate API calls.
    // For now, return the favorite references.

    return ResponseUtil.success(res, favorites);
  })
};

module.exports = favoriteController;
