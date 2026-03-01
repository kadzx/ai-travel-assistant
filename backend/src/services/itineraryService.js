const { Itinerary } = require('../models');
const aiService = require('./aiService');
const logger = require('../utils/logger');

class ItineraryService {
  /**
   * Generate itinerary using AI
   * @param {Object} data - User preferences
   * @returns {Promise<Object>} Generated itinerary data
   */
  async generate(data) {
    try {
      const generatedContent = await aiService.generateItinerary(data);
      return generatedContent;
    } catch (error) {
      logger.error('ItineraryService generate error:', error);
      throw error;
    }
  }

  /**
   * Create (save) an itinerary
   * @param {Number} userId 
   * @param {Object} data 
   * @returns {Promise<Itinerary>}
   */
  async create(userId, data) {
    try {
      const { title, content, start_date, end_date } = data;
      const itinerary = await Itinerary.create({
        user_id: userId,
        title,
        content, // JSON
        start_date,
        end_date
      });
      return itinerary;
    } catch (error) {
      logger.error('ItineraryService create error:', error);
      throw error;
    }
  }

  /**
   * List user's itineraries
   * @param {Number} userId 
   * @returns {Promise<Array<Itinerary>>}
   */
  async list(userId) {
    try {
      return await Itinerary.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      logger.error('ItineraryService list error:', error);
      throw error;
    }
  }

  /**
   * Get itinerary details
   * @param {Number} id 
   * @param {Number} userId 
   * @returns {Promise<Itinerary>}
   */
  async getDetail(id, userId) {
    try {
      const itinerary = await Itinerary.findOne({
        where: { id, user_id: userId }
      });
      return itinerary;
    } catch (error) {
      logger.error('ItineraryService getDetail error:', error);
      throw error;
    }
  }
}

module.exports = new ItineraryService();
