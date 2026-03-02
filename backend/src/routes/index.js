const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const spotRoutes = require('./spotRoutes');
const itineraryRoutes = require('./itineraryRoutes');
const chatRoutes = require('./chatRoutes');
const socialRoutes = require('./socialRoutes');
const userRoutes = require('./userRoutes');

router.use('/auth', authRoutes);
router.use('/spots', spotRoutes);
router.use('/itineraries', itineraryRoutes);
router.use('/chat', chatRoutes);
router.use('/social', socialRoutes);
router.use('/user', userRoutes);

module.exports = router;
