const router = require('express').Router();
const c = require('../controllers/earthController');
router.get('/health', c.health);
router.get('/earth-data', c.single);
router.get('/earth-data/multiple', c.multiple);
router.get('/geocode', c.geocode);
router.get('/reverse', c.reverse);
module.exports = router;
