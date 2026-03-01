const express = require('express');
const router = express.Router();
const spotController = require('../controllers/spotController');

// TODO: Add middleware to protect routes (verifyToken)
router.post('/', spotController.createSpot);
router.get('/', spotController.getSpots);
router.get('/:id', spotController.getSpotById);

module.exports = router;
