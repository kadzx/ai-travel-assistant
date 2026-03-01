const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const spotRoutes = require('./spotRoutes');
const itineraryRoutes = require('./itineraryRoutes');
const chatRoutes = require('./chatRoutes');

router.use('/auth', authRoutes);
router.use('/spots', spotRoutes);
router.use('/itineraries', itineraryRoutes);
router.use('/chat', chatRoutes);

module.exports = router;
