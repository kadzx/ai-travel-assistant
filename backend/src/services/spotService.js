const { ScenicSpot } = require('../models');
const { Op } = require('sequelize');

class SpotService {
  async create(data) {
    return await ScenicSpot.create(data);
  }

  async findAll(query) {
    const { page = 1, limit = 10, search } = query;
    const offset = (page - 1) * limit;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name_en: { [Op.like]: `%${search}%` } },
        { name_zh: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await ScenicSpot.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    return {
      total: count,
      page: parseInt(page),
      list: rows
    };
  }

  async findById(id) {
    const spot = await ScenicSpot.findByPk(id);
    if (!spot) throw new Error('spot_not_found');
    return spot;
  }
}

module.exports = new SpotService();
