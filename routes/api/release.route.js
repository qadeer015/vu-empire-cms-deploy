const express = require('express');
const ReleaseController = require('../../controllers/release.controller');

const router = express.Router();

router.get('/latest', ReleaseController.latest);
router.get('/', ReleaseController.list);

module.exports = router;
