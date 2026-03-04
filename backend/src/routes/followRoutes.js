const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/', followController.follow);
router.post('/unfollow', followController.unfollow);
router.get('/check', followController.check);
router.get('/following', followController.following);
router.get('/followers', followController.followers);

module.exports = router;
