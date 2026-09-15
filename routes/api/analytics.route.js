const express = require('express');
const router = express.Router();
const analyticsController = require('../../controllers/analytics.controller');
const { authenticate } = require('../../middlewares/authenticate');
const { authorize } = require('../../middlewares/authorize');

// All analytics routes require admin authentication (CMS manages content)
router.use(authenticate, authorize('admin'));

// ── Dashboard (aggregated summary, devices, countries, traffic, trend) ──
router.get('/dashboard', analyticsController.dashboardData);
router.get('/realtime', analyticsController.realtime);
router.get('/summary', analyticsController.summary);
router.get('/pages', analyticsController.topPages);
router.get('/devices', analyticsController.devices);
router.get('/countries', analyticsController.countries);
router.get('/traffic', analyticsController.traffic);
router.get('/monthly', analyticsController.monthly);

module.exports = router;