const express = require('express');
const router = express.Router();
const itineraryController = require('../controllers/itineraryController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

router.post('/generate', itineraryController.generate);
router.post('/', itineraryController.create);
router.get('/', itineraryController.list);
router.get('/:id', itineraryController.getDetail);

module.exports = router;
