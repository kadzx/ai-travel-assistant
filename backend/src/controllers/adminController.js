const { Op, fn, col, literal } = require('sequelize');
const { User, Post, Comment, Report, Like, Itinerary } = require('../models');
const ResponseUtil = require('../utils/response');
const asyncHandler = require('../middlewares/asyncHandler');

const adminController = {
  getDashboardStats: asyncHandler(async (req, res) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [userCount, postCount, commentCount, reportPending, todayUsers, todayPosts, itineraryCount] = await Promise.all([
      User.count(),
      Post.count(),
      Comment.count(),
      Report.count({ where: { status: 'pending' } }),
      User.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      Post.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      Itinerary.count(),
    ]);

    // 7-day trend
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [userTrend, postTrend] = await Promise.all([
      User.findAll({
        attributes: [[fn('DATE', col('created_at')), 'date'], [fn('COUNT', '*'), 'count']],
        where: { created_at: { [Op.gte]: sevenDaysAgo } },
        group: [fn('DATE', col('created_at'))],
        raw: true,
      }),
      Post.findAll({
        attributes: [[fn('DATE', col('created_at')), 'date'], [fn('COUNT', '*'), 'count']],
        where: { created_at: { [Op.gte]: sevenDaysAgo } },
        group: [fn('DATE', col('created_at'))],
        raw: true,
      }),
    ]);

    const userMap = Object.fromEntries(userTrend.map(r => [r.date, parseInt(r.count)]));
    const postMap = Object.fromEntries(postTrend.map(r => [r.date, parseInt(r.count)]));

    const trend = days.map(d => ({
      date: d,
      users: userMap[d] || 0,
      posts: postMap[d] || 0,
    }));

    // Post type distribution
    const typeDistRaw = await Post.findAll({
      attributes: ['type', [fn('COUNT', '*'), 'count']],
      group: ['type'],
      raw: true,
    });
    const typeDistribution = typeDistRaw.map(r => ({ type: r.type || 'other', count: parseInt(r.count) }));

    return ResponseUtil.success(res, {
      users: userCount,
      posts: postCount,
      comments: commentCount,
      itineraries: itineraryCount,
      reportPending,
      todayUsers,
      todayPosts,
      trend,
      typeDistribution,
    });
  }),

  getUsers: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { keyword, role, status } = req.query;

    const where = {};
    if (keyword) {
      where[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { email: { [Op.like]: `%${keyword}%` } },
        { nickname: { [Op.like]: `%${keyword}%` } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;

    const { count, rows } = await User.findAndCountAll({
      attributes: { exclude: ['password'] },
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    return ResponseUtil.success(res, {
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      users: rows,
    });
  }),

  updateUserStatus: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, role } = req.body;

    const user = await User.findByPk(id);
    if (!user) return ResponseUtil.fail(res, 'not_found', 'User not found');

    if (status !== undefined) user.status = status;
    if (role !== undefined) user.role = role;
    await user.save();

    return ResponseUtil.success(res, { id: user.id, status: user.status, role: user.role });
  }),

  getPosts: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { keyword, type } = req.query;

    const where = {};
    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { content: { [Op.like]: `%${keyword}%` } },
      ];
    }
    if (type) where.type = type;

    const { count, rows } = await Post.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'nickname', 'avatar'] }],
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    return ResponseUtil.success(res, {
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      posts: rows,
    });
  }),

  deletePost: asyncHandler(async (req, res) => {
    const post = await Post.findByPk(req.params.id);
    if (!post) return ResponseUtil.fail(res, 'not_found', 'Post not found');
    await post.destroy();
    return ResponseUtil.success(res, null);
  }),

  getComments: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { keyword } = req.query;

    const where = {};
    if (keyword) where.content = { [Op.like]: `%${keyword}%` };

    const { count, rows } = await Comment.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'nickname', 'avatar'] }],
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    return ResponseUtil.success(res, {
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      comments: rows,
    });
  }),

  deleteComment: asyncHandler(async (req, res) => {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) return ResponseUtil.fail(res, 'not_found', 'Comment not found');
    await comment.destroy();
    return ResponseUtil.success(res, null);
  }),

  // Reports
  getReports: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { status: qs } = req.query;

    const where = {};
    if (qs) where.status = qs;

    const { count, rows } = await Report.findAndCountAll({
      where,
      include: [{ association: 'reporter', attributes: ['id', 'username', 'nickname', 'avatar'] }],
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    return ResponseUtil.success(res, {
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      reports: rows,
    });
  }),

  updateReport: asyncHandler(async (req, res) => {
    const report = await Report.findByPk(req.params.id);
    if (!report) return ResponseUtil.fail(res, 'not_found', 'Report not found');
    report.status = req.body.status || 'resolved';
    await report.save();
    return ResponseUtil.success(res, { id: report.id, status: report.status });
  }),
};

module.exports = adminController;
