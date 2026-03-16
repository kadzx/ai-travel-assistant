const express = require('express');
const router = express.Router();
const itineraryController = require('../controllers/itineraryController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

router.post('/generate', itineraryController.generate);
router.post('/', itineraryController.create);
router.put('/:id', itineraryController.update);
router.patch('/:id/nodes/:nodeId', itineraryController.updateNode);
router.post('/:id/nodes', itineraryController.addNode);
router.delete('/:id/nodes/:nodeId', itineraryController.deleteNode);
router.delete('/:id', itineraryController.deleteItinerary);
router.post('/:id/nodes/reorder', itineraryController.reorderNodes);
router.get('/', itineraryController.list);
router.get('/:id', itineraryController.getDetail);

module.exports = router;
