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
  }),

  // PUT /:id
  update: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const itinerary = await itineraryService.update(req.user.id, id, req.body || {});
    if (!itinerary) {
      return ResponseUtil.fail(res, 'not_found', 'Itinerary not found');
    }
    return ResponseUtil.success(res, itinerary);
  }),

  // PATCH /:id/nodes/:nodeId
  updateNode: asyncHandler(async (req, res) => {
    const { id, nodeId } = req.params;
    const itinerary = await itineraryService.updateNode(req.user.id, id, nodeId, req.body || {});
    if (!itinerary) {
      return ResponseUtil.fail(res, 'not_found', 'Itinerary or node not found');
    }
    return ResponseUtil.success(res, itinerary);
  }),

  // POST /:id/nodes
  addNode: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const itinerary = await itineraryService.addNode(req.user.id, id, req.body || {});
    if (!itinerary) {
      return ResponseUtil.fail(res, 'not_found', 'Itinerary not found');
    }
    return ResponseUtil.success(res, itinerary);
  }),

  // DELETE /:id/nodes/:nodeId
  deleteNode: asyncHandler(async (req, res) => {
    const { id, nodeId } = req.params;
    const itinerary = await itineraryService.deleteNode(req.user.id, id, nodeId);
    if (!itinerary) {
      return ResponseUtil.fail(res, 'not_found', 'Itinerary or node not found');
    }
    return ResponseUtil.success(res, itinerary);
  }),

  // POST /:id/nodes/reorder
  reorderNodes: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const orders = req.body?.orders;
    const itinerary = await itineraryService.reorderNodes(req.user.id, id, orders);
    if (!itinerary) {
      return ResponseUtil.fail(res, 'not_found', 'Itinerary not found');
    }
    return ResponseUtil.success(res, itinerary);
  })
};

module.exports = itineraryController;
