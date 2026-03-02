const { User, Post, Comment } = require('../models');
const ResponseUtil = require('../utils/response');

const adminController = {
  // Dashboard Stats / 仪表盘统计
  getDashboardStats: async (req, res) => {
    try {
      const userCount = await User.count();
      const postCount = await Post.count();
      const commentCount = await Comment.count();

      return ResponseUtil.success(res, {
        users: userCount,
        posts: postCount,
        comments: commentCount
      });
    } catch (error) {
      return ResponseUtil.fail(res, 'server_error', error.message);
    }
  },

  // User Management / 用户管理
  getUsers: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { count, rows } = await User.findAndCountAll({
        attributes: { exclude: ['password'] },
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return ResponseUtil.success(res, {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        users: rows
      });
    } catch (error) {
      return ResponseUtil.fail(res, 'server_error', error.message);
    }
  },

  updateUserStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, role } = req.body;
      
      const user = await User.findByPk(id);
      if (!user) {
        return ResponseUtil.fail(res, 'not_found', 'User not found');
      }

      if (status) user.status = status;
      if (role) user.role = role;
      
      await user.save();

      return ResponseUtil.success(res, {
        id: user.id,
        status: user.status,
        role: user.role
      });
    } catch (error) {
      return ResponseUtil.fail(res, 'server_error', error.message);
    }
  },

  // Content Management - Posts / 内容管理 - 帖子
  getPosts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { count, rows } = await Post.findAndCountAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'nickname', 'avatar']
          }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return ResponseUtil.success(res, {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        posts: rows
      });
    } catch (error) {
      return ResponseUtil.fail(res, 'server_error', error.message);
    }
  },

  deletePost: async (req, res) => {
    try {
      const { id } = req.params;
      const post = await Post.findByPk(id);
      
      if (!post) {
        return ResponseUtil.fail(res, 'not_found', 'Post not found');
      }

      await post.destroy();
      return ResponseUtil.success(res, null);
    } catch (error) {
      return ResponseUtil.fail(res, 'server_error', error.message);
    }
  },

  // Content Management - Comments / 内容管理 - 评论
  getComments: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { count, rows } = await Comment.findAndCountAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'nickname', 'avatar']
          }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return ResponseUtil.success(res, {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        comments: rows
      });
    } catch (error) {
      return ResponseUtil.fail(res, 'server_error', error.message);
    }
  },

  deleteComment: async (req, res) => {
    try {
      const { id } = req.params;
      const comment = await Comment.findByPk(id);
      
      if (!comment) {
        return ResponseUtil.fail(res, 'not_found', 'Comment not found');
      }

      await comment.destroy();
      return ResponseUtil.success(res, null);
    } catch (error) {
      return ResponseUtil.fail(res, 'server_error', error.message);
    }
  }
};

module.exports = adminController;
