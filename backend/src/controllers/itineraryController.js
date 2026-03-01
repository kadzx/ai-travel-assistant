const itineraryService = require('../services/itineraryService');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');

const itineraryController = {
  // POST /generate
  generate: asyncHandler(async (req, res) => {
    const { destination, days, budget, interests, travelers } = req.body;
    // Basic validation
    if (!destination || !days) {
      return ResponseUtil.fail(res, 'params_error', 'Destination and days are required');
    }
    
    const result = await itineraryService.generate({
      destination,
      days,
      budget,
      interests,
      travelers
    });
    
    return ResponseUtil.success(res, result);
  }),

  // POST /
  create: asyncHandler(async (req, res) => {
    const { title, content, start_date, end_date } = req.body;
    
    if (!title || !content) {
      return ResponseUtil.fail(res, 'params_error', 'Title and content are required');
    }

    const itinerary = await itineraryService.create(req.user.id, {
      title,
      content,
      start_date,
      end_date
    });

    return ResponseUtil.success(res, itinerary);
  }),

  // GET /
  list: asyncHandler(async (req, res) => {
    const list = await itineraryService.list(req.user.id);
    return ResponseUtil.success(res, list);
  }),

  // GET /:id
  getDetail: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const itinerary = await itineraryService.getDetail(id, req.user.id);
    
    if (!itinerary) {
      return ResponseUtil.fail(res, 'resource_not_found', 'Itinerary not found');
    }

    return ResponseUtil.success(res, itinerary);
  })
};

module.exports = itineraryController;
